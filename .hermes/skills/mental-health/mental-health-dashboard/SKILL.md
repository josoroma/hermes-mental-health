---
name: mental-health-dashboard
description: Practitioner dashboard — patient list, assessment library, Create With AI dialog, navigation bar.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, dashboard, ui]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-patient-summary
      - nextjs-patterns
---

# Mental Health Dashboard

## When to use

Use when working with the practitioner dashboard UI or when the practitioner asks about:
- The patient summary table
- The available assessments library
- The Create With AI feature
- Navigation structure

## Dashboard components
### Patient table

- Lists patients with name, age range, clinical context, and consent status
- Clicking a row sets the active patient and routes to `/patients/[id]`
- **New patients** come from `data/patients/<id>/profile.json` files (see below)
- **Pagination** — client-side pagination with page size selector (1, 5, 10, 15, 20, 25, 50, 100). Default page size is 10. Shows "X–Y of Z" count with prev/next buttons. Uses `useMemo` to slice the patients array. Page resets to 1 when page size changes.

### Create Patient

A "+" button on the dashboard opens a dialog to add new patients. Implementation:

- **Server action** — `lib/actions/create-patient.ts` (marked `"use server"`):
  - Accepts `FormData` with `name`, `ageRange`, `gender`, `clinicalBackground`
  - Generates a patient ID from the name: `sanitized-name-<timestamp36>`
  - Validates against `patientSchema` via Zod
  - Writes `data/patients/<id>/profile.json` (creates directory if needed)
  - Returns `{ success, patient }` or `{ success: false, error }`

- **Dialog component** — `app/(dashboard)/_components/create-patient-dialog.tsx`:
  - Client component using `useActionState` or plain `useState` + `createPatient()` call
  - Form fields: Name (required), Age Range, Gender, Clinical Background (textarea)
  - On success: closes dialog, shows toast, optionally navigates to new patient

- **Filesystem scan** — `listAllPatients()` in `lib/data/patients-server.ts` (server-only):\n  - Reads `data/patients/` directory for `*/profile.json` files\n  - Parses and validates each, merges with `SEED_PATIENTS`\n  - Deduplicates by `id` (seed patients win on collision)\n  - Marked with `\"server-only\"` import to prevent `fs` leaking to client bundle\n  - Client-safe `patients.ts` contains seed data only, no `fs`

- **Dashboard page** — `app/(dashboard)/page.tsx`:
  - Server component that calls `listPatients()` (now includes filesystem patients)
  - Passes merged list to `PatientTable`

### Patient profile page (`/patients/[id]`)

After clicking a patient row, the profile page renders with tabs, clinical summary, and
result detail navigation. Full documentation is in `mental-health-patient-summary`. 
Key entry points from the dashboard:

- `PatientProfile` at `app/patients/[id]/_components/patient-profile.tsx` — uses
  `useHydrateAtoms([[activePatientIdAtom, patientId]])` to set active patient synchronously
  before first render (avoids 0-count flash on badges)
- Badge counts use `suppressHydrationWarning` — localStorage may differ from server seed data
- URL sync for `?tab=` is deferred to `useEffect` to avoid hydration mismatch

### Assessment library

The dashboard shows **two** assessment sections, in this order:
1. **Custom Assessments** — AI-generated or manually created JSON files from `data/shared/assessments/` via `listCustomAssessments()`. Shown FIRST, above Available Assessments.
2. **Available Assessments** — DSM-5-TR templates from `data/shared/templates/json/` via `listMeasures()`.

Each card shows title, description, slug (monospace), field count badge, chart type badge, scoring type badge, and version badge. Links to editor (`/editor/[slug]`).

**Custom assessment cards** (the grid passed `custom` prop) show a delete button on hover (`bottom-2 right-2`, `opacity-0 group-hover/card:opacity-100`). Position at `bottom-2` NOT `top-2` — the card header has an item count badge at top-right that would overlap. Clicking opens a confirmation `Dialog`. On confirm, calls `deleteCustomAssessment(slug)` from `lib/actions/assessment-files.ts` (server action that deletes `data/shared/assessments/<slug>.json`), shows toast, and `router.refresh()`.

Dashboard header shows combined count: `measures.length + customAssessments.length`.

### Agent button (navigates to /agent chat page)

An **Agent** button (Bot icon, emerald) sits in every page header (Dashboard, Editor, Patient, Result Detail). It is a simple `<Link>` with **context-specifying query params** — NOT a modal dialog. Clicking navigates to a **dedicated full-route chat page** at `/agent` where users type messages directly (no select options, no prompt picker).

**Link hrefs with query params:**
```tsx
// Dashboard
<Link href="/agent?dashboard" ...>Agent</Link>

// Patient profile
<Link href={`/agent?profile&patientId=${patientId}`} ...>Agent</Link>

// Editor
<Link href={`/agent?editor&slug=${slug}`} ...>Agent</Link>

// Result detail
<Link href={`/agent?result&patientId=${result.patientId}&resultId=${result.resultId}`} ...>Agent</Link>
```

