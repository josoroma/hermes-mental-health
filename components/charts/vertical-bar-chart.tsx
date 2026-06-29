"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores, extractFieldLabels } from "./field-score-helpers";

const COLORS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)", "var(--chart-1)"];

interface VerticalBarChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function VerticalBarChartView({ measure, answers, sampleLabel }: VerticalBarChartViewProps) {
  const scores = extractFieldScores(measure, answers, COLORS);
  const labels = extractFieldLabels(measure);
  const data = scores.map((s, i) => ({ name: labels[i], score: s.score }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Factor Scores</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="w-full" initialDimension={{ width: 400, height: 280 }}>
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 60, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-35} textAnchor="end" interval={0} height={80} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
            <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} formatter={(v: unknown) => [`${v}/4`, "Score"]} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={36}>
              {data.map((_, idx) => <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
