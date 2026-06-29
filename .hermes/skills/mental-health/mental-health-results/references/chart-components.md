# Shared Recharts Chart Components

All assessment result and preview charts use shared Recharts components from `components/charts/`. Never hand-roll SVGs, divs, or inline charting code.

## Component map

| Component | File | Chart type | Used in |
|---|---|---|---|
| `SeverityBarChart` | `severity-bar-chart.tsx` | `severity_bar` | ResultDetail, EditorPage ChartPreview |
| `TScoreGaugeChart` | `t-score-gauge-chart.tsx` | `t_score_gauge` | ResultDetail, EditorPage ChartPreview |
| `DomainBarsChart` | `domain-bars-chart.tsx` | `domain_bars` | ResultDetail |
| `chart-helpers.ts` | — | Shared helpers | All charts + results-section |

## Imports

```tsx
// Charts
import { SeverityBarChart, TScoreGaugeChart, DomainBarsChart } from "@/components/charts";

// Shared helpers
import {
  severityColors,
  severityBadgeVariant,
  computeSeverityBands,
  computeDomainScores,
  resolveValueLabel,
  bandOrder,
} from "@/components/charts";
```

## SeverityBarChart

Props:
```tsx
interface SeverityBarChartProps {
  measure: Measure;       // Need scoringRule.severityThresholds and fields
  score: number;           // Actual patient score or sample
  maxScore?: number;       // Override computed max (for editor preview)
  sampleLabel?: string;    // Description shown below title (editor preview)
}
```

Renders:
- Stacked Recharts `BarChart` with one colored segment per severity band
- `ReferenceLine` at the actual score position (colored to match the band)
- Custom `SeverityTooltip` showing score + severity band (NOT `ChartTooltipContent`)
- Labels below bar colored to match each band

Tooltip pitfall: `ChartTooltipContent` shows ALL stacked-bar segment raw widths ("none: 5, mild: 5, …"). Always use the custom `SeverityTooltip` that ships inside `severity-bar-chart.tsx`.

## TScoreGaugeChart

Props:
```tsx
interface TScoreGaugeChartProps {
  tScore: number;          // PROMIS T-score
  severity: string;        // Severity band for display label
  sampleLabel?: string;    // Description for editor preview
}
```

Renders:
- Horizontal `BarChart` with T-score value
- `ReferenceLine` at T=50 labeled "M = 50"
- Value label on bar: `T: {score}`
- Below: "T-Score: N · SeverityLabel"

## DomainBarsChart

Props:
```tsx
interface DomainBarsChartProps {
  measure: Measure;                                    // Fields with domain grouping
  answers: Record<string, string | number | string[]>; // Patient answers
  title?: string;                                      // Card title override
}
```

Renders:
- Horizontal `BarChart` with one bar per domain
- Bars colored by severity: green (0-0.99), yellow (1-2), orange (2-3), red (3+)
- `CartesianGrid` on X axis
- Custom tooltip showing Score/4 + full domain name
- Per-bar coloring via `<Cell>` children (NOT `<rect>`)
- Score summary below: domain name + score/4

## chart-helpers.ts

Shared utilities consumed by chart components AND by other UI:

| Export | Purpose |
|---|---|
| `severityColors` | `Record<string, string>` — band → luma token (var(--chart-1..5)) |
| `severityBadgeVariant(severity)` | Returns shadcn `Badge` variant for a severity band |
| `computeSeverityBands(measure, maxScore)` | Builds band slice data from thresholds or equal-width fallback |
| `computeDomainScores(measure, answers)` | Extracts `{ domainName: { score, severity } }` from field answers |
| `resolveValueLabel(field, value)` | Maps answer value → display label via field options metadata |
| `bandOrder` | `string[]` — canonical severity band ordering |

Consumers: `result-detail.tsx`, `results-section.tsx`, `editor-page.tsx`, all chart components.

## Architecture notes

- All charts wrap Recharts inside shadcn `ChartContainer`
- `ChartContainer` `config` defaults to `{}` when bands/data keys don't need the config-driven theming
- Charts live in `components/charts/` (not under `app/`), usable anywhere
- `index.ts` barrel exports all components and helpers
- The `resultChart` field on measures drives dispatch — `result-detail.tsx` has a thin `ResultChart` dispatcher
- Editor `ChartPreview` uses the same components with sample data