# Patient File Structure

Each patient has a directory under `data/patients/<id>/` with these files:

| File | Content | Editable |
|------|---------|----------|
| `profile.json` | Demographics: id, name, ageRange, gender, createdAt, updatedAt | Yes (not id) |
| `consent.json` | Consent status + timestamps | Yes (status only) |
| `clinical-background.md` | Free-text clinical background (markdown) | Yes (full page editor) |
| `clinical-summary.md` | Clinical summary notes (markdown) | Yes (full page editor) |

## Creation

Server action `lib/actions/create-patient.ts` writes all four files.
`createPatientId()` generates `{sanitized-name}-{timestamp36}` format.

## Invites & Results (file-only persistence)

All data is stored as JSON files on disk via server actions — never localStorage.

### Invites
- Stored: `data/patients/<id>/invites/<timestamp>-<token>.json`
- Read/write: `lib/actions/invite-files.ts` (server actions)
- Format: `Invite` schema (patientId, token, measureSlug, status, createdAt, expiresAt)

### Results
- Stored: `data/patients/<id>/results/<taken-ts>-<slug>.json`
- Deleted: `data/patients/<id>/results-deleted/deleted-<ts>-<taken-ts>-<slug>.json`
- Read/write: `lib/actions/result-files.ts` (server actions)
- Format: `Result` schema (resultId, patientId, assessmentSlug, inviteToken, answers, scoring, createdAt)

### Sessions & Notes
- Stored: `data/patients/<id>/sessions/<ts>-<id>.json` and `data/patients/<id>/notes/<ts>-<id>.json`
- Deleted: `data/patients/<id>/sessions-deleted/` and `data/patients/<id>/notes-deleted/`
- Read/write: `lib/actions/clinical-notes.ts` (server actions)

### Seed data
Seed patients, invites, and results live in `lib/data/patients.ts` (`SEED_PATIENTS`, `SEED_RESULTS`, `SEED_INVITES`).
These are validated against Zod schemas at module load. Runtime-created patients are persisted to disk.

### Per-patient scoping
Scoped atoms (`scopedInvitesAtom`, `scopedResultsAtom`) consume from file-backed server actions,
filtered by `activePatientIdAtom`. Client components use `useAtomValue` — data flows server→client via
server components passing props.

## Hydration

- `useHydrateAtoms([[activePatientIdAtom, patientId]])` — sets atom BEFORE first render (not useEffect)
- Badge counts use `suppressHydrationWarning` — server data may differ from seed fallback
- `useSearchParams()` synced in `useEffect` post-mount to avoid SSR mismatch

## Edit Routes

Clinical content editing uses nested routes `/patients/[id]/edit/[fileType]` instead of modals.
FileType: `"clinical-summary"` | `"clinical-background"`.
Edit page loads MDX Editor via `dynamic(..., { ssr: false })` wrapped in `"use client"` component.