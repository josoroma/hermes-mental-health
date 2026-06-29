# Corpus → Templates Sync Pipeline

The `data/corpus/assessment-measures/*.md` files (68 DSM-5-TR measures) are the **authoritative
source** for assessment templates. The sync pipeline reads them, parses structured data, and
generates schema-conformant JSON templates + an index.

## Pipeline

```
data/corpus/assessment-measures/*.md  (68 markdown files)
  │  scripts/corpus/generate-templates.py
  ▼
data/shared/templates/json/*.json     (68 JSON templates)
  │  scripts/corpus/build-index.py
  ▼
data/shared/templates/index.json      (measure catalog)
```

## Running

```bash
# Full sync
make dsm-corpus-sync

# Individual steps
make dsm-corpus-generate-templates    # .md → JSON templates
make dsm-corpus-build-index           # → index.json + coverage
```

## Template format

Each JSON template follows the `Measure` Zod schema with:
- `slug`, `title`, `description`, `version`, `instructions`
- `resultChart` — one of: `severity_bar`, `t_score_gauge`, `domain_bars`, `trend_line`, `none`
- `fields[]` — each with `id`, `label`, `type` (scale|text|select|multi_select|boolean), `required`, `min`, `max`, `options`
- `scoringRule` — `calculation` (total|average|t_score|domain_max), `maxScale`, `severityThresholds`, `requiredFields`, `t_score`, `reverseScoredItems`

## Parsing caveats

The markdown corpus has items that span multiple lines (text on one line, scores on next).
The preprocessor in `generate-templates.py` joins continuation lines before regex extraction.
Roman numeral prefixes (Level 1 cross-cutting: "I. 1. text 0 1 2 3 4") are handled separately.

APA PHQ-9 thresholds were mangled in the PDF→markdown conversion (moderately_severe and severe
ranges on separate lines). Well-known calibrations in `KNOWN_CALIBRATIONS` override extraction.

## YAML is NOT used for corpus templates

Only JSON templates are generated. The app's data layer (`lib/data/measures.ts`) loads from
`data/shared/templates/json/`. YAML is used only for AI-generated shared assessments
(`data/shared/assessments/*.yaml`), not for corpus-derived templates.
