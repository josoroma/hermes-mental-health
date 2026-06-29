"use client";

import { useAtomValue } from "jotai";
import { scopedResultsAtom } from "@/lib/scope";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { severityLabel } from "@/lib/domain/_enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function severityColor(
  severity: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "severe":
    case "moderately_severe":
      return "destructive";
    case "moderate":
      return "default";
    case "mild":
      return "secondary";
    case "none":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Derives a clinical summary from the patient's latest results.
 * Deterministic stub — no AI call; synthesizes latest severity trends locally.
 */
export function ClinicalSummary() {
  const results = useAtomValue(scopedResultsAtom);

  if (results.length === 0) {
    return (
      <Card className="ui-content-card">
        <CardHeader>
          <CardTitle className="text-base">Clinical Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No assessment results available. Administer an assessment to
            generate a clinical summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort results by date (newest first)
  const sorted = [...results].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );

  // Get the latest result per unique assessment
  const seen = new Set<string>();
  const latestByAssessment: typeof sorted = [];
  for (const r of sorted) {
    if (!seen.has(r.assessmentSlug)) {
      seen.add(r.assessmentSlug);
      latestByAssessment.push(r);
    }
  }

  // Build summary text
  const measureNames = latestByAssessment
    .map((r) => {
      const measure = getMeasureTitle(r.assessmentSlug);
      return measure ?? r.assessmentSlug;
    })
    .join(", ");

  const hasClinicalConcern = latestByAssessment.some(
    (r) =>
      r.scoring.severity === "moderate" ||
      r.scoring.severity === "moderately_severe" ||
      r.scoring.severity === "severe"
  );

  return (
    <Card className="ui-content-card">
      <CardHeader>
        <CardTitle className="text-base">Clinical Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">
          Results available for{" "}
          <span className="font-medium">{results.length}</span> assessment
          {results.length !== 1 ? "s" : ""} across{" "}
          <span className="font-medium">{seen.size}</span> measure
          {seen.size !== 1 ? "s" : ""}: {measureNames}.
          {hasClinicalConcern && (
            <>
              {" "}
              Clinical attention warranted — scores in the moderate to severe
              range detected.
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {latestByAssessment.map((r) => (
            <Badge
              key={r.assessmentSlug}
              variant={
                severityColor(r.scoring.severity) as
                  | "default"
                  | "secondary"
                  | "destructive"
                  | "outline"
              }
            >
              {getMeasureTitle(r.assessmentSlug) ?? r.assessmentSlug}:{" "}
              {severityLabel(r.scoring.severity)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}