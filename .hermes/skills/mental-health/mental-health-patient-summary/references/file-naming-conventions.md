# File Naming Conventions

All patient data files follow strict naming conventions. Deviating breaks the file-scanning logic
in server actions.

## Results

**Active results:** `data/patients/<patientId>/results/taken-yyyy-mm-dd-hh-mm-ss-<slug>.json`
- Prefix: `taken-`
- Timestamp: ISO date without T separator, hyphens kept
- Example: `taken-2026-06-21-12-00-00-level2-depression-adult.json`

**Deleted results:** `data/patients/<patientId>/results-deleted/deleted-yyyy-mm-dd-hh-mm-ss-taken-yyyy-mm-dd-hh-mm-ss-<slug>.json`
- Moved (not copied) from `results/` to `results-deleted/`
- Original `taken-ts-slug.json` filename is PRESERVED
- `deleted-<now-ts>-` is prepended (timestamp of deletion time)
- Example: `deleted-2026-06-21-18-00-00-taken-2026-06-21-12-00-00-level2-depression-adult.json`
- Server action: `moveResultToDeleted(patientId, resultId)` in `lib/actions/result-files.ts`
- The `listDeletedResultFiles()` function parses `deletedAt` from the `deleted-` prefix and returns `DeletedResultFile` which includes `filename` and `deletedAt`

## Invites

**Active invites:** `data/patients/<patientId>/invites/<yyyy-mm-dd-hh-mm-ss>-<first8tokenchars>.json`
- Timestamp prefix
- First 8 chars of invite token
- Example: `2026-06-21-16-11-28-adb0278d.json`

## Patients

**Active patients:** `data/patients/<patientId>/profile.json`, `consent.json`, etc.
**Deleted patients:** `data/patients-deleted/<yyyy-mm-dd-hh-mm-ss>-<patientId>/`
- Entire directory moved (rename) to patients-deleted with timestamp prefix
- Server action: `deletePatient(patientId)` in `lib/actions/patient-files.ts` (name is misleading — it moves, not deletes)

## Clinical files

- `data/patients/<patientId>/clinical-summary.md`
- `data/patients/<patientId>/clinical-background.md`
