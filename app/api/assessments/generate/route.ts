import { measureSchema } from "@/lib/domain/_schema";
import fs from "fs";
import path from "path";

const ASSESSMENTS_DIR = path.join(process.cwd(), "data/shared/assessments");
const HERMES_API = process.env.HERMES_API_SERVER_URL ?? "http://127.0.0.1:8642";
const HERMES_KEY = process.env.API_SERVER_KEY ?? "change-me-local-dev";

function systemPrompt(assessmentId: string, slug: string): string {
  const targetPath = path.join(ASSESSMENTS_DIR, `${slug}.json`);
  return `You are a DSM-5-TR assessment JSON generator.
Generate the assessment JSON, then write it to ${targetPath} by running this exact terminal command:

python3 -c "
import json, pathlib
data = { ... your generated JSON ... }
pathlib.Path('${targetPath}').parent.mkdir(parents=True, exist_ok=True)
json.dump(data, open('${targetPath}', 'w'), indent=2)
"

The JSON must conform to:
- slug: "${slug}" (URL-friendly, lowercase, hyphens)
- title: string
- description: string (max 300 chars)
- version: "1.0.0"
- instructions: string
- resultChart: "severity_bar" | "t_score_gauge" | "domain_bars" | "trend_line" | "none"
- fields: Array<{ id, label, type: "scale"|"text"|"select"|"multi_select"|"boolean", required: true, min?, max?, options?, domain? }>
- scoringRule: { calculation: "total"|"average"|"t_score"|"domain_max", maxScale: number (default 3), severityThresholds: object like {"none":[0,4],"mild":[5,9]}, reverseScoredItems?: string[], requiredFields: string[], t_score?: boolean, tScoreLookup?: object, diagnosticThreshold?: number }

For scale 0-3: options [{value:0,label:"Not at all"},{value:1,label:"Several days"},{value:2,label:"More than half the days"},{value:3,label:"Nearly every day"}].
For scale 0-4: options [{value:0,label:"None/Not at all"},{value:1,label:"Slight/Rare"},{value:2,label:"Mild/Several days"},{value:3,label:"Moderate/More than half"},{value:4,label:"Severe/Nearly every day"}].
For scale 1-5: options [{value:1,label:"Never"},{value:2,label:"Rarely"},{value:3,label:"Sometimes"},{value:4,label:"Often"},{value:5,label:"Always"}].
For domain_bars: add domain string to each field.
For severity_bar: severityThresholds MUST be an object mapping severity labels to [min,max] tuples, e.g. {"none":[0,4],"mild":[5,9],"moderate":[10,14]} — NEVER an array.
For t_score_gauge: provide tScoreLookup.
For t_score: set t_score:true.

After writing the file, reply "DONE" — nothing else.`;
}

async function callHermesAgent(assessmentId: string, prompt: string, slug: string): Promise<string> {
  const targetPath = path.join(ASSESSMENTS_DIR, `${slug}.json`);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;

  const instructions = systemPrompt(assessmentId, slug);

  // Step 1: Create run
  const runRes = await fetch(`${HERMES_API}/v1/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input: `/goal ${prompt}\n\nGenerate the assessment JSON and write it to ${targetPath} using a python3 -c terminal command. Then reply "DONE".`,
      instructions,
    }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Hermes API error (create run): ${runRes.status} - ${err.slice(0, 200)}`);
  }

  const { run_id } = await runRes.json();
  if (!run_id) throw new Error("No run_id returned");

  // Step 2: Poll until completed (max 15 minutes)
  const deadline = Date.now() + 900_000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${HERMES_API}/v1/runs/${run_id}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!statusRes.ok) continue;
    const data = await statusRes.json();
    if (data.status !== lastStatus) {
      console.log(`[hermes] run ${run_id}: ${data.status}`);
      lastStatus = data.status;
    }
    if (data.status === "completed") {
      return data.output as string;
    }
    if (data.status === "failed" || data.status === "error") {
      throw new Error(`Hermes run failed: ${data.error || data.status}`);
    }
  }

  throw new Error("Hermes run timed out after 15 minutes");
}

export async function POST(request: Request) {
  try {
    const { assessmentId, prompt, slug } = await request.json();

    const fileSlug = slug || assessmentId;
    console.log(`[assessments/generate] Generating assessment ${assessmentId} (slug: ${fileSlug}) with prompt: ${prompt.slice(0, 100)}...`);

    if (!assessmentId || !prompt) {
      console.error("[assessments/generate] Missing assessmentId or prompt");
      return Response.json({ error: "assessmentId and prompt are required" }, { status: 400 });
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]?$/i.test(assessmentId)) {
      console.error("[assessments/generate] Invalid assessment ID");
      return Response.json({ error: "Invalid assessment ID" }, { status: 400 });
    }

    const targetPath = path.join(ASSESSMENTS_DIR, `${fileSlug}.json`);

    // Remove existing file so we can detect if agent wrote a new one
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      console.log(`[assessments/generate] Removed existing ${targetPath}`);
    }

    try {
      await callHermesAgent(assessmentId, prompt, fileSlug);
    } catch (err) {
      return Response.json({
        error: `Hermes API call failed: ${String(err)}. Is hermes gateway running at ${HERMES_API}?`,
      }, { status: 502 });
    }

    // Verify the agent wrote the file
    if (!fs.existsSync(targetPath)) {
      return Response.json({
        error: `Agent completed but did not write ${targetPath}`,
      }, { status: 422 });
    }

    // Read and validate the written file
    const raw = fs.readFileSync(targetPath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Agent wrote invalid JSON", raw: raw.slice(0, 500) }, { status: 422 });
    }

    const result = measureSchema.safeParse(parsed);
    if (!result.success) {
      console.error("[assessments/generate] Schema validation failed", result.error.issues);
      return Response.json({
        error: "Schema validation failed",
        issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      }, { status: 422 });
    }

    const validated = result.data;
    validated.slug = fileSlug;
    fs.writeFileSync(targetPath, JSON.stringify(validated, null, 2), "utf-8");

    return Response.json({ success: true, assessmentId, slug: fileSlug, path: targetPath });
  } catch (error) {
    console.error("[assessments/generate]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}