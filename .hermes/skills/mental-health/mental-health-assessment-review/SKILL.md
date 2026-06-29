---
name: mental-health-assessment-review
description: Review and interpret DSM-5-TR assessment results — score submissions, map severity bands, select and render result charts, detect data-quality issues, and produce clinical interpretations in English.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, assessment, scoring, interpretation, review]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-patient-summary
---

# Mental Health Assessment Review

## When to use

Use when the practitioner needs to:
- Score a patient's submitted assessment
- Map scores to severity bands
- Select and render the correct result chart
- Flag data-quality issues (missing items → unscorable)
- Generate a clinical interpretation narrative in English

## Procedure

1. **Load the measure** from `data/shared/templates/json/<slug>.json`
2. **Load the submission** from `data/processed/patients/<patient-id>/results/<result-id>.json`
3. **Score the answers** using the measure's `scoringRule`:
   - Sum items → total (or average)
   - Apply reverse scoring for flagged items
   - Look up T-score if PROMIS measure
4. **Determine severity** from threshold ranges
5. **Select the chart** per the measure's `resultChart`:
   - `severity_bar` → horizontal bar with 5 bands
   - `t_score_gauge` → gauge on PROMIS T-score scale
   - `domain_bars` → grouped bars per domain
   - `trend_line` → score-over-time line
   - `none` → no chart (free-text)
6. **Flag data quality**:
   - Missing required items → `missing_required`
   - >=50% required missing → `unscorable`
7. **Generate interpretation** in English

## Interpretation format

```text
## Result: [Measure Title]

**Total score:** [N] / [max]
**Severity:** [severity band]
**Clinical interpretation:** [narrative in English]
**Data quality:** [flags or "Complete"]
**Chart:** [chart type rendered]

### Recommendations
[clinical recommendations in English]

### Next steps
[next steps in English]
```

## References

- `references/phq-9-interpretation.md` — PHQ-9 interpretation guidelines
- `references/gad-7-interpretation.md` — GAD-7 interpretation guidelines