# Scoring Engine — Auto-Computed Severity Thresholds

## When

When a measure's `scoringRule.severityThresholds` is empty `{}` — common for:
- Level 1 cross-cutting measures (`domain_max` scoring)
- WHODAS measures
- Any measure where thresholds weren't explicitly defined in the template

## The problem

Before fix: `resolveSeverityThreshold()` returned `UNSCORABLE` when thresholds were empty,
even for results with valid numeric scores (e.g., Total: 23, Average: 1.8).

This caused false "Unscorable" badges on valid assessment results.

## The fix

`resolveSeverityThreshold()` now accepts a third `maxScore` parameter and auto-computes
severity from `score / maxScore` percentage when thresholds are empty.

```typescript
export function resolveSeverityThreshold(
  score: number,
  thresholds: Record<string, [number, number]>,
  maxScore: number = 27  // default for backward compat
): SeverityBand {
  if (!thresholds || Object.keys(thresholds).length === 0) {
    const pct = maxScore > 0 ? score / maxScore : 0;
    if (score === 0 || pct < 0.2) return SeverityBand.NONE;
    if (pct < 0.4) return SeverityBand.MILD;
    if (pct < 0.6) return SeverityBand.MODERATE;
    if (pct < 0.8) return SeverityBand.MODERATELY_SEVERE;
    return SeverityBand.SEVERE;
  }
  // ... existing threshold lookup
}
```

### Call sites with maxScore

| Scoring type | maxScore |
|---|---|
| `AVERAGE` | `rule.maxScale` (individual scale max, typically 3-5) |
| `DOMAIN_MAX` | `rule.maxScale` |
| `TOTAL` | `values.length * rule.maxScale` (total possible sum) |

## Caveats

- **Existing result files on disk are NOT automatically updated.** Only newly scored
  results (fresh submissions or edited+re-saved) get auto-computed severity.
- To update existing results: edit the result (click Edit → change a value → Save)
  and the re-score will use the new engine.
