"use client";

import type { Measure } from "@/lib/domain/_schema";
import { ChartContainer } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractFieldScores } from "./field-score-helpers";

interface ScatterChartViewProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  sampleLabel?: string;
}

export function ScatterChartView({ measure, answers, sampleLabel }: ScatterChartViewProps) {
  const scores = extractFieldScores(measure, answers, ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]);
  const data = scores.map((s, i) => ({ x: i + 1, y: s.score, z: 60, name: s.label }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs vs Capacity Match</CardTitle>
        {sampleLabel && <p className="text-sm text-muted-foreground">{sampleLabel}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="w-full" initialDimension={{ width: 400, height: 300 }}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" dataKey="x" domain={[0.5, scores.length + 0.5]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "Domain", position: "bottom", offset: -4, fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis type="number" dataKey="y" domain={[0, 4]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} label={{ value: "Score", angle: -90, position: "left", fill: "var(--muted-foreground)", fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[80, 80]} />
            <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} formatter={(v: unknown, name: unknown) => [name === "y" ? `${v}/4` : String(v), name === "y" ? "Score" : String(name)]} />
            <Scatter data={data} fill="var(--chart-1)" />
          </ScatterChart>
        </ChartContainer>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs">
          {scores.map((s, i) => (
            <span key={s.name} className="text-muted-foreground">{i + 1}. {s.label}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
