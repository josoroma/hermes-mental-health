"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores, extractFieldLabels } from "./field-score-helpers";

interface LineChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function LineChartView({ measure, answers, sampleLabel }: LineChartViewProps) {
  const scores = extractFieldScores(measure, answers, ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]);
  const labels = extractFieldLabels(measure);
  const data = scores.map((s, i) => ({ name: labels[i], score: s.score }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dimension Profile</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="w-full" initialDimension={{ width: 400, height: 280 }}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 60, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-35} textAnchor="end" interval={0} height={80} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
            <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
            <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 5, fill: "var(--chart-1)", strokeWidth: 2 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
