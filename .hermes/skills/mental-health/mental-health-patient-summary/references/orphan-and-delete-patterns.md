# Orphan and Delete Patterns

## Orphan concept

An **orphan** is data that exists in one storage but not in another:

- **Invite orphan:** marked "completed" but has no corresponding result JSON file.
  Shown as a `destructive` Badge next to "Completed" in the assessments list.

- **Result orphan (REMOVED):** previously, results that existed only in localStorage
  but not as files were flagged as orphans. This concept has been **removed** — all
  results are now file-backed only, so orphans cannot exist.

## Delete confirm dialogs

All delete operations use shadcn `Dialog` with `DialogContent`, `DialogDescription`,
`DialogFooter`. The confirm button is always `variant="destructive"`.

### Template pattern

```tsx
const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

{/* Delete button — MUST use type="button" + stopPropagation */}
<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
  className="text-destructive hover:text-destructive"
>
  <Trash2 className="size-3.5" />
</Button>

{/* Confirm dialog */}
<Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete ...</DialogTitle>
      <DialogDescription>
        {/* varies by status/orphan */}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
      <Button variant="destructive" onClick={handleDeleteConfirm}>
        <Trash2 className="size-3.5 mr-1.5" />Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Button requirements

- `type="button"` — prevents form submission if inside a form
- `e.stopPropagation()` — prevents parent Link click navigation
- Do NOT use `e.preventDefault()` on the button (unnecessary and can interfere with dialog opening)

### onOpenChange pattern

```tsx
onOpenChange={(open) => !open && setDeleteTarget(null)}
```

Only clears state when dialog is closing (`open === false`). When opening (`open === true`),
does nothing — the state was already set by the trash button click.

## Invite delete messages

| Status | Has Result | Dialog message |
|--------|-----------|----------------|
| pending | N/A | "This invite hasn't been completed yet and has no results. Are you sure?" |
| completed | no | "This invite is marked completed but has no result file. Deleting it will only remove the invite record." |
| completed | yes | "This invite has been completed. Deleting it will also remove the associated assessment result. Are you sure?" |

On confirm:
- If has result: `deleteResultFile()` + `deleteInviteFile()`
- If orphan: only `deleteInviteFile()`

## Result delete messages

| Type | Dialog message |
|------|---------------|
| File-backed | "This will permanently delete the result file. Are you sure?" |

On confirm: `deleteResultFile()` then `onDeleted?.()` callback → `router.refresh()`

## Per-invite action button matrix

| Invite Status | Has Result File | Actions |
|--------------|----------------|---------|
| pending | N/A | Take (ExternalLink), Copy Link, Trash |
| completed | yes | View Result (FileText), Trash |
| completed | no | Orphan badge, Trash |
