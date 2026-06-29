---
name: mental-health-patient-summary
description: Patient profile area — clinical summaries, markdown rendering, demographics editing, consent, assessments, results, invites, and file-based persistence. Synthesize assessment history, severity trends, and progress notes into narrative summaries in English.
version: 0.11.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, summary, patient, clinical-narrative, progress, ui, edit-mode, markdown, file-persistence]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-assessment-review
---

# Mental Health Patient Summary

## When to use

Use when the practitioner needs:
- A clinical summary of a patient's current status
- A progress note synthesizing recent assessment results
- To modify or extend the patient profile UI, markdown rendering, inline editing, or navigation
- To work with file-based invites, results, or clinical markdown files

## Architecture: no tabs — separate pages + nav links

The patient area uses **separate sub-pages** navigated via the top `AppNav` bar,
NOT in-page tabs. The old `ProfileTabs` component and `profile-tabs.tsx` have been **deleted**.

```
/patients/[id]              → Profile page (header + Clinical Summary + Clinical Background + Consent)
/patients/[id]/assessments   → Assessments page (CreateInvite + invites list, reads from files)
/patients/[id]/results       → Results page (results list, reads from files via server props)
/patients/[id]/view/<type>   → Read-only markdown view (clinical-summary / clinical-background)
/patients/[id]/edit/<type>   → MDX editor (clinical-summary / clinical-background)
/patients/[id]/results/<rid> → Result detail (reads from file, editable, saves back to file)
```

### Top nav (AppNav)

`components/app-nav.tsx` — when `activePatientIdAtom` is set AND the current pathname
matches the patient, the nav shows:

```
Hermes Mental Health   Profile   Assessments   Results          GitHub
```

- **Dashboard link removed** — the user explicitly asked to remove it.
- **Active state highlighting** — the current page's nav link renders with
  `text-foreground font-medium`; others use `hover:text-foreground transition-colors`.
  Active detection: `pathname === /patients/<id>` (Profile), `pathname.startsWith(/patients/<id>/assessments)`,
  `pathname.startsWith(/patients/<id>/results)`.
- Nav links appear only when `activePatientId` is set AND `pathname` starts with
  `/patients/<activePatientId>` (hidden on Dashboard and editor).
- The patient username badge has been **removed** from the nav.

## Data sources — FILE-BACKED ONLY

**All patient data is file-backed.** JSON and Markdown files on disk are the single source
of truth. localStorage is NOT used for results; it is NOT used for invites; it is NOT used for
any patient-scoped data. The user explicitly rejected dual writes.

- `data/patients/<id>/profile.json` — demographics (name, ageRange, gender, timestamps)
- `data/patients/<id>/consent.json` — consent status + timestamps
- `data/patients/<id>/clinical-summary.md` — editable clinical summary
- `data/patients/<id>/clinical-background.md` — editable clinical background
- `data/patients/<id>/care-plan.md` — editable care plan
- `data/patients/<id>/version/<type>-{yyyy-mm-dd-hh-mm-ss}.md` — versioned backups (created on AI Generate overwrite)
- `data/patients/<id>/invites/<ts>-<tokenPrefix>.json` — invite records (file-backed)
- `data/patients/<id>/results/<yyyy-mm-dd-hh-mm-ss>-<slug>.json` — scored result JSON files (prefixed `taken-`)
- `data/patients/<id>/results-deleted/deleted-<yyyy-mm-dd-hh-mm-ss>-taken-<original-ts>-<slug>.json` — moved deleted results (original filename preserved, `deleted-` prefix added)

### File naming conventions

- **New results:** `taken-yyyy-mm-dd-hh-mm-ss-<slug>.json` (e.g. `taken-2026-06-21-12-00-00-level2-depression-adult.json`)
- **Deleted results:** `deleted-yyyy-mm-dd-hh-mm-ss-<original-filename>` in `results-deleted/` — preserves the original `taken-ts-slug.json` filename, prepends `deleted-<now-ts>-`
  - Example: `deleted-2026-06-21-18-00-00-taken-2026-06-21-12-00-00-level2-depression-adult.json`
  - The `listDeletedResultFiles()` function returns `DeletedResultFile` which includes `filename` and `deletedAt` (parsed from the `deleted-ts-` prefix)

## Patient shared layout (`app/patients/[id]/layout.tsx`)

**All patient sub-pages** (Profile, Assessments, Results, view, edit, result detail) share
a common layout that renders the **patient info header** (gradient-cover with name, age, gender,
patient ID, Edit button) at the top, then the child page content below.

The layout is a server component that:
1. Loads the patient from filesystem via `getPatientById(id)`
2. Renders `PatientLayoutClient` which calls `useHydrateAtoms([[activePatientIdAtom, patientId]])`
   and renders `PatientHeader` + `{children}` inside a `max-w-6xl mx-auto p-6 md:p-8 space-y-8` container

**Child pages do NOT need their own `useHydrateAtoms` or padding wrappers.** The layout provides
both. Child pages should render just their content with no outer padding/max-width div.

```tsx
// app/patients/[id]/layout.tsx
export default async function PatientLayout({ children, params }) {
  const { id } = await params;
  const patient = getPatientById(id);
  if (!patient) return <>{children}</>;
  return <PatientLayoutClient patientId={id} patient={patient}>{children}</PatientLayoutClient>;
}
```

