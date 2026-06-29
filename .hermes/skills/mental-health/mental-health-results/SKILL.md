---
name: mental-health-results
description: Results display and data-quality management — render score tables, item-level answer breakdowns, severity charts, and trend lines. Detect and flag data-quality issues.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, results, scoring, charts, data-quality]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-assessment-review
---

# Mental Health Results

## When to use

Use when the practitioner needs to:
- Display a patient's assessment results
- Render the correct chart for a scorer's result
- Show item-level answer breakdowns
- Flag data-quality issues
- Compare results across time (trend lines)

## Results table

| Column | Description |
|--------|-------------|
| Assessment | Measure title + slug |
| Score | Formatted as "Total: N", "Avg: N.N", or "T: N.N" |
| Severity | Color-coded badge (green/yellow/orange/dark-orange/red) |
| Data quality | Grey "Unscorable" badge if incomplete |

## Chart selection

The measure's `resultChart` field drives which visualization to render. All charts use **shared Recharts components** from `components/charts/` with shadcn `ChartContainer` — never hand-roll SVGs or divs.

| Chart type | Component | Measures |
|---|---|---|
| `severity_bar` | `SeverityBarChart` | PHQ-9, GAD-7, PCL-5, WHO-5, Level 2 cross-cutting |
| `t_score_gauge` | `TScoreGaugeChart` | PROMIS Level 2 (depression, anxiety, anger, sleep) |
| `domain_bars` | `DomainBarsChart` | Level 1 cross-cutting, WHODAS 2.0 |
| `none` | — | CFI, EDHB, qualitative measures |

Shared helpers in `components/charts/chart-helpers.ts`:
- `severityColors` — band→luma-token map (`var(--chart-1..5)`)
- `severityBadgeVariant()` — returns shadcn badge variant for a severity
- `computeSeverityBands()` — builds band slices from thresholds or fallback
- `computeDomainScores()` — extracts `{ domainName: { score, severity } }` from answers
- `resolveValueLabel()` — maps answer value to display label via field options

## Item-level answers

Responses are rendered with **field labels** (not raw field IDs) and **option labels**
(not raw numeric values). The helper `resolveValueLabel()` in `result-detail.tsx`
resolves:

- **scale**: maps numeric value → option label (e.g., `2` → "More than half the days")
- **select**: maps string value → option label
- **multi_select**: maps array of values → comma-separated option labels
- **boolean**: maps `true`/`false` → "Yes"/"No"
- **fallback**: raw value as string

Field labels come from `measure.fields[].label` via a lookup by field ID.

### Response Scale legend

Below the item-level answers, show a **Response Scale** legend extracting option labels from the first field's options:

```tsx
{measure?.fields[0]?.options && measure.fields[0].options.length > 0 && (
  <div className="mt-4 pt-3 border-t border-border space-y-1">
    <p className="text-xs font-medium text-muted-foreground mb-2">Response Scale</p>
    {measure.fields[0].options.map((opt) => (
      <div key={String(opt.value)} className="flex items-center gap-2 text-xs">
        <span className="font-mono font-medium min-w-[1.25rem]">{opt.value}</span>
        <span className="text-muted-foreground">= {opt.label}</span>
      </div>
    ))}
  </div>
)}
```

This displays e.g. `0 = Not at all`, `1 = Several days`, `2 = More than half the days`, `3 = Nearly every day`. Separated from answers by a top border for visual distinction.

## Practitioner edit mode

The result detail page supports inline editing of assessment responses by the practitioner.
This reuses the patient-facing `FieldRenderer` component and the `scoreResult()` engine.

### Flow
1. **Edit button** — visible in the Responses card header when `measure` prop is available
2. **Inline form** — `FieldRenderer` renders each field with its type-appropriate input
   (scale buttons, textarea, select, multi-select checkboxes, boolean radio)
3. **Save** — calls `scoreResult(measure, editAnswers)` to re-score, then
   `updateResult()` to persist in the result atom store
4. **Cancel** — discards edits, reverts to read-only view

### Component requirements
- `ResultDetail` receives `measure: Measure | null` as a prop from the server component
- Server page.tsx resolves the measure via `getMeasure(slug)` from seed data's `assessmentSlug`
- Imports `FieldRenderer` from `@/app/a/[token]/_components/field-renderer`
- Imports `scoreResult` from `@/lib/scoring/engine`
- Imports `updateResult` from `@/lib/data/_repository`
- Uses `useAtom(resultsAtom)` for write access (not just `useAtomValue(scopedResultsAtom)`)

### Pitfalls
- `resultsAtom` stores all patients' results keyed by patientId; `scopedResultsAtom` is read-only derived.
  To write, use `resultsAtom` directly via `useAtom`, then call `updateResult(updated, resultStore)`.
- Server component can only resolve measures from seed data. Runtime results (created via the
  patient form) won't have measure available on the server. The Edit button is gated on `measure` prop
  being non-null — graceful degradation for runtime results.

## Back navigation

The result detail page header includes a back button (to Results) and an **Agent button** (Bot icon, emerald, aligned opposite the back button). The Agent button opens a full-window modal with a context-aware prompt about that specific result (measure, score, severity). See `mental-health-dashboard` skill for the canonical Agent modal documentation (command format, skills mapping, API route).

## Implementation

Component: `app/patients/[id]/results/[resultId]/_components/result-detail.tsx`
- Receives `measure: Measure | null` prop from server page
- Reads `scopedResultsAtom` for the active patient
- Writes to `resultsAtom` via `updateResult()` for edit saves
- Dispatches chart type from `getMeasureMeta(slug).resultChart`
- Scores grid: Total, Average, T-Score, Severity badge
- Data quality flags in a muted block when present
- Item-level answers with field labels + option labels via `resolveValueLabel()`
- Inline edit mode reusing `FieldRenderer` + `scoreResult()`
- Back button navigates to patient profile Results tab

Helper: `severityLabel(severity: string): string` in `lib/domain/_enums.ts`
— returns human-readable label ("Moderately Severe", "Unscorable", etc.)

Helper: `resolveValueLabel(field, value): string` in `components/charts/chart-helpers.ts`
— maps answer value to display label using field option metadata. Import from `@/components/charts`.

Helper: `severityBadgeVariant(severity: string)` in `components/charts/chart-helpers.ts`
— returns shadcn badge variant for a severity band. Import from `@/components/charts`. Do not inline a local switch statement — use the shared function.

## References

- `references/tab-persistence.md` — URL + Jotai tab state persistence pattern for patient profile
- `references/chart-components.md` — Shared Recharts chart component architecture (SeverityBarChart, TScoreGaugeChart, DomainBarsChart)

## Score format by type

| Scoring type | Display format | Example |
|-------------|---------------|---------|
| Total | `Total: N` | `Total: 15` |
| Average | `Avg: N.N` | `Avg: 2.1` |
| T-score | `T: N.N` | `T: 84.0` |
| Unscorable | `Unscorable (reason)` | `Unscorable (incomplete)` |

## Data quality

Flags to surface in the results:
- `missing_required:<fieldId>` — required field left empty
- `incomplete` — >=50% required items missing
- `out_of_range` — answer outside min..max
- Always show the flag explanation alongside the result