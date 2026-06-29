---
name: mental-health-corpus
description: DSM-5-TR template pipeline — parse the existing Markdown corpus, generate schema-conformant JSON templates, and build the template catalog index.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, corpus, dsm-5-tr, templates, pipeline]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-editor
---

# Mental Health Corpus Pipeline

## When to use

Use when the practitioner needs to:
- Generate schema-conformant assessment templates (JSON) from the Markdown corpus
- Build the template catalog index
- Verify template coverage (68/68)
- Regenerate templates after corpus updates

## Pipeline stages

The pipeline uses Python scripts under `scripts/corpus/`:

```
make dsm-corpus-generate-templates → scripts/corpus/generate-templates.py
                                     data/shared/templates/json/<slug>.json
make dsm-corpus-build-index       → scripts/corpus/build-index.py
                                     data/shared/templates/index.json
make dsm-corpus-sync              → generate-templates + build-index combined
```

**Current state:** 68 corpus .md files → 68 JSON templates → 100% coverage index.

## Source corpus

The 68 DSM-5-TR assessment measures are in `data/corpus/assessment-measures/*.md`
as verified Markdown files. Categories: Level 1 (3), Level 2 Adult (8), Level 2 Parent (9),
Level 2 Child (9), Severity Adult (10), Severity Child (10), Clinician-Rated (6),
Disability (2), Personality (5), Early Dev (2), Cultural (4).

## Make targets

```makefile
make dsm-corpus-generate-templates   # Corpus .md → JSON templates
make dsm-corpus-build-index         # → index.json + coverage report
make dsm-corpus-sync                # Both combined
```
## Template generation

Each template must:
- Validate against the `Measure` Zod schema
- Include `instructions` (administration/clinical guidance)
- Include a `ScoringRule` (total, thresholds, reverse items, T-score lookup)
- Include a `resultChart` (severity_bar | t_score_gauge | domain_bars | trend_line | none)
- Output JSON only (app loads from `data/shared/templates/json/` per SPECS.md T-4.1.1;
  JSON is natively importable in Next.js/TypeScript with zero dependencies)

## Template generation architecture

The `generate-templates.py` script (`scripts/corpus/`) handles 9 distinct measure types
with specialized extractors. Key design decisions documented in
`references/template-generation-pipeline.md`:
- **Preprocessing**: joins multiline items that span 2-3 lines in the APA markdown
  (continuation lines + scores on separate lines from item text)
- **Well-known calibrations**: authoritative scoring rules for PHQ-9, GAD-7, Level 1
  where the APA conversion mangled threshold tables
- **Chart inference**: `severity_bar` for severity measures, `t_score_gauge` for PROMIS,
  `domain_bars` for Level 1/WHODAS, `none` for CFI/EDHB
- **Coverage**: 100% — all 68 corpus measures have templates

## Pitfalls

### Template generation

1. **Multiline items break simple regex.** The APA markdown conversion splits
   items across 2-3 lines. Always run the `preprocess_text()` pass before
   item extraction. Without it, PHQ-9 gets 5 of 9 items; with it, all 9.

2. **APA threshold tables are mangled.** The markdown conversion
   occasionally places severity labels and ranges on separate lines.
   Use `KNOWN_CALIBRATIONS` for well-known measures (PHQ-9, GAD-7, Level 1)
   and regex extraction as fallback for others.

3. **Level 1 cross-cutting uses Roman numeral prefixes.** The preprocessor
   must handle `I. 1. text 0 1 2 3 4` separately from `1. text 0 1 2 3`.
   Without Roman numeral handling, Level 1 gets 1 field instead of 13 domains.

4. **T-score appears in Level 1 clinician instructions but is NOT applicable.**
   Force `t_score: False` for `level1-*` slugs; only Level 2 PROMIS measures
   use T-scores.

### App integration

5. **JSON only for corpus templates.** YAML was deleted. The Next.js/TypeScript
   app loads from `data/shared/templates/json/` natively with zero parser
   dependencies. Templates are generated, not hand-edited.

6. **zod v3 required.** zod v4 has incompatible types with `@hookform/resolvers`.
   When adding zod to the app, pin to `zod@3` and `@hookform/resolvers@4`.

7. **eslint scans .hermes/ by default.** Add `.hermes/**` and `scripts/**`
   to `eslint.config.mjs` `globalIgnores` to prevent false positives from
   non-app source files.

9. **`tsc` binary breaks after scaffold copy.** When copying a Next.js
   scaffold (from `create-next-app` temp dir into an existing project),
   the `node_modules/.bin/tsc` stub often breaks. Fix: `rm -rf
   node_modules package-lock.json && npm install`. Running `npx tsc
   --noEmit` works directly but `npm run typecheck` calls the broken
   `.bin/tsc` stub.

10. **shadcn luma preset CSS cannot be scraped from the web.** The
    `https://ui.shadcn.com/create?preset=b2D0wqNxT` page is an SPA.
    See `references/luma-dark-theme.md` for the full CSS and token mapping.

11. **`execute_code` with `read_file` can corrupt project files.**
    `read_file()` inside `execute_code` returns content with `LINE|TEXT`
    format (line-number-prefixed). Writing that raw content back via
    `write_file()` embeds literal `123|` prefixes in every line. Always
    strip line-number prefixes before writing, or use the direct
    `write_file` / `patch` tools outside `execute_code` for file edits.

12. **z.nativeEnum().default() fails with TypeScript string enums.**
    Zod v3's `z.nativeEnum(MyEnum).default(MyEnum.MEMBER)` produces
    `Type 'string' is not assignable to type 'MyEnum'` errors with
    TypeScript string enums. Workaround: use
    `.default("value" as any)` or remove `.default()` and make the
    field optional with `.optional()`. The `@hookform/resolvers@5`
    is also incompatible with both zod v3 and v4 for nativeEnum;
    pin to `@hookform/resolvers@4` and `zod@3`.