The `PatientHeader` component (`patient-header.tsx`) is a standalone \"use client\" component
extracted from the old `patient-profile.tsx` — it handles demographics loading, inline edit toggling,
and save/cancel. It also includes the **Agent button** (Bot icon, emerald) — see `mental-health-dashboard`
skill for the canonical Agent modal documentation (skill mapping, command format, API route).

This also means the **profile page** (`patient-profile.tsx`) is now simplified — it only renders
Clinical Summary, Clinical Background, and Consent, with **no header and no `useHydrateAtoms`**.

### Layout wrapping: what child pages need to remove

Before the layout existed, each page had its own wrapper:
```tsx
<div className="flex flex-col flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-4">
```

After the layout, child pages should NOT use this wrapper. They render plain content:
```tsx
<>
  <h1 className="text-xl font-semibold tracking-tight">Assessments</h1>
  <AssessmentsSection />
</>
```

The same applies to result-detail, view-page, and all nested routes under `/patients/[id]/`.

The profile page (`patient-profile.tsx`) renders everything inline:

```
Header (gradient-cover, editable inline) — name, age range, gender, patient ID
├── Care Plan (EditableMarkdownCard)
├── Clinical Summary (EditableMarkdownCard)
├── Clinical Background (EditableMarkdownCard)
└── Consent & Dates (ConsentCard — from consent-card.tsx)
```

### Demographics editing (gradient-cover header)

Demographics are edited **inline in the gradient-cover header** in `patient-profile.tsx`.
There is NO separate DemographicsCard. The old `DemographicsCard` component has been removed.

- **Read mode** — shows name as `<h1>`, age range + gender in subtitle, patient ID as monospace.
  Edit button (Pencil) at top-right.
- **Edit mode** — form fields inline: Name (Input), Age Range (Select), Gender (Select),
  Patient ID (read-only monospace), Save/Cancel buttons
- Reads from `data/patients/<id>/profile.json` via `readDemographics()` server action
- Save calls `saveDemographics()` which preserves `id`, `createdAt`, bumps `updatedAt`
- Falls back to `patient` prop (seed data) when no `profile.json` exists

### Consent card

`app/patients/[id]/_components/consent-card.tsx` — standalone component:
- Reads from `data/patients/<id>/consent.json` via `readConsent()` server action
- Falls back to `seedPatient.consentStatus` if no file exists
- Inline edit mode — toggles between read-only badge display and a Select for consent status
- Save calls `saveConsent()`

**Pitfall — consent changes won't appear in the patient list unless `listAllPatients()` overlays `consent.json` from disk.** The seed patients in `lib/data/patients.ts` have hardcoded `consentStatus: "granted"`. When the practitioner changes consent via the profile page, `consent.json` is written to `data/patients/<id>/consent.json`. But if `listAllPatients()` returns the seed patient directly without reading and overlaying the consent file, the dashboard table will still show the old status after reload. The fix: `lib/data/patients-server.ts` uses `overlayConsent()` and `overlayProfile()` helpers that read the JSON files from disk and spread the values onto the seed patient object. Same applies to `profile.json` (demographics changes).

## Assessments page (`/patients/[id]/assessments`)

**FILE-BACKED ONLY.** No localStorage. No Jotai atoms for invite data.

**See `references/assessments-page-design.md` for full layout, per-status controls, and delete behavior.**

Server component (`page.tsx`) validates patient ID, then renders `AssessmentsPageClient`
which hydrates `activePatientIdAtom` and delegates to `AssessmentsSection`.

`AssessmentsSection` (`assessments-section.tsx`):
- Loads invites via `listInviteFiles(patientId)` in `useEffect`, stored in `useState<Invite[] | null>`
- **Only pending invites appear in the main list.** Completed/taken assessments are in a collapsible \"Taken Assessments (N)\" log below. Delete in the assessments page only removes the invite file — results are managed from the Results page.
- `CreateInvite` saves via `saveInviteFile()` server action, triggers `loadData()` callback
- Shows "Loading…" while fetching, "No assessments yet" when empty
- Sorts by `createdAt` descending

**Per-invite controls:**
- **Pending** — "Take" link (ExternalLink, `/a/<token>`, same tab) + "Copy Link" + Trash
- **Completed + has result** — "View Result" link (FileText, links to `/patients/<id>/results/<rid>`) + Trash
- **Completed + no result** — "Orphan" Badge (destructive) next to "Completed" + Trash

**Delete button** (Trash2, destructive) with confirm dialog — different messages per status:
- Pending: "This invite hasn't been completed yet and has no results."
- Completed orphan: "This invite is marked completed but has no result file."
- Completed + result: "Deleting it will also remove the associated assessment result."
- Calls `deleteInviteFile()` and optionally `deleteResultFile()`, then `loadData()` to refresh

### Invite file server actions

`lib/actions/invite-files.ts` (`"use server"`):

```ts
saveInviteFile(patientId, invite) → { success } | { error }
listInviteFiles(patientId) → Invite[]              // sorted by createdAt desc
getInviteByToken(token) → Invite | null            // scans all patients
updateInviteFile(patientId, token, updates) → { success } | { error }
deleteInviteFile(patientId, token) → { success } | { error }
```

## Results page (`/patients/[id]/results`)

