import type { Measure } from "@/lib/domain/_schema";

export interface FieldScore {
  name: string;
  label: string;
  score: number;
  maxScore: number;
  fill: string;
}

export function extractFieldScores(
  measure: Measure,
  answers: Record<string, string | number | string[]>,
  fillColors: string[]
): FieldScore[] {
  return measure.fields.map((field, i) => {
    const raw = answers[field.id];
    const val =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseFloat(raw)
          : 0;
    const score = isNaN(val) ? 0 : val;
    return {
      name: field.id,
      label: field.label.length > 30 ? field.label.slice(0, 28) + "\u2026" : field.label,
      score,
      maxScore: field.max ?? measure.scoringRule.maxScale,
      fill: fillColors[i % fillColors.length],
    };
  });
}

export function extractFieldLabels(measure: Measure): string[] {
  return measure.fields.map((f) =>
    f.label.length > 24 ? f.label.slice(0, 22) + "\u2026" : f.label
  );
}