The query params tell the chat page's back button where to navigate (resolved via `useSearchParams` in the chat component).

**Patient sub-page Agent links** are dynamic via `usePathname()` in `PatientHeader`:
- `/patients/<id>/assessments` → `?assessments&patientId=<id>`
- `/patients/<id>/results` → `?results&patientId=<id>`
- `/patients/<id>/sessions` → `?sessions&patientId=<id>`
- `/patients/<id>/notes` → `?notes&patientId=<id>`
- `/patients/<id>` (profile) → `?profile&patientId=<id>`

Nested routes like `/patients/<id>/results/<resultId>` are handled by `pathname.includes("/results/")`.

**Link styling** (same className used in all pages):
```tsx
className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
```

**The /agent page (`app/agent/page.tsx`)** is a full chat interface with:
- Chat bubbles (user/assistant) with markdown rendering
- Loading/error states
- Context-aware filesystem tree sidebar (see `mental-health-development` skill)
- POST to `/api/agent/chat` which wraps the Hermes gateway run API
- No select options — just type and send
- Semantic UI labels: `ui-content-page-agent-chat`, `ui-header-agent-chat`, `ui-content-section-agent-sidebar`, `ui-content-section-agent-messages`, `ui-content-card-agent-empty/loading/error`, `ui-bottom-agent-input` — all visible when "UI Labels" checkbox is toggled

The old prompt catalog (`lib/prompts.ts`) and `AGENT_SKILLS` mapping still exist in the codebase but are not wired to any UI button.

**The /agent page quick-action buttons** (below the chat input) inject pre-built prompts via `inject*Prompt` functions in `app/agent/_components/agent-chat.tsx`:

| Button | Function | File |
|--------|----------|------|
| Safety Check | `injectSafetyPrompt` | `agent-chat.tsx` |
| Care Plan | `injectCarePlanPrompt` | `agent-chat.tsx` |
| Session Note | `injectSessionNotePrompt` | `agent-chat.tsx` |
| Progress Report | `injectProgressReportPrompt` | `agent-chat.tsx` |

When the user says "change the prompt when I click X in the agent chat", edit the `inject*Prompt` function in `agent-chat.tsx` — NOT `lib/prompts.ts`. The `lib/prompts.ts` file feeds the old `AgentModal` dialog (mostly unused) but has NO effect on the `/agent` chat page buttons.

### AI prompt hints on the dashboard

The dashboard page (`app/(dashboard)/page.tsx`) shows collapsible green `HermesPromptHint` components next to section headings (English prompts). Each hint has a close button (X icon) that **collapses the green box** but keeps the trigger button visible so it can be reopened:

- **Patients heading**: compact inline hint — English prompt about reviewing active patients (agent: `assessment-review`)
- **Available Assessments heading**: compact inline hint — English prompt about catalog coverage gaps (agent: `assessment-review`)

These hints are client components (`DashboardPatientsHint`, `DashboardMeasuresHint` from `_components/dashboard-hints.tsx`). The `HermesPromptHint` component itself lives at `components/hermes-prompt-hint.tsx`.

The **Agent button** (above) is a simple `<Link href="/agent">` that navigates to the full chat page — no dropdown, no prompt selection.

### Custom assessment editor

The editor route (`/editor/[slug]`) now supports both template measures and custom assessments:

- Tries `getMeasure(slug)` first (template catalog)
- Falls back to `loadCustomMeasure(slug)` from `lib/data/custom-assessments.ts` (reads `data/shared/assessments/<slug>.json`)
- `MetadataForm` accepts both `slug` and `measure` props — uses the full measure object for custom assessments when template metadata (`getMeasureTitle`/`getMeasureMeta`) returns null
- Fields, Scoring, and Chart tabs use the `measure` prop directly (already supports custom assessments)

### Create With AI (Hermes Gateway API)

Uses the Hermes Gateway API server (`hermes gateway`) at `http://127.0.0.1:8642`:

- Dialog with Assessment ID input (slug) and AI Prompt textarea
- HTTP POST to `/api/assessments/generate` → **Hermes Gateway API** (`POST /v1/runs` + poll `GET /v1/runs/{id}`) → validate → save
- Start with: `make hermes-gateway` (sets `HERMES_HOME` to project `.hermes/`, `API_SERVER_ENABLED=true`)
- The API route sends a `/goal` command as the `input` field, with the schema spec as `instructions`
- Agent writes assessment JSON directly to `data/shared/assessments/<slug>.json` via `terminal` Python one-liner (API-mode agent does NOT have `write_file` tool)
- Route handler reads back the file, validates against `measureSchema`, fixes slug, rewrites clean copy
- Runs have 300s create timeout, 900s poll deadline, 3s poll interval
- Custom assessments NEVER touch `data/shared/templates/index.json` — filesystem-only from `data/shared/assessments/`
- **Never sends patient-scoped data to the LLM**
- Error messages include clear "Hermes gateway not running" guidance
- Test with: `make hermes-gateway-curl-test`
- Full docs: `README-CREATE-WITH-AI.md`

