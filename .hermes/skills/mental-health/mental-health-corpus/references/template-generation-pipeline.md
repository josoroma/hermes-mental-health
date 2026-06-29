# Template Generation Pipeline — Technical Reference

> How `scripts/corpus/generate-templates.py` parses 68 APA DSM-5-TR markdown
> files into schema-conformant `Measure` JSON templates.

---

## Architecture

```
corpus/*.md  →  preprocess_text()  →  extract_items()  →  extract_scoring()
                                    →  extract_title()       ↓
                                    →  extract_description() KNOWN_CALIBRATIONS
                                    →  extract_instructions()
                                         ↓
                                    infer_chart_type()
                                         ↓
                                    parse_measure()  →  data/shared/templates/json/<slug>.json
                                    build_index.py   →  data/shared/templates/index.json
```

---

## Preprocessing: Joining Multiline Items

**Problem:** APA markdown conversion splits items across 2-3 lines:
```
6. Feeling bad about yourself—or that you are a failure or       ← item start
have let yourself or your family down 0 1 2 3                    ← continuation + scores
```

The continuation line has no item number prefix, and the scores are at
the end of the continuation, not on the item line.

**Solution:** `preprocess_text()` walks the items section (before
"Instructions to Clinicians" or "<!-- Page 3 -->") and merges
continuation lines back into a single line:

```
6. Feeling bad about yourself—or that you are a failure or have let yourself or your family down 0 1 2 3
```

**Termination rules for continuation collection:**
- Next line starts a new numbered item (`^\s*\d{1,3}[.)]\s`)
- Next line starts a new Roman-numeral item (`^\s*[IVX]+\.\s+\d{1,2}[.)]\s`)
- Next line is a page marker (`<!--`), heading (`###`), or summary line
  (`Total`, `Prorated`, `Average`, `T-Score`, `Adapted`, `Name:`)

**Roman numeral Level 1 items:**
Level 1 cross-cutting uses domain prefixes: `I. 1. text 0 1 2 3 4`.
These are handled by a separate `roman_item_match` branch in the
preprocessor that preserves the `{domain}. {item_num}. {text}` format.

**Table header filtering:**
Lines matching `Clinician|Use|Item|score|Not at|Several|More than|...`
are silently dropped to avoid false item matches from the markdown
table header row.

**Cutoff detection:**
Only the items section is preprocessed. Cutoff is found by matching:
`Instructions to Clinicians`, `Scoring and Interpretation`,
`Frequency of Use`, `Interpretation Table`, `Total/Partial Raw Score`,
or `<!-- Page 3 -->`.

---

## Item Extraction by Measure Type

The script dispatches to 9 specialized extractors based on slug prefix:

| Measure Type | Extractor | Pattern |
|-------------|-----------|---------|
| severity-* | `extract_numbered_items()` | `1. text 0 1 2 3` or `1 text 1 2 3 4 5` |
| level1-* | `extract_level1_items()` | `I. 1. text 0 1 2 3 4` |
| level2-* | `extract_numbered_items()` | Same as severity |
| clinician-* | `extract_clinician_items()` | `I. Hallucinations` (domain-based) |
| cfi-* | `extract_cfi_items()` | `1. What brings you here today?` (text) |
| whodas-* | `extract_whodas_items()` | `D1.1 Concentrating on...` |
| pid5-* | `extract_pid5_items()` | `1 I don't get as much pleasure... 0 1 2 3` |
| edhb-* | `extract_edhb_items()` | Checkbox items or numbered |

### Scale option mapping

Items auto-detect scale ranges from the digit pattern at line end:

| Digits | Scale | Options |
|--------|-------|---------|
| `... 0 1 2 3` | 0-3 | Not at all / Several days / More than half / Nearly every day |
| `... 0 1 2 3 4` | 0-4 | Never–Not at all / Occasionally–Slight / Half the time–Mild / Most of the time–Moderate / All the time–Severe |
| `... 1 2 3 4 5` | 1-5 | Never / Rarely / Sometimes / Often / Always |

---

## Scoring Extraction

### KNOWN_CALIBRATIONS override

The APA markdown conversion sometimes places threshold values on
separate lines (e.g., "Severe depression" on one line, "20-27" on the
next). Because the regex can't match across lines, we maintain
well-known calibrations for measures where the conversion is known to
be broken:

