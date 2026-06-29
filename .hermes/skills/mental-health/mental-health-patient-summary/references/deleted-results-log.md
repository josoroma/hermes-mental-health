# Deleted Results — Folder-Based Audit Trail

## Approach

Deleted results are **moved** (not copied, not logged to a JSON array) to a `results-deleted/` folder.
The original filename is preserved and prepended with `deleted-<now-ts>-`.

## File naming

- **Active result:** `data/patients/<id>/results/taken-2026-06-21-12-00-00-level2-depression-adult.json`
- **After deletion:** `data/patients/<id>/results-deleted/deleted-2026-06-21-18-00-00-taken-2026-06-21-12-00-00-level2-depression-adult.json`

The filename encodes:
- `deleted-2026-06-21-18-00-00` — when the result was deleted
- `taken-2026-06-21-12-00-00-level2-depression-adult.json` — original filename preserved

## Server actions

- `moveResultToDeleted(patientId, resultId)` — finds the file in `results/`, renames it to `results-deleted/deleted-<now-ts>-<original-filename>`
- `listDeletedResultFiles(patientId)` — reads all `.json` files from `results-deleted/`, returns `DeletedResultFile[]`

## DeletedResultFile type

```ts
interface DeletedResultFile extends ResultFileData {
  filename: string;   // original filename preserved
  deletedAt: string;  // yyyy-mm-dd-hh-mm-ss parsed from filename's deleted- prefix
}
```

## Display in results page

The "Deleted Results (N)" toggle button loads from `listDeletedResultFiles()` on mount (`useEffect`).
Each entry shows:
- **Measure name** (left)
- **Filename** in `text-xs text-muted-foreground font-mono mt-0.5` below the measure name
- "Taken: date · Deleted: date" on the right in `text-xs shrink-0 ml-2`
- Both dates use `formatShortDate()` which produces "21 jun 2026" format (short month)

```tsx
{deletedWithNames.map((r) => (
  <div key={r.resultId} className="flex justify-between border-b border-border pb-2 last:border-0">
    <div>
      <span>{r.measureName}</span>
      {r.filename && (
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.filename}</p>
      )}
    </div>
    <span className="text-xs shrink-0 ml-2">
      Taken: {formatShortDate(r.createdAt)}
      {r.deletedAt && <> · Deleted: {formatFilenameDate(r.deletedAt)}</>}
    </span>
  </div>
))}
```

### Date helpers

Both helpers produce the same format ("21 jun 2026"):

```tsx
function formatShortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function formatFilenameDate(ts: string): string {
  // ts is yyyy-mm-dd-hh-mm-ss from filename, convert to readable
  if (!ts) return "—";
  const parts = ts.split("-");
  if (parts.length < 3) return ts;
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3] || 0, +parts[4] || 0);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}
```

## What was deleted

- `lib/actions/deleted-results.ts` — the old JSON-log approach (`deleted-results.json` array file)
- This was replaced by the folder-based `moveResultToDeleted()` / `listDeletedResultFiles()` in `result-files.ts`
