"use client";

import { severityLabel } from "@/lib/domain/_enums";
import type { Measure } from "@/lib/domain/_schema";

// ── Severity colors (luma dark theme tokens) ───────────────────────────────

export const severityColors: Record<string, string> = {
  none: "var(--chart-1)",
  mild: "var(--chart-2)",
  moderate: "var(--chart-3)",
  moderately_severe: "var(--chart-4)",
  severe: "var(--chart-5)",
  unscorable: "var(--muted-foreground)",
};

// ── Ordered severity bands ─────────────────────────────────────────────────

export const bandOrder: string[] = [
  "none",
  "mild",
  "moderate",
  "moderately_severe",
  "severe",
];

// ── Badge variant mapper ───────────────────────────────────────────────────

export function severityBadgeVariant(
  severity: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "severe":
    case "moderately_severe":
      return "destructive";
    case "moderate":
      return "default";
    case "mild":
      return "secondary";
    default:
      return "outline";
  }
}

// ── Band computation ───────────────────────────────────────────────────────

export interface SeverityBandData {
  band: string;
  min: number;
  max: number;
  color: string;
  label: string;
  pct: number;
}

/**
 * Compute severity band slices from a Measure's scoringRule.
 * Uses configured thresholds when available; falls back to equal-width bands.
 */
export function computeSeverityBands(
  measure: Measure,
  maxScore: number
): SeverityBandData[] {
  const thresholds = measure.scoringRule.severityThresholds;

  if (Object.keys(thresholds).length > 0) {
    return bandOrder
      .filter((band) => thresholds[band])
      .map((band) => {
        const [min, max] = thresholds[band];
        return {
          band,
          min,
          max,
          color: severityColors[band] ?? "var(--muted-foreground)",
          label: severityLabel(band),
          pct: ((max - min + 1) / maxScore) * 100,
        };
      });
  }

  // No thresholds — divide maxScore evenly into 5 bands
  const bandWidth = Math.ceil(maxScore / bandOrder.length);
  return bandOrder.map((band, i) => {
    const min = i * bandWidth;
    const max = Math.min((i + 1) * bandWidth - 1, maxScore);
    return {
      band,
      min,
      max,
      color: severityColors[band] ?? "var(--muted-foreground)",
      label: severityLabel(band),
      pct: ((max - min + 1) / maxScore) * 100,
    };
  });
}

/**
 * Get domain scores from measure fields + answers.
 * Returns { domainName: maxScore } keyed by domain.
 */
export function computeDomainScores(
  measure: Measure,
  answers: Record<string, string | number | string[]>
): Record<string, { score: number; severity: string }> {
  const domainScores: Record<string, { raw: number; max: number }> = {};

  for (const field of measure.fields) {
    if (!field.domain) continue;
    const raw = answers[field.id];
    const val =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseFloat(raw)
          : 0;
    if (isNaN(val)) continue;

    if (!domainScores[field.domain]) {
      domainScores[field.domain] = { raw: 0, max: 4 };
    }
    domainScores[field.domain].raw = Math.max(
      domainScores[field.domain].raw,
      val
    );
  }

  const result: Record<string, { score: number; severity: string }> = {};
  for (const [domain, { raw }] of Object.entries(domainScores)) {
    result[domain] = {
      score: raw,
      severity:
        raw >= 3
          ? "severe"
          : raw >= 2
            ? "moderate"
            : raw >= 1
              ? "mild"
              : "none",
    };
  }
  return result;
}

// ── Helper: resolve answer value to display label ──────────────────────────

export function resolveValueLabel(
  field: Measure["fields"][number] | undefined,
  value: unknown
): string {
  if (value === undefined || value === null) return "—";

  if (field?.options) {
    if (Array.isArray(value)) {
      return value
        .map(
          (v) =>
            field.options!.find((o) => String(o.value) === String(v))?.label ??
            String(v)
        )
        .join(", ");
    }
    const opt = field.options.find((o) => String(o.value) === String(value));
    if (opt) return opt.label;
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}