import { saveClinicalFileWithBackup } from "@/lib/actions/clinical-files";

const HERMES_API = process.env.HERMES_API_SERVER_URL ?? "http://127.0.0.1:8642";
const HERMES_KEY = process.env.API_SERVER_KEY ?? "change-me-local-dev";

const FILES: Record<string, string> = {
  "care-plan": "care-plan.md",
  "clinical-summary": "clinical-summary.md",
  "clinical-background": "clinical-background.md",
};

interface ClinicalGenerateRequest {
  patientId: string;
  fileType: "clinical-summary" | "clinical-background" | "care-plan";
  prompt: string;
}

function systemPrompt(fileType: string, filename: string): string {
  const descriptors: Record<string, string> = {
    "care-plan": "a structured clinical care plan",
    "clinical-summary": "a narrative clinical summary synthesizing recent assessment results",
    "clinical-background": "a structured clinical history and background",
  };
  const descriptor = descriptors[fileType] ?? "clinical markdown content";

  return `You are a clinical documentation assistant for a mental health practitioner.
Generate ${descriptor}.

STRICT OUTPUT RULES — VIOLATING ANY OF THESE IS UNACCEPTABLE:
1. Start the very first line with "## " — a level-2 markdown heading. No exceptions.
2. Do NOT write a single word before the first "## " heading.
3. Do NOT mention any file name, file path, or where content is written.
4. Do NOT write "Here is", "I've generated", "The following", or any meta-commentary.
5. Do NOT describe the structure or say "sections include".
6. Your ENTIRE output must be valid clinical markdown only — nothing else.

Use ONLY these markdown elements:
- ## or ### headings
- Plain paragraphs
- Bullet lists with "- " prefix
- Numbered lists with "1. " prefix
- **bold** text
- --- horizontal rules

NO: HTML, tables, code blocks, blockquotes, special Unicode, em dashes, smart quotes.
Use plain ASCII dashes (-) and straight quotes (") only.

Output the clinical content directly — first character must be "#".`;
}

async function callHermesAgent(prompt: string, fileType: string, filename: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;

  const instructions = systemPrompt(fileType, filename);

  // Step 1: Create run
  const runRes = await fetch(`${HERMES_API}/v1/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input: prompt,
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

  // Step 2: Poll until completed (max 5 minutes for markdown gen)
  const deadline = Date.now() + 300_000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`${HERMES_API}/v1/runs/${run_id}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!statusRes.ok) continue;
    const data = await statusRes.json();
    if (data.status !== lastStatus) {
      console.log(`[clinical/generate] run ${run_id}: ${data.status}`);
      lastStatus = data.status;
    }
    if (data.status === "completed") {
      return data.output as string;
    }
    if (data.status === "failed" || data.status === "error") {
      throw new Error(`Hermes run failed: ${data.error || data.status}`);
    }
  }

  throw new Error("Hermes run timed out after 5 minutes");
}

export async function POST(request: Request) {
  try {
    const { patientId, fileType, prompt } =
      (await request.json()) as ClinicalGenerateRequest;

    if (!patientId || !fileType || !prompt) {
      return Response.json(
        { error: "patientId, fileType, and prompt are required" },
        { status: 400 }
      );
    }

    if (!["clinical-summary", "clinical-background", "care-plan"].includes(fileType)) {
      return Response.json({ error: "Invalid fileType" }, { status: 400 });
    }

    // Validate patientId (no path traversal)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(patientId)) {
      return Response.json({ error: "Invalid patientId" }, { status: 400 });
    }

    const filename = FILES[fileType];
    console.log(
      `[clinical/generate] Generating ${fileType} → ${filename} for ${patientId}`
    );

    let markdown: string;
    try {
      markdown = await callHermesAgent(prompt, fileType, filename);
    } catch (err) {
      return Response.json(
        {
          error: `Hermes API call failed: ${String(err)}. Is hermes gateway running at ${HERMES_API}?`,
        },
        { status: 502 }
      );
    }

    if (!markdown || markdown.trim().length === 0) {
      return Response.json(
        { error: "Agent returned empty content" },
        { status: 422 }
      );
    }

    // Strip any leading/trailing code fences or noise the model might add
    let cleaned = markdown.trim();
    if (cleaned.startsWith("```markdown")) cleaned = cleaned.slice("```markdown".length).trim();
    if (cleaned.startsWith("```md")) cleaned = cleaned.slice("```md".length).trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3).trim();
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3).trim();

    // Strip preamble lines that mention files, paths, or meta-commentary.
    // The model sometimes still outputs "Written to..." or describes structure.
    const lines = cleaned.split("\n");
    const contentStart = lines.findIndex(
      (line) => line.startsWith("## ") || line.startsWith("# ")
    );
    if (contentStart > 0) {
      cleaned = lines.slice(contentStart).join("\n").trim();
    }

    // Remove lines that are pure meta-commentary (no markdown value)
    const filtered = lines.slice(contentStart > 0 ? contentStart : 0).filter(
      (line) => {
        const t = line.trim().toLowerCase();
        if (t.startsWith("written to ") || t.startsWith("saved to ")) return false;
        if (t.startsWith("care plan written") || t.startsWith("clinical summary written") || t.startsWith("clinical background written")) return false;
        if (t.startsWith("i've ") || t.startsWith("here is ") || t.startsWith("the following")) return false;
        if (t === "---" && (t.length === line.trim().length)) return true; // keep hr
        return true;
      }
    );
    cleaned = filtered.join("\n").trim();

    // Save to disk — backs up existing file to version/<type>-{ts}.md
    const result = await saveClinicalFileWithBackup(patientId, fileType, cleaned);
    if (!result.success) {
      return Response.json(
        { error: `Failed to save: ${result.error}` },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      fileType,
      filename,
      patientId,
      backedUp: result.backedUp,
      content: cleaned,
    });
  } catch (error) {
    console.error("[clinical/generate]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}