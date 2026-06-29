"use client";

import {
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { severityLabel } from "@/lib/domain/_enums";

interface TScoreGaugeChartProps {
  tScore: number;
  severity: string;
  /** Show a sample description (editor preview mode) */
  sampleLabel?: string;
}

const tScoreChartConfig: ChartConfig = {
  tScore: { label: "T-Score", color: "var(--chart-1)" },
};

export function TScoreGaugeChart({
  tScore,
  severity,
  sampleLabel,
}: TScoreGaugeChartProps) {
  const data = [{ name: "T-Score", value: tScore }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">T-Score</CardTitle>
        {sampleLabel && (
          <p className="text-sm text-muted-foreground">{sampleLabel}</p>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={tScoreChartConfig} className="h-48 w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 62, bottom: 0, left: 0 }}
          >
            <XAxis type="number" domain={[20, 100]} />
            <YAxis type="category" dataKey="name" hide />
            <Bar
              dataKey="value"
              fill="var(--chart-1)"
              radius={4}
              barSize={32}
              label={{
                position: "right",
                fontSize: 14,
                fontWeight: 600,
                fill: "var(--foreground)",
                formatter: (v: string | number | boolean | null | undefined) => `T: ${v}`,
              }}
            />
            <ReferenceLine
              x={50}
              stroke="var(--chart-3)"
              strokeDasharray="4 4"
              label={{
                value: "M = 50",
                position: "top",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </BarChart>
        </ChartContainer>
        <p className="text-center text-sm text-muted-foreground mt-2">
          T-Score: {tScore} · {severityLabel(severity)}
        </p>
      </CardContent>
    </Card>
  );
}