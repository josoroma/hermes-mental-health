"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores, extractFieldLabels } from "./field-score-helpers";

const COLORS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];

interface ComposedChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function ComposedChartView({ measure, answers, sampleLabel }: ComposedChartViewProps) {
  const scores = extractFieldScores(measure, answers, COLORS);
  const labels = extractFieldLabels(measure);
  const avg = scores.reduce((s, x) => s + x.score, 0) / scores.length;
  const data = scores.map((s, i) => ({
    name: labels[i],
    score: s.score,
    average: Math.round(avg * 10) / 10,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Individual & Average</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="w-full" initialDimension={{ width: 400, height: 280 }}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 60, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-35} textAnchor="end" interval={0} height={80} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
            <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
              {data.map((_, idx) => <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
            </Bar>
            <Line type="monotone" dataKey="average" stroke="var(--chart-1)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: "var(--chart-1)" }} />
          </ComposedChart>
        </ChartContainer>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Dashed line: average ({avg.toFixed(1)})
        </p>
      </CardContent>
    </Card>
  );
}
