---
name: mental-health-editor
description: Assessment Editor workflows — edit measure metadata (title, slug, description, version), manage field definitions (add/reorder/remove), and configure scoring rules (thresholds, T-score lookup, reverse scoring).
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, editor, authoring, measures]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-assessment-review
---

# Mental Health Assessment Editor

## When to use

Use when the practitioner needs to:
- Edit an existing measure's metadata
- Add, remove, or reorder field definitions
- Configure scoring rules (severity thresholds, T-score lookup, reverse items)
- Create a new shared assessment (via Create With AI)

## Editor sections

### Metadata
- **Title** — Full DSM-5-TR measure name
- **Slug** — URL-friendly ID (auto-derived from title)
- **Description** — Clinical purpose and target population
- **Version** — Semantic version
- **Instructions** — Administration guidance shown to patient before form
- **resultChart** — Which visualization to render for results

### Fields
Each field has:
- **id** — Unique within the measure (e.g., `item_1`, `item_2`)
- **label** — The question/prompt text
- **type** — `scale | text | select | multi_select | boolean`
- **required** — Whether the patient must answer
- **options** — For select/multi_select: array of {value, label}
- **min / max** — For scale: the numeric range
- Fields are ordered; reorder support via drag or move-up/move-down

### Scoring rules
- **calculation** — `total` or `average`
- **maxScale** — Highest possible value per item (for reverse scoring)
- **severityThresholds** — Map of band name → [min, max] range
- **reverseScoredItems** — Array of field IDs to reverse before totaling
- **tScoreLookup** — PROMIS raw → T-score mapping table
- **requiredFields** — Fields that must be answered for the result to be scorable

## Create With AI

The Hermes agent generates shared assessment **JSON** via WebSocket at
`HERMES_ASSESSMENT_AI_URL`. Generated JSON is validated against the `Measure`
Zod schema and persisted to `data/shared/assessments/<id>.json`.

The agent receives: `{ assessmentId, prompt, model }` and streams JSON output.
Never send patient-scoped data to the agent — only the assessment ID + prompt.

## Implementation

Component: `app/editor/[slug]/` — 4-tab layout (Metadata / Fields / Scoring / Chart)

### Editor header

The editor header shows a back link, the assessment title + slug, and the **Agent button** which links to `/agent?editor&slug=${slug}` (a dedicated page route, not a modal).

When the agent chat page receives `editor` + `slug` query params, the textarea is **pre-filled** with a context-aware prompt:

> Edit the **{slug}** assessment template using your .hermes agents and mental-health skills. Review the current template configuration and suggest improvements for the metadata, fields, scoring rules, and chart settings.

This pre-fill is implemented in `app/agent/_components/agent-chat.tsx` using a `useState` lazy initializer that checks `searchParams`. From non-editor pages, the textarea starts empty.

### Data loading

The server component (`page.tsx`) loads the full measure from the template JSON via `getMeasure(slug)` from `lib/data/measures.ts` (server-only, filesystem). The `Measure` object is passed as a prop to the client `EditorPage` component.

### Metadata tab
Reads from `getMeasureMeta(slug)` (client-safe static import from `index.json`).

### Fields tab
Renders each field using `FieldRenderer` (the same component used in the patient assessment form and result edit mode). Fields are displayed as interactive form elements (scale buttons, selects, etc.) in read-only mode — `value={undefined}` and `onChange={() => {}}` to render the widgets without accepting input.

```tsx
import { FieldRenderer } from "@/app/a/[token]/_components/field-renderer";
// ...
{measure.fields.map((field, idx) => (
  <div key={field.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
    <div className="flex items-start gap-2 mb-1">
      <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">{idx + 1}.</span>
      <FieldRenderer field={field} value={undefined} onChange={() => {}} />
    </div>
  </div>
))}
```

### Scoring tab
Displays full scoring configuration from the template JSON: calculation method, max scale, T-score status, diagnostic threshold, severity thresholds table, reverse-scored items, and required fields.

### Chart tab
Renders a **Chart Preview** using the same custom HTML/CSS severity bar as the result detail page, but with a computed sample score (mid-range, typically `Math.floor(fields.length * 1.4)`). Shows the full severity bar with colored band segments, a score indicator line, and severity labels below. For `t_score_gauge` measures, renders a T-score gauge with a sample value of 55.