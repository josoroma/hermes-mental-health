# AGENTS.md — Hermes Mental Health (Practitioner Web App)

Operational instructions for any AI agent or developer working in this repository.
This is the **canonical** context file; `CLAUDE.md`, `.cursorrules`, and `.hermes.md` point here.

For the full product/domain background see [`README-MENTAL-HEALTH-PY.md`](./README-MENTAL-HEALTH-PY.md).
For the feature-by-feature plan (epics, user stories, tasks) see [`SPECS.md`](./SPECS.md).

---

## What this project is

A Next.js re-implementation of the **practitioner-facing** part (Parts 1–6) of
[`josoroma/hermes-mental-health-mvp`](https://github.com/josoroma/hermes-mental-health-mvp):
a DSM-5-TR assessment-management app — Dashboard, Patient Profile, Assessment Invites, patient-facing
assessment forms, Results/scoring, and an Assessment Editor.

The app runs against a local data layer (seed data + `localStorage`). The original `.hermes` agentic
runtime and the Python/FastAPI back end (Part 7) are **replaced** by Next.js API routes + server actions
+ `.hermes/` configuration loaded by the Hermes dashboard at `http://127.0.0.1:9120`. 
Its **one external integration**
is the **Hermes agent**: the "Create With AI" feature talks to it over a **WebSocket** to generate shared
assessment JSON (see Environment variables + rule #4). The agent itself is external — we only call it.

---

## Tech stack (do not substitute without asking)

| Layer | Tech |
| --- | --- |
| Framework | Next.js (App Router, TypeScript, strict) |
| UI | shadcn/ui |
| Theme | shadcn **"luma"** preset — `https://ui.shadcn.com/create?preset=b2D0wqNxT`, **dark mode only** |
| Styling | Tailwind CSS (driven by luma tokens) |
| State | **Jotai** (atomic client state) |
| Forms | **React Hook Form** |
| Validation | **Zod** (single source → inferred TS types + RHF resolver + template validation) |
| Resolver | `@hookform/resolvers` |
| Charts | **shadcn Chart** (Recharts) — all graphs; no hand-rolled SVG |
| Toasts | `sonner` |
| AI integration | **Hermes agent** over **WebSocket** (Create With AI → `data/shared/assessments/*.json`) |
| Data pipeline | Python scripts (`scripts/corpus/`) — Markdown corpus → JSON templates |

> **Dark mode only.** `<html class="dark">` is unconditional in `app/layout.tsx`; `color-scheme: dark`.
> There is **no** `next-themes`, no light tokens path, and **no theme toggle** anywhere in the UI.

---

## Commands

```bash
npm install           # install dependencies
npm run dev           # dev server  → http://localhost:3000
npm run build         # production build
npm run start         # serve production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit (must pass before commit)
npm test              # unit tests (scoring engine, schema validation)

# Adding shadcn components
npx shadcn@latest add <component>

# DSM-5-TR data pipeline (offline; produces data/shared/templates/)
npm run corpus        # generate templates from Markdown corpus → build index
```

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `HERMES_ASSESSMENT_AI_URL` | `http://127.0.0.1:9120/api/ws` | Hermes agent WebSocket endpoint for "Create With AI" |
| `HERMES_ASSESSMENT_AI_MODEL` | `deepseek/deepseek-v4-pro` | Model the agent uses to generate assessment JSON |

**Always run `npm run typecheck` and `npm run lint` before considering a task done.**

> The **Hermes dashboard** at `http://127.0.0.1:9120` loads `.hermes/` config (hooks, agents,
> commands, plugins, skills, bundles) and exposes the WebSocket API at `/api/ws`. Start it with
> `make hermes-dashboard`. Part 7's Python/FastAPI server is replaced by Next.js API routes and
> server actions — no external Python service needed.

---

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| Next.js dev/prod | `3000` | `http://localhost:3000` |
| Hermes dashboard | `9120` | `http://127.0.0.1:9120` — serves Web UI + WebSocket API (`/api/ws`), loads `.hermes/` config |
| Invite link shape | n/a | Patient-facing route is `/a/<32-char-token>` |

The original FastAPI form server (`127.0.0.1:9130`) is **replaced** by Next.js API routes — references
to it in the source are historical; reproduce only the `/a/<token>` URL shape.

---

## Architecture notes

App Router, server-component-first. Route-private modules use the underscore convention.

```
app/
├── (dashboard)/page.tsx              # Part 1 — Dashboard (+ Create With AI dialog)
├── patients/[id]/                    # Part 2 — Profile; Part 3 invites; Part 5 result detail
├── a/[token]/                        # Part 4 — patient-facing assessment form
├── editor/[slug]/                    # Part 6 — Assessment Editor
└── api/assessments/generate/route.ts # validate + persist Hermes-agent JSON → data/shared/assessments/
components/ui/                         # shadcn/ui (luma dark)
lib/
├── domain/    # _schema.ts, _enums.ts        Zod entities + inferred types
├── ai/        # hermes-client.ts (WebSocket), _env.ts   Create With AI
├── data/      # measures.ts (templates + shared assessments), patients.ts, _repository.ts
├── scoring/   # engine.ts                    total/avg/T-score/severity/data-quality
├── invites/   # token.ts                     32-char URL-safe token
├── scope/     # _atoms.ts, guard.ts, validate.ts
└── state/     # _atoms.ts

scripts/corpus/                        # offline data pipeline (npm run corpus)
└── generate-templates.py · build-index.py

data/
├── corpus/assessment-measures/        # *.md (68 verified corpus files)
└── shared/templates/                  # json/<slug>.json · index.json (generated)
```

**Data pipeline (E3).** Assessment definitions are **generated**, not hand-written: download the
68 verified Markdown corpus files in `data/corpus/assessment-measures/*.md` and generate
schema-conformant `Measure` templates into `data/shared/templates/json/`. Each template carries Each template carries
**instructions** (shown to the patient before the form), **scoring rules**, and a **`resultChart`** type
telling the results view which visualization to render. The app loads measures from these templates;
every template must validate against the `Measure` Zod schema.

Domain entities: **Patient, Measure, MeasureField, ScoringRule, Invite, Result**.
- Field types: `scale | text | select | multi_select | boolean`.
- Severity bands: `none | mild | moderate | moderately_severe | severe | unscorable`
  (green → yellow → orange → dark-orange → red).
- Result charts (`resultChart`): `severity_bar` (PHQ-9, GAD-7) · `t_score_gauge` (PROMIS) ·
  `domain_bars` (Level 1 cross-cutting) · `trend_line` (repeat administrations) · `none` (free-text).

---

## Non-negotiable rules

1. **Patient scope is sacred.** Exactly one patient is active per session
   (`activePatientIdAtom`). All scoped reads go through `assertScoped(patientId)`, which throws
   `PatientScopeError` on mismatch. Never add a code path that reads across patients. This mirrors the
   original `patient-scope-guard.sh`.
2. **Validate every patient id** with `validatePatientId` (no path traversal / illegal chars) at route
   boundaries — mirrors `validate_patient_id`.
3. **Zod is the single source of truth.** Derive TS types via `z.infer`; never hand-write a parallel
   interface. Seed data is validated against schemas at module load.
4. **No PHI leakage.** Synthetic patient data only — no real patient data and no analytics. The **only**
   permitted external call is the **Hermes agent WebSocket** for Create With AI
   (`HERMES_ASSESSMENT_AI_URL`); the template pipeline reads from the local Markdown corpus. Never send
   patient-scoped data to the agent — Create With AI passes only the assessment id + prompt + model.
5. **Dark mode only.** Never add a light theme or a theme toggle. `<html class="dark">` is
   unconditional; style exclusively with luma dark tokens.
6. **Templates are generated.** Don't hand-author measure definitions — they come from the corpus
   pipeline (`npm run corpus`) and must validate against the `Measure` schema. Verify template coverage (68 templates from 68 corpus files) before deploying.
7. **Scope discipline.** Build only Parts 1–6. The `.hermes` runtime (hooks, agents, commands, skills)
   lives in `.hermes/` as configuration loaded by the Hermes dashboard; server-side logic uses Next.js
   API routes and server actions — no external Python package or FastAPI server.

---

## Coding conventions

- **TypeScript strict**; path alias `@/*`.
- **Route-private files:** `_schema.ts`, `_actions.ts`, `_atoms.ts`, `_components/`.
- **Jotai atoms** live in `_atoms.ts`; **Zod schemas** in `_schema.ts`.
- **Forms:** always `useForm({ resolver: zodResolver(schema) })`; surface errors via shadcn
  `<FormMessage>`. Dynamic assessment forms build their schema via `buildAnswerSchema(measure)`.
- **Server Components by default**; add `"use client"` only where state/interactivity requires it.
- Use the **luma** tokens — never hardcode hex colors; severity bands map to luma chart tokens.
- **Charts:** always use the shadcn `Chart` primitives over **Recharts** (`ChartContainer`,
  `ChartConfig`, `ChartTooltip`, `BarChart`/`LineChart`/`RadialBarChart`, `ReferenceLine`). Never
  hand-roll SVG/div charts. Color via `ChartConfig` referencing luma `--chart-1..5` / severity tokens.
- Naming: `kebab-case` files, `PascalCase` components, `camelCase` functions/atoms.
- Keep new code consistent with surrounding style (comment density, idiom).
- Match existing patterns before inventing new ones; reuse `lib/` helpers.

---

## Testing expectations

- Unit-test the **scoring engine** (totals, reverse scoring, severity thresholds, PROMIS T-score,
  `unscorable` data-quality) and **schema validation** (seed integrity, dynamic answer schema).
- A change to scoring or domain schemas must include/adjust tests.
- Manual check: invite → take assessment at `/a/<token>` → result appears scoped to the patient.
