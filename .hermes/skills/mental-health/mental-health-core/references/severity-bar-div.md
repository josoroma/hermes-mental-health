# Severity Bar — Div-Based Implementation (SUPERSEDED)

> **Superseded by Recharts stacked bars.** The shared `SeverityBarChart` component in `components/charts/severity-bar-chart.tsx` now uses Recharts stacked `<Bar>` with `stackId`, `ReferenceLine`, and is proven to render correctly. See `mental-health-results` skill, reference `chart-components.md` for the current implementation.
>
> The div-based approach below is retained for historical reference only. Do NOT use it for new work — use `import { SeverityBarChart } from "@/components/charts"`.

## Implementation

```tsx
const maxScore = measure.fields.length * measure.scoringRule.maxScale;
const thresholds = measure.scoringRule.severityThresholds;

const bands = bandOrder
  .filter((band) => thresholds[band])
  .map((band) => {
    const [min, max] = thresholds[band];
    return {
      band, min, max,
      color: severityColors[band],
      label: severityLabel(band),
      pct: ((max - min + 1) / maxScore) * 100,
    };
  });

const scorePct = (score / maxScore) * 100;

return (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Severity</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* Full-width background bar with colored severity bands */}
      <div className="relative h-8 w-full rounded-md overflow-hidden bg-muted">
        {bands.map((b) => (
          <div
            key={b.band}
            className="absolute inset-y-0"
            style={{
              left: `${(b.min / maxScore) * 100}%`,
              width: `${b.pct}%`,
              backgroundColor: b.color,
              opacity: 0.6,
            }}
          />
        ))}
        {/* Score indicator line */}
        <div
          className="absolute inset-y-0 w-1 bg-foreground rounded-full z-10"
          style={{ left: `${scorePct}%`, transform: "translateX(-50%)" }}
        />
        {/* Score value above bar */}
        <div
          className="absolute -top-6 text-xs font-semibold whitespace-nowrap"
          style={{ left: `${scorePct}%`, transform: "translateX(-50%)" }}
        >
          {score}
        </div>
      </div>

      {/* Labels below matching band colors */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {bands.map((b) => (
          <span key={b.band} style={{ color: b.color }}>{b.label}</span>
        ))}
      </div>
    </CardContent>
  </Card>
);
```

## Patterns

- `bg-muted` as the bar track background
- Absolute-positioned colored divs for each severity band (opacity 0.6)
- `w-1 bg-foreground rounded-full` as the score indicator line
- Score value positioned above the bar with `-top-6`
- Labels below colored to match their bands

## Pitfalls avoided

- Recharts `<defs>` / `<linearGradient>` — unrendered in some contexts
- Recharts `<ReferenceArea>` — invisible or wrong z-order
- Recharts stacked `<Bar>` with `stackId` — zero-width bars when data shape mismatches
- `ChartContainer` requiring proper `config` keys for shadcn chart theming