```python
KNOWN_CALIBRATIONS = {
    "severity-depression-adult": {
        "calculation": "total", "maxScale": 3,
        "severityThresholds": {
            "none": [0,4], "mild": [5,9], "moderate": [10,14],
            "moderately_severe": [15,19], "severe": [20,27],
        },
    },
    "severity-gad-adult": {
        "calculation": "average", "maxScale": 4,
        "severityThresholds": {
            "none": [0,0], "mild": [1,1], "moderate": [2,2],
            "moderately_severe": [3,3], "severe": [4,4],
        },
    },
    "level1-adult": {
        "calculation": "domain_max", "maxScale": 4,
        "severityThresholds": {},
    },
    # ...
}
```

**Add new calibrations when:** a measure's extracted thresholds differ
from the DSM-5-TR published values. The known calibration is the
authoritative source.

### Text-based extraction (fallback)

For measures not in KNOWN_CALIBRATIONS, regex extracts severity bands
from lines matching `band_label digits-digits`:

```python
sev_pattern = re.compile(
    r"(none|mild\s*(?:depression)?|moderate\s*(?:depression)?|"
    r"moderately\s*severe\s*(?:depression)?|severe\s*(?:depression)?)\s+"
    r"(\d+)\s*[-–]\s*(\d+)",
    re.IGNORECASE,
)
```

Band labels are normalized: `"Mild depression"` → `"mild"`,
`"Severe depression"` → `"severe"`.

### T-score detection

- **Level 1 cross-cutting**: NEVER a T-score measure. Force `t_score: False`
  even if "T-score" appears in clinician instructions.
- **Level 2 PROMIS**: Detect by `"t-score"` or `"t score"` in text.
- **Others**: Default `t_score: False`.

### Max scale detection

```python
if "5-point scale" in text: maxScale = 4
elif "4-point scale" in text: maxScale = 3
elif "0=Never; 1=Occasionally; 2=Half..." in text: maxScale = 4  # GAD-7 severity
elif "0=Not at all; 1=Several days" in text: maxScale = 3  # PHQ-9
elif "1=never; 2=rarely; 3=sometimes" in text: maxScale = 4  # PROMIS 1-5
```

---

## Chart Type Inference

```python
def infer_chart_type(slug, scoring):
    if slug.startswith("severity-"): return "severity_bar"
    if slug.startswith("level1-"):   return "domain_bars"
    if scoring.get("t_score"):       return "t_score_gauge"
    if slug.startswith("level2-"):   return "severity_bar"
    if slug.startswith("cfi-"):      return "none"
    if slug.startswith("clinician-"): return "severity_bar"
    if slug.startswith("whodas-"):   return "domain_bars"
    if slug.startswith("pid5-"):     return "domain_bars"
    if slug.startswith("edhb-"):     return "none"
    return "severity_bar"
```

---

## JSON-Only

Templates are JSON only (`data/shared/templates/json/`). YAML was deleted.
**Why:** The Next.js/TypeScript app loads from `data/shared/templates/json/`
(per SPECS.md T-4.1.1). JSON is natively importable (`import data from
'./template.json'`) with zero parser dependencies. Templates are generated,
not hand-edited — human readability doesn't matter.

---

## Pitfalls

1. **Multiline items break simple regex.** Always run `preprocess_text()`
   before `extract_items()`. Without preprocessing, only ~5 of 9 PHQ-9
   items are detected.

2. **APA threshold tables are fragile.** The markdown conversion from
   PDF places "Moderately severe depression" and "15-19" on separate
   lines. Use `KNOWN_CALIBRATIONS` for known measures, regex as fallback.

3. **"T-score" appears in Level 1 clinician instructions.** Level 1
   cross-cutting mentions T-score in the follow-up guidance table but is
   NOT a T-score measure. Force `t_score: False` for `level1-*` slugs.

4. **Level 1 items use Roman numeral prefixes.** The preprocessor must
   detect `I. 1. text` patterns separately from `1. text` patterns.
   Without Roman numeral handling, Level 1 gets 1 field instead of 13.

5. **PID-5 has 220 items with `1 text 0 1 2 3` pattern** (no period after
   number). The regex `(\d{1,3})\s{2,}(.+?)\s+(\d)\s+(\d)\s+(\d)\s+(\d)`
   requires 2+ spaces after the item number. Check that the corpus format
   has this spacing before running.

6. **Never use `write_file` for >8K characters** — stream timeout risk.
   Use `execute_code` with `write_file` inside for large files. The
   generate-templates.py script is ~700 lines generated this way.

7. **zod v4 is incompatible with @hookform/resolvers.** When using zod
   in the Next.js app, pin to `zod@3`. The `useZodForm` helper uses
   `zodResolver(schema as never)` as a workaround but zod v3 avoids
   the issue entirely.

8. **eslint scans .hermes/ by default.** Add `.hermes/**` and
   `scripts/**` to `eslint.config.mjs` `globalIgnores` to avoid false
   positives from non-app source.