**FILE-BACKED ONLY.** No localStorage. No `scopedResultsAtom`. No `resultsAtom`.

Server component (`page.tsx`) calls `listResultFiles(id)` and passes results as props to
`ResultsPageClient`. The client hydrates `activePatientIdAtom` and renders `ResultsSection`.

`ResultsSection` (`results-section.tsx`):
- Receives `results: Result[]` as a prop from the server component — no useEffect loading
- Shows "Loading…" while props are null, "No results yet" when empty
- Merging with localStorage orphan data has been removed — file-only
Delete button on every result with confirm dialog.
  Deleting **moves** the result file to `results-deleted/deleted-<ts>-<slug>.json`
  (renames in-place preserving content) and deletes the associated invite file.
  The \"Deleted Results (N)\" toggle loads from `listDeletedResultFiles()` which reads
  the `results-deleted/` folder — NOT from a JSON log file.
  - "This will permanently delete the result file. Are you sure?"
  - Calls `deleteResultFile()`, then `onDeleted?.()` callback which calls `router.refresh()`

**IMPORTANT:** ResultsSection does NOT load data in useEffect. The `react-hooks/set-state-in-effect`
ESLint rule is enforced. Data must come from server props.

```tsx
// ❌ WRONG — eslint error
useEffect(() => { listResultFiles(patientId).then(setResults); }, [patientId]);

// ✅ RIGHT — server component loads, passes as props
// page.tsx: const results = await listResultFiles(id);
// results-section.tsx: export function ResultsSection({ results }: { results: Result[] }) { ... }
```

## Result detail page (`/patients/[id]/results/[resultId]`)

**FILE-BACKED ONLY.** Server component reads from `data/patients/<id>/results/` via
`readResultFile()`. No localStorage fallback. No `resultsAtom`. No `updateResult`.

- **Server component** (`page.tsx`):
  1. Validates patient ID
  2. Calls `readResultFile(id, resultId)` — scans `results/*.json` for matching `resultId`
  3. Returns 404 if no file found
  4. Resolves `measure` via `getMeasure(result.assessmentSlug)`
  5. Passes `result` + `measure` as props to `ResultDetail`
- **Client component** (`result-detail.tsx`):
  - Uses `useHydrateAtoms([[activePatientIdAtom, result.patientId]])` so the nav links work
  - Uses local `useState(initialResult)` for immediate UI feedback — no re-fetch needed
  - **Edit mode** — renders `FieldRenderer` for each measure field. Save re-scores via
    `scoreResult()`, calls `updateResultFile()`, updates local state via `setResult()`
  - **Chart** — `ResultChart` component. Charts are **suppressed** for unscorable results
    (`severity === "unscorable"` or `total === null`). Return `null` from ResultChart.
  - **Scores card** — shows `—` for null values, "Unscorable" badge, data quality flags

### Result JSON file format

```json
{
  "resultId": "result-1782072256615-2co3yf",
  "inviteToken": "<32-char token>",
  "patientId": "<patient-id>",
  "assessmentSlug": "level2-depression-adult",
  "scoring": { "total": 15, "average": 1.67, "tScore": null, "severity": "moderately_severe", "dataQualityFlags": [] },
  "answers": { "q1": 2, "q2": 2, "q3": 1, "q4": 2 },
  "createdAt": "2026-06-21T12:00:00.000Z",
  "resultChart": "severity_bar"
}
```

### Result file server actions

`lib/actions/result-files.ts` (`"use server"`):

```ts
saveResultFile(patientId, result) → { success, filename } | { error }   // filename: taken-ts-slug.json
readResultFile(patientId, resultId) → ResultFileData | null
listResultFiles(patientId) → ResultFileData[]         // sorted by createdAt desc
updateResultFile(patientId, result) → { success } | { error }
moveResultToDeleted(patientId, resultId) → { success } | { error }   // moves file to results-deleted/, prepends deleted-ts- preserving original taken- filename
listDeletedResultFiles(patientId) → DeletedResultFile[]              // reads from results-deleted/ folder, includes filename + deletedAt
```

`DeletedResultFile` extends `ResultFileData` with:
```ts
interface DeletedResultFile extends ResultFileData {
  filename: string;   // original filename (taken-ts-slug.json preserved)
  deletedAt: string;  // yyyy-mm-dd-hh-mm-ss parsed from deleted- prefix
}
```

### Submission flow (assessment form → file → redirect)

When a patient submits (`app/a/[token]/_components/assessment-form.tsx`):
1. Scores via `scoreResult(measure, answers)`
2. Generates `resultId` (`result-${Date.now()}-${random}`)
3. Calls `saveResultFile()` server action → writes JSON to `results/<ts>-<slug>.json`
4. Calls `updateInviteFile()` to set invite status to `completed` (in file, not localStorage)
5. **Redirects** via `router.push()` to `/patients/<patientId>/results/<resultId>`
6. No "thank you" page — the user explicitly prefers direct redirect

## Assessment form page (`/a/[token]`)

The assessment page reads the invite from files via `getInviteByToken(token)` — no localStorage.

