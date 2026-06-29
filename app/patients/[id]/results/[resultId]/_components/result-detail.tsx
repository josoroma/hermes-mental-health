"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMeasureTitle, getMeasureMeta } from "@/lib/data/measure-meta";
import { severityLabel } from "@/lib/domain/_enums";
import type { Measure, Result } from "@/lib/domain/_schema";
import { scoreResult } from "@/lib/scoring/engine";
import { updateResultFile } from "@/lib/actions/result-files";
import { FieldRenderer } from "@/app/a/[token]/_components/field-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SeverityBarChart,
  TScoreGaugeChart,
  DomainBarsChart,
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
  severityBadgeVariant,
  resolveValueLabel,
} from "@/components/charts";
import { ArrowLeft, Pencil, X, Check, Bot } from "lucide-react";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";
import Link from "next/link";

function ResultChart({
  measureSlug,
  scoring,
  measure,
  answers,
}: {
  measureSlug: string;
  scoring: { total: number | null; tScore: number | null; severity: string };
  measure: Measure | null;
  answers?: Record<string, string | number | string[]>;
}) {
  const meta = getMeasureMeta(measureSlug);
  const chartType = measure?.resultChart ?? meta?.resultChart ?? "severity_bar";

  if (chartType === "none") return null;

  if (chartType === "t_score_gauge" && scoring.tScore != null) {
    return (
      <TScoreGaugeChart
        tScore={scoring.tScore}
        severity={scoring.severity}
      />
    );
  }

  if (chartType === "domain_bars" && measure && answers) {
    return <DomainBarsChart measure={measure} answers={answers} />;
  }

  // New chart types — all require measure + answers
  if (!measure || !answers) return null;

  switch (chartType) {
    case "radar_chart":
      return <RadarChartView measure={measure} answers={answers} />;
    case "bar_chart":
      return <VerticalBarChartView measure={measure} answers={answers} />;
    case "radial_bar_chart":
      return <RadialBarChartView measure={measure} answers={answers} />;
    case "composed_chart":
      return <ComposedChartView measure={measure} answers={answers} />;
    case "pie_chart":
      return <PieChartView measure={measure} answers={answers} />;
    case "line_chart":
      return <LineChartView measure={measure} answers={answers} />;
    case "area_chart":
      return <AreaChartView measure={measure} answers={answers} />;
    case "scatter_chart":
      return <ScatterChartView measure={measure} answers={answers} />;
    case "funnel_chart":
      return <FunnelChartView measure={measure} answers={answers} />;
    case "sunburst_chart":
      return <SunburstChartView measure={measure} answers={answers} />;
  }

  // severity_bar (default)
  if (scoring.severity === "unscorable" || scoring.total === null) return null;
  if (!measure) return null;

  return (
    <SeverityBarChart
      measure={measure}
      score={scoring.total}
    />
  );
}

interface ResultDetailProps {
  result: Result;
  measure: Measure | null;
}

export function ResultDetail({ result: initialResult, measure }: ResultDetailProps) {
  const router = useRouter();

  const [result, setResult] = useState(initialResult);
  const [isEditing, setIsEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<Record<string, unknown>>({});

  const measureTitle = getMeasureTitle(result.assessmentSlug) ?? result.assessmentSlug;

  const handleBack = () => {
    router.push(`/patients/${result.patientId}/results`);
  };

  const handleEditStart = () => {
    setEditAnswers({ ...result.answers });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditAnswers({});
  };

  const handleEditSave = async () => {
    if (!measure) return;

    const scoring = scoreResult(
      measure,
      editAnswers as Record<string, string | number | string[]>
    );
    scoring.patientId = result.patientId;

    const updated: Result = {
      ...result,
      answers: editAnswers as Record<string, string | number | string[]>,
      scoring,
    };

    updateResultFile(result.patientId, {
      ...updated,
      resultChart: measure.resultChart,
    });

    setResult(updated);
    setIsEditing(false);
    setEditAnswers({});
  };

  return (
    <div className="ui-content-page ui-content-page-result-detail space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="ui-header ui-header-result-detail w-fit -ml-2 text-muted-foreground hover:text-foreground"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Back to Results
        </Button>
        <Link
          href={`/agent?result&patientId=${result.patientId}&resultId=${result.resultId}`}
          className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
        >
          <Bot className="size-3.5" />
          Agent
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {measureTitle}
        </h1>
        <p className="text-muted-foreground text-sm mt-1" suppressHydrationWarning>
          {result.createdAt
            ? new Date(result.createdAt).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </p>
      </div>

      <ResultChart
        measureSlug={result.assessmentSlug}
        scoring={result.scoring}
        measure={measure}
        answers={result.answers}
      />

      <HermesPromptHint
        prompt={`Interpret this clinical result: measure=${result.assessmentSlug} (${measureTitle}), total score=${result.scoring.total ?? "N/A"}, severity=${result.scoring.severity}. Generate a narrative interpretation citing the specific measure and key clinical findings.`}
        agent="assessment-review"
      />

      <Card className="ui-content-card">
        <CardHeader>
          <CardTitle className="text-base">Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Total</span>
              <p className="font-medium">{result.scoring.total ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Average</span>
              <p className="font-medium">
                {result.scoring.average?.toFixed(1) ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">T-Score</span>
              <p className="font-medium">{result.scoring.tScore ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Severity</span>
              <div className="mt-0.5">
                <Badge
                  variant={severityBadgeVariant(result.scoring.severity)}
                >
                  {severityLabel(result.scoring.severity)}
                </Badge>
              </div>
            </div>
          </div>

          {result.scoring.dataQualityFlags.length > 0 && (
            <div className="mt-4 p-3 rounded-md bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Data Quality Flags
              </p>
              <ul className="text-xs space-y-0.5">
                {result.scoring.dataQualityFlags.map((flag) => (
                  <li key={flag} className="font-mono">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <HermesPromptHint
              prompt={`Generate a care plan for this patient based on the ${measureTitle} result. Score: ${result.scoring.total ?? "N/A"}, Severity: ${result.scoring.severity}. Include measurable treatment goals, recommended interventions, follow-up frequency, and discharge criteria. Markdown format.`}
              agent="care-plan"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="ui-content-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Responses</CardTitle>
          {measure && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleEditStart}>
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleEditCancel}>
                <X className="size-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleEditSave}>
                <Check className="size-3.5 mr-1.5" />
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isEditing && measure ? (
            <div className="ui-content-page ui-content-page-result-detail space-y-6">
              {measure.fields.map((field, idx) => (
                <div key={field.id} className="pb-4 border-b border-border last:border-0">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                    <FieldRenderer
                      field={field}
                      value={editAnswers[field.id]}
                      onChange={(value: unknown) =>
                        setEditAnswers((prev) => ({ ...prev, [field.id]: value }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                {Object.entries(result.answers).map(([id, value]) => {
                  const field = measure?.fields.find((f) => f.id === id);
                  const label = field?.label ?? id;
                  const displayValue = resolveValueLabel(field, value);
                  return (
                    <div
                      key={id}
                      className="flex justify-between border-b border-border pb-2 last:border-0 gap-4"
                    >
                      <span className="text-muted-foreground min-w-0">
                        {label}
                      </span>
                      <span className="font-medium shrink-0 text-right">
                        {displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
              {measure?.fields[0]?.options && measure.fields[0].options.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Response Scale</p>
                  {measure.fields[0].options.map((opt) => (
                    <div key={String(opt.value)} className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-medium min-w-[1.25rem]">{opt.value}</span>
                      <span className="text-muted-foreground">= {opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}