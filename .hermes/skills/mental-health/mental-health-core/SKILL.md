---
name: mental-health-core
description: Core DSM-5-TR mental health domain knowledge — measures, severity bands, scoring, patient scoping, and clinical vocabulary. Must be loaded for any mental-health session.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags:
      - mental-health
      - dsm-5-tr
      - clinical
      - assessment
    category: mental-health
    related_skills:
      - mental-health-assessment-review
      - mental-health-patient-summary
      - mental-health-scoping
    config:
      patient_root: data/patients
      template_root: data/shared/templates
      corpus_root: data/corpus/assessment-measures
---

# Mental Health Core

## When to use

Load this skill for any mental-health session. It provides the foundational domain vocabulary, measure catalog, severity classification, and patient-scoping rules that all other mental-health skills depend on.

## Domain vocabulary

### Measures
- **PHQ-9** — Patient Health Questionnaire: depression severity (9 items, 0-27 range)
- **GAD-7** — Generalized Anxiety Disorder: anxiety severity (7 items, 0-21 range)
- **PCL-5** — PTSD Checklist: trauma symptom severity (20 items, 4 clusters)
- **WHO-5** — Well-Being Index: subjective psychological well-being (5 items, 0-25 raw)
- **PROMIS** — Patient-Reported Outcomes: T-score based (e.g., Anxiety, Depression, Sleep)
- **DSM-5-TR Level 1** — Cross-cutting symptom measure (multi-domain)
- **DSM-5-TR Level 2** — Domain-specific severity measures (adult, parent, child)
- **CFI** — Cultural Formulation Interview (qualitative)
- **WHODAS 2.0** — Disability assessment (12 or 36 items)
- **PID-5** — Personality Inventory (220 items, 25 facets, 5 domains)

### Severity bands

| Band | Range (PHQ-9) | Color |
|------|--------------|-------|
| None | 0-4 | Green |
| Mild | 5-9 | Yellow |
| Moderate | 10-14 | Orange |
| Moderately severe | 15-19 | Dark orange |
| Severe | 20-27 | Red |
| Unscorable | — | Grey |

### Field types
- `scale` — Radio buttons with labeled endpoints (min..max range)
- `text` — Free-text textarea
- `select` — Single dropdown
- `multi_select` — Checkboxes for multiple choices
- `boolean` — Yes/No toggle

### Result chart types
- `severity_bar` — Horizontal bar with 5 severity bands + score marker
- `t_score_gauge` — Gauge/marker on PROMIS T-score scale (M=50, SD=10)
- `domain_bars` — Grouped bars for multi-domain measures (Level 1 cross-cutting)
- `trend_line` — Score-over-time line chart for repeat administrations
- `none` — No chart (free-text/unscored measures)

### Scoring types
- **Total** — Sum of all item scores (PHQ-9, PCL-5)
- **Average** — Mean score across items (GAD-7 severity)
- **T-score** — PROMIS standardized score (M=50, SD=10, range ~20-80)
- **Domain max** — Highest score within each symptom domain (Level 1 cross-cutting)
- **Reverse scoring** — Items scored in reverse (higher = better), flipped before totaling

### Data quality flags
- `missing_required` — Required field left empty
- `incomplete` — Submission missing one or more items
- `unscorable` — Cannot compute valid score due to missing data
- `out_of_range` — Answer outside allowed min..max

## Patient scoping

**One patient per session.** The `activePatientIdAtom` holds the current patient.
All repository reads for scoped collections (invites, results) must pass through
`assertScoped(patientId)`, which throws `PatientScopeError` on mismatch.

Patient IDs must pass `validatePatientId()`:
- 1-64 alphanumeric chars + hyphens + underscores
- No path traversal (`..`, `/`, `\\`)
- No special chars except `-` and `_`

## Data layout

