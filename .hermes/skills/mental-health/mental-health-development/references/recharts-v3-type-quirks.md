# Recharts v3.8.1 Type Quirks

TypeScript pitfalls encountered when building chart components with Recharts 3.8.1.
These are version-specific — verify if upgrading.

## LabelFormatter

`LabelFormatter = (label: RenderableText) => RenderableText` where `RenderableText = string | number | boolean | null | undefined`.

```tsx
// ❌ Wrong — doesn't accept null/undefined/boolean
formatter: (v: number) => `T: ${v}`

// ✅ Right
formatter: (v: string | number | boolean | null | undefined) => `T: ${v}`
```

## PieChart label prop

The `label` prop on `<Pie>` uses `PieLabelRenderProps` which has `percent`, NOT `pct`:

```tsx
// ❌ Wrong
label={({ pct }: { pct: number }) => `${pct}%`}

// ✅ Right
label={({ percent }: { percent?: number }) =>
  percent != null ? `${Math.round(percent * 100)}%` : ""}
```

## ScatterChart Tooltip formatter

The Recharts `Tooltip` formatter's second parameter (`name`) is typed as `NameType | undefined`, not `string`:

```tsx
// ❌ Wrong
formatter={(v: unknown, name: string) => [name === "y" ? ... : ...]}

// ✅ Right
formatter={(v: unknown, name: unknown) => [
  name === "y" ? `${v}/4` : String(v),
  name === "y" ? "Score" : String(name),
]}
```

## SunburstChart data shape

`SunburstData` is a single object with `name` and optional `children`, NOT an array:

```tsx
// ❌ Wrong
const data: SunburstData[] = [{ name: "Root", children: [...] }];

// ✅ Right
const data: SunburstData = { name: "Root", children: [...] };

<SunburstChart data={data} />
```

## Stacked Bar tooltip with ChartTooltipContent

When using stacked `<Bar stackId="...">` with shadcn's `ChartTooltipContent`, the tooltip shows ALL stacked segments with raw dataKey values. The `getPayloadConfigFromPayload` function checks `typeof payloadPayload[key] === "string"` — since numeric values fail this check, labels resolve to the raw dataKey name.

**Fix:** Use a custom tooltip component instead of `ChartTooltipContent` for stacked bar charts.

## ChartContainer config

When using `ChartContainer` without actual config keys, pass `config={{}}` (empty object). Omitting `config` entirely may cause the shadcn `useChart()` hook to error.

## YAxis required for BarChart layout="vertical"

A single-bar horizontal `BarChart` renders an invisible ~6px bar without `<YAxis type="category" dataKey="name" hide />`. Always include YAxis even if hidden.