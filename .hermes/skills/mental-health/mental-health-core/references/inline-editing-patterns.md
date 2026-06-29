# Inline Editing Patterns

## Preference: inline > modal for simple forms

Demographics and Consent cards edit INLINE (no modal). Only long-form markdown content (Clinical Summary, Clinical Background) uses the dedicated edit page route.

| Card | Edit mechanism | Rationale |
|------|---------------|-----------|
| Demographics | Inline: Edit → form fields in card → Save/Cancel buttons in header | Only 3 fields (name, ageRange, gender), low complexity |
| Consent & Dates | Inline: Edit → Select dropdown in card → Save/Cancel buttons in header | Only 1 field (consentStatus), dates are read-only |
| Clinical Summary | Navigate to `/patients/[id]/edit/clinical-summary` | Long-form markdown, needs full editor |
| Clinical Background | Navigate to `/patients/[id]/edit/clinical-background` | Long-form markdown, needs full editor |

## Inline edit component pattern

```tsx
function SomeCard({ patientId }: { patientId: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Title</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check /> Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          /* Form fields */
        ) : (
          /* Read-only display */
        )}
      </CardContent>
    </Card>
  );
}
```

## Why not modals for simple forms?

- Modals add unnecessary dialog overhead for 1-3 fields
- Inline editing keeps the user's context (they see surrounding content)
- DemographicsCard already uses this pattern — ConsentCard should match
- Modals break the visual consistency of the profile page