- **"Back to Assessments" link** at top (ArrowLeft icon) → `/patients/<patientId>/assessments`
- Uses plain `<Link>` with className — do NOT use `<Button asChild>` (not supported by this project's shadcn Button)
- Error states: "Invite Not Available" card for not_found / completed / measure_load_failed

## Editable markdown cards

`EditableMarkdownCard` at `app/patients/[id]/_components/editable-markdown-card.tsx`:
- **Read mode** — `react-markdown` in `max-h-[300px] overflow-y-auto` with `prose prose-sm dark:prose-invert`
- **View button** (Eye) → `/patients/[id]/view/[fileType]` (read-only full page)
- **Edit button** (Pencil) → `/patients/[id]/edit/[fileType]` (MDXEditor)
- **AI Generate button** (Sparkles, emerald) — shown when `hint` prop is set; calls `POST /api/clinical/generate` with the hint as prompt; saves via `saveClinicalFileWithBackup` (versions old file to `version/<type>-{ts}.md`); re-reads file on success; shows backup filename in toast
- **Maximize/Expand button REMOVED** — user explicitly removed it along with the expanded modal Dialog
- Supported types: `"care-plan"`, `"clinical-summary"`, `"clinical-background"`

### AI Generate API (`app/api/clinical/generate/route.ts`)

POST `{ patientId, fileType, prompt }`:
1. Calls Hermes Agent API (`HERMES_API_SERVER_URL/v1/runs`) with a system prompt instructing markdown-only output
2. Polls for completion (2s interval, 5-minute timeout)
3. Strips accidental code fences from agent output
4. Saves via `saveClinicalFile()` to `data/patients/<id>/<fileType>.md`
5. Returns `{ success, fileType, patientId, content }`

Requires Hermes Agent API server running at `:8642` (`API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway`).

See `references/create-with-ai.md` for the full Hermes Agent API integration pattern (shared with assessment generation).

## View page (`/patients/[id]/view/[fileType]`)

Server component reads `.md` file, passes content to `ViewMarkdownPage` (client component with `react-markdown`).
Do NOT use `dynamic(() => import(), { ssr: false })` — it breaks content rendering. `react-markdown`
works fine with SSR.

## Clinical summary content format

When generating or writing a narrative clinical summary to `data/patients/<id>/clinical-summary.md`,
use these rules.

### Sections (required)

- **Presenting Concerns** — why the patient is seeking care, in their own clinical frame
- **Assessment Findings** — each administered measure gets a sub-heading with date, scores, and
  item-level detail mapped to human-readable labels (load the measure template JSON to resolve
  item IDs to their labels and domains)
- **Clinical Impressions** — synthesize across assessments; note discrepancies (e.g., self-report
  vs clinician-rated gap), patterns, diagnostic hypotheses
- **Recommendations** — next clinical steps, follow-up assessments, safety screening, referral
  triggers

### Formatting constraints (mandatory)

Use ONLY these Markdown constructs:
- `##` and `###` headings
- Paragraphs
- Bullet lists (`-`)
- `**bold**` for emphasis
- `---` horizontal rules between sections

Never use: HTML, tables, code blocks, blockquotes, numbered lists, or special Unicode.
This matches the constraints enforced in the AI Generate API system prompt
(`app/api/clinical/generate/route.ts`).

### Synthesis workflow

1. Read all result JSON files from `data/patients/<id>/results/`
2. For each result, read the measure template from `data/shared/templates/json/<slug>.json`
   to map `answers` keys (e.g. `item_1`) to human-readable labels and domains
3. Read existing `clinical-summary.md` and `care-plan.md` for context if they exist
4. Write the summary deterministically — same inputs produce same output

## Edit page (`/patients/[id]/edit/[fileType]`)

Uses `@mdxeditor/editor` (v4). Supports three file types: `care-plan`, `clinical-summary`, `clinical-background`.

### Client-only mount guard (DO NOT use `next/dynamic`)

> **CRITICAL**: `dynamic(() => import(...), { ssr: false })` **drops props** passed from server
> components. The `initialContent` prop (loaded from disk via `readClinicalFile`) never reaches
> the MDX editor, so the editor renders empty — even though the file exists and the RSC payload
> contains the content. This is a Next.js `dynamic()` SSR-off serialization issue, not a React bug.

✅ **CORRECT** — use `"use client"` direct import + `useEffect` mount guard in the wrapper:
```tsx
// edit-page-client.tsx
"use client";
import { useEffect, useState } from "react";
import { EditMarkdownPage } from "./edit-page";

export function EditMarkdownPageClient(props: { ... }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div>Loading editor…</div>;
  return <EditMarkdownPage {...props} />;  // props pass through directly
}
```

❌ **WRONG** — `dynamic()` drops props from server components:
```tsx
// NEVER do this for server-component→client-component prop chains
const EditMarkdownPage = dynamic(
  () => import("./edit-page").then((m) => ({ default: m.EditMarkdownPage })),
  { ssr: false }
);
```

This applies to ALL MDX editor pages: `app/patients/[id]/edit/[fileType]/` AND
`app/patients/[id]/sessions/[itemId]/edit/` AND `app/patients/[id]/notes/[itemId]/edit/`.
If an edit page shows empty content even though the file exists on disk, check for `next/dynamic`.

### `mountedRef` guard — delay with `requestAnimationFrame`

MDXEditor v4 fires `onChange` during initialization (markdown parsing/normalization). If
`mountedRef.current` is `true` at that point, `onChange` will overwrite the loaded content
with an empty or normalized string.

✅ **CORRECT** — delay `mountedRef` so init-time `onChange` is ignored:
```tsx
const [markdown, setMarkdown] = useState(initialContent ?? "");
const mountedRef = useRef(false);

useEffect(() => {
  const id = requestAnimationFrame(() => { mountedRef.current = true; });
  return () => { mountedRef.current = false; cancelAnimationFrame(id); };
}, []);

// In JSX:
<MDXEditor
  markdown={markdown}
  onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
/>
```

❌ **WRONG** — `mountedRef.current = true` synchronously in useEffect:
```tsx
useEffect(() => { mountedRef.current = true; }, []);
// MDXEditor fires onChange during init → mountedRef is true → overwrites content with ""
```

Dark mode via `!important` CSS overrides (see `references/mdx-editor-dark-mode.md`).

## Pitfalls

### `@tailwindcss/typography` — must be installed and configured for `prose`

Tailwind v4 (`@import "tailwindcss"`). Add `@plugin "@tailwindcss/typography"` in `app/globals.css`
after `@import` directives. Without it, `prose`, `prose-invert`, etc. produce zero CSS.

### `react-hooks/set-state-in-effect` — load data server-side, pass as props

ESLint enforces this rule. Do NOT call `setState()` synchronously in `useEffect`.
Load data in server components and pass as props to client components. This is the
pattern used by ResultsSection and AssessmentsSection.

### `dynamic(() => import(), { ssr: false })` — only for DOM-accessing components

✅ Use for: `MDXEditor`, `@mdxeditor/editor`
❌ Do NOT use for: `react-markdown` (pure renderer, works with SSR)

### Select `onValueChange` — use `v ?? ""` for null-safe spread

```tsx
onValueChange={(v) => setDraft((prev) => prev ? { ...prev, ageRange: v ?? "" } : prev)}
```

### Delete buttons and confirm dialogs

Use `type="button"` + `e.stopPropagation()` on delete buttons to prevent Link navigation
interference. Wrap confirm dialogs in shadcn `Dialog` with `DialogContent`, `DialogDescription`,
`DialogFooter`. The `onOpenChange` handler should only clear state when closing:
`onOpenChange={(open) => !open && setDeleteTarget(null)}`.

Do NOT use `<Button asChild>` — this project's shadcn Button does not support the `asChild` prop.
Use plain `<Link>` with className for link-styled buttons.

### Never dual-write to localStorage

Results and invites are file-only. Do NOT call `addResult()`, `setResultStore()`,
`updateResult()`, `addInvite()`, `setInviteStore()` when saving data. Only use
server actions from `result-files.ts` and `invite-files.ts`.

### AI-generated markdown — zero preamble, no file paths, no meta-commentary

The user explicitly requires: "strictly don't say where the file was written and avoid writing
something not useful to the markdown file." Every AI Generate call must produce PURE clinical
markdown — first character must be `#`, no "Written to...", no "Here is...", no file paths.

The API uses two-layer defense: strict system prompt rules (lines 26-38 of route.ts) +
post-processing that finds the first `##` heading and strips everything before it, then
filters out meta-commentary lines. See `references/mdx-editor-pitfalls.md` § AI Preamble Stripping.

### Invite field name: `measureSlug` NOT `assessmentSlug`

When creating invite JSON files manually for demo data, the field name is `measureSlug` — not `assessmentSlug`. Using the wrong field name causes the assessment form page (`/a/[token]`) to fail silently with "Invite Not Available" even when the invite is valid and pending.

```json
// ✅ CORRECT
{ "token": "...", "measureSlug": "level2-depression-adult", "status": "pending", ... }

// ❌ WRONG — form won't load
{ "token": "...", "assessmentSlug": "level2-depression-adult", "status": "pending", ... }
```

The `_actions.ts` server action (`loadMeasure`) looks for `invite.measureSlug`, not `invite.assessmentSlug`. Follow the real invite files in `data/patients/<id>/invites/` as reference.

The 3 reusable green prompts (`hint` prop on `EditableMarkdownCard`) MUST ONLY describe
the clinical content required. Do NOT mention:
- File names or paths ("write it to care-plan.md")
- Markdown format constraints ("Use ONLY ## headings")
- Output format ("Output in clean deterministic Markdown")
- Section names as a schema ("Sections: Treatment Goals...")

ALL format enforcement lives in the API system prompt (`app/api/clinical/generate/route.ts`).
The user prompt is solely a clinical content brief — what to cover, not how to format.

✅ Correct:
```
Generate a clinical care plan for [Patient]. Include treatment goals with measurable
targets, recommended interventions, follow-up schedule, discharge criteria, and risk
mitigation strategies.
```

❌ Wrong:
```
Generate a clinical care plan for [Patient] and write it to care-plan.md.
Use ONLY these markdown elements: ## headings, bullet lists...
Output in clean deterministic Markdown.
```

### Template regeneration — run scripts, then restart dev server

After editing `scripts/corpus/generate-templates.py`:
```bash
python3 scripts/corpus/generate-templates.py
python3 scripts/corpus/build-index.py
```
Then **restart the dev server**. `loadMeasures()` in `lib/data/measures.ts` caches
templates in a module-level variable that survives HMR. Stale cache causes missing
domain info, wrong field counts, or incorrect chart types.

### Suppress chart for unscorable results

For `severity_bar` chart type (default fallback), hide when unscorable:
```tsx
if (scoring.severity === "unscorable" || scoring.total === null) return null;
```
This check goes AFTER the `domain_bars` and `t_score_gauge` handlers — domain bars
should still render for unscorable results (they show per-domain scores regardless).

### Scoring engine — empty thresholds auto-compute severity

`lib/scoring/engine.ts` → `resolveSeverityThreshold(score, thresholds, maxScore)`:

When a measure's `scoringRule.severityThresholds` is empty `{}` (common for Level 1
domain_max measures and any template without explicit thresholds), severity is
auto-computed from `score / maxScore` percentage:

