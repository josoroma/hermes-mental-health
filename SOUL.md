# hermes-mental-health — SOUL.md

> **Next.js practitioner web app + Hermes Agent runtime for DSM-5-TR assessment management.**
> Re-implements Parts 1–6 of the original MVP as a shadcn/ui dark-mode app with a 68-measure
> corpus pipeline, local data layer, and a `.hermes` agentic infrastructure for clinical AI.

---

## Identity

| Field | Value |
|-------|-------|
| **Name** | `hermes-mental-health` |
| **Type** | Next.js (App Router, TypeScript) + Python scripts + Hermes agent skills |
| **Language** | TypeScript (strict), Python 3.12+ |
| **Purpose** | DSM-5-TR assessment management for mental health practitioners — dashboard, patient profiles, invites, forms, results, editor |
| **Data domain** | DSM-5-TR assessment measures — 68 validated corpus measures across 9 categories |
| **Primary consumer** | Mental health practitioners via Next.js web app; Hermes Agent via `.hermes/` skills and plugins |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   DSM-5-TR Corpus Pipeline                        │
│  68 Markdown corpus files → parse → JSON templates → index    │
│  scripts/corpus/{download,convert,verify,generate,build}          │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│               data/shared/templates/json/                         │
│  68 schema-conformant Measure JSON templates                      │
│  index.json — measure catalog                                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Next.js App      │ │  Scoring Engine  │ │  .hermes Runtime │
│  Dashboard        │ │  lib/scoring/    │ │  13 skills       │
│  Patient Profile  │ │  Total/Avg/T-score│ │  5 skill bundles │
│  Invites          │ │  Severity bands  │ │  4 agents        │
│  Forms            │ │  Data quality    │ │  2 hooks         │
│  Results          │ │  Result charts   │ │  1 plugin        │
│  Editor           │ │                  │ │  5 commands      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Project Structure

```
hermes-mental-health/
├── app/                          # Next.js App Router
│   ├── (dashboard)/page.tsx      # Part 1 — Dashboard
│   ├── patients/[id]/            # Part 2 — Profile, Part 3 invites
│   ├── a/[token]/                # Part 4 — patient-facing form
│   └── editor/[slug]/            # Part 6 — Assessment Editor
├── components/ui/                 # shadcn/ui (luma dark)
├── lib/
│   ├── domain/   _schema.ts       # Zod entities + inferred TS types
│   ├── scoring/  engine.ts        # Total/Avg/T-score/severity/data-quality
│   ├── data/     measures.ts      # Measure catalog loader
│   ├── invites/  token.ts         # 32-char URL-safe token generator
│   ├── scope/    guard.ts         # Patient-scope enforcement
│   └── state/    _atoms.ts        # Jotai atoms
├── data/
│   ├── corpus/assessment-measures/  # 68 verified .md corpus files
│   ├── shared/templates/json/       # 68 generated JSON templates
│   ├── shared/templates/index.json  # Measure catalog
│   └── shared/assessments/          # AI-generated (Create With AI)
├── scripts/corpus/
│   ├── generate-templates.py        # Corpus → JSON templates
│   └── build-index.py               # → index.json + coverage report
├── .hermes/                         # Hermes Agent runtime
│   ├── agents/                      # 4 named agent configs
│   ├── commands/mental-health.md    # 5 slash commands
│   ├── hooks/                       # 2 agent hooks
│   ├── plugins/hermes-mental-health/ # Plugin (tools.py, schemas.py)
│   ├── skill-bundles/               # 5 skill bundles
│   ├── skills/mental-health/        # 13 mental-health skills
│   └── config.yaml                  # Provider/model config
├── AGENTS.md                        # Canonical agent context
├── CLAUDE.md                        # Claude Code config
├── SOUL.md                          # This file
├── SPECS.md                         # Feature plan (12 epics, 38 stories)
├── Makefile                         # Local-first orchestration
└── README-MENTAL-HEALTH-PY.md       # Domain + original MVP background
```

---

## .hermes Mental Health Infrastructure

### Agent Hooks (`hooks/`)

