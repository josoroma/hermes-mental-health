const HERMES_API = process.env.HERMES_API_SERVER_URL ?? "http://127.0.0.1:8642";
const HERMES_KEY = process.env.API_SERVER_KEY ?? "change-me-local-dev";

async function runHermesGoal(input: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;

  const runRes = await fetch(`${HERMES_API}/v1/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Hermes API error (create run): ${runRes.status} - ${err.slice(0, 200)}`);
  }

  const { run_id } = await runRes.json();
  if (!run_id) throw new Error("No run_id returned");

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
      console.log(`[agent/run] run ${run_id}: ${data.status}`);
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
    const { input } = await request.json();

    if (!input || typeof input !== "string") {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    console.log(`[agent/run] Running: ${input.slice(0, 150)}...`);

    const output = await runHermesGoal(input);

    return Response.json({ success: true, output });
  } catch (error) {
    console.error("[agent/run]", error);
    return Response.json(
      { error: `Agent run failed: ${String(error)}. Is hermes gateway running at ${HERMES_API}?` },
      { status: 502 }
    );
  }
}