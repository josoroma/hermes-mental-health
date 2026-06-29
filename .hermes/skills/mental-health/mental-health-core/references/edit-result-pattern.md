# Edit Assessment Result Pattern

Practitioners can edit a patient's assessment answers from the result detail page.

## Architecture

1. **Server page** loads the `Measure` (with field definitions) from seed data using `getMeasure(slug)` and passes it as a prop to the client component
2. **Client component** uses the measure to render editable fields with `FieldRenderer`
3. **On save**, re-scores via `scoreResult()` and updates the atom store

## Server component (page.tsx)

```tsx
// app/patients/[id]/results/[resultId]/page.tsx
import { getMeasure } from "@/lib/data/measures";
import { SEED_RESULTS } from "@/lib/data/patients";

export default async function ResultPage({ params }) {
  const { id, resultId } = await params;
  
  let measure: Measure | undefined;
  const seedResult = (SEED_RESULTS[id] ?? []).find(r => r.resultId === resultId);
  if (seedResult) measure = getMeasure(seedResult.assessmentSlug);
  
  return <ResultDetail measure={measure ?? null} />;
}
```

## Client component (result-detail.tsx)

```tsx
interface ResultDetailProps {
  measure: Measure | null;
}

export function ResultDetail({ measure }: ResultDetailProps) {
  const result = /* from scopedResultsAtom */;
  const [isEditing, setIsEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<Record<string, unknown>>({});

  const handleEditStart = () => {
    setEditAnswers({ ...result.answers });
    setIsEditing(true);
  };

  const handleEditSave = () => {
    const scoring = scoreResult(measure, editAnswers);
    scoring.patientId = result.patientId;
    const updated = { ...result, answers: editAnswers, scoring };
    setResultStore(updateResult(updated, resultStore));
    setIsEditing(false);
  };
```

## Repository

```ts
// lib/data/_repository.ts
export function updateResult(result: Result, store: Record<string, Result[]>): Record<string, Result[]> {
  const idx = (store[result.patientId] ?? []).findIndex(r => r.resultId === result.resultId);
  if (idx === -1) return store;
  return { ...store, [result.patientId]: [...before, result, ...after] };
}
```

## Response display with labels

When NOT editing, responses show field labels and option labels (not raw IDs/values):

```tsx
const field = measure?.fields.find(f => f.id === id);
const label = field?.label ?? id;
const displayValue = resolveValueLabel(field, value);
// e.g., "Little interest or pleasure in doing things" → "Several days"
```

`resolveValueLabel()` maps scale/select values to their option labels, shows "Yes"/"No" for booleans, and handles multi_select arrays.

## Edit button visibility

Only shows when `measure` is available (i.e., the result's assessment slug matches a known seed measure). Runtime-created results with unknown measures won't show the edit button.