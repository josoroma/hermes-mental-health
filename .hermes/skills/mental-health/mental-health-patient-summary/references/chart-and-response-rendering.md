# Recharts Severity Bar Chart

The result detail page renders a horizontal severity bar. Common pitfalls:

## Bar renders at 1-2px height

**Cause:** Missing `YAxis` — Recharts can't determine the category axis for
`layout="vertical"` bar charts, so the bar collapses to minimum height.

**Fix:**
```tsx
// ❌ WRONG — no YAxis, bar collapses
<BarChart data={data} layout="vertical">
  <XAxis type="number" domain={[0, 30]} />
  <Bar dataKey="value" fill="..." />
</BarChart>

// ✅ RIGHT — YAxis + barSize + explicit margin
<BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
  <XAxis type="number" domain={[0, 30]} hide />
  <YAxis type="category" dataKey="name" hide />
  <Bar
    dataKey="value"
    fill="..."
    radius={4}
    barSize={32}
    label={{ position: "right", fontSize: 14, fontWeight: 600, fill: "var(--foreground)" }}
  />
</BarChart>
```

- `barSize={32}` — explicit height in pixels (prevents automatic sizing issues)
- `margin={{ right: 32 }}` — space for the right-positioned label
- `hide` on both axes — single-bar chart doesn't need tick marks
- `label={{ position: "right" }}` — score value displayed inline on the bar

## Imports required

```tsx
import { BarChart, Bar, XAxis, YAxis, ReferenceLine } from "recharts";
```

`YAxis` must be explicitly imported; it's not auto-available.

## Domain calculation

```tsx
domain={[0, Math.max(total * 1.3, 30)]}
```

Ensures the bar area is at least 30 units wide, with 30% padding beyond the total.

---

# Response Display with Field/Option Labels

## Raw display (problem)

```
item_1    2
item_2    2
```

Users see meaningless field IDs and raw numeric values.

## Resolved display (solution)

```
Little interest or pleasure in doing things    More than half the days
Feeling down, depressed, or hopeless           More than half the days
```

## Implementation — `resolveValueLabel`

```tsx
function resolveValueLabel(
  field: Measure["fields"][number] | undefined,
  value: unknown
): string {
  if (value === undefined || value === null) return "—";

  // Scale/select fields: map value to option label
  if (field?.options) {
    if (Array.isArray(value)) {
      return value
        .map((v) => field.options!.find((o) => String(o.value) === String(v))?.label ?? String(v))
        .join(", ");
    }
    const opt = field.options.find((o) => String(o.value) === String(value));
    if (opt) return opt.label;
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
```

## Integration in result detail

```tsx
{Object.entries(result.answers).map(([id, value]) => {
  const field = measure?.fields.find((f) => f.id === id);
  const label = field?.label ?? id;
  const displayValue = resolveValueLabel(field, value);
  return (
    <div key={id} className="flex justify-between gap-4">
      <span className="text-muted-foreground min-w-0">{label}</span>
      <span className="font-medium shrink-0 text-right">{displayValue}</span>
    </div>
  );
})}
```

- Field label replaces raw `id` (left side)
- Option label replaces raw value (right side)
- Handles scale, select, multi_select, boolean, and fallback to `String(value)`
