# Hermes API Server Integration

## Enabling the gateway

The Hermes API server runs separately from the dashboard. Start with the **project's** `.hermes/` config (not global `~/.hermes/`) so the gateway uses the project-scoped model configuration (provider + model, e.g. `deepseek/deepseek-v4-pro`). The app never calls OpenRouter (or any model provider) directly — all requests go through the gateway at `:8642`:

```bash
# Manual:
HERMES_HOME=<project>/.hermes API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway

# Or via Makefile:
make hermes-gateway           # starts gateway, kills existing on port 8642
make hermes-gateway-curl-test # POST /v1/runs, prints run_id + status
```

> **CRITICAL:** `HERMES_HOME` must point to the project's `.hermes/` directory. Without it, the gateway inherits global `~/.hermes/config.yaml` which defaults to a local GGUF model on port 8080 (not running) — all runs will fail with `Connection error`.

The `API_SERVER_KEY` must be added to Next.js `.env`:
```
API_SERVER_KEY=change-me-local-dev
```

Output: `[API Server] API server listening on http://127.0.0.1:8642`

### Gateway warnings you can ignore

- `Auxiliary Nous client unavailable: no Nous authentication` — non-critical; the auxiliary client is a separate service
- Background agent connection errors to `127.0.0.1:8080` — only appears when using global config; fixed by setting `HERMES_HOME` to project `.hermes/`

## Agent tool availability (API mode)

When triggered via `/v1/runs`, the agent has a **subset** of tools. Specifically:
- ✅ `terminal` — available; use Python one-liners to write files
- ❌ `write_file` — NOT available in API mode
- ❌ `patch`, `read_file`, `search_files` — NOT available in API mode

**Pattern for file output:** instruct the agent to use `terminal` with a Python script:
```
python3 -c "
import json, pathlib
data = { ... your generated JSON ... }
pathlib.Path('data/shared/assessments/slug.json').parent.mkdir(parents=True, exist_ok=True)
json.dump(data, open('data/shared/assessments/slug.json', 'w'), indent=2)
"
```

Route handler (`app/api/assessments/generate/route.ts`) reads back the file, validates against `measureSchema`, and returns the result. Do NOT try to extract JSON from the agent's output — the agent writes the file, the route reads and validates it.

## Schema validation pitfalls

The agent frequently gets these wrong. Explicitly constrain these in the `instructions`:

### severityThresholds — object, NOT array

`scoringRuleSchema` defines it as `z.record(z.string(), z.tuple([z.number(), z.number()]))` — an object mapping severity labels to `[min, max]` tuples. The agent will default to an array.

**Prompt fix:**
```
severityThresholds MUST be an object mapping severity labels to [min,max] tuples,
e.g. {"none":[0,4],"mild":[5,9],"moderate":[10,14]} — NEVER an array.
```

**Expected shape:** `{"none": [0, 4], "mild": [5, 9], "moderate": [10, 14], "moderately_severe": [15, 19], "severe": [20, 27]}`
**Wrong (agent default):** `[{label: "none", min: 0, max: 4}, ...]`

### Other common schema issues

- **`calculation`** must be one of: `"total" | "average" | "t_score" | "domain_max"` (not "sum", "mean")
- **`maxScale`** must be an integer 1–10, defaults to 3
- **`resultChart`** must be one of: `"severity_bar" | "t_score_gauge" | "domain_bars" | "trend_line" | "none"`
- **`tScoreLookup`** when present must be `Record<number, number>` (raw→T mapping), not an array
- **Field `type`** must be one of: `"scale" | "text" | "select" | "multi_select" | "boolean"`
- **Field `options`** must be `Array<{value: number, label: string}>` when present

## API endpoints
## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/runs` | Create a run, returns `{ run_id, status: "started" }` |
| GET | `/v1/runs/{run_id}` | Get run status, returns `{ run_id, status: "completed", output: "..." }` |
| GET | `/v1/runs/{run_id}/events` | SSE stream of progress events |
| GET | `/health` | Health check `{ status: "ok" }` |

## Next.js integration pattern

Do NOT use WebSocket. Use SSE or polling:

```ts
// Step 1: Create run
const res = await fetch("http://127.0.0.1:8642/v1/runs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_SERVER_KEY}`,
  },
  body: JSON.stringify({
    input: "/goal Your prompt here",
    instructions: "System-level instructions",
  }),
  signal: AbortSignal.timeout(300_000),
});
const { run_id } = await res.json();

# Step 2: Poll until completed (max 15 minutes)
const deadline = Date.now() + 900_000;  // 15 minutes for complex prompts
let lastStatus = "";
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 3000));  // poll every 3s
  const status = await fetch(`http://127.0.0.1:8642/v1/runs/${run_id}`, {
    headers: { Authorization: `Bearer ${API_SERVER_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!status.ok) continue;
  const data = await status.json();
  if (data.status !== lastStatus) {
    console.log(`[hermes] run ${run_id}: ${data.status}`);
    lastStatus = data.status;
  }
  if (data.status === "completed" && data.output) {
    return data.output; // Final result
  }
  if (data.status === "failed" || data.status === "error") {
    throw new Error(`Hermes run failed: ${data.error || data.status}`);
  }
}
throw new Error("Hermes run timed out after 15 minutes");
```

## Auth

- Header: `Authorization: Bearer <API_SERVER_KEY>`
- The POST to `v1/runs` and GET to `v1/runs/{id}` both require auth
- Key in `.env`: `API_SERVER_KEY=change-me-local-dev`
- Next.js route reads: `process.env.API_SERVER_KEY`