"use client";

import type { Measure } from "@/lib/domain/_schema";
import {
  ChartContainer,
  ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeDomainScores, severityColors } from "./chart-helpers";

interface DomainBarsChartProps {
  measure: Measure;
  answers: Record<string, string | number | string[]>;
  /** Optional: sample title override for editor preview */
  title?: string;
}

export function DomainBarsChart({
  measure,
  answers,
  title,
}: DomainBarsChartProps) {
  const domainEntries = Object.entries(computeDomainScores(measure, answers));

  if (domainEntries.length === 0) return null;

  const data = domainEntries.map(([name, { score }]) => ({
    name: name.length > 20 ? name.slice(0, 18) + "\u2026" : name,
    score,
    fill:
      score >= 3
        ? severityColors.severe
        : score >= 2
          ? severityColors.moderate
          : score >= 1
            ? severityColors.mild
            : severityColors.none,
    fullName: name,
  }));

  const domainChartConfig: ChartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.fullName }])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title ?? "Domain Scores"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={domainChartConfig}
          className="w-full"
          initialDimension={{ width: 500, height: Math.max(data.length * 48, 200) }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 4]}
              tickCount={5}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
              formatter={(_value: unknown) => {
                const v = typeof _value === "number" ? _value : 0;
                return [`${v}/4`, "Score"];
              }}
              labelFormatter={(label: React.ReactNode) => {
                const labelStr = typeof label === "string" ? label : String(label);
                const d = data.find((x) => x.name === labelStr);
                return d?.fullName ?? labelStr;
              }}
            />
            <Bar dataKey="score" radius={4} barSize={24}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Domain labels with scores */}
        <div className="space-y-1 mt-3">
          {domainEntries.map(([name, { score }]) => (
            <div key={name} className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {name.length > 28 ? name.slice(0, 26) + "\u2026" : name}
              </span>
              <span className="font-medium font-mono">{score}/4</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}