| Hook | Trigger | Purpose |
|------|---------|---------|
| `patient-scope-guard.sh` | Pre-tool | Blocks cross-patient access (one patient per session) |
| `output-privacy-review.sh` | Post-response | Scans output for accidental PHI before delivery |

### Agents (`agents/`)

| Agent | Skills | Purpose |
|-------|--------|---------|
| `assessment-review` | core + assessment-review + patient-summary | Score submissions, render charts, interpret |
| `patient-intake` | core + patient-summary | New patient workspace, clinical background, measure recommendations |
| `patient-progress-weekly` | core + patient-summary | Weekly progress, trend lines, narrative notes |
| `privacy-audit` | core | PHI scan, scope verification, audit report |

### Slash Commands (`commands/mental-health.md`)

| Command | Purpose |
|---------|---------|
| `/assess <patient-id> <measure>` | Assessment review + scoring + interpretation |
| `/intake <patient-id>` | Patient intake workflow |
| `/progress <patient-id>` | Weekly progress summary |
| `/safety-check <patient-id>` | Safety screening (PHQ-9 item 9, crisis flags) |
| `/privacy-audit` | Session output PHI audit |

### Plugin (`plugins/hermes-mental-health/`)

| File | Purpose |
|------|---------|
| `plugin.yaml` | Manifest — corpus roots, smart context, source formats |
| `__init__.py` | Exports tools and schemas |
| `tools.py` | 7 clinical tools: `validate_patient_id`, `list_patients`, `list_assessments`, `score_submission`, `generate_clinical_summary`, `assess_patient` |
| `schemas.py` | Domain dataclasses: `PatientRecord`, `AssessmentMeasure`, `ScoringOutput`, `AssessmentResult` |

### Skill Bundles (`skill-bundles/`)

| Bundle | Skills | Purpose |
|--------|--------|---------|
| `mental-health` | All 13 | Full mental-health session |
| `assessment-review` | 3 | Scoring + charts + interpretation |
| `patient-session` | 5 | Profile + invites + results + care plan |
| `care-plan` | 4 | Treatment goals + interventions + follow-up |
| `safety-check` | 3 | PHQ-9 item 9 + SI/HI + crisis plan |

### Skills (`skills/mental-health/`) — 13 total

| # | Skill | Description |
|---|-------|-------------|
| 1 | `mental-health-core` | Domain vocabulary, measures, severity bands, scoping rules |
| 2 | `mental-health-scoping` | Patient scope discipline (one per session) |
| 3 | `mental-health-commands` | Slash command workflows |
| 4 | `mental-health-assessment-review` | Scoring, charts, interpretation, data quality |
| 5 | `mental-health-patient-summary` | Clinical summaries, progress notes, intake |
| 6 | `mental-health-assessment-invite` | Token generation, invite lifecycle |
| 7 | `mental-health-results` | Results tables, chart selection, data quality |
| 8 | `mental-health-editor` | Measure metadata, fields, scoring rules, Create With AI |
| 9 | `mental-health-dashboard` | Patient table, assessment library, nav |
| 10 | `mental-health-care-plan` | Treatment goals, interventions, follow-up |
| 11 | `mental-health-safety` | Suicide risk, crisis flags, safety plans |
| 12 | `mental-health-corpus` | DSM-5-TR template pipeline, corpus → JSON templates |
| 13 | `mental-health-video` | Walkthrough videos, screencasts, GitHub Pages |

---

## Key Commands

### Next.js app

```bash
npm install              # install dependencies
npm run dev              # dev server → http://localhost:3000
npm run build            # production build
npm run typecheck        # tsc --noEmit
```

### Hermes Agent runtime

```bash
# Chat with default mental-health skills
make hermes-chat

# Dashboard at http://127.0.0.1:9120
make hermes-dashboard

# Launch Hermes Desktop with this repo's .hermes/
make hermes-desktop

# Chat with a specific skill bundle
make hermes-chat-bundle BUNDLE=assessment-review
make hermes-chat-bundle BUNDLE=safety-check

# Named agents
make agent-assessment-review
make agent-patient-intake
make agent-patient-progress
make agent-privacy-audit

# Test hooks
make hooks-test
```

### Corpus pipeline

