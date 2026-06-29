# Demo Data Population

## When to use

When the practitioner asks to populate a patient with demo data for stakeholder presentations or testing. This covers the exact file formats, naming conventions, and scoring patterns for results, invites, sessions, and notes.

## Result JSON format

File: `data/patients/<id>/results/taken-<yyyy-mm-dd-hh-mm-ss>-<slug>.json`

```json
{
  "resultId": "result-<ts>-<random>",
  "inviteToken": "<32-char-token>",
  "patientId": "<patient-id>",
  "assessmentSlug": "level2-depression-adult",
  "scoring": {
    "assessmentSlug": "level2-depression-adult",
    "patientId": "<patient-id>",
    "total": 30,
    "average": 3.75,
    "tScore": 66,
    "severity": "moderately_severe",
    "dataQualityFlags": []
  },
  "answers": {
    "item_1": 4,
    "item_2": 3
  },
  "createdAt": "2026-06-28T14:00:00.000Z",
  "resultChart": "t_score_gauge"
}
```

**Key rules:**
- `resultId` format: `result-<timestamp>-<random6>`
- `inviteToken` must match an existing invite file
- `assessmentSlug` must exist in `data/shared/templates/json/<slug>.json`
- `scoring.total` / `scoring.average` / `scoring.tScore` must be internally consistent
- `scoring.severity` must be: none, mild, moderate, moderately_severe, severe
- `scoring.dataQualityFlags` is an array (empty if no issues)
- `answers` keys must match the measure template's field IDs
- `createdAt` in ISO 8601 with `.000Z` suffix
- `resultChart` must match the measure's `resultChart` field
- **File name MUST use the `taken-` prefix:** `taken-yyyy-mm-dd-hh-mm-ss-<slug>.json`

### Result Charts by measure type

| Measure type | resultChart |
|-------------|-------------|
| Level 2 Depression/Anxiety (PROMIS) | `t_score_gauge` |
| Level 1 Cross-Cutting | `domain_bars` |
| Clinician-Rated Severity | `severity_bar` |

## Invite JSON format

File: `data/patients/<id>/invites/<yyyy-mm-dd-hh-mm-ss>-<descriptor>.json`

```json
{
  "token": "<32-char-token>",
  "patientId": "<patient-id>",
  "assessmentSlug": "level2-depression-adult",
  "status": "completed",
  "createdAt": "2026-06-28T13:50:00.000Z",
  "expiresAt": null
}
```

**Key rules:**
- `token` must match `inviteToken` in the associated result
- `status`: "completed" for demo data with results, "pending" for outstanding
- Invite `createdAt` should be BEFORE result `createdAt` (invite created first)
- One invite per result — pair them by token
- Original invites from before demo data may not have matching result tokens — create matching invites to avoid orphan results

## Session JSON format

File: `data/patients/<id>/sessions/<yyyy-mm-dd-hh-mm-ss>-<id>.json`

```json
{
  "id": "session-<ts>-<random>",
  "type": "session",
  "title": "Intake Session",
  "content": "## Clinical Session\n\n**Date:** June 28, 2026\n...",
  "createdAt": "2026-06-28T15:00:00.000Z",
  "updatedAt": "2026-06-28T15:00:00.000Z"
}
```

**Session content sections** (recommended for demo data):
- `## Clinical Session` — metadata: Date, Duration, Type
- `### Opening / Check-in` — interval events, crisis events, meds, substances, sleep, appetite
- `### Mental Status Exam` — 9 MSE fields
- `### Symptom Review` — assessment scores, subjective report
- `### Safety Screening` — PHQ-9 item 9, C-SSRS, safety plan status
- `### Interventions Delivered` — modality, technique, duration
- `### Patient Response` — emotional, cognitive, barriers, within-session change
- `### Session Plan for Next Visit` — Date, Focus
- `### Progress Notes` — cumulative change, goals status

## Note JSON format

File: `data/patients/<id>/notes/<yyyy-mm-dd-hh-mm-ss>-<id>.json`

```json
{
  "id": "note-<ts>-<random>",
  "type": "note",
  "title": "Initial Diagnostic Formulation",
  "content": "## Clinical Note\n...",
  "createdAt": "2026-06-28T16:00:00.000Z",
  "updatedAt": "2026-06-28T16:00:00.000Z"
}
```

## Cleanup steps

When setting up demo data:
1. Remove old sessions with empty template content
2. Remove old `.appointment.json` companion files from sessions/
3. Remove `sessions-deleted/` folder if it exists
4. Remove old template notes (placeholders with only template content)
5. Ensure all results have matching invites (check `inviteToken` matches an invite `token`)
6. Run `npx tsc --noEmit` to verify no type errors from the new data

## Scoring reference for Level 2 measures

Level 2 Depression Adult (PROMIS, 8 items, 1-5 scale):
- Raw total range: 8-40
- Clinical T-scores: ~30 minimal, ~50 average, ~60 moderate, ~70 severe
- For demo: total 30 = T≈66 (moderately severe), total 24 = T≈60 (moderate)

Level 2 Anxiety Adult (PROMIS, 7 items, 1-5 scale):
- Raw total range: 7-35
- Clinical T-scores: ~30 minimal, ~50 average, ~60 moderate, ~70 severe
- For demo: total 25 = T≈62 (moderate), total 19 = T≈56 (moderate)

Level 1 Adult Cross-Cutting (13 items, 0-4 scale):
- Domain max scoring per domain
- Average across items for overall severity
- For demo: total 28, avg 2.15 → moderate