| Percentage | Severity |
|---|---|
| 0% – <20% | none |
| 20% – <40% | mild |
| 40% – <60% | moderate |
| 60% – <80% | moderately_severe |
| ≥80% | severe |

All call sites pass the appropriate `maxScore`:
- `AVERAGE` → `rule.maxScale`
- `DOMAIN_MAX` → `rule.maxScale`
- `TOTAL` → `values.length * rule.maxScale`

This prevents false "Unscorable" results for measures without explicit thresholds.
Existing result files on disk won't change — only newly scored or edited+re-saved
results get auto-computed severity.

### `export type` in `"use server"` files causes runtime crash

Do NOT add `export type { SomeType }` at the bottom of `"use server"` action files.
Next.js's server action bundler can choke on it, producing a runtime error like:
`ReferenceError: ClinicalFileType is not defined` even though TypeScript erases types.

✅ Keep the `type` alias at module scope (non-exported) — consumers can still `import type` it.
❌ Do NOT add `export type { ... }` in `"use server"` modules.

### `toLocaleDateString` causes hydration mismatch — use `suppressHydrationWarning`

Server (Node.js ICU) and client (browser Intl) produce different locale strings:
```
Server: "21 de junio de 2026, 04:12 p.m."
Client: "21 de junio de 2026 a las 04:12 p.m."
```

