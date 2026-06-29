"use client";

import type { MeasureField } from "@/lib/domain/_schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FieldRendererProps {
  field: MeasureField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: FieldRendererProps) {
  switch (field.type) {
    case "scale": {
      const min = field.min ?? 0;
      const max = field.max ?? (field.options ? field.options.length - 1 : 3);
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: max - min + 1 }, (_, i) => {
              const val = min + i;
              const label = field.options
                ? field.options.find((o) => o.value === val)?.label ?? String(val)
                : String(val);
              const currentValue = typeof value === "number" ? value : -1;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChange(val)}
                  className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                    currentValue === val
                      ? "border-primary bg-primary/10 text-primary-foreground"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    }

    case "text":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your response…"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {field.options?.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "multi_select":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <div className="space-y-1">
            {field.options?.map((opt) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(String(opt.value));
              return (
                <label
                  key={String(opt.value)}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...arr, String(opt.value)]
                        : arr.filter((v: string) => v !== String(opt.value));
                      onChange(next);
                    }}
                    className="rounded border-input"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case "boolean":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <div className="flex gap-4">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((opt) => (
              <label
                key={String(opt.value)}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name={field.id}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="border-input"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <Input value={String(value ?? "")} readOnly />
        </div>
      );
  }
}