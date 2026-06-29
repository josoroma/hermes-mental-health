"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores } from "./field-score-helpers";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

interface RadialBarChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function RadialBarChartView({ measure, answers, sampleLabel }: RadialBarChartViewProps) {
  const scores = extractFieldScores(measure, answers, COLORS);
  const data = scores.map((s, i) => ({
    name: s.label,
    score: s.score,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress Rings</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="mx-auto" initialDimension={{ width: 380, height: 380 }}>
          <RadialBarChart data={data} cx="50%" cy="50%" innerRadius="20%" outerRadius="85%" startAngle={180} endAngle={0}>
            <RadialBar dataKey="score" background cornerRadius={6} />
            <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "11px", fill: "var(--muted-foreground)" }} />
          </RadialBarChart>
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
