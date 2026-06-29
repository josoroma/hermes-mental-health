"use client";

import type { Measure } from "@/lib/domain/_schema";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeSeverityBands } from "./chart-helpers";

// ── Custom tooltip for severity bar ────────────────────────────────────────

function SeverityTooltip({
  active,
  payload,
  score,
  scoreColor,
  bands,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
  score: number;
  scoreColor: string;
  bands: Array<{ min: number; max: number; label: string; color: string }>;
}) {
  if (!active || !payload?.length) return null;

  // Find which band the score falls into
  let bandLabel = "";
  let bandColor = scoreColor;
  for (const b of bands) {
    if (score >= b.min && score <= b.max) {
      bandLabel = b.label;
      bandColor = b.color;
      break;
    }
  }

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: bandColor }}
        />
        <span className="font-medium text-foreground">Score: {score}</span>
      </div>
      <p className="text-muted-foreground mt-0.5">{bandLabel}</p>
    </div>
  );
}

interface SeverityBarChartProps {
  measure: Measure;
  score: number;
  maxScore?: number;
  /** Show a sample description (editor preview mode) */
  sampleLabel?: string;
}

export function SeverityBarChart({
  measure,
  score,
  maxScore: maxScoreProp,
  sampleLabel,
}: SeverityBarChartProps) {
  const maxScore =
    maxScoreProp ?? measure.fields.length * measure.scoringRule.maxScale;
  const bands = computeSeverityBands(measure, maxScore);

  if (bands.length === 0) return null;

  // Build stacked bar data — one row with each band as a separate data key
  const segmentData = bands.map((b) => ({
    band: b.band,
    width: b.max - b.min + 1,
    color: b.color,
    label: b.label,
  }));

  const totalWidth = segmentData.reduce((sum, s) => sum + s.width, 0);

  const chartData: Record<string, string | number> = {
    name: "Severity",
  };
  for (const seg of segmentData) {
    chartData[seg.band] = seg.width;
  }

  // Pick the color for the ReferenceLine based on where score falls
  let scoreColor = "var(--foreground)";
  for (const b of bands) {
    if (score >= b.min && score <= b.max) {
      scoreColor = b.color;
      break;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Severity</CardTitle>
        {sampleLabel && (
          <p className="text-sm text-muted-foreground">{sampleLabel}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={{}} className="h-24 w-full">
          <BarChart
            data={[chartData]}
            layout="vertical"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barGap={0}
            barCategoryGap={0}
          >
            <XAxis type="number" domain={[0, totalWidth]} hide />
            <YAxis type="category" dataKey="name" hide />
            {segmentData.map((seg, idx) => {
              const first = idx === 0;
              const last = idx === segmentData.length - 1;
              return (
                <Bar
                  key={seg.band}
                  dataKey={seg.band}
                  stackId="severity"
                  fill={seg.color}
                  fillOpacity={0.7}
                  radius={
                    first && last
                      ? [4, 4, 4, 4]
                      : first
                        ? [4, 0, 0, 4]
                        : last
                          ? [0, 4, 4, 0]
                          : 0
                  }
                  barSize={32}
                />
              );
            })}
            <ReferenceLine
              x={score}
              stroke={scoreColor}
              strokeWidth={3}
              strokeOpacity={1}
            />
            <ChartTooltip
              content={
                <SeverityTooltip
                  score={score}
                  scoreColor={scoreColor}
                  bands={bands}
                />
              }
            />
          </BarChart>
        </ChartContainer>

        {/* Labels below, colored to match bands */}
        <div className="flex justify-between text-xs text-muted-foreground">
          {segmentData.map((seg) => (
            <span key={seg.band} style={{ color: seg.color }}>
              {seg.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}