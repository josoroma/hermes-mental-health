---
name: mental-health-scoping
description: Patient scope discipline — enforce one-patient-per-session, validate patient IDs, block cross-patient access. Must be paired with mental-health-core.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, scoping, privacy, guard]
    category: mental-health
    related_skills: [mental-health-core]
---

# Mental Health Scoping

## When to use

Load this skill alongside `mental-health-core` for any session that accesses patient data. It enforces the patient-scope discipline: exactly one patient active per session, all reads validated.

## Rules

### One patient per session
- `activePatientIdAtom` holds exactly one patient ID at a time
- Switching patients clears the previous scope
- No code path may read across patients

### Validate all patient IDs
- Every patient ID at route/API boundaries must pass `validatePatientId()`
- Pattern: `^[a-zA-Z0-9_-]{1,64}$`
- Blocks: `..`, `/`, `\\`, control chars, whitespace

### Scoped reads
- All repository reads for invites, results, and other patient-scoped data go through `assertScoped(patientId)`
- `assertScoped` throws `PatientScopeError` on mismatch
- Never bypass the guard — no raw reads of patient directories

### Hook integration
- `patient-scope-guard.sh` runs before every tool invocation
- Checks `HERMES_PATIENT_ID` against `HERMES_ACTIVE_PATIENT_ID`
- Exits non-zero to block cross-patient operations

## What the guard blocks

```text
[PATIENT-SCOPE-GUARD] BLOCKED: read_file tried to access patient "patient-002" while patient "patient-001" is active
```

## Pitfalls

- **Never hardcode a patient directory path** — always resolve through the repository
- **The guard runs at the hook level** — it catches tool-level violations, not in-code logic errors
- **Synthetic data only** — no real patient PHI in any session