Add `suppressHydrationWarning` on the element containing `toLocaleDateString` calls.

### Redirect after assessment submit — no thank-you page

Do NOT show a static confirmation. Redirect directly to the result detail page.

### Demo data creation pattern

To populate a patient with demo data for stakeholder presentations, create these files in order:

1. **Results** (`data/patients/<id>/results/taken-<ts>-<slug>.json`) — Scored assessment JSON with `resultId`, `inviteToken`, `patientId`, `assessmentSlug`, `scoring`, `answers`, `createdAt`, `resultChart`.
2. **Invites** (`data/patients/<id>/invites/<ts>-<tokenPrefix>.json`) — MUST use `measureSlug` (not `assessmentSlug`). Each result needs a matching invite with the same token. Status: `"completed"`.
3. **Sessions** (`data/patients/<id>/sessions/<ts>-<itemId>.json`) — ClinicalItem with `type: "session"`, `title`, `content` (markdown), `createdAt`, `updatedAt`.
4. **Notes** (`data/patients/<id>/notes/<ts>-<itemId>.json`) — ClinicalItem with `type: "note"`, same structure as sessions.

**Do NOT touch:** `care-plan.md`, `clinical-summary.md`, `clinical-background.md` — the practitioner generates those manually via the AI Generate button.

Use realistic clinical progression across sessions: intake → behavioral activation → cognitive restructuring. Reference actual assessment scores from the results in the session content.

### Invite field name: `measureSlug` NOT `assessmentSlug`

### Result detail: use `useState` for local edits

```tsx
export function ResultDetail({ result: initialResult, measure }) {
  const [result, setResult] = useState(initialResult);
  // Save → updateResultFile() → setResult(updated)
}
```

### `useHydrateAtoms` in patient route tree — use `useEffect` + `useSetAtom` instead

Calling `useHydrateAtoms` **anywhere** in the patient route tree (even in a wrapper)
causes **"Cannot update a component (AppNav) while rendering a different component"**
because `useHydrateAtoms` synchronously sets atom values during the render pass,
and `AppNav` reads `activePatientIdAtom`. Both components share the same render
tree under the root layout.

✅ Use `useEffect` + `useSetAtom` (atomic, deferred to after mount):
```tsx
// result-detail-client.tsx
export function ResultDetailClient({ result, measure }) {
  const setActivePatient = useSetAtom(activePatientIdAtom);
  useEffect(() => {
    setActivePatient(result.patientId);
  }, [result.patientId, setActivePatient]);

  return <ResultDetail result={result} measure={measure} />;
}
```

❌ Do NOT use `useHydrateAtoms` anywhere in patient sub-pages — even in wrappers.
The SSR hydration concern doesn't apply here since the patientId comes from a server
prop, not localStorage.

## Dashboard assessment library cards

`app/(dashboard)/_components/assessment-library.tsx` — each card displays:
- **Title** (`CardTitle text-sm`)
- **Field count badge** — `{measure.fieldCount} items` (Badge, outline, shrink-0)
- **Description** — `CardDescription text-xs line-clamp-2`
- **Slug** — `text-xs text-muted-foreground font-mono truncate` in CardContent
- **Badges row**: chart type (CHART_LABELS lookup), scoring type, version
- `references/patient-delete.md` — Patient delete: move to patients-deleted/ with timestamp, router.refresh()
- `references/file-naming-conventions.md` — Exact naming for results (taken-), deleted (deleted-ts-taken-), invites, patients
- `references/dashboard-assessment-cards.md` — Dashboard card layout: slug, field count, chart type, scoring type badges
- `references/screenshot-workflow.md` — Screenshot capture workflow: dual-display Edge, scrolling strategy, interactive captures, markdown embedding

