# Domain Bars Chart — Level 1 Cross-Cutting Measures

## When

`resultChart: "domain_bars"` — DSM-5-TR Level 1 cross-cutting symptom measures, WHODAS, PID-5-BF.
These measures group items by domain (e.g., Depression, Anger, Anxiety, Somatic Symptoms).

## Chart implementation

The `ResultChart` component in `result-detail.tsx` renders a horizontal bar per domain,
showing the max score per domain (since scoring uses `domain_max`).

```tsx
if (chartType === "domain_bars" && measure && answers) {
  const domainScores: Record<string, number> = {};
  for (const field of measure.fields) {
    if (!field.domain) continue;
    const raw = answers[field.id];
    const val = typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : 0;
    if (isNaN(val)) continue;
    domainScores[field.domain] = Math.max(domainScores[field.domain] ?? 0, val);
  }
  // ... render bars
}
```

Colors use severity scale:
- 0 → `var(--chart-1)` (green)
- 1 → `var(--chart-2)` (yellow)
- 2 → `var(--chart-3)` (orange)
- 3-4 → `var(--chart-5)` (red)

## Template requirements

Measure fields MUST have a `domain` property. The Zod schema allows it:
```ts
// lib/domain/_schema.ts
domain: z.string().max(100).optional(),
```

The `extract_level1_items()` function in `scripts/corpus/generate-templates.py` maps
Roman numerals to domain names:
```python
DOMAIN_NAMES = [
    "Depression", "Anger", "Mania", "Anxiety", "Somatic Symptoms",
    "Suicidal Ideation", "Psychosis", "Sleep Problems", "Memory",
    "Repetitive Thoughts and Behaviors", "Dissociation",
    "Personality Functioning", "Substance Use",
]
```

## Chart suppression rules

The `ResultChart` function handles chart types in this order:
1. `chartType === "none"` → return null
2. `t_score_gauge` → T-Score chart (only if `tScore != null`)
3. `domain_bars` → Domain bars (requires `measure` + `answers`, works even if unscorable)
4. `severity_bar` (fallback) → Severity bar (returns null if `severity === "unscorable"`)

The unscorable guard is specific to `severity_bar`, not applied globally. Domain bars
and T-score gauges have their own guards.

## Regeneration

After modifying `generate-templates.py`:
```bash
python3 scripts/corpus/generate-templates.py
python3 scripts/corpus/build-index.py
# Then RESTART dev server — loadMeasures() caches templates in module-level variable
```
