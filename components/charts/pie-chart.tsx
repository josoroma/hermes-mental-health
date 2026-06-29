"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores } from "./field-score-helpers";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface PieChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function PieChartView({ measure, answers, sampleLabel }: PieChartViewProps) {
  const scores = extractFieldScores(measure, answers, COLORS);
  const total = scores.reduce((s, x) => s + x.score, 0);
  const data = scores.map((s, i) => ({
    name: s.label,
    value: s.score || 1, // ensure non-zero for pie visibility
    fill: COLORS[i % COLORS.length],
    pct: total > 0 ? Math.round((s.score / total) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Support Needs Distribution</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="mx-auto" initialDimension={{ width: 380, height: 340 }}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50} paddingAngle={3} label={({ percent }: { percent?: number }) => percent != null ? `${Math.round(percent * 100)}%` : ""}>
              {data.map((_, idx) => <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} formatter={(v: unknown) => [`${v}/4`, "Score"]} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", fill: "var(--muted-foreground)" }} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
