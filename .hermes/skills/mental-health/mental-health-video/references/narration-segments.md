# Narration Segment Template

Split narration into segments separated by `---` lines. Each segment
becomes a separate TTS MP3, and its measured duration drives how long
its screenshot is shown in the video.

## Format

```
Segment 0 text here.

---

Segment 1 text here.

---

Segment 2 text here.
```

## Segment-to-screenshot mapping

| Segment | Narration content | Screenshot(s) |
|---------|-----------------|---------------|
| 0 | Welcome / intro | dashboard.png |
| 1 | Dashboard description | dashboard.png + dashboard-assessments.png |
| 2 | Patient profile | patient-profile.png |
| 3 | Clinical summary scrolled | patient-profile-clinical.png |
| 4 | Assessments invite lifecycle | assessments.png |
| 5 | Assessment form (patient-facing) | assessment-form.png + assessment-form-scrolled.png |
| 6 | Results list | results.png |
| 7 | Result detail (view mode) | result-dep-followup.png |
| 8 | Result edit (inline editing) | result-dep-edit.png + result-dep-edit-scrolled.png |
| 9 | Sessions list | sessions.png |
| 10 | Agent chat | agent-chat-patient.png |
| 11 | Assessment editor | editor.png |
| 12 | Closing summary | dashboard.png |

## Rules

- Each segment should be 5-20 seconds of narration (roughly 15-50 words)
- Split long segments (>20s) across two screenshots for visual variety
- The `---` delimiter must be on its own line
- Empty segments are skipped
- Technical terms (PHQ-9, DSM-5-TR, PROMIS, T-score) are used as-is in English