### Navigation bar
- Sticky top bar with Dashboard, active patient indicator, GitHub link
- Dark mode only — no theme toggle
- Glass/blur header styled with luma dark tokens

## Underlying tech

- Next.js App Router (server components by default)
- Jotai atoms for active patient + UI state
- shadcn/ui Table, Card, Dialog, Badge components
- Dark mode only: `<html class="dark">` is unconditional
- MDX Editor for clinical markdown editing

## References

- `references/nextjs-pitfalls.md` — Jotai hydration, SSR boundaries, MDX Editor dark theme, fs isolation


## Pitfalls

### Agent chat button prompts live in agent-chat.tsx, not lib/prompts.ts

When the user asks to change a prompt triggered by a quick-action button in the `/agent` chat page (Care Plan, Session Note, Safety Check, Progress Report), the prompt text lives in `app/agent/_components/agent-chat.tsx` as `inject*Prompt` functions. Do NOT edit `lib/prompts.ts` — that file feeds the old modal dialog and is not wired to the chat page. Editing it has zero effect on the agent chat buttons.

```tsx
// ✅ RIGHT — edit the inject*Prompt function in agent-chat.tsx
const injectCarePlanPrompt = () => {
    setInput(`Audit the existing care plans...`);
};

// ❌ WRONG — lib/prompts.ts has no effect on the /agent chat page
```

### HermesPromptHint close button (do NOT hide trigger)
When adding a close button to the green `HermesPromptHint` box, the X button should ONLY collapse the green box (`setExpanded(false)`) — NEVER dismiss the entire component or hide the trigger button. The trigger must stay visible so the user can re-expand the box. Do NOT use a `dismissed` state that makes the component return `null` — just toggle `expanded`.

### Agent chat quick-inject prompts live in agent-chat.tsx, NOT lib/prompts.ts

The `lib/prompts.ts` file and `AGENT_SKILLS` mapping are ONLY used by the legacy `AgentModal` dialog. The `/agent` chat page has its own hardcoded `inject*Prompt()` functions in `app/agent/_components/agent-chat.tsx`. When updating the "Care Plan", "Session Note", "Progress Report", or "Safety Check" buttons, edit the corresponding function in `agent-chat.tsx` — do NOT edit `lib/prompts.ts` or `agent-modal.tsx`.

Prompt format preference: AUDIT pattern (evaluate existing content against patient data, return score/strengths/gaps/revisions) — not GENERATE pattern (draft new content from scratch). Use "Audit" verb, not "Review". Include specific output structure: quality score, strengths, clinical gaps, measurable-goal issues, missing interventions, safety concerns, recommended revisions.

### Button inside DialogTrigger
Do NOT nest `<Button>` inside `<DialogTrigger asChild>` — both render `<button>`,
causing a hydration error: "In HTML, `<button>` cannot be a descendant of `<button>`."

```tsx
// ❌ WRONG
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// ✅ RIGHT — use onClick on Button directly, no DialogTrigger wrapper
<Button onClick={() => setOpen(true)}>Open</Button>
```

### fs leaking to client bundle
When a shared module (e.g., `lib/data/patients.ts`) imports `fs`, it leaks into client
components that transitively import it. Fix by splitting server-only code into a
separate module:

```
lib/data/patients.ts         ← client-safe (seed data, no fs)
lib/data/patients-server.ts  ← server-only (scans filesystem, imports fs)
```

The server module starts with `"server-only"` (npm package) to enforce the boundary.
Server components (pages) import from `patients-server`; client components stay on
`patients`.

## References

- `references/screenshot-capture.md` — Camera-ready screenshot capture for docs: AppleScript bounds + screencapture -D2 for Edge browser on secondary display, scrolling, multi-screenshot strategy, window management
- `references/screenshot-analysis.md` — Pixel-level UI debugging: OCR + PIL color inspection for detecting active tabs, buttons, and layout when vision analysis fails.
- `references/nextjs-pitfalls.md` — Recurring Next.js + shadcn + Jotai patterns: hydration fixes, Recharts quirks, server-only modules, patient data architecture, inline editing.
- `references/mdx-editor-dark-mode.md` — MDX Editor (`@mdxeditor/editor`) dark mode integration: required global CSS (hashed class selectors, portal popups, combobox trigger buttons), z-index for shadcn Dialog, plugin setup, text visibility gotchas, SSR guard pattern.
- `references/agent-chat-prompts.md` — Agent chat quick-inject button prompts and skills mapping (Care Plan audit, Session Note audit, Progress Report, Safety Check).
- `references/screenshot-capture.md` — macOS screenshot capture workflow: display-level capture with `screencapture -D2`, browser navigation script, multi-section page strategy.
- `references/docs-generation-workflow.md` — Batch screenshot capture, prev/next nav links, logo embedding for docs/*.md pages.