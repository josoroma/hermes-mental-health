"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores, extractFieldLabels } from "./field-score-helpers";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface RadarChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function RadarChartView({ measure, answers, sampleLabel }: RadarChartViewProps) {
  const scores = extractFieldScores(measure, answers, COLORS);
  const labels = extractFieldLabels(measure);
  const data = scores.map((s, i) => ({ subject: labels[i], score: s.score, fullMark: s.maxScore }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Readiness Profile</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="mx-auto" initialDimension={{ width: 360, height: 360 }}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Radar name="Score" dataKey="score" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ChartContainer>
        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
          {scores.map((s) => (
            <div key={s.name} className="flex justify-between">
              <span className="text-muted-foreground truncate mr-1">{s.label}</span>
              <span className="font-mono font-medium">{s.score}/{s.maxScore}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