```
data/patients/<patient-id>/
├── profile.json              # Demographics only (name, ageRange, gender, timestamps)
├── consent.json              # Consent status + timestamps
├── clinical-summary.md       # Practitioner-editable clinical summary (Markdown)
├── clinical-background.md    # Practitioner-editable clinical background (Markdown)
├── assessments/              # Invite records (JSON)
└── results/                  # Scored submission JSON files

Seed patients live in lib/data/patients.ts (SEED_PATIENTS, SEED_RESULTS, SEED_INVITES).
Runtime-created patients are persisted under data/patients/<id>/.
listAllPatients() (server-only, lib/data/patients-server.ts) merges seed + filesystem.
getPatientById() (server-only) checks seed first, then filesystem profile.json.

data/shared/templates/
├── index.json            # Measure catalog (68 entries, 100% coverage)
└── json/<slug>.json      # Schema-conformant Measure templates (JSON-only)

data/shared/assessments/
└── <id>.json             # AI-generated shared assessments (Hermes agent via WebSocket)

data/corpus/assessment-measures/
├── manifest.json          # 68-measure catalogue
├── *.md                  # 68 verified Markdown corpus files
```

### Server/client boundary

- `lib/data/patients.ts` — client-safe (seed data only, no `fs`). Imported by atoms, client components.
- `lib/data/patients-server.ts` — server-only (`"server-only"` + `fs`). Imported by server page components.
- `lib/actions/patient-files.ts` — server actions for reading/writing profile.json and consent.json.
- `lib/actions/clinical-files.ts` — server actions for reading/writing clinical-*.md files.
- `lib/actions/create-patient.ts` — server action that writes new patient profile.json.

## Language

The user is a mental health practitioner. All clinical interpretations,
summaries, and patient-facing content should be in English. Technical artifact names
(slugs, file paths, field IDs) remain in English.

## References

- `references/scoring-guide.md` — Detailed scoring procedures for each measure
- `references/severity-bands.md` — Severity band definitions and thresholds
- `references/field-types.md` — Field type rendering and validation rules
- `references/corpus-pipeline.md` — Corpus .md → JSON templates → index.json sync pipeline
- `references/zod-form-compatibility.md` — zod@4 vs @hookform/resolvers compatibility pitfall
- `references/nextjs-client-patterns.md` — Client-safe data loading, fs boundary, static JSON imports
- `references/patient-file-structure.md` — Patient data files: profile.json, consent.json, clinical-*.md, server actions
- `references/hermes-tool-pitfalls.md` — patch tool escape-drift, execute_code quirks, batch workflow
- `references/inline-editing-patterns.md` — Inline edit (no modal) for simple forms: Demographics + Consent
- `references/hydration-patterns.md` — SSR-safe patterns: useSearchParams, atomWithStorage, useHydrateAtoms
- `references/recharts-pitfalls.md` — Vertical BarChart: YAxis required, barSize, labels, margins
- `references/tab-state-pattern.md` — Tab persistence: Jotai atom + URL search params + Suspense
- `references/edit-result-pattern.md` — Edit assessment answers: server measure prop, re-score, resolve labels
- `references/mdx-editor-integration.md` — MDX Editor: SSR client-only loading, dark theme CSS (hashed class names), portal popups, code blocks, button-inside-button pitfall, full-page editor route
- `references/severity-bar-div.md` — Div-based severity bar (preferred over Recharts stacked bars/gradients)
- `references/shared-assessment-template-format.md` — JSON schema for shared assessment templates: field types, resultChart requirements, scoringRule, index.json update procedure
## Utility functions

### severityLabel(severity: string): string
Located in `lib/domain/_enums.ts`. Converts severity band values to human-readable labels
(none→None, mild→Mild, moderate→Moderate, moderately_severe→Moderately Severe, severe→Severe, default→Unscorable).
Use this instead of inlining switch statements in every component.

### getMeasureTitle(slug: string): string | undefined
Located in `lib/data/measure-meta.ts`. Client-safe measure name lookup from the static `index.json`.
Use this in client components instead of importing from `lib/data/measures.ts` which uses `fs`.
The index.json is imported at build time via static `import`, avoiding the Next.js client/server `fs` boundary.