## Sessions and Notes pages

Two new top-level patient pages accessible from the AppNav: **Sessions** and **Notes**. Both use
the same `ClinicalItemsSection` component with type parameter (`"session"` | `"note"`).

### Routes

```
/patients/[id]/sessions           → List page (ClinicalItemsSection type="session")
/patients/[id]/sessions/[itemId]/edit → MDX editor (EditClinicalItemPage)
/patients/[id]/sessions/[itemId]/view → Read-only markdown view (ViewClinicalItemPage)
/patients/[id]/notes               → List page (ClinicalItemsSection type="note")
/patients/[id]/notes/[itemId]/edit   → MDX editor (reuses sessions edit component)
/patients/[id]/notes/[itemId]/view   → Read-only markdown view (reuses sessions view component)
```

### Templates

`data/shared/templates/md/session-template.json` and `note-template.json` — JSON files with
`{ type, title, content, version }`. Content is markdown with clinical headings. New items
initialize from these templates via `loadTemplate()` in clinical-notes.ts.

### Server actions

`lib/actions/clinical-notes.ts` (`"use server"`):

```ts
createClinicalItem(patientId, "session"|"note") → ClinicalItem    // loads template, writes to file
listClinicalItems(patientId, type) → ClinicalItem[]               // sorted by createdAt desc
listDeletedClinicalItems(patientId, type) → ClinicalItem[]        // reads from type-deleted/ folder
readClinicalItem(patientId, type, itemId) → ClinicalItem | null
saveClinicalItem(patientId, item) → { success } | { error }      // updates in place, bumps updatedAt
deleteClinicalItem(patientId, type, itemId) → { success } | { error }  // moves to type-deleted/
```

### File naming

- Active: `data/patients/<id>/sessions/<ts>-<itemId>.json` or `/notes/<ts>-<itemId>.json`
- Deleted: `data/patients/<id>/sessions-deleted/deleted-<ts>-<original-filename>` (same for notes)

### ClinicalItem type

```ts
interface ClinicalItem {
  id: string;        // "session-<ts>-<random>" or "note-<ts>-<random>"
  type: "session" | "note";
  title: string;
  content: string;   // markdown
  createdAt: string;
  updatedAt: string;
}
```

### ClinicalItemsSection component

`app/patients/[id]/_components/clinical-items-section.tsx` — reusable list component:
- **Create** — `+ New Session` / `+ New Note` button calls `createClinicalItem()`, then `loadData()`
- **List** — each item shows title (linked to view), date, char count, Edit link, Trash
- **Deleted** — collapsible "Deleted Sessions (N)" / "Deleted Notes (N)" toggle, loads from `listDeletedClinicalItems()`
- **Delete confirm** — Dialog with destructive button, calls `deleteClinicalItem()` (moves to deleted folder, never truly deletes)

### EditClinicalItemPage

Reuses the same MDX editor pattern as Clinical Summary (`@mdxeditor/editor` with `mountedRef` guard).
Has: Back button, editable title (inline input), Cancel, Save. Dark mode CSS identical to clinical-summary edit page.
Routes under `app/patients/[id]/sessions/[itemId]/edit/_components/edit-page.tsx` and imported by notes route.

### ViewClinicalItemPage

Read-only `react-markdown` rendering with Back button and Edit button. Same pattern as clinical-summary view page.
Do NOT wrap in `h-screen` — the patient layout provides the container.

### Nav integration

AppNav adds two links after Results:
- Sessions (`/patients/<id>/sessions`) — active when `pathname.includes("/sessions")`
- Notes (`/patients/<id>/notes`) — active when `pathname.includes("/notes")`

## Dashboard patient table with delete

Each row in `app/(dashboard)/_components/patient-table.tsx` has a Trash2 button that opens
a confirm `Dialog`. Deleting calls `deletePatient()` from `lib/actions/patient-files.ts`, which
**moves** the patient directory to `data/patients-deleted/<ts>-<patientId>/` (rename, not rm).
The list refreshes via `router.refresh()`. Seed patients filtered by directory existence in
`listAllPatients()`.

## Deleted results display

In the deleted results section, each item shows:
- **Measure name** (left)
- **Filename** in monospace below the name (from `DeletedResultFile.filename`)
- **Dates** (right): "Taken: 21 jun 2026 · Deleted: 21 jun 2026"
  - Both use `formatShortDate()` helper (same `toLocaleDateString("es-MX", { month: "short" })` format)

## Key files

