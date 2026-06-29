# Hermes Mental Health — Practitioner Commands

Five bundled practitioner workflows accessible as Hermes slash commands.

---

## /mental-health — Main command group

| Command | Purpose |
|---------|---------|
| `/assess <patient-id> <measure>` | Start an assessment review session for a patient |
| `/intake <patient-id>` | Run the patient intake workflow (clinical background, consent, prior diagnoses) |
| `/progress <patient-id>` | Generate a weekly progress summary from all recent results |
| `/safety-check <patient-id>` | Review patient data for safety concerns (SI/HI indicators, crisis flags) |
| `/privacy-audit` | Audit the current session's output for PHI leakage before delivery |

---

## /assess — Assessment Review

```
/assess <patient-id> <measure-slug>
```

**Workflow:**
1. Activate patient scope (`HERMES_PATIENT_ID=<patient-id>`)
2. Load the measure definition from `data/shared/templates/`
3. Load the patient's results for this measure (if any)
4. Score the latest submission against the measure's `ScoringRule`
5. Render the result chart matching the measure's `resultChart`
6. Generate a narrative clinical interpretation
7. Flag data-quality issues (`unscorable`, missing required items)

**Skills loaded:** `mental-health-core`, `mental-health-assessment-review`

---

## /intake — Patient Intake

```
/intake <patient-id>
```

**Workflow:**
1. Create patient workspace under `data/processed/patients/<patient-id>/`
2. Initialize `profile.yaml` with demographics, clinical background, consent status
3. Review prior diagnoses and current medications
4. Recommend suitable DSM-5-TR measures based on clinical presentation
5. Generate an intake summary note

**Skills loaded:** `mental-health-core`, `mental-health-patient-summary`

---

## /progress — Weekly Progress

```
/progress <patient-id>
```

**Workflow:**
1. Load all recent results for the patient (past 30 days)
2. Compute score-over-time trends per measure
3. Generate trend-line charts for measures supporting `trend_line`
4. Synthesize a narrative progress note
5. Flag any worsening severity patterns

**Skills loaded:** `mental-health-core`, `mental-health-patient-summary`

---

## /safety-check — Safety Review

```
/safety-check <patient-id>
```

**Workflow:**
1. Scan the patient's most recent PHQ-9 item 9 (self-harm) response
2. Check for SI/HI flags in clinical notes
3. Review scores for crisis-level severity
4. Generate a safety assessment with recommended actions
5. Log the safety check timestamp

**Skills loaded:** `mental-health-core`, `mental-health-assessment-review`

---

## /privacy-audit — Privacy Audit

```
/privacy-audit
```

**Workflow:**
1. Scan the current session's output for PHI patterns
2. Run output-privacy-review.sh hook rules
3. Verify patient-scope boundaries were maintained
4. Report any findings with severity (INFO/WARN/BLOCK)

**Skills loaded:** `mental-health-core`

---

## Command Registration

To register these as Hermes slash commands, add to `.hermes/commands/`:

```yaml
commands:
  - name: assess
    description: "Start an assessment review session for a patient"
    skills: [mental-health-core, mental-health-assessment-review]
    hook: patient-scope-guard
  - name: intake
    description: "Run the patient intake workflow"
    skills: [mental-health-core, mental-health-patient-summary]
    hook: patient-scope-guard
  - name: progress
    description: "Generate a weekly progress summary"
    skills: [mental-health-core, mental-health-patient-summary]
    hook: patient-scope-guard
  - name: safety-check
    description: "Review patient data for safety concerns"
    skills: [mental-health-core, mental-health-assessment-review]
    hook: patient-scope-guard
  - name: privacy-audit
    description: "Audit current session output for PHI leakage"
    skills: [mental-health-core]
    hook: output-privacy-review
```