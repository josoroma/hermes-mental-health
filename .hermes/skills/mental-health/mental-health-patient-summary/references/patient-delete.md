# Patient Delete — Move to Archive

Deleting a patient moves their directory to `data/patients-deleted/` with a timestamp prefix
rather than permanently removing it.

## Server action

`lib/actions/patient-files.ts` → `deletePatient(patientId)`:

```ts
// Moves data/patients/<id>/ → data/patients-deleted/<yyyy-mm-dd-hh-mm-ss>-<id>/
const deletedDir = path.join(process.cwd(), "data", "patients-deleted");
fs.mkdirSync(deletedDir, { recursive: true });
const ts = `${yyyy}-${mm}-${dd}-${hh}-${mm}-${ss}`;
fs.renameSync(srcDir, path.join(deletedDir, `${ts}-${patientId}`));
```

## UI pattern

`app/(dashboard)/_components/patient-table.tsx`:

- Trash2 button per row, `type="button"`, `e.stopPropagation()` to avoid row click navigation
- Confirm dialog: "This will move all data for <name> (<id>) to the deleted patients archive. Are you sure?"
- On confirm: `await deletePatient(target.id)`, toast "moved to archive", `router.refresh()`

## File system reading

`lib/data/patients-server.ts` → `listAllPatients()`:

- Seed patients only included if `data/patients/<id>/` directory exists
- Filesystem-only patients included if `profile.json` exists
- After move-to-archive, the directory is gone → patient disappears from the list
- `router.refresh()` on the page.tsx server component re-renders with fresh `listAllPatients()` call
