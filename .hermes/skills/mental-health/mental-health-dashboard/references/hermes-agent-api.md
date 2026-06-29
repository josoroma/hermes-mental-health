# Hermes Gateway API Integration for Create With AI

## Architecture

The "Create With AI" feature uses the Hermes Gateway API (started via `make hermes-gateway`).
The agent runs with `openrouter` + `deepseek/deepseek-v4-pro`.

## Starting the gateway

```bash
make hermes-gateway           # starts gateway on :8642, kills existing
make hermes-gateway-curl-test # POST /v1/runs health check
```

> **CRITICAL:** The Makefile target sets `HERMES_HOME` to the project's `.hermes/` directory.
> Without this, the gateway inherits global `~/.hermes/config.yaml` which may point to a
> different provider/model. All runs would fail with `Connection error`.

## API Route: POST /api/assessments/generate

Located at `app/api/assessments/generate/route.ts`.

### Flow

1. **Create run** — `POST http://127.0.0.1:8642/v1/runs`
   ```json
   {
     "input": "/goal <user-prompt>\n\nGenerate the assessment JSON and write it to <path> using a python3 -c terminal command. Then reply \"DONE\".",
     "instructions": "<full Measure schema spec + file write instructions>"
   }
   ```
   Returns: `{ "run_id": "run_...", "status": "started" }`

2. **Poll status** — `GET http://127.0.0.1:8642/v1/runs/{run_id}`
   - Every 3 seconds, up to 900s (15 min) deadline
   - Returns: `{ "status": "completed"|"failed"|"running", "output": "..." }`
   - On `"completed"`, the agent has written the file to `data/shared/assessments/<slug>.json`

3. **Validate file** — Route reads back the file, parses JSON, validates against `measureSchema`
4. **Rewrite + return** — Fixes slug, writes clean copy, returns success

### Timeout handling

- Create run: 300s (`AbortSignal.timeout(300_000)`)
- Poll deadline: 900s (15 minutes)
- Poll interval: 3 seconds
- Poll request timeout: 10s each

## Agent tool availability (API mode)

When triggered via `/v1/runs`, the agent has a SUBSET of tools:
- ✅ `terminal` — available; use Python one-liners to write files
- ❌ `write_file` — NOT available in API mode
- ❌ `patch`, `read_file`, `search_files` — NOT available in API mode

**Pattern:** Route instructs agent to write file via `terminal` + `python3 -c`:
```bash
python3 -c "
import json, pathlib
data = { ... generated JSON ... }
pathlib.Path('data/shared/assessments/slug.json').parent.mkdir(parents=True, exist_ok=True)
json.dump(data, open('data/shared/assessments/slug.json', 'w'), indent=2)
"
```

Agent replies "DONE" — route handler reads back the file, validates, and returns success.
Do NOT try to extract JSON from agent output.

## Schema validation pitfalls

### severityThresholds — object, NOT array

`scoringRuleSchema` defines it as `z.record(z.string(), z.tuple([z.number(), z.number()]))`.
The agent defaults to an array.

**Fixed in prompt:** MUST be `{"none":[0,4],"mild":[5,9],"moderate":[10,14]}` — NEVER an array.

### Other common issues

- `calculation`: `"total"|"average"|"t_score"|"domain_max"` (not "sum", "mean")
- `maxScale`: integer 1–10, default 3
- `resultChart`: `"severity_bar"|"t_score_gauge"|"domain_bars"|"trend_line"|"none"`
- `tScoreLookup`: `Record<number, number>` (object), not array
- Field `type`: `"scale"|"text"|"select"|"multi_select"|"boolean"`
- Field `options`: `Array<{value: number, label: string}>`

## Custom assessments discipline

- Custom assessments go ONLY to `data/shared/assessments/<slug>.json`
- NEVER write to `data/shared/templates/index.json`
- `listCustomAssessments()` reads filesystem only from `data/shared/assessments/`
- `loadMeasure()` (assessment form) checks both `templates/json/` and `assessments/`
- Invite dropdown includes custom assessments via `customSlugs` prop from server page

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HERMES_API_SERVER_URL` | `http://127.0.0.1:8642` | Gateway base URL |
| `API_SERVER_KEY` | `change-me-local-dev` | Bearer token (must match gateway startup) |

## Auth

- Header: `Authorization: Bearer <API_SERVER_KEY>`
- Both `POST /v1/runs` and `GET /v1/runs/{id}` require auth

## Full documentation

See `README-CREATE-WITH-AI.md` for end-to-end setup: architecture diagram, prerequisites,
step-by-step run instructions, troubleshooting table, and file reference.