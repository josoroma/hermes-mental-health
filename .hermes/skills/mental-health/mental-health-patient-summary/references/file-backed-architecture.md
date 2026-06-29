# File-Backed Architecture

## Design decision

The user explicitly rejected dual writes (file + localStorage). The conversation:
> User: "why we need to write to write to localStorage? with saving to JSON file is enough?"
> Agent: removed all localStorage writes for results and invites

**Rule: all patient-scoped data is file-backed ONLY.** Never dual-write.

## Storage layout

```
data/patients/<id>/
├── profile.json                              # Demographics
├── consent.json                              # Consent
├── clinical-summary.md                       # Clinical summary markdown
├── clinical-background.md                    # Clinical background markdown
├── invites/
│   └── <yyyy-mm-dd-hh-mm-ss>-<tokenFirst8>.json  # Invite records
└── results/
    └── <yyyy-mm-dd-hh-mm-ss>-<slug>.json     # Assessment results
```

## Server actions

### Invites (`lib/actions/invite-files.ts`)
- `saveInviteFile(patientId, invite)` — create invite file
- `listInviteFiles(patientId)` — list all invites for a patient, sorted by createdAt desc
- `getInviteByToken(token)` — find invite by token across ALL patients (used by `/a/[token]` page)
- `updateInviteFile(patientId, token, updates)` — partial update (e.g., set status to completed)
- `deleteInviteFile(patientId, token)` — remove invite file

### Results (`lib/actions/result-files.ts`)
- `saveResultFile(patientId, result)` — create result file with auto-generated filename
- `readResultFile(patientId, resultId)` — find result file by resultId
- `listResultFiles(patientId)` — list all results for a patient, sorted by createdAt desc
- `updateResultFile(patientId, result)` — overwrite result file (preserves createdAt)
- `deleteResultFile(patientId, resultId)` — remove result file

### Clinical files (`lib/actions/clinical-files.ts`)
- `readClinicalFile(patientId, type)` — read `.md` file
- `saveClinicalFile(patientId, type, content)` — write `.md` file

### Patient files (`lib/actions/patient-files.ts`)
- `readDemographics(patientId)` / `saveDemographics(patientId, data)`
- `readConsent(patientId)` / `saveConsent(patientId, data)`

## Data flow patterns

### Server → Client props

The standard pattern for loading file data:
1. Server component (`page.tsx`) calls server action
2. Passes data as props to client component
3. Client component renders

This avoids `react-hooks/set-state-in-effect` errors.

### Local useState for edits

For pages that allow editing (result detail, demographics):
1. Server component loads the data
2. Client component copies to local `useState`
3. On save: calls update server action, then `setState` for immediate UI feedback
4. No localStorage atoms involved

### Refresh after mutation

After deleting an item that was loaded as a server prop:
- Results page: `onDeleted?.()` → calls `router.refresh()` (server component re-renders)
- Assessments page: `loadData()` callback re-fetches from server actions

## Migration from localStorage

The following localStorage atoms exist in `lib/data/_repository.ts` but should NOT be used
for new code:

- `invitesAtom` / `scopedInvitesAtom` — used ONLY for `CreateInvite` component (pending removal)
- `resultsAtom` / `scopedResultsAtom` — DO NOT USE for result data
- `addInvite()`, `updateInviteStatus()`, `removeInvite()` — DO NOT USE, use invite-files.ts instead
- `addResult()`, `updateResult()` — DO NOT USE, use result-files.ts instead

The only remaining legitimate use of Jotai atoms is `activePatientIdAtom` for nav context.

## Assessment form flow

1. Patient opens `/a/<token>` → `getInviteByToken(token)` from file system
2. Patient fills form → `scoreResult(measure, answers)`
3. On submit:
   - `saveResultFile()` → writes JSON to results/
   - `updateInviteFile()` → sets invite status to "completed"
   - `router.push()` → redirects to result detail page
4. No localStorage writes. No thank-you page.
