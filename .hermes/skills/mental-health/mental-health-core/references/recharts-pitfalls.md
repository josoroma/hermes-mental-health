# Recharts Vertical BarChart Pitfalls

## Missing YAxis → invisible bar

A single-bar `BarChart` with `layout="vertical"` renders a ~6px bar without a `<YAxis>`.
Always include `<YAxis type="category" dataKey="name" hide />` so Recharts knows the category and allocates proper bar height.

## Score not visible on bar

Use `barSize` and a `label` to show the value:

```tsx
<BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
  <XAxis type="number" domain={[0, Math.max(total * 1.3, 30)]} hide />
  <YAxis type="category" dataKey="name" hide />
  <Bar
    dataKey="value"
    fill={severityColors[scoring.severity] ?? "var(--chart-1)"}
    radius={4}
    barSize={32}
    label={{ position: "right", fontSize: 14, fontWeight: 600, fill: "var(--foreground)" }}
  />
</BarChart>
```

- `barSize={32}` — proper height for a single horizontal bar
- `label={{ position: "right" }}` — shows score value next to the bar
- `margin={{ right: 32 }}` — space for the label
- `XAxis hide` — numerical ticks are noise for a single bar

## shadcn ChartContainer

Use `ChartContainer` wrapper from shadcn/ui for consistent theming:

```tsx
<ChartContainer config={chartConfig} className="h-24 w-full">
  <BarChart ...>...</BarChart>
</ChartContainer>
```

## Stacked bars — working pattern

Stacked bars for severity visualization work with the right setup. See `components/charts/severity-bar-chart.tsx`:

```tsx
<BarChart data={[chartData]} layout="vertical" barGap={0} barCategoryGap={0}>
  <XAxis type="number" domain={[0, totalWidth]} hide />
  <YAxis type="category" dataKey="name" hide />
  {segmentData.map((seg, idx) => (
    <Bar key={seg.band} dataKey={seg.band} stackId="severity"
      fill={seg.color} fillOpacity={0.7}
      radius={idx === 0 ? [4,0,0,4] : idx === last ? [0,4,4,0] : 0}
      barSize={32} />
  ))}
  <ReferenceLine x={score} stroke={scoreColor} strokeWidth={3} />
</BarChart>
```

Key requirements:
- `barGap={0}` and `barCategoryGap={0}` — no gaps between stacked segments
- `YAxis type="category" dataKey="name" hide` — required even when hidden, or bars collapse to ~6px
- Data shape: single row `Record<string, string | number>` with each band as a key holding its width
- `radius` as array: `[leftTop, rightTop, rightBottom, leftBottom]` — apply to first and last segment only
- `ReferenceLine` for the score marker, not another stacked bar segment
- **NEVER use `ChartTooltipContent`** on stacked bar charts — it renders ALL segment values as separate tooltip rows (raw widths like "none: 5, mild: 5, ..."). Use a custom tooltip component that shows the actual score and severity band.

## LabelFormatter type gotcha

Recharts `Bar` label `formatter` expects `(label: RenderableText) => RenderableText` where `RenderableText = string | number | boolean | null | undefined`. Your param type must accept all these:

```tsx
// ✅ Correct
formatter: (v: string | number | boolean | null | undefined) => `T: ${v}`

// ❌ Wrong — TS error
formatter: (v: number) => `T: ${v}`
```

## Per-bar coloring (domain bars)

Use `<Cell>` children of `<Bar>`, not `<rect>`:

```tsx
import { Cell } from "recharts";

<Bar dataKey="score" radius={4} barSize={24}>
  {data.map((entry, idx) => (
    <Cell key={`cell-${idx}`} fill={entry.fill} />
  ))}
</Bar>
```

## Other Recharts v3.8.1 type quirks

For PieChart label (`percent` not `pct`), ScatterChart Tooltip formatter (`name` can be undefined), and SunburstChart data shape (single object not array), see `mental-health-development` → `references/recharts-v3-type-quirks.md`.
