# Shared Assessment Template Format

Reference for generating new assessment JSON templates compatible with the
`data/shared/templates/` directory. Use this when creating assessments via
"Create With AI" or manually.

## File locations

```
data/shared/templates/json/<slug>.json   # The template JSON
data/shared/templates/index.json         # Catalogue entry (must be updated)
```

## JSON schema

```json
{
  "slug": "kebab-case-slug",
  "title": "Human-Readable Title",
  "description": "One-line clinical description",
  "version": "1.0.0",
  "instructions": "Practitioner-facing instructions shown before the form",
  "resultChart": "domain_bars | severity_bar | t_score_gauge | trend_line | none",
  "fields": [ ... ],
  "scoringRule": { ... }
}
```

## Field types

### scale
```json
{
  "id": "snake_case_id",
  "label": "Question text displayed to the respondent",
  "type": "scale",
  "required": true,
  "min": 0,
  "max": 4,
  "domain": "Domain Name",          // REQUIRED for domain_bars resultChart
  "options": [
    { "value": 0, "label": "Label for 0" },
    { "value": 1, "label": "Label for 1" },
    { "value": 2, "label": "Label for 2" },
    { "value": 3, "label": "Label for 3" },
    { "value": 4, "label": "Label for 4" }
  ]
}
```

### text
```json
{
  "id": "snake_case_id",
  "label": "Prompt for the text field",
  "type": "text",
  "required": false
}
```

## resultChart types and required extras

| resultChart     | Field requirement          | ScoringRule.calculation |
|-----------------|----------------------------|------------------------|
| domain_bars     | Each scale field needs `domain` string | `average` or `domain_max` |
| severity_bar    | scoringRule.severityThresholds populated | `total` or `average`     |
| t_score_gauge   | scoringRule.t_score: true  | `t_score`                |
| none            | No special requirements    | any                      |

## ScoringRule

```json
{
  "calculation": "total | average | t_score | domain_max",
  "maxScale": 4,
  "severityThresholds": {},
  "reverseScoredItems": [],
  "requiredFields": ["id_1", "id_2", ...],
  "t_score": false
}
```

- `severityThresholds`: {} (empty object) for domain_bars. Populated for severity_bar.
- `reverseScoredItems`: [] when all items are positively phrased.
- `requiredFields`: list all scale item IDs. Text fields are excluded.
- `t_score`: false unless using t_score_gauge.

## Updating index.json

After writing a new template, add an entry to `data/shared/templates/index.json`:

```json
{
  "slug": "reintegration-planning",
  "title": "Reintegration Planning Assessment",
  "description": "One-line description",
  "version": "1.0.0",
  "field_count": 36,
  "resultChart": "domain_bars",
  "scoring_type": "average"
}
```

The `scoring_type` field mirrors `scoringRule.calculation`.

## Checklist after generation

- [ ] JSON parses without errors
- [ ] Every scale field has `domain` if resultChart is `domain_bars`
- [ ] `requiredFields` lists all scale field IDs (not text fields)
- [ ] Options arrays have `value` matching min..max range (0-indexed or 1-indexed)
- [ ] index.json entry added with correct `field_count` and `scoring_type`
- [ ] Scale fields = `field_count` minus text/select/boolean fields