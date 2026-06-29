---
name: mental-health-assessment-invite
description: Manage assessment invite lifecycle — generate 32-char tokens, create invite links to /a/<token>, track pending/completed status, and manage the invite table.
version: 0.2.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, invites, tokens, workflow]
    category: mental-health
    related_skills: [mental-health-core]
---

# Mental Health Assessment Invites

## When to use

Use when the practitioner needs to:
- Create an invite for a patient to complete a DSM-5-TR measure
- Generate a unique 32-character URL-safe token
- Track invite status (pending → completed)
- Copy or share the invite link `/a/<TOKEN>`
- Review the active invites table

## Invite lifecycle

```
[Create] → pending → [Patient completes form] → completed
```

## Token generation

- 32 characters, URL-safe (a-z, A-Z, 0-9, no special chars)
- Cryptographically random
- Each invite gets a unique token

## Invite link format

```
http://127.0.0.1:3000/a/<32-char-token>
```

The patient-facing form resolves the token, loads the measure, renders
instructions and fields, validates answers, and submits for scoring.

## Data storage

Invites are **file-backed** — stored as JSON files in `data/patients/<id>/invites/<ts>-<tokenPrefix>.json`. No localStorage, no Jotai atoms for invite data.

The `Invite` type lives in `lib/domain/_schema.ts`:
```typescript
interface Invite {
  token: string;        // 32-char
  measureSlug: string;  // NOTE: field is 'measureSlug', not 'assessmentSlug'
  patientId: string;
  createdAt: string;    // ISO datetime
  expiresAt: string | null;
  status: 'pending' | 'completed';
}
```

Server actions in `lib/actions/invite-files.ts`:
- `saveInviteFile(patientId, invite)` — writes to disk
- `listInviteFiles(patientId)` — reads directory
- `getInviteByToken(token)` — scans all patient dirs
- `updateInviteFile(patientId, token, updates)` — modifies status/fields
- `deleteInviteFile(patientId, token)` — removes file

## Create invite UI

Component: `app/patients/[id]/_components/create-invite.tsx`
- Dropdown of all measures from `data/shared/templates/index.json` (client-safe static import)
- Uses `generateInviteToken()` from `lib/invites/token.ts` (crypto.randomUUID)
- Toasts confirmation via `sonner` on creation
- Invite link shape: `/a/<32-char-token>`

## Active invites table

| Column | Description |
|--------|-------------|
| Assessment | Measure title (e.g., PHQ-9) |
| Created | ISO timestamp |
| Status | `pending` or `completed` badge |
| Link | `/a/<TOKEN>` with copy button |

## Assessment page architecture

The assessment page at `app/a/[token]/page.tsx` is a **client component** (`'use client'`). This is required because it calls server actions asynchronously in `useEffect` and manages loading/error state.

The page:
1. Calls the server action `getInviteByToken(token)` from `lib/actions/invite-files.ts` — scans all patient directories on disk
2. If the invite is `completed` or `expired`, shows "Invite Not Available" with the appropriate message
3. Calls the server action `loadMeasure(slug)` from `app/a/[token]/_actions.ts` to load the measure template from filesystem
4. Renders `<AssessmentForm>` with the resolved invite and measure
5. On submit, calls `saveResultFile()` and `updateInviteFile()` (to mark completed), then redirects to result detail

**No localStorage involved** — all data comes from files on disk via server actions.

## Pitfalls

- **Never make the assessment page a server component** — it must be a client component to call server actions in `useEffect`. Using a server component would require reading files synchronously at request time with no loading state.
- **Invite field is `measureSlug`, not `assessmentSlug`** — when creating invite JSON files manually, use `"measureSlug"` as the key. Results use `"assessmentSlug"`. Using the wrong field name causes the form to fail silently with "Invite Not Available".
- **Completed invites show "Invite Not Available"** — only `pending` invites render the assessment form. Completed and expired invites are rejected.
- **Invite must be scoped to the active patient** — never create cross-patient invites.
- **Token is the lookup key** — never expose patient ID in the URL. `getInviteByToken()` scans all patients.