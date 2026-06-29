# Result File Persistence

Results are stored as JSON files on disk, NOT in localStorage.

## File naming

```
data/patients/<patientId>/results/<yyyy-mm-dd-hh-mm-ss>-<slug>.json
```

Example: `data/patients/patient-002/results/2026-06-21-15-34-14-level2-mania-adult.json`

## File format

```json
{
  "resultId": "result-1782077654282-nr9gyw",
  "inviteToken": "7cce33a7d5c24820815f82d338262658",
  "patientId": "patient-002",
  "assessmentSlug": "level2-mania-adult",
  "scoring": {
    "assessmentSlug": "level2-mania-adult",
    "patientId": "patient-002",
    "total": null,
    "average": null,
    "tScore": null,
    "severity": "unscorable",
    "dataQualityFlags": ["no_numeric_answers"]
  },
  "answers": { "response": "abc" },
  "createdAt": "2026-06-21T21:34:14.282Z",
  "resultChart": "severity_bar"
}
```

The `resultChart` field is added by the assessment form to tell the result detail page
which visualization to render.

## Server actions (`lib/actions/result-files.ts`)

All marked `"use server"`:

- **`saveResultFile(patientId, result)`** — writes new JSON file. Filename auto-generated from `createdAt` + `assessmentSlug`. Returns `{ success, filename }` or `{ error }`.

- **`readResultFile(patientId, resultId)`** — scans `results/*.json` for file whose `resultId` field matches. Returns `ResultFileData | null`.

- **`listResultFiles(patientId)`** — reads all `.json` files in the results directory, sorts by `createdAt` desc. Returns `ResultFileData[]`.

- **`updateResultFile(patientId, result)`** — finds the file by `resultId`, overwrites with updated data. Preserves original `createdAt` if not in the update.

- **`deleteResultFile(patientId, resultId)`** — finds the file by `resultId` and calls `fs.unlinkSync()`. Used when deleting completed invites and when deleting individual results.

## Usage patterns

### Reading results for the list page (server component)

```tsx
// app/patients/[id]/results/page.tsx
const results = await listResultFiles(id);
return <ResultsPageClient patientId={id} patient={patient} results={results} />;
```

### Reading a single result for the detail page

```tsx
// app/patients/[id]/results/[resultId]/page.tsx
const result = await readResultFile(id, resultId);
if (!result) notFound();
const measure = getMeasure(result.assessmentSlug);
return <ResultDetail result={result} measure={measure ?? null} />;
```

### Saving a new result (assessment form submit)

```tsx
await saveResultFile(invite.patientId, {
  ...result,
  resultChart: measure.resultChart,
});
```

### Updating after edit (result detail page)

```tsx
await updateResultFile(result.patientId, {
  ...updated,
  resultChart: measure.resultChart,
});
```

### Deleting (results list or invite delete)

```tsx
await deleteResultFile(patientId, resultId);
```

## Anti-patterns

❌ Do NOT write to localStorage atoms (`addResult`, `setResultStore`, `updateResult`)
❌ Do NOT read from localStorage atoms (`scopedResultsAtom`, `resultsAtom`) for result data
❌ Do NOT create dual-write paths (file + localStorage)
✅ Always use server actions from `result-files.ts`
✅ Load data in server components, pass as props to client components
