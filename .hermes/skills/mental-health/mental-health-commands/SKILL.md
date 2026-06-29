---
name: mental-health-commands
description: Practitioner slash-command workflows for Hermes Mental Health — /assess, /intake, /progress, /safety-check, /privacy-audit.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, commands, slash, workflows]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-assessment-review
      - mental-health-patient-summary
---

# Mental Health Commands

## Available slash commands

### `/assess <patient-id> <measure-slug>`
Start an assessment review session. Loads the measure definition, the patient's
latest submission, scores it, renders the result chart, and generates a clinical
interpretation in English.

Skills: `mental-health-core`, `mental-health-assessment-review`
Hook: `patient-scope-guard`

### `/intake <patient-id>`
Run the patient intake workflow. Creates the patient workspace, initializes
`profile.yaml`, reviews prior diagnoses, recommends DSM-5-TR measures, and
generates an intake summary.

Skills: `mental-health-core`, `mental-health-patient-summary`
Hook: `patient-scope-guard`

### `/progress <patient-id>`
Generate a weekly progress summary. Loads recent results (past 30 days), computes
score-over-time trends, renders trend-line charts, and synthesizes a narrative
progress note in English.

Skills: `mental-health-core`, `mental-health-patient-summary`
Hook: `patient-scope-guard`

### `/safety-check <patient-id>`
Review patient data for safety concerns. Scans PHQ-9 item 9 (self-harm), checks
for SI/HI flags, reviews crisis-level severity scores, and generates a safety
assessment with recommended actions.

Skills: `mental-health-core`, `mental-health-assessment-review`
Hook: `patient-scope-guard`

### `/privacy-audit`
Audit the current session's output for PHI leakage. Scans for email addresses,
phone numbers, SSN-like patterns, and DOB references. Verifies patient-scope
boundaries were maintained.

Skills: `mental-health-core`
Hook: `output-privacy-review`

## Usage pattern

All patient-scoped commands set `HERMES_PATIENT_ID` before execution. The
`patient-scope-guard.sh` hook runs pre-tool and blocks cross-patient access.
`output-privacy-review.sh` runs post-response and flags potential PHI.