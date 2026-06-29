# Assessments Page Design

## Layout

The assessments page (`/patients/[id]/assessments`) has two sections:

### 1. Pending Invites (main list)

Only pending invites appear in the main card. Completed/taken assessments are
intentionally excluded — the user wants them visible only in Results.

Each pending invite shows:
- Measure name
- Invite URL path
- Creation date (es-MX locale)
- "Pending" badge (secondary variant)
- "Take" link (ExternalLink icon, `/a/<token>`, SAME TAB — no `target="_blank"`)
- "Copy Link" button
- Trash delete button (destructive)

### 2. Taken Assessments (collapsible log)

Completed invites are shown in a separate collapsed card at the bottom:

```
Taken Assessments (N)  [ChevronDown]
```

Click to expand — shows a simple list of measure names and dates.
Uses `useState(false)` for `showCompleted`, toggled via `onClick` on CardHeader.

### Delete from assessments

Delete from assessments page only removes the invite file (`deleteInviteFile`).
It does NOT delete results. Deleting results is handled on the Results page.
The dialog text reflects this:
- Pending: "This invite hasn't been completed yet. Are you sure you want to delete it?"
- Completed: "This assessment has been completed. Deleting the invite will only remove this record."

## Implementation

```tsx
const pending = allWithNames.filter((inv) => inv.status === "pending");
const completed = allWithNames.filter((inv) => inv.status !== "pending");

// Main list: only pending
{pending.length === 0 ? (<empty state>) : (<card with pending list>)}

// Completed log: collapsible
{completed.length > 0 && (
  <Card>
    <CardHeader onClick={() => setShowCompleted(!showCompleted)}>
      <CardTitle>
        Taken Assessments ({completed.length})
        {showCompleted ? <ChevronUp /> : <ChevronDown />}
      </CardTitle>
    </CardHeader>
    {showCompleted && <CardContent>{completed list}</CardContent>}
  </Card>
)}
```

## Key difference from old design

- OLD: All invites (pending + completed) shown together with status-specific actions
- NEW: Pending only in main list. Completed in separate collapsible "Taken Assessments" log
- OLD: Delete from assessments could also delete result files
- NEW: Delete from assessments only deletes invite file