```bash
# Full sync: corpus → templates → index
make dsm-corpus-sync

# Individual steps
make dsm-corpus-generate-templates    # Corpus .md → JSON templates
make dsm-corpus-build-index           # → index.json + coverage
make dsm-corpus-generate-templates    # Corpus .md → JSON templates
make dsm-corpus-build-index           # → index.json + coverage
```

---

## Dependencies

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router, TypeScript strict) |
| UI | shadcn/ui (luma preset, dark mode only) |
| State | Jotai (atomWithStorage for persistence) |
| Forms | React Hook Form + Zod + @hookform/resolvers |
| Charts | shadcn Chart (Recharts) |
| Toasts | sonner |
| AI (external) | Hermes Agent over WebSocket (Create With AI) |
| Corpus scripts | Python 3.12+ (stdlib: json, re, pathlib) |

---

## Environment Constraints

- **Dark mode only** — `<html class="dark">` is unconditional; no theme toggle
- **Patient scope** — Exactly one patient active per session; cross-patient reads throw `PatientScopeError`
- **Synthetic data only** — No real PHI; seed patients are generated
- **Local-first** — No cloud dependencies; assessment templates generated offline
- **Templates are generated** — Don't hand-author measures; they come from `scripts/corpus/generate-templates.py`
- **Zod is single source of truth** — Derive TS types via `z.infer`; never hand-write interfaces
- **Language** — Clinical output in Spanish; technical artifact names in English

---

## Data Format

### Measure template (`data/shared/templates/json/<slug>.json`)

```json
{
  "slug": "severity-depression-adult",
  "title": "Severity Measure for Depression—Adult",
  "description": "Adapted from the Patient Health Questionnaire–9 (PHQ-9)",
  "version": "1.0.0",
  "instructions": "",
  "resultChart": "severity_bar",
  "fields": [
    {
      "id": "item_1",
      "label": "Little interest or pleasure in doing things",
      "type": "scale",
      "required": true,
      "min": 0,
      "max": 3,
      "options": [
        {"value": 0, "label": "Not at all"},
        {"value": 1, "label": "Several days"},
        {"value": 2, "label": "More than half the days"},
        {"value": 3, "label": "Nearly every day"}
      ]
    }
  ],
  "scoringRule": {
    "calculation": "total",
    "maxScale": 3,
    "severityThresholds": {
      "none": [0, 4], "mild": [5, 9], "moderate": [10, 14],
      "moderately_severe": [15, 19], "severe": [20, 27]
    },
    "reverseScoredItems": [],
    "requiredFields": ["item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "item_7", "item_8", "item_9"],
    "t_score": false
  }
}
```

### Patient data (`data/processed/patients/<id>/`)

```
profile.json         # Demographics, clinical background, consent
assessments/          # Invite records (JSON)
results/              # Scored JSON submissions
care-plan/            # Versioned Markdown care plans
sessions/             # Session notes, transcripts
```

---

## Conventions

1. **Patient scope is sacred** — one patient per session; `assertScoped(patientId)` on all reads
2. **Validate every patient ID** — `validatePatientId()` at route boundaries
3. **Zod is the single source of truth** — derive TS types via `z.infer`
4. **No PHI leakage** — synthetic data only; the only external call is Hermes Agent WebSocket
5. **Dark mode only** — no light theme, no theme toggle
6. **Templates are generated** — `npm run corpus` or `make dsm-corpus-sync`
7. **Charts via shadcn/Recharts** — `ChartContainer`, `ChartConfig`, `ChartTooltip`; no hand-rolled SVG
8. **Server Components by default** — add `"use client"` only for state/interactivity
9. **Clinical output in Spanish** — code, slugs, field IDs in English
10. **Corpus dictates templates** — measures, fields, scores, and chart types derive from `data/corpus/`

---

## Visual Identity

Built with the **shadcn/ui luma preset** (`https://ui.shadcn.com/create?preset=b2D0wqNxT`):

| Token | Purpose |
|-------|---------|
| `--chart-1` | Green — severity: none |
| `--chart-2` | Yellow — severity: mild |
| `--chart-3` | Orange — severity: moderate |
| `--chart-4` | Dark orange — severity: moderately severe |
| `--chart-5` | Red — severity: severe |
| Grey tokens | Severity: unscorable, data quality flags |