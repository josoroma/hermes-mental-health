# Create With AI — Hermes Agent API Generation

The "Create With AI" feature generates custom DSM-5-TR assessment templates and clinical markdown via the **local Hermes Agent API** (`:8642`).

## Architecture

**HTTP POST** via Hermes Agent API (`/v1/runs` create + poll pattern).

```
Client → POST /api/assessments/generate (or /api/clinical/generate)
       → Hermes Agent API (http://127.0.0.1:8642/v1/runs)
       → create run → poll SSE until completed → validate → save to disk
```

## API Routes

### `app/api/assessments/generate/route.ts` — Assessment JSON generation

For generating DSM-5-TR measure templates (Zod-validated JSON written to `data/shared/assessments/`).

```ts
POST { assessmentId: string, prompt: string, slug?: string }
→ { success: true, assessmentId, slug, path }
```

### `app/api/clinical/generate/route.ts` — Clinical markdown generation

For generating clinical documentation (care plans, summaries, backgrounds) as Markdown written to patient directories.

```ts
POST { patientId: string, fileType: "care-plan"|"clinical-summary"|"clinical-background", prompt: string }
→ { success: true, fileType, patientId, content: string }
```

### Hermes Agent API call pattern (shared by both routes):

1. `POST {HERMES_API}/v1/runs` with `{ input, instructions }` — returns `{ run_id }`
2. Poll `GET {HERMES_API}/v1/runs/{run_id}` every 2-3s until `status: "completed"` or `"failed"`
3. On completed: `data.output` is the agent's final response
4. Validate + clean (strip code fences, etc.) + save to disk via server action

Auth: `Authorization: Bearer ${API_SERVER_KEY}` header.
Env vars: `HERMES_API_SERVER_URL` (default `http://127.0.0.1:8642`), `API_SERVER_KEY` (default `change-me-local-dev`).

### Assessment generate specifics:
- System prompt instructs agent to write JSON to `data/shared/assessments/<slug>.json` via `python3 -c`
- Validates against `measureSchema` (Zod) after agent writes
- Assessment generate timeout: 15 minutes
- Clinical generate timeout: 5 minutes

### Clinical generate specifics:
- System prompt instructs agent to return raw Markdown for the specific target file (e.g. `care-plan.md`)
- Strips any accidental ``` fences from agent output
- Saves via `saveClinicalFileWithBackup()` server action:
  - If file **doesn't exist** → creates it fresh under `data/patients/<id>/<fileType>.md`
  - If file **exists** → copies old to `data/patients/<id>/version/<fileType>-{yyyy-mm-dd-hh-mm-ss}.md`, then overwrites
- API response includes `filename` and `backedUp` (version filename or `null`)
- Client (`EditableMarkdownCard`) re-reads the file on success and shows backup filename in toast

## Client: `app/(dashboard)/_components/create-with-ai.tsx`

- `fetch("/api/assessments/generate", { method: "POST" })`
- Shows `Loader2` spinner during generation
- Displays generated JSON in `<pre>` with success toast
- Error states: connection failure, LLM errors, schema validation with issue list
- Badges: "API: Hermes Agent"

## AI Generate buttons on patient profile

`EditableMarkdownCard` (`editable-markdown-card.tsx`) renders an emerald "AI Generate" button (Sparkles icon) whenever the `hint` prop is set. The button reuses the **same `hint` string** already displayed by the green `HermesPromptHint` — no duplicated prompt data.

All three patient profile cards have hints set:
- **Care Plan** — `hintAgent="care-plan"`
- **Clinical Summary** — `hintAgent="assessment-review"`
- **Clinical Background** — `hintAgent="patient-intake"`

On click: `fetch("/api/clinical/generate", { body: { patientId, fileType, prompt: hint } })` → saves to file → re-reads + displays.

## Environment

Requires Hermes Agent API server running at `HERMES_API_SERVER_URL` (default `:8642`).
Start with: `API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway`.
Model is controlled by the Hermes Agent profile, not by the Next.js app.
