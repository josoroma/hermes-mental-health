"use client";

import type { Measure } from "@/lib/domain/_schema";
import { getMeasureTitle, getMeasureMeta } from "@/lib/data/measure-meta";
import { severityLabel } from "@/lib/domain/_enums";
import { FieldRenderer } from "@/app/a/[token]/_components/field-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetadataForm } from "./metadata-form";
import {
  SeverityBarChart,
  TScoreGaugeChart,
  RadarChartView,
  VerticalBarChartView,
  RadialBarChartView,
  ComposedChartView,
  PieChartView,
  LineChartView,
  AreaChartView,
  ScatterChartView,
  FunnelChartView,
  SunburstChartView,
} from "@/components/charts";
import { ChevronLeft, Bot } from "lucide-react";
import Link from "next/link";

interface EditorPageProps {
  slug: string;
  measure: Measure | null;
}

export function EditorPage({ slug, measure }: EditorPageProps) {
  const title = getMeasureTitle(slug);

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="ui-header ui-header-editor flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4 mr-1" />
          Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {title ?? slug}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assessment Editor ·{" "}
            <span className="font-mono text-xs">{slug}</span>
          </p>
        </div>
        <Link
          href={`/agent?editor&slug=${slug}`}
          className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
        >
          <Bot className="size-3.5" />
          Agent
        </Link>
      </div>

      <Tabs defaultValue="metadata" className="w-full">
        <TabsList>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="space-y-4 mt-4">
          <MetadataForm slug={slug} measure={measure} />
        </TabsContent>

        <TabsContent value="fields" className="space-y-4 mt-4">
          {measure ? (
            <Card className="ui-content-card">
              <CardHeader>
                <CardTitle className="text-base">
                  Fields ({measure.fields.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {measure.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="pb-4 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                          {idx + 1}.
                        </span>
                        <FieldRenderer
                          field={field}
                          value={undefined}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="ui-content-card">
              <CardHeader>
                <CardTitle className="text-base">Field Definitions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Field definitions are generated from the DSM-5-TR corpus.
                  No template found for this slug.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4 mt-4">
          {measure ? (
            <>
              <Card className="ui-content-card">
                <CardHeader>
                  <CardTitle className="text-base">Scoring Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground">Calculation</span>
                      <p className="font-medium capitalize">
                        {measure.scoringRule.calculation}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Scale</span>
                      <p className="font-medium">
                        {measure.scoringRule.maxScale}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">T-Score</span>
                      <Badge
                        variant={
                          measure.scoringRule.t_score ? "default" : "outline"
                        }
                      >
                        {measure.scoringRule.t_score ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Diagnostic Threshold
                      </span>
                      <p className="font-medium">
                        {measure.scoringRule.diagnosticThreshold ?? "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="ui-content-card">
                <CardHeader>
                  <CardTitle className="text-base">
                    Severity Thresholds
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm">
                    {Object.entries(measure.scoringRule.severityThresholds).map(
                      ([band, range]) => (
                        <div
                          key={band}
                          className="flex items-center justify-between"
                        >
                          <span>{severityLabel(band)}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {range[0]} – {range[1]}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {measure.scoringRule.reverseScoredItems.length > 0 && (
                <Card className="ui-content-card">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Reverse-Scored Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {measure.scoringRule.reverseScoredItems.map((id) => (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {id}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="ui-content-card">
                <CardHeader>
                  <CardTitle className="text-base">
                    Required Fields ({measure.scoringRule.requiredFields.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {measure.scoringRule.requiredFields.map((id) => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {id}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="ui-content-card">
              <CardHeader>
                <CardTitle className="text-base">Scoring Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Scoring rules are generated from the DSM-5-TR corpus.
                  No template found for this slug.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chart" className="space-y-4 mt-4">
          {measure ? (
            <ChartPreview measure={measure} />
          ) : (
            <Card className="ui-content-card">
              <CardHeader>
                <CardTitle className="text-base">Chart Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No template found for this slug.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Chart Preview ──────────────────────────────────────────────────────────

function ChartPreview({ measure }: { measure: Measure }) {
  const meta = getMeasureMeta(measure.slug);
  const chartType = measure.resultChart ?? meta?.resultChart ?? "severity_bar";

  if (chartType === "none") {
    return (
      <Card className="ui-content-card">
        <CardHeader>
          <CardTitle className="text-base">Chart Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No chart configured for this measure.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sampleTotal = Math.min(
    Math.floor(measure.fields.length * 1.4),
    measure.fields.length * measure.scoringRule.maxScale - 1
  );
  const maxScore = measure.fields.length * measure.scoringRule.maxScale;

  // Generate sample answers for chart previews
  const sampleAnswers: Record<string, string | number | string[]> = {};
  measure.fields.forEach((f, i) => {
    const vals = [2, 3, 1, 4, 2, 3, 0, 4, 1, 3, 2, 2, 3, 1];
    sampleAnswers[f.id] = vals[i % vals.length];
  });

  if (chartType === "t_score_gauge") {
    const sampleTScore = 55;
    return (
      <Card className="ui-content-card">
        <CardHeader>
          <CardTitle className="text-base">Chart Preview — T-Score Gauge</CardTitle>
        </CardHeader>
        <CardContent>
          <TScoreGaugeChart
            tScore={sampleTScore}
            severity="moderate"
            sampleLabel={`Example with T-Score = ${sampleTScore} (Moderate).`}
          />
        </CardContent>
      </Card>
    );
  }

  switch (chartType) {
    case "radar_chart":
      return <RadarChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "bar_chart":
      return <VerticalBarChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "radial_bar_chart":
      return <RadialBarChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "composed_chart":
      return <ComposedChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "pie_chart":
      return <PieChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "line_chart":
      return <LineChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "area_chart":
      return <AreaChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "scatter_chart":
      return <ScatterChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "funnel_chart":
      return <FunnelChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
    case "sunburst_chart":
      return <SunburstChartView measure={measure} answers={sampleAnswers} sampleLabel={`Preview with sample scores.`} />;
  }

  // Default: severity_bar
  return (
    <SeverityBarChart
      measure={measure}
      score={sampleTotal}
      maxScore={maxScore}
      sampleLabel={`Example score = ${sampleTotal} (Moderate). Range: 0 – ${maxScore}.`}
    />
  );
}