| File | Role |
|------|------|
| `components/app-nav.tsx` | Top nav: Profile / Assessments / Results (active state highlighted, no Dashboard) |
| `app/patients/[id]/page.tsx` | Server: validates, loads patient |
| `app/patients/[id]/_components/patient-profile.tsx` | Profile: editable header, Clinical Summary, Clinical Background, Care Plan, Consent |
| `app/patients/[id]/_components/consent-card.tsx` | Standalone consent card |
| `app/patients/[id]/_components/editable-markdown-card.tsx` | Markdown preview with AI Generate, View, Edit, Expand buttons |
| `app/patients/[id]/_components/assessments-section.tsx` | Invites list, file-loaded, delete confirm |
| `app/patients/[id]/_components/results-section.tsx` | Results list, server props, delete confirm |
| `app/patients/[id]/_components/create-invite.tsx` | Creates invites, saves to file via server action |
| `app/patients/[id]/assessments/page.tsx` | Server: validates, renders AssessmentsSection |
| `app/patients/[id]/results/page.tsx` | Server: loads results from files, renders ResultsPageClient |
| `app/patients/[id]/results/_components/results-page-client.tsx` | Client: hydrates atom, passes results + onDeleted callback |
| `app/patients/[id]/view/[fileType]/page.tsx` | Server: reads .md file |
| `app/patients/[id]/edit/[fileType]/page.tsx` | Server: MDX editor page |
| `app/patients/[id]/results/[resultId]/page.tsx` | Server: reads result file, resolves measure |
| `app/patients/[id]/results/[resultId]/_components/result-detail.tsx` | Result view + edit mode, local useState |
| `app/api/clinical/generate/route.ts` | AI clinical markdown generation: POST → Hermes run + poll → saveClinicalFileWithBackup → returns markdown |
| `app/api/assessments/generate/route.ts` | AI assessment JSON generation: calls Hermes Agent API, saves to shared/assessments/ |
| `lib/actions/clinical-files.ts` | `readClinicalFile()`, `saveClinicalFile()`, `saveClinicalFileWithBackup()` (backs up to `version/<type>-{ts}.md` before overwrite) |
| `lib/actions/patient-files.ts` | `readDemographics()`, `saveDemographics()`, `readConsent()`, `saveConsent()` |
| `lib/actions/result-files.ts` | `saveResultFile()`, `readResultFile()`, `listResultFiles()`, `updateResultFile()`, `moveResultToDeleted()`, `listDeletedResultFiles()` |
| `lib/actions/invite-files.ts` | `saveInviteFile()`, `listInviteFiles()`, `getInviteByToken()`, `updateInviteFile()`, `deleteInviteFile()` |
| `lib/actions/deleted-results.ts` | ❌ DELETED — replaced by `moveResultToDeleted()` + `listDeletedResultFiles()` in `result-files.ts` |
| `lib/data/_repository.ts` | `addInvite()`, `updateInviteStatus()`, `removeInvite()`, `updateResult()` — legacy localStorage, DO NOT use for new code |
| `lib/state/_atoms.ts` | `activePatientIdAtom` (only atom still used for nav context) |
| `app/a/[token]/page.tsx` | Assessment page: reads invite from files, shows Back link, renders form |
| `app/a/[token]/_components/assessment-form.tsx` | Form: saves to file, updates invite file, redirects to result |
| `lib/actions/clinical-notes.ts` | `createClinicalItem()`, `listClinicalItems()`, `readClinicalItem()`, `saveClinicalItem()`, `deleteClinicalItem()` |
| `app/patients/[id]/_components/clinical-items-section.tsx` | Reusable Sessions/Notes list: create, list, delete, deleted toggle |
| `app/patients/[id]/_components/patient-header.tsx` | Demographics header (reused in layout) |
| `app/patients/[id]/_components/patient-layout-client.tsx` | Client wrapper: hydrates atom, renders header + children |
| `app/patients/[id]/layout.tsx` | Shared layout for all patient sub-pages |
| `app/patients/[id]/sessions/page.tsx` | Server: Sessions list |
| `app/patients/[id]/sessions/[itemId]/edit/_components/edit-page.tsx` | MDX editor for sessions/notes |
| `app/patients/[id]/sessions/[itemId]/view/_components/view-page.tsx` | Read-only markdown view for sessions/notes |

## References

- `references/chart-and-response-rendering.md` — Recharts severity bar chart patterns
- `references/domain-bars-chart.md` — Domain bars chart (domain extraction, template regeneration, chart implementation)
- `references/scoring-auto-thresholds.md` — Scoring engine auto-computation when severity thresholds are empty
- `references/assessments-page-design.md` — Pending-only main list, collapsible "Taken Assessments" log, delete behavior
- `references/deleted-results-log.md` — Folder-based: move to `results-deleted/` with `deleted-` prefix, `DeletedResultFile` type
- `references/app-nav-active-state.md` — AppNav active highlighting, `useHydrateAtoms` pitfall, `useEffect`+`useSetAtom` fix
- `references/orphan-and-delete-patterns.md` — Orphan detection, delete confirm dialogs, per-invite action button matrix
- `references/patient-shared-layout.md` — Shared layout for all patient sub-pages, header extraction, child page simplification
- `references/file-backed-architecture.md` — Full file-backed architecture: server actions, naming conventions, data flow, migration from localStorage
- `references/mdx-editor-dark-mode.md` — Aggressive `!important` CSS for MDX editor dark mode: Lexical text spans, active blocks, toolbar
- `references/mdx-editor-pitfalls.md` — MDXEditor v4 bugs: next/dynamic prop loss, onChange init race, export type crash in server actions, API notes
- `references/demo-data-population.md` — Populating patients with demo data: result/invite/session/note JSON formats, naming conventions, scoring reference, cleanup steps
- `references/create-with-ai.md` — HTTP-based assessment generation via Hermes Agent API server (POST /v1/runs + SSE polling, replaces OpenRouter)