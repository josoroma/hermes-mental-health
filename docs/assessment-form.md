# Assessment Form (Patient-Facing)

**Route:** `/a/[token]`  
**Component:** `app/a/[token]/page.tsx` (server) → `AssessmentForm`

The patient-facing form for completing an assessment invite. Accessible via the unique invite link (32-character token). No authentication required — the token serves as the access key.

> **Screenshot:** [assessment-form.png](screenshots/assessment-form.png) — Patient-facing assessment form showing the measure title, instructions, and radio/select fields.

---

## Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Hermes Mental Health                                         │
├───────────────────────────────────────────────────────────────┤
│  ← Back to Assessments                                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────────┐│
│  │  DSM-5-TR Self-Rated Level 1 Cross-Cutting Symptom        ││
│  │  Measure — Adult                                          ││
│  │                                                           ││
│  │  Instructions: The questions below ask about things that  ││
│  │  might have bothered you. For each question, select the   ││
│  │  answer that best describes how much (or how often) you   ││
│  │  have been bothered by the following problems during the  ││
│  │  past TWO (2) WEEKS.                                      ││
│  └───────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌───────────────────────────────────────────────────────────┐│
│  │  1. Little interest or pleasure in doing things?          ││
│  │     ○ None  ○ Slight  ○ Moderate  ○ Considerable  ○ Severe││
│  │                                                           ││
│  │  2. Feeling down, depressed, or hopeless?                 ││
│  │     ○ None  ○ Slight  ○ Moderate  ○ Considerable  ○ Severe││
│  │                                                           ││
│  │  ... (remaining fields)                                   ││
│  └───────────────────────────────────────────────────────────┘│
│                                                               │
│  [Submit Assessment]                                          │
└───────────────────────────────────────────────────────────────┘
```

---

## Flow

### 1. Token Validation

The server component reads the invite from files via `getInviteByToken(token)` — scans all patient directories for matching invite JSON files.

### 2. Measure Loading

Resolves the measure from `assessmentSlug` in the invite. Loads the full measure template (fields, instructions, labels, scoring rules).

### 3. Form Rendering

Each measure field is rendered as its native input type:

| Field Type | Rendering |
|-----------|-----------|
| `scale` | Radio buttons with labeled endpoints (min..max range) |
| `text` | Free-text textarea |
| `select` | Single dropdown |
| `multi_select` | Checkboxes |
| `boolean` | Yes/No toggle |

### 4. Submission

On submit:
1. Scores answers via `scoreResult(measure, answers)`
2. Generates `resultId`: `result-${Date.now()}-${random}`
3. Calls `saveResultFile()` → writes JSON to `results/taken-<ts>-<slug>.json`
4. Calls `updateInviteFile()` → sets status to `"completed"`
5. **Redirects** via `router.push()` to `/patients/<patientId>/results/<resultId>`
6. No "thank you" page — direct redirect to result detail

---

## Error States

| Error | Display |
|-------|---------|
| Token not found | "Invite Not Available" card — invite not found |
| Invite already completed | "Invite Not Available" card — already completed |
| Measure load failed | "Invite Not Available" card — measure not found |

---

## Invite File Validation

The invite must:
- Have a valid 32-character token
- Be in `pending` status
- Reference an existing `assessmentSlug` in the measure catalog
- Not be expired (if `expiresAt` is set and in the past)

---

## Back Link

The **← Back to Assessments** link at the top navigates to `/patients/<patientId>/assessments` using a plain `<Link>` (NOT `<Button asChild>` — not supported by this project's shadcn Button).

---

## Key Files

| File | Role |
|------|------|
| `app/a/[token]/page.tsx` | Server: validates token, loads measure |
| `app/a/[token]/_components/assessment-form.tsx` | Client: form fields, scoring, save, redirect |
| `lib/invites/token.ts` | 32-char URL-safe token generation |
| `lib/actions/invite-files.ts` | `getInviteByToken()`, `updateInviteFile()` |
| `lib/actions/result-files.ts` | `saveResultFile()` |
| `lib/scoring/engine.ts` | `scoreResult()` |
| `components/field-renderer.tsx` | Renders field by type (scale, text, select, etc.) |
---

← [editor](editor.md) | [VIDEO](VIDEO.md) →
