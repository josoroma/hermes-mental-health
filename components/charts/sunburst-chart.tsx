"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { SunburstChart, type SunburstData } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores } from "./field-score-helpers";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface SunburstChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function SunburstChartView({ measure, answers, sampleLabel }: SunburstChartViewProps) {
  const scores = extractFieldScores(measure, answers, COLORS);
  const data: SunburstData = {
    name: "Process",
    children: scores.map((s, i) => ({
      name: s.label,
      value: Math.max(s.score, 1),
      fill: COLORS[i % COLORS.length],
    })),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Process Stages</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="mx-auto" initialDimension={{ width: 400, height: 380 }}>
          <SunburstChart data={data} />
        </ChartContainer>
        <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs">
          {scores.map((s) => (
            <div key={s.name} className="flex justify-between">
              <span className="text-muted-foreground truncate mr-1">{s.label}</span>
              <span className="font-mono font-medium">{s.score}/4</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
