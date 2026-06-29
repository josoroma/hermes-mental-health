# Custom Assessments from Filesystem

## Location
Custom assessments are JSON files in `data/shared/assessments/<slug>.json`.

## Loading

Custom assessments are loaded via `lib/data/custom-assessments.ts` (server-only):

```ts
import { loadCustomMeasure, loadAllCustomMeasures } from "@/lib/data/custom-assessments";

// Single measure
const measure = loadCustomMeasure("incarcerated"); // Measure | undefined

// All measures
const all = loadAllCustomMeasures(); // Measure[]
```

## List for dashboard

`lib/data/measures.ts` → `listCustomAssessments()` returns a summary list matching
the same shape as `listMeasures()` (slug, title, description, version, fieldCount,
resultChart, scoringType). Used by the dashboard to render the "Custom Assessments"
section.

## Editor integration

The editor route (`/editor/[slug]`) supports custom assessments:
1. Try `getMeasure(slug)` (template catalog)
2. Fall back to `loadCustomMeasure(slug)` (custom assessments dir)

`MetadataForm` accepts both `slug` and `measure` props — uses the full measure
object for custom assessments when template metadata (`getMeasureTitle`) returns null.

## AI generation

Custom assessments are created via "Create With AI" → Hermes Agent API generation
→ saves to `data/shared/assessments/<slug>.json` with schema validation.

## Display order

Dashboard shows: **Custom Assessments** first, then **Available Assessments** (DSM-5-TR templates).
Combined count in header: `measures + customAssessments`.