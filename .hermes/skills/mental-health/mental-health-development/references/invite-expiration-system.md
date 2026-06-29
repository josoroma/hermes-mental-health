# Invite Expiration System

## Overview

Assessment invites can expire. When expired, the patient-facing form shows "This invite has expired" instead of the assessment, and the practitioner's assessments section shows an Expired badge with a Renew button.

## Schema

`lib/domain/_schema.ts` — `inviteSchema`:

```ts
export const inviteSchema = z.object({
  token: z.string().length(32),
  measureSlug: z.string().min(1).max(128),
  patientId: z.string().min(1).max(64),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),  // NEW — optional for backward compat
  status: z.nativeEnum(InviteStatus).default("pending" as any),
});
```

## Duration helper

`app/patients/[id]/_components/create-invite.tsx`:

```ts
const DURATION_OPTIONS = [
  { label: "1 day", value: "1d" },
  { label: "1 week", value: "1w" },
  { label: "1 month", value: "1m" },
] as const;
type Duration = (typeof DURATION_OPTIONS)[number]["value"];

export function addDuration(date: Date, duration: Duration): Date {
  const d = new Date(date);
  switch (duration) {
    case "1d": d.setDate(d.getDate() + 1); break;
    case "1w": d.setDate(d.getDate() + 7); break;
    case "1m": d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}
```

## Create invite flow

1. User selects measure from dropdown
2. User selects duration (1 day / 1 week / 1 month) — defaults to 1 week
3. `addDuration(now, duration)` computes `expiresAt`
4. Invite saved with both `createdAt` and `expiresAt`

## Assessment form expiration check

`app/a/[token]/page.tsx` — after checking invite exists and is not completed:

```ts
if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
  setError("expired");
  return;
}
```

Error messages are keyed:
- `"not_found"` — invite doesn't exist
- `"completed"` — already taken
- `"expired"` — past expiresAt
- `"measure_load_failed"` — measure file missing

## Assessments section (practitioner view)

`app/patients/[id]/_components/assessments-section.tsx`:

**Expiration check helper:**
```ts
function isExpired(invite: Invite): boolean {
  if (!invite.expiresAt) return false;
  return new Date(invite.expiresAt) < new Date();
}
```

**Date range display:**
```ts
function formatDateRange(start: string, end?: string): string {
  const startDate = new Date(start).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
  if (!end) return `Created: ${startDate}`;
  const endDate = new Date(end).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
  return `${startDate} → ${endDate}`;
}
```

**Per-invite rendering:**
- If `expired`: show `Badge variant="destructive">Expired</Badge>` + **Renew** button (no Take link)
- If not expired: show `Badge variant="secondary">Pending</Badge>` + **Take** link
- Always show: date range, Copy Link button, Delete button

## Renew dialog

A `<Dialog>` that:
1. Shows the measure name being renewed
2. Has a duration `<Select>` (1d/1w/1m)
3. Calls `updateInviteFile(patientId, token, { expiresAt: addDuration(now, duration).toISOString(), createdAt: now.toISOString() })`
4. On success: toast, refresh invite list

**Key:** `updateInviteFile` from `lib/actions/invite-files.ts` updates the invite JSON on disk in-place. The `createdAt` is also reset to now so the invite appears at the top of the list.

## Integration points

| Layer | File | Change |
|-------|------|--------|
| Schema | `lib/domain/_schema.ts` | Add `expiresAt?: string` to inviteSchema |
| Create invite | `create-invite.tsx` | Duration selector, `addDuration()` helper, `preselectedSlug` prop |
| Invite actions | `lib/actions/invite-files.ts` | `updateInviteFile()` already exists — used for renew |
| Assessment form | `app/a/[token]/page.tsx` | Check `expiresAt`, show `"expired"` error |
| Assessments section | `assessments-section.tsx` | `isExpired()`, expired badge, renew dialog, date range display |
