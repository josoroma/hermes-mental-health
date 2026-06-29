# SPECS.md — Hermes Mental Health (Practitioner Web App)

A Next.js re-implementation of the practitioner-facing application from
[`josoroma/hermes-mental-health-mvp`](https://github.com/josoroma/hermes-mental-health-mvp)
(Parts 1–6 of its tutorial). Built with **shadcn/ui** (**dark mode only**), **Jotai**,
**React Hook Form**, **Zod**, and the shadcn **"luma" theme**
([preset](https://ui.shadcn.com/create?preset=b2D0wqNxT)).

Background and domain understanding: see [`README-MENTAL-HEALTH-PY.md`](./README-MENTAL-HEALTH-PY.md).
The `.hermes` agentic runtime and Python/FastAPI back end (Part 7) are **replaced** by Next.js API
routes + server actions + `.hermes/` configuration; this app runs
against a **file-backed local data layer** (`data/patients/<id>/*.json,*.md`) whose assessment
definitions are **generated from a DSM-5-TR corpus** (`data/corpus/` → `data/shared/templates/`)
and preserves the same domain vocabulary and patient-scoping guarantees. Its **one external integration**
is the **Hermes agent**, which the app talks to over a **WebSocket** for the "Create With AI" feature
(US-5.3) and an **HTTP REST API** (`hermes gateway` at `:8642`) for clinical markdown generation —
generating shared assessment JSON into `data/shared/assessments/`.

> **Legend**
> - `[ ]` Todo — Not started
> - `[~]` In Progress — Actively being worked on
> - `[x]` Completed — Implemented and verified
> - `[!]` Blocked — Waiting on external dependency
> - 🎨 Uses the design system — UI-intensive story requiring the luma (dark) theme + shadcn/ui

---

## Progress Summary

| Epic | Stories | Todo | In Progress | Completed | Blocked |
| --- | ---: | ---: | ---: | ---: | ---: |
| E1: Project Setup & Luma Dark Theme | 4 | 0 | 0 | 4 | 0 |
| E2: Domain Model & Scoring Engine | 2 | 0 | 0 | 2 | 0 |
| E3: DSM-5-TR Corpus & Template Pipeline | 2 | 0 | 0 | 2 | 0 |
| E4: File-Backed Data Layer & Seed | 3 | 0 | 0 | 3 | 0 |
| E5: Dashboard | 4 | 0 | 0 | 4 | 0 |
| E6: Patient Profile | 4 | 0 | 0 | 4 | 0 |
| E7: Assessment Invites | 3 | 0 | 0 | 3 | 0 |
| E8: Taking Assessments | 4 | 0 | 0 | 4 | 0 |
| E9: Results & Scoring | 4 | 0 | 0 | 4 | 0 |
| E10: Assessment Editor | 3 | 0 | 0 | 3 | 0 |
| E11: Patient-Scope Guard | 2 | 0 | 0 | 2 | 0 |
| E12: Theming & Visual Polish (Dark) | 2 | 0 | 0 | 2 | 0 |
| E13: Sessions & Notes | 2 | 0 | 0 | 2 | 0 |
| E14: Agent Chat Interface | 3 | 0 | 0 | 3 | 0 |
| E15: Clinical Markdown Editing | 2 | 0 | 0 | 2 | 0 |
| E16: .hermes Agent Infrastructure | 4 | 0 | 0 | 4 | 0 |
| **Total** | **48** | **0** | **0** | **48** | **0** |

---

## E1: Project Setup & Luma Dark Theme

### US-1.1: Initialize the Next.js project `[x]`

**As a** developer
**I want** a Next.js (App Router, TypeScript) project scaffolded
**So that** I have a typed, file-routed foundation to build on

```gherkin
Feature: Next.js project initialization
  Scenario: Bootstrap the app
    Given an empty repository
    When I scaffold a Next.js project with TypeScript, ESLint, and the App Router
    Then `app/`, `lib/`, and `components/` directories exist
    And `npm run dev` serves the app on http://localhost:3000

  Scenario: Strict typing enabled
    Given the project is scaffolded
    When I inspect `tsconfig.json`
    Then `strict` is true and path alias `@/*` is configured
```

#### Tasks
- [x] T-1.1.1: Scaffold Next.js (App Router, TS, ESLint, Tailwind) with `@/*` alias
- [x] T-1.1.2: Enable `strict` in `tsconfig.json`; add `lib/`, `components/`, `app/` layout shell
- [x] T-1.1.3: Add `prettier` + project ESLint rules; add `npm run typecheck` script
- [x] T-1.1.4: Configure root `app/layout.tsx` with metadata "Hermes Mental Health"

### US-1.2: Install shadcn/ui and apply the luma theme in dark mode `[x]` 🎨

#### Tasks
- [x] T-1.2.1: Run `shadcn init`; apply luma preset from `https://ui.shadcn.com/create?preset=b2D0wqNxT`
- [x] T-1.2.2: Force dark mode — `className="dark"` on `<html>`, `color-scheme: dark`; no theme toggle
- [x] T-1.2.3: Verify luma dark oklch tokens, `--radius`, `--chart-1..5`, and font tokens
- [x] T-1.2.4: Add base components: `button card table tabs dialog input textarea select checkbox radio-group badge label form sonner chart`

### US-1.3: Wire up Jotai state `[x]`

#### Tasks
- [x] T-1.3.1: Add `jotai`; mount `<Provider>` in `app/providers.tsx`
- [x] T-1.3.2: Add `lib/state/_atoms.ts` for global atoms (active patient id, UI state)
- [x] T-1.3.3: Add `jotai/utils` `atomWithStorage` for persisted UI prefs

### US-1.4: Install form stack (React Hook Form + Zod) `[x]`

#### Tasks
- [x] T-1.4.1: Add `react-hook-form`, `zod`, `@hookform/resolvers`
- [x] T-1.4.2: Create a `useZodForm` helper wrapping `useForm` + `zodResolver`
- [x] T-1.4.3: Verify shadcn `<Form>`, `<FormField>`, `<FormMessage>` integrate with the resolver

---

## E2: Domain Model & Scoring Engine

### US-2.1: Define Zod domain schemas `[x]`

```gherkin
Feature: Domain schemas
  Scenario: Entities modeled
    Then `Patient`, `Measure`, `MeasureField`, `ScoringRule`, `Invite`, and `Result` types are inferred via `z.infer`

  Scenario: Field type union
    Then it includes `scale`, `text`, `select`, `multi_select`, and `boolean`

  Scenario: Severity bands
    Then it includes `none`, `mild`, `moderate`, `moderately_severe`, `severe`, and `unscorable`

  Scenario: Result chart type
    Then it includes `severity_bar`, `t_score_gauge`, `domain_bars`, `trend_line`, and `none`
```

#### Tasks
- [x] T-2.1.1: `lib/domain/_schema.ts` — Patient, Measure, MeasureField, ScoringRule, Invite, Result
- [x] T-2.1.2: Measure includes `instructions`, `resultChart`, `scoringRule`
- [x] T-2.1.3: ScoringRule — total calc, severity thresholds, T-score lookup, reverse-scored items
- [x] T-2.1.4: Invite (token, measureSlug, patientId, status) and Result (answers, scoring, chart)
- [x] T-2.1.5: `lib/domain/_enums.ts` — field-type, severity, chart-type, invite-status, scoring-type unions

### US-2.2: Scoring engine `[x]`

#### Tasks
- [x] T-2.2.1: `lib/scoring/engine.ts` — total/avg calculation with reverse scoring
- [x] T-2.2.2: Severity-threshold resolver (ranges → band label); auto-compute when thresholds empty
- [x] T-2.2.3: PROMIS raw→T-score lookup support
- [x] T-2.2.4: Data-quality detection (missing required items → `unscorable`); 27 unit tests

---

## E3: DSM-5-TR Corpus & Template Pipeline

### US-3.1: Generate schema-conformant templates (JSON) `[x]`

#### Tasks
- [x] T-3.1.1: `scripts/corpus/generate-templates.py` — parse 68 corpus `.md` into Measure objects
- [x] T-3.1.2: Derive `resultChart` per measure from scoring shape; per-slug override map
- [x] T-3.1.3: Write `data/shared/templates/json/<slug>.json`
- [x] T-3.1.4: Validate every generated template against Measure schema; fail build on violation

### US-3.2: Template catalog & integrity `[x]`

#### Tasks
- [x] T-3.2.1: `scripts/corpus/build-index.py` — emit `data/shared/templates/index.json`
- [x] T-3.2.2: Reconcile counts; 100% coverage (68/68); report gaps
- [x] T-3.2.3: Add `make dsm-corpus-sync` (generate → index) in Makefile

---

## E4: File-Backed Data Layer & Seed

> **IMPORTANT:** The original E4 used localStorage-backed atoms. The codebase has been migrated to
> a **file-backed architecture** where patient data lives in `data/patients/<id>/*.json,*.md` on disk.
> No localStorage. No dual-writes. JSON and Markdown files are the single source of truth.

### US-4.1: Measure catalog loader `[x]`

#### Tasks
- [x] T-4.1.1: `lib/data/measures.ts` — load + validate templates from `data/shared/templates/json/` and custom assessments from `data/shared/assessments/`
- [x] T-4.1.2: Throw on schema drift at load time
- [x] T-4.1.3: Provide `getMeasure(slug)` and `listMeasures()` helpers

### US-4.2: File-backed patient persistence `[x]`

```gherkin
Feature: File-backed patients
  Scenario: Patients from filesystem
    Given `data/patients/<id>/profile.json` exists
    When `listAllPatients()` runs
    Then patient is loaded and merged with seed data

  Scenario: Create patient writes to disk
    Given a new patient form submission
    When the server action runs
    Then `data/patients/<id>/` directory is created
    And `profile.json` is written with validated demographics

  Scenario: Consent from disk overlays seed
    Given `data/patients/<id>/consent.json` exists
    When the patient is loaded
    Then consent status reflects the file, not the seed default
```

#### Tasks
- [x] T-4.2.1: `lib/data/patients.ts` — 3 seed patients (Carlos Ramírez, Ana Vega, josoroma)
- [x] T-4.2.2: `lib/data/patients-server.ts` — filesystem scan + overlay helpers (`overlayConsent`, `overlayProfile`)
- [x] T-4.2.3: `lib/actions/patient-files.ts` — `readDemographics()`, `saveDemographics()`, `readConsent()`, `saveConsent()`
- [x] T-4.2.4: `lib/actions/create-patient.ts` — creates `data/patients/<id>/profile.json`
- [x] T-4.2.5: `lib/actions/clinical-files.ts` — `readClinicalFile()`, `saveClinicalFile()`, `saveClinicalFileWithBackup()`
- [x] T-4.2.6: Versioned backups to `version/<type>-{yyyy-mm-dd-hh-mm-ss}.md` on AI generate overwrite

### US-4.3: Patient delete workflow `[x]`

#### Tasks
- [x] T-4.3.1: Move patient directory to `data/patients-deleted/<ts>-<patientId>/` (rename, not rm)
- [x] T-4.3.2: `router.refresh()` updates the dashboard table

---

## E5: Dashboard

### US-5.1: Patient list `[x]` 🎨

#### Tasks
- [x] T-5.1.1: `app/(dashboard)/page.tsx` — server component reading patients from filesystem
- [x] T-5.1.2: `_components/patient-table.tsx` — shadcn Table with row links, pagination, delete
- [x] T-5.1.3: Row click sets active-patient atom and routes to `/patients/[id]`
- [x] T-5.1.4: Page size selector (1, 5, 10, 15, 20, 25, 50, 100); client-side pagination

### US-5.2: Assessment library `[x]` 🎨

#### Tasks
- [x] T-5.2.1: `_components/assessment-library.tsx` — card grid with slug, field count, chart type, scoring type, version badges
- [x] T-5.2.2: Custom Assessments (from `data/shared/assessments/`) shown FIRST with delete buttons
- [x] T-5.2.3: Available Assessments (68 DSM-5-TR measures) shown second
- [x] T-5.2.4: Dashboard header shows combined count: custom + available

### US-5.3: Create Shared Assessment With AI (Hermes Gateway API) `[x]` 🎨

> The app calls the **Hermes Gateway API** at `http://127.0.0.1:8642` via HTTP POST/Poll
> (replaced original WebSocket transport). The agent is external — start with `make hermes-gateway`.

#### Tasks
- [x] T-5.3.1: `_components/create-with-ai.tsx` — dialog: Assessment ID (slug) + AI Prompt textarea
- [x] T-5.3.2: `lib/ai/hermes-client.ts` — HTTP client: POST `/v1/runs` + poll `GET /v1/runs/{id}`
- [x] T-5.3.3: `lib/ai/_env.ts` — `HERMES_ASSESSMENT_AI_URL`, `HERMES_ASSESSMENT_AI_MODEL`
- [x] T-5.3.4: `app/api/assessments/generate/route.ts` — validate + persist agent JSON
- [x] T-5.3.5: 300s create timeout, 900s poll deadline, 3s poll interval
- [x] T-5.3.6: Custom assessment cards appear in dashboard with delete buttons

### US-5.4: Top navigation bar `[x]` 🎨

#### Tasks
- [x] T-5.4.1: `components/app-nav.tsx` — nav with Profile, Assessments, Results, Sessions, Notes links
- [x] T-5.4.2: Nav links appear only when active patient is set
- [x] T-5.4.3: Active state highlighting; sticky, glass/blur header with luma dark tokens

---

## E6: Patient Profile

### US-6.1: Profile page with gradient header `[x]` 🎨

```gherkin
Feature: Patient profile
  Scenario: Profile page layout
    Given I open a patient
    When the profile renders
    Then I see a gradient cover header with name, age range, gender, patient ID
    And inline edit button toggles demographics form fields
    And cards for Care Plan, Clinical Summary, Clinical Background, and Consent

  Scenario: Shared layout for sub-pages
    Given I navigate to any patient sub-page
    Then the gradient header is persistent across all routes
    And sub-pages render without duplicate padding/wrappers
```

#### Tasks
- [x] T-6.1.1: `app/patients/[id]/layout.tsx` — shared layout: header + children container
- [x] T-6.1.2: `_components/patient-header.tsx` — gradient cover with inline demographics edit
- [x] T-6.1.3: `_components/patient-profile.tsx` — cards: Care Plan, Clinical Summary, Clinical Background, Consent
- [x] T-6.1.4: `_components/consent-card.tsx` — consent status badge with inline edit dropdown

### US-6.2: Editable markdown cards `[x]` 🎨

#### Tasks
- [x] T-6.2.1: `_components/editable-markdown-card.tsx` — preview (max-h-[300px] scrollable), View, Edit, AI Generate buttons
- [x] T-6.2.2: AI Generate calls `POST /api/clinical/generate` → Hermes Gateway API → saves with backup
- [x] T-6.2.3: Green prompt hints (collapsible, trigger stays visible)

### US-6.3: View page (read-only markdown) `[x]`

#### Tasks
- [x] T-6.3.1: `app/patients/[id]/view/[fileType]/page.tsx` — server reads `.md`, renders via `react-markdown`
- [x] T-6.3.2: `prose prose-sm dark:prose-invert` styling

### US-6.4: AI clinical markdown generation `[x]`

```gherkin
Feature: AI clinical markdown generation
  Scenario: Generate via Hermes Gateway
    Given the Hermes Gateway is running at :8642
    When the practitioner clicks AI Generate on a markdown card
    Then POST to `/api/clinical/generate` calls Hermes Gateway `/v1/runs`
    And existing file is backed up to `version/<type>-{ts}.md`
    And new markdown is saved and displayed

  Scenario: Zero preamble enforcement
    Given AI generation completes
    Then the output starts with a `##` heading
    And no "Written to..." or "Here is..." meta-commentary appears
```

#### Tasks
- [x] T-6.4.1: `app/api/clinical/generate/route.ts` — POST → Hermes run + poll (2s, 5-min timeout)
- [x] T-6.4.2: Strip code fences and meta-commentary from agent output
- [x] T-6.4.3: Save with backup via `saveClinicalFileWithBackup()`
- [x] T-6.4.4: Toast shows backup filename on success

---

## E7: Assessment Invites

### US-7.1: Create an invite with a tokenized link `[x]`

#### Tasks
- [x] T-7.1.1: `lib/invites/token.ts` — 32-char URL-safe token generator
- [x] T-7.1.2: `_components/create-invite.tsx` — measure dropdown + expiration selector
- [x] T-7.1.3: `lib/actions/invite-files.ts` — `saveInviteFile()` writes to `data/patients/<id>/invites/`

### US-7.2: Invites list with status controls `[x]` 🎨

```gherkin
Feature: Invites list
  Scenario: Pending invites with controls
    Given a patient with pending invites
    When I view the assessments page
    Then each pending invite shows Take link, Copy Link, and Delete
    And completed invites show in a collapsible "Taken Assessments" log

  Scenario: Orphan detection
    Given an invite is marked completed but no result file exists
    Then it shows an "Orphan" badge next to the status
```

#### Tasks
- [x] T-7.2.1: `_components/assessments-section.tsx` — pending list + collapsible taken log
- [x] T-7.2.2: Per-status controls: Take (ExternalLink), Copy Link, View Result, Delete
- [x] T-7.2.3: Delete confirm dialog with status-specific messages
- [x] T-7.2.4: Invite deletion also removes associated result file

### US-7.3: Invite completion lifecycle `[x]`

#### Tasks
- [x] T-7.3.1: On form submission, `updateInviteFile()` sets status to `completed`
- [x] T-7.3.2: Result linked to invite via `inviteToken` in result JSON
- [x] T-7.3.3: File-based: `listInviteFiles()` reads from `invites/` directory

---

## E8: Taking Assessments

### US-8.1: Token-resolved patient form `[x]` 🎨

#### Tasks
- [x] T-8.1.1: `app/a/[token]/page.tsx` — resolve invite via `getInviteByToken()`, load measure
- [x] T-8.1.2: Handle invalid/expired/completed tokens with "Invite Not Available" card
- [x] T-8.1.3: Back to Assessments link (ArrowLeft) → `/patients/<patientId>/assessments`

### US-8.2: Dynamic field renderer `[x]` 🎨

#### Tasks
- [x] T-8.2.1: `_components/field-renderer.tsx` — scale (radio-group), text (textarea), select, multi_select (checkboxes), boolean
- [x] T-8.2.2: Labeled endpoints for scale fields from `min`/`max` + `options`
- [x] T-8.2.3: Measure instructions displayed above the form

### US-8.3: Schema-driven validation `[x]`

#### Tasks
- [x] T-8.3.1: `_schema.ts` — `buildAnswerSchema(measure)` returning a Zod object
- [x] T-8.3.2: Enforce required, numeric `min`/`max`, option membership
- [x] T-8.3.3: Wire `zodResolver` to the form; surface errors via `<FormMessage>`

### US-8.4: Submit, score, and redirect `[x]`

#### Tasks
- [x] T-8.4.1: `_components/assessment-form.tsx` — score via `scoreResult()`, save via `saveResultFile()`
- [x] T-8.4.2: Flip invite to `completed` via `updateInviteFile()`
- [x] T-8.4.3: **Direct redirect** to `/patients/<id>/results/<resultId>` — no thank-you page

---

## E9: Results & Scoring

### US-9.1: Results list `[x]` 🎨

#### Tasks
- [x] T-9.1.1: `_components/results-section.tsx` — server props, no useEffect loading
- [x] T-9.1.2: Measure name resolved via `getMeasureTitle()`, date, score summary per row
- [x] T-9.1.3: Delete moves file to `results-deleted/`; collapsible "Deleted Results" toggle

### US-9.2: Result chart selected by measure's `resultChart` `[x]` 🎨

#### Tasks
- [x] T-9.2.1: `_components/result-chart.tsx` — dispatcher: severity_bar, domain_bars, t_score_gauge, trend_line, none
- [x] T-9.2.2: Severity bar: horizontal bar with 5 bands (green→red) + score marker
- [x] T-9.2.3: Domain bars: grouped bars per symptom domain (renders even for unscorable)
- [x] T-9.2.4: Charts suppressed when `severity === "unscorable"` or `total === null` (except domain_bars)

### US-9.3: Result detail (scores + answers + edit mode) `[x]` 🎨

#### Tasks
- [x] T-9.3.1: `app/patients/[id]/results/[resultId]/page.tsx` — server reads result file, resolves measure
- [x] T-9.3.2: Scores card: total, average, T-score, severity, data quality flags
- [x] T-9.3.3: Answers table with item-level breakdown
- [x] T-9.3.4: Edit mode — `FieldRenderer` per field, re-score on save, `updateResultFile()`

### US-9.4: File-backed result persistence `[x]`

#### Tasks
- [x] T-9.4.1: `lib/actions/result-files.ts` — `saveResultFile()`, `readResultFile()`, `listResultFiles()`, `updateResultFile()`
- [x] T-9.4.2: `moveResultToDeleted()` — moves to `results-deleted/deleted-<ts>-<original-filename>`
- [x] T-9.4.3: `listDeletedResultFiles()` — reads from `results-deleted/` folder
- [x] T-9.4.4: File naming: `taken-yyyy-mm-dd-hh-mm-ss-<slug>.json`

---

## E10: Assessment Editor

### US-10.1: Edit measure metadata `[x]` 🎨

#### Tasks
- [x] T-10.1.1: `app/editor/[slug]/page.tsx` — loads from templates or custom assessments
- [x] T-10.1.2: `_components/metadata-form.tsx` — title, description, slug, version, field count

### US-10.2: Edit field definitions `[x]` 🎨

#### Tasks
- [x] T-10.2.1: Fields tab — list with add/remove/reorder
- [x] T-10.2.2: Conditional inputs by field type (options for selects, min/max for scales)

### US-10.3: Edit scoring rules and chart type `[x]` 🎨

#### Tasks
- [x] T-10.3.1: Scoring tab — type (total/avg/T-score/domain_max), thresholds, max scale
- [x] T-10.3.2: Chart tab — chart type selector with live preview
- [x] T-10.3.3: Custom assessments get full edit; template measures have slug locked

---

## E11: Patient-Scope Guard

### US-11.1: One active patient per session `[x]`

#### Tasks
- [x] T-11.1.1: `lib/scope/_atoms.ts` — `activePatientIdAtom`
- [x] T-11.1.2: `lib/scope/guard.ts` — `assertScoped(patientId)` throwing `PatientScopeError`
- [x] T-11.1.3: Route all repository reads of scoped collections through `assertScoped`

### US-11.2: Validate patient IDs `[x]`

#### Tasks
- [x] T-11.2.1: `lib/scope/validate.ts` — `validatePatientId` (Zod regex, no path traversal)
- [x] T-11.2.2: Apply validation at every patient route boundary

---

## E12: Theming & Visual Polish (Dark)

### US-12.1: Dark-only luma fidelity `[x]` 🎨

#### Tasks
- [x] T-12.1.1: `<html class="dark">` unconditional; no light tokens path / toggle
- [x] T-12.1.2: All components use luma dark oklch tokens (no hardcoded hex)
- [x] T-12.1.3: Contrast-checked severity bands and charts on dark backgrounds

### US-12.2: Layout polish `[x]` 🎨

#### Tasks
- [x] T-12.2.1: Gradient cover cards + glass/blur backdrop utilities (dark-tuned)
- [x] T-12.2.2: Responsive grid breakpoints (≤768px → single column)
- [x] T-12.2.3: Focus-visible outlines and keyboard-navigation pass

---

## E13: Sessions & Notes

> Clinical session notes and general notes are managed via `ClinicalItemsSection` with
> `type="session"` or `type="note"`. Both use the same MDX editor and server action infrastructure.

### US-13.1: Sessions management `[x]`

```gherkin
Feature: Session notes
  Scenario: Create from template
    Given a patient profile
    When I click "+ New Session"
    Then a session initializes from `session-template.json`
    And is written to `data/patients/<id>/sessions/<ts>-<itemId>.json`

  Scenario: Edit with MDX editor
    Given an existing session
    When I click Edit
    Then the MDX editor opens at `/patients/[id]/sessions/[itemId]/edit`
    And save calls `saveClinicalItem()` which bumps `updatedAt`

  Scenario: View read-only
    When I click View
    Then read-only react-markdown renders at `/patients/[id]/sessions/[itemId]/view`

  Scenario: Delete moves to deleted folder
    When I delete a session
    Then file moves to `sessions-deleted/deleted-<ts>-<original-filename>`
```

#### Tasks
- [x] T-13.1.1: `app/patients/[id]/sessions/page.tsx` — server: sessions list
- [x] T-13.1.2: `_components/clinical-items-section.tsx` — reusable list (create, view, edit, delete, deleted toggle)
- [x] T-13.1.3: `app/patients/[id]/sessions/[itemId]/edit/` — MDX editor with `mountedRef` guard
- [x] T-13.1.4: `app/patients/[id]/sessions/[itemId]/view/` — read-only markdown view
- [x] T-13.1.5: `lib/actions/clinical-notes.ts` — `createClinicalItem()`, `listClinicalItems()`, `readClinicalItem()`, `saveClinicalItem()`, `deleteClinicalItem()`, `listDeletedClinicalItems()`
- [x] T-13.1.6: `data/shared/templates/md/session-template.json` — default session template

### US-13.2: Notes management `[x]`

#### Tasks
- [x] T-13.2.1: `app/patients/[id]/notes/page.tsx` — server: notes list
- [x] T-13.2.2: Reuses `ClinicalItemsSection` with `type="note"`
- [x] T-13.2.3: `data/shared/templates/md/note-template.json` — default note template
- [x] T-13.2.4: File naming: `notes/<ts>-<itemId>.json`, deleted: `notes-deleted/deleted-<ts>-<original-filename>`

---

## E14: Agent Chat Interface

> A full-page AI chat interface at `/agent` with context-aware quick-inject buttons.
> Navigated via the Agent button in every page header with context query params.

### US-14.1: Chat page with context routing `[x]` 🎨

```gherkin
Feature: Agent chat
  Scenario: Navigate from patient profile
    Given I'm on a patient profile
    When I click the Agent button
    Then I navigate to `/agent?profile&patientId=<id>`

  Scenario: Back button resolves context
    Given query params from the source page
    When I click Back
    Then I return to the correct source page
```

#### Tasks
- [x] T-14.1.1: `app/agent/page.tsx` — server: renders AgentChat
- [x] T-14.1.2: `_components/agent-chat.tsx` — chat bubbles, markdown rendering, input
- [x] T-14.1.3: Context-aware back button resolved from query params
- [x] T-14.1.4: `_components/agent-sidebar.tsx` — collapsible filesystem tree

### US-14.2: Quick-inject prompt buttons `[x]`

```gherkin
Feature: Quick-inject buttons
  Scenario: Care Plan
    When I click "Care Plan"
    Then input populates with: "Audit the existing care plans for the current patient..."
    And skills loaded: mental-health-core, mental-health-care-plan

  Scenario: Session Note
    When I click "Session Note"
    Then input populates with clinical session notes audit prompt
    And skills loaded: mental-health-core, mental-health-patient-summary

  Scenario: Progress Report
    When I click "Progress Report"
    Then input populates with weekly progress report generation prompt

  Scenario: Safety Check
    When I click "Safety Check"
    Then input populates with safety screening prompt
```

#### Tasks
- [x] T-14.2.1: `injectCarePlanPrompt()` — care plan audit with patient ID interpolation
- [x] T-14.2.2: `injectSessionNotePrompt()` — session notes audit
- [x] T-14.2.3: `injectProgressReportPrompt()` — weekly progress report
- [x] T-14.2.4: `injectSafetyCheckPrompt()` — safety screening (PHQ-9 item 9, SI/HI, crisis scores)

### US-14.3: Agent API integration `[x]`

#### Tasks
- [x] T-14.3.1: `app/api/agent/chat/route.ts` — POST wrapper around Hermes Gateway run API
- [x] T-14.3.2: `app/api/agent/run/route.ts` — agent modal run endpoint
- [x] T-14.3.3: Response rendered as markdown bubble in chat

---

## E15: Clinical Markdown Editing

> Rich markdown editing for clinical documents using `@mdxeditor/editor` v4.

### US-15.1: MDX Editor integration `[x]`

```gherkin
Feature: MDX Editor
  Scenario: Load clinical content
    Given a markdown file exists on disk
    When I navigate to the edit page
    Then the MDX editor loads with the file content
    And props pass through correctly (no next/dynamic prop loss)

  Scenario: Dark mode overrides
    Given the editor has hashed CSS class names
    When the page renders
    Then aggressive !important CSS overrides all toolbar and editor elements
    And explicit oklch values are used for colors
```

#### Tasks
- [x] T-15.1.1: Client-only mount guard — `useEffect` + `useState(mounted)`, never `next/dynamic`
- [x] T-15.1.2: `mountedRef` guard with `requestAnimationFrame` to ignore init-time `onChange`
- [x] T-15.1.3: Dark mode CSS: global attribute selectors (`[class*='_contentEditable']`, `[class*='_toolbar']`)
- [x] T-15.1.4: Edit pages: care-plan, clinical-summary, clinical-background, sessions, notes

### US-15.2: View page markdown rendering `[x]`

#### Tasks
- [x] T-15.2.1: `react-markdown` with `prose prose-sm dark:prose-invert`
- [x] T-15.2.2: Back button + Edit button on every view page
- [x] T-15.2.3: No `dynamic()` needed — react-markdown works with SSR

---

## E16: .hermes Agent Infrastructure

> The `.hermes/` directory contains the agentic runtime configuration: skills, plugins, hooks,
> agents, commands, and skill bundles. This is NOT the Hermes Gateway itself — it is the
> configuration loaded by the Hermes dashboard at `http://127.0.0.1:9120`.

### US-16.1: Mental health skills (15 skills) `[x]`

| Skill | Purpose |
|-------|---------|
| `mental-health-core` | DSM-5-TR domain vocabulary, severity bands, scoring, patient scoping |
| `mental-health-assessment-review` | Score submissions, interpret results, render charts, flag data quality |
| `mental-health-patient-summary` | Clinical summaries, markdown rendering, profile UI, file persistence |
| `mental-health-care-plan` | Draft and audit care plans: goals, interventions, follow-up, risk mitigation |
| `mental-health-dashboard` | Practitioner dashboard: patient table, assessment library, agent modal |
| `mental-health-editor` | Assessment editor: metadata, fields, scoring, chart configuration |
| `mental-health-safety` | Safety screening: PHQ-9 item 9, C-SSRS, crisis protocols |
| `mental-health-development` | Development patterns, pitfalls, and workflows |
| `mental-health-infrastructure` | .hermes infrastructure: plugins, hooks, agents, commands |
| `mental-health-commands` | Slash-command workflows for the practitioner |
| `mental-health-assessment-invite` | Assessment invite lifecycle |
| `mental-health-results` | Results display and data-quality management |
| `mental-health-corpus` | DSM-5-TR template pipeline |
| `mental-health-scoping` | Patient scope enforcement |
| `mental-health-video` | Walkthrough video creation |

#### Tasks
- [x] T-16.1.1: 15 skills with SKILL.md + references/ directories
- [x] T-16.1.2: All clinical content in English
- [x] T-16.1.3: Skills loaded by agent via `/goal` commands with comma-separated skill names

### US-16.2: Hermes Gateway API integration `[x]`

```gherkin
Feature: Hermes Gateway
  Scenario: Start gateway
    Given the project directory
    When I run `API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway`
    Then the gateway listens on :8642
    And accepts POST /v1/runs with skill + prompt payloads

  Scenario: Clinical markdown generation
    Given the gateway is running
    When POST /api/clinical/generate is called
    Then the route sends a /goal command to the gateway
    And polls for completion
    And returns generated markdown
```

#### Tasks
- [x] T-16.2.1: `app/api/clinical/generate/route.ts` — HTTP client to Hermes Gateway
- [x] T-16.2.2: `app/api/assessments/generate/route.ts` — HTTP client for assessment JSON
- [x] T-16.2.3: `app/api/agent/chat/route.ts` — chat endpoint
- [x] T-16.2.4: `app/api/agent/run/route.ts` — agent modal run endpoint

### US-16.3: Agent modal (legacy) `[x]`

> The AgentModal at `_components/agent-modal.tsx` is a prompt-selector dialog that builds
> `/goal` commands with mapped skills. It is superseded by the Agent Chat page but still
> accessible from the dashboard.

#### Tasks
- [x] T-16.3.1: Prompt catalog from `lib/prompts.ts` (10 prompts with agent mappings)
- [x] T-16.3.2: `AGENT_SKILLS` mapping: agent name → comma-separated skill list
- [x] T-16.3.3: Select → generate /goal command → editable textarea → submit to agent

### US-16.4: Documentation `[x]`

#### Tasks
- [x] T-16.4.1: `docs/index.md` — architecture overview, route table, data flow
- [x] T-16.4.2: Per-page docs: dashboard, patient-profile, assessments, results, sessions, notes, agent-chat, editor, assessment-form
- [x] T-16.4.3: `docs/SPECS.md` — this file (completed epics with task status)
- [x] T-16.4.4: Screenshots in `docs/screenshots/`

---

## Architecture Overview

```
app/
├── layout.tsx                          # root layout, metadata, <html class="dark">
├── providers.tsx                        # Jotai <Provider> (client)
├── (dashboard)/
│   ├── page.tsx                         # E5 — Dashboard
│   └── _components/
│       ├── patient-table.tsx            # Patient table with pagination + delete
│       ├── assessment-library.tsx       # Custom + Available assessment cards
│       ├── create-patient-dialog.tsx    # New patient form
│       ├── create-with-ai.tsx           # Create With AI dialog
│       ├── agent-modal.tsx              # Hermes Agent modal (legacy)
│       └── dashboard-hints.tsx          # AI prompt hints
├── api/
│   ├── assessments/generate/route.ts    # AI assessment JSON generation (Hermes Gateway)
│   ├── clinical/generate/route.ts       # AI clinical markdown generation (Hermes Gateway)
│   ├── agent/chat/route.ts              # Agent chat endpoint
│   └── agent/run/route.ts               # Agent modal run endpoint
├── patients/[id]/
│   ├── layout.tsx                       # Shared layout: gradient header + children
│   ├── page.tsx                         # E6 — Patient Profile
│   ├── assessments/page.tsx             # E7 — Create invites, pending list
│   ├── results/
│   │   ├── page.tsx                     # E9 — Results list
│   │   └── [resultId]/page.tsx          # E9 — Result detail
│   ├── sessions/
│   │   ├── page.tsx                     # E13 — Sessions list
│   │   └── [itemId]/{edit,view}/        # MDX editor + read-only view
│   ├── notes/
│   │   ├── page.tsx                     # E13 — Notes list
│   │   └── [itemId]/{edit,view}/        # MDX editor + read-only view
│   ├── view/[fileType]/page.tsx         # E15 — Read-only markdown view
│   ├── edit/[fileType]/page.tsx         # E15 — MDX editor
│   └── _components/
│       ├── patient-header.tsx           # Gradient cover with inline edit
│       ├── patient-profile.tsx          # Profile page cards
│       ├── patient-layout-client.tsx    # Client wrapper: hydrates atom
│       ├── editable-markdown-card.tsx   # Card: preview + AI Gen + View + Edit
│       ├── consent-card.tsx             # Consent status with inline edit
│       ├── assessments-section.tsx      # Invites list with per-status controls
│       ├── results-section.tsx          # Results list with delete
│       ├── clinical-items-section.tsx   # Reusable Sessions/Notes list
│       ├── create-invite.tsx            # Create invite form
│       └── edit-markdown-page.tsx       # MDX editor wrapper
├── a/[token]/
│   ├── page.tsx                         # E8 — Patient-facing assessment form
│   └── _components/
│       ├── assessment-form.tsx          # Form: fields → score → save → redirect
│       └── field-renderer.tsx           # Dynamic field renderer by type
├── agent/
│   ├── page.tsx                         # E14 — Agent Chat
│   └── _components/
│       ├── agent-chat.tsx               # Chat bubbles + quick-inject buttons
│       └── agent-sidebar.tsx            # Filesystem tree sidebar
└── editor/[slug]/
    ├── page.tsx                         # E10 — Assessment Editor
    └── _components/
        ├── metadata-form.tsx
        ├── fields-tab.tsx
        ├── scoring-tab.tsx
        └── chart-tab.tsx

components/
├── app-nav.tsx                          # Top nav: Profile, Assessments, Results, Sessions, Notes
├── hermes-prompt-hint.tsx               # Collapsible green AI prompt hint
├── result-chart.tsx                     # Chart dispatcher: severity_bar, domain_bars, etc.
└── ui/                                  # shadcn/ui (luma dark)

lib/
├── domain/       # _schema.ts, _enums.ts           Zod entities + inferred types
├── data/         # measures.ts, patients.ts, patients-server.ts, _repository.ts
├── scoring/      # engine.ts                       total/avg/T-score/severity/data-quality
├── invites/      # token.ts                        32-char URL-safe token
├── ai/           # hermes-client.ts, _env.ts        Hermes Gateway HTTP client
├── scope/        # _atoms.ts, guard.ts, validate.ts Patient-scope guard
├── state/        # _atoms.ts                        Global Jotai atoms
├── actions/
│   ├── patient-files.ts               # readDemographics, saveDemographics, readConsent, saveConsent
│   ├── clinical-files.ts              # readClinicalFile, saveClinicalFile, saveClinicalFileWithBackup
│   ├── clinical-notes.ts              # createClinicalItem, listClinicalItems, saveClinicalItem, deleteClinicalItem
│   ├── result-files.ts                # saveResultFile, readResultFile, listResultFiles, updateResultFile, moveResultToDeleted
│   ├── invite-files.ts                # saveInviteFile, listInviteFiles, getInviteByToken, updateInviteFile, deleteInviteFile
│   ├── create-patient.ts              # Create patient profile.json
│   └── assessment-files.ts            # Delete custom assessments
└── utils.ts                            # cn()

scripts/corpus/                          # E3 — template pipeline
├── generate-templates.py               # corpus .md → data/shared/templates/json/
└── build-index.py                      # → data/shared/templates/index.json

data/
├── corpus/assessment-measures/*.md     # 68 verified DSM-5-TR corpus files
├── shared/
│   ├── templates/
│   │   ├── json/<slug>.json            # Schema-conformant Measure templates
│   │   ├── index.json                  # Template catalog
│   │   └── md/
│   │       ├── session-template.json   # Default session template
│   │       └── note-template.json      # Default note template
│   └── assessments/<id>.json           # AI-generated custom assessments
├── patients/<id>/
│   ├── profile.json                    # Demographics
│   ├── consent.json                    # Consent status
│   ├── clinical-summary.md             # Editable clinical summary
│   ├── clinical-background.md          # Editable clinical background
│   ├── care-plan.md                    # Editable care plan
│   ├── version/<type>-{ts}.md          # Versioned backups
│   ├── invites/<ts>-<token>.json       # Assessment invites
│   ├── results/
│   │   ├── taken-<ts>-<slug>.json      # Scored results
│   │   └── results-deleted/            # Deleted results (moved, not erased)
│   ├── sessions/<ts>-<itemId>.json     # Session notes
│   ├── sessions-deleted/               # Deleted sessions
│   ├── notes/<ts>-<itemId>.json        # Clinical notes
│   └── notes-deleted/                  # Deleted notes
└── patients-deleted/<ts>-<patientId>/   # Deleted patients (moved, not erased)

.hermes/
├── skills/mental-health/               # 15 mental-health skills (SKILL.md + references/)
├── plugins/
│   └── hermes-mental-health/           # plugin.yaml + tools.py + schemas.py
├── hooks/                              # patient-scope-guard.sh, output-privacy-review.sh
├── agents/                             # assessment-review, patient-intake, patient-progress-weekly, privacy-audit
├── commands/                           # /assess, /intake, /progress, /safety-check, /privacy-audit
└── skill-bundles/                      # 5 bundles mapping agent names → skills
```

**Naming conventions:**
- `_schema.ts` / `_actions.ts` / `_atoms.ts` / `_enums.ts` — route-segment or module private exports
- `_components/` — route-segment private components
- Jotai atoms live in `_atoms.ts`; Zod schemas in `_schema.ts`
- Pipeline scripts live in `scripts/corpus/`; generated artifacts in `data/shared/templates/`
- File naming: `taken-yyyy-mm-dd-hh-mm-ss-<slug>.json` (results), `<ts>-<itemId>.json` (sessions/notes)
- Deleted: `deleted-<ts>-<original-filename>` (moved, never truly deleted)

---

## Tech Stack

| Layer | Tech | Purpose |
| --- | --- | --- |
| Framework | Next.js (App Router, TS strict) | File-routed, server-component-first app |
| UI | shadcn/ui | Accessible component primitives |
| Theme | shadcn "luma" preset — **dark only** | Dark oklch design tokens, radius, fonts |
| Styling | Tailwind CSS | Utility styling driven by luma tokens |
| State | Jotai | Atomic client state (active patient, UI) |
| Forms | React Hook Form + Zod | Single-source schemas → types + validation |
| Charts | shadcn Chart (Recharts) | Severity bars, domain bars, trend lines |
| Markdown Edit | @mdxeditor/editor v4 | Rich clinical markdown editing |
| Markdown View | react-markdown | Read-only clinical document rendering |
| Toasts | sonner | Copy-link / submit confirmations |
| AI Integration | Hermes Gateway (`:8642`) | HTTP REST API for agent runs |
| Data | File-backed JSON/MD on disk | No database, no localStorage |
| Pipeline | Python scripts (`scripts/corpus/`) | Markdown corpus → JSON templates |

> Note: there is **no** `next-themes` / theme toggle — the app is intentionally dark-only.
> There is **no** `next/dynamic` for MDX editor — props drop in SSR-off serialization.

---

## Data & Persistence

| Concern | Approach | Location |
| --- | --- | --- |
| Templates | Generated from DSM-5-TR corpus | `data/shared/templates/json/*.json` |
| Custom Assessments | AI-generated via Hermes Gateway | `data/shared/assessments/*.json` |
| Patients | Seed + filesystem overlay | `data/patients/<id>/profile.json` |
| Demographics | Read/write via server actions | `lib/actions/patient-files.ts` |
| Consent | Read/write via server actions | `lib/actions/patient-files.ts` |
| Clinical Docs | Read/write markdown; versioned backups | `lib/actions/clinical-files.ts` |
| Invites | File-backed JSON | `data/patients/<id>/invites/` |
| Results | File-backed JSON with scoring | `data/patients/<id>/results/` |
| Sessions | File-backed JSON with MDX content | `data/patients/<id>/sessions/` |
| Notes | File-backed JSON with MDX content | `data/patients/<id>/notes/` |
| Scoring | Pure engine | `lib/scoring/engine.ts` |
| Patient Scope | Active-patient atom + guard | `lib/scope/` |
| Invite Links | 32-char URL-safe tokens | `/a/<token>` |
| Delete | Move to `*-deleted/` folder | Never truly deleted |

---

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| Next.js dev/prod | `3000` | `http://localhost:3000` |
| Hermes Gateway | `8642` | `API_SERVER_ENABLED=true API_SERVER_KEY=change-me-local-dev hermes gateway` |
| Invite link shape | n/a | Patient-facing route is `/a/<32-char-token>` |

---

## Non-Negotiable Rules

1. **Patient scope is sacred.** Exactly one patient active per session. All scoped reads through `assertScoped`.
2. **Validate every patient id** with `validatePatientId` at route boundaries.
3. **Zod is the single source of truth.** Derive TS types via `z.infer`.
4. **No PHI leakage.** Synthetic patient data only. Never send patient-scoped data to the LLM.
5. **Dark mode only.** No light theme or theme toggle. `<html class="dark">` is unconditional.
6. **Templates are generated.** Don't hand-author measure definitions — they come from the corpus pipeline.
7. **File-backed only.** No localStorage, no dual-writes, no database. JSON/MD on disk is the single source of truth.
8. **English for all clinical output.** All skills, summaries, patient-facing content in English.
9. **AI markdown: zero preamble.** Generated content starts with `#` or `##` — no "Written to..." or file paths.
10. **Delete = move.** Nothing is truly deleted. All deletions move files to `*-deleted/` folders.

---

## Code Style Rules

Enforced across `app/`, `components/`, and `lib/`.

| Rule | Detail |
|------|--------|
| **Indentation** | 2-space |
| **Quotes** | Single quotes (`'`) for all JS/TS strings. JSX attributes use double quotes (`"`). |
| **Semicolons** | None. No trailing semicolons. |
| **Trailing commas** | Always in multi-line objects, arrays, and parameter lists. |
| **Exports** | Named exports only (`export const`, `export async function`). `export default` allowed ONLY for `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`. |
| **Path alias** | Always `@/` — never relative imports up more than one level. |
| **Route files** | Underscore prefix: `_actions.ts`, `_schema.ts`, `_hooks.ts`, `_atoms.ts`, `_types.ts`, `_utils.ts`, `_constants.ts`. |
| **Components** | Folder `_components/` with kebab-case file names, PascalCase component names. One component per file. |
| **Function style** | `const` arrow functions for components: `export const MyComponent = (props) => {}`. Destructure props in signature. |
| **Types** | Colocate with their route. Only extract to `lib/` if used by 3+ routes. |
| **Schemas** | `export const <Name>Schema = z.object({...})` + `export type <Name> = z.infer<typeof <Name>Schema>`. |
| **Actions** | `export async function <verbNoun>(...)` — e.g., `createPosition`, `updateProfile`. |
| **Server directives** | `'use server'` / `'use client'` at top of file with single quotes. |

### Code style lint command

```bash
npx tsc --noEmit          # TypeScript type-checking (must pass before commit)
npm run lint              # ESLint
```

---

## Changelog

| Date | Change | Author |
| --- | --- | --- |
| 2026-06-20 | Initial spec: 12 epics covering Parts 1–6 as Next.js app | @dev |
| 2026-06-27 | Migrated to file-backed architecture; removed localStorage | @dev |
| 2026-06-27 | Added E13 (Sessions & Notes), E14 (Agent Chat), E15 (MDX Editor) | @dev |
| 2026-06-27 | Added E16 (.hermes Agent Infrastructure — 15 skills) | @dev |
| 2026-06-28 | All 48 stories completed; 16 epics at 100% | @dev |
| 2026-06-28 | Updated architecture tree to reflect current codebase layout | @dev |
| 2026-06-28 | Created docs/ with per-page documentation and screenshots | @dev |
| 2026-06-28 | Code style refactor: single quotes, no semicolons, `@/` paths, named exports, arrow functions, trailing commas | @dev |