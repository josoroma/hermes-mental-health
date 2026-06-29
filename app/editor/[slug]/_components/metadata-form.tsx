"use client";

import type { Measure } from "@/lib/domain/_schema";
import { getMeasureMeta, getMeasureTitle } from "@/lib/data/measure-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";

interface MetadataFormProps {
  slug: string;
  measure: Measure | null;
}

export function MetadataForm({ slug, measure }: MetadataFormProps) {
  const templateTitle = getMeasureTitle(slug);
  const meta = getMeasureMeta(slug);

  // Use the full measure for custom assessments, template meta for built-in
  const title = measure?.title ?? templateTitle ?? null;
  const desc = measure?.description ?? meta?.description ?? null;
  const version = measure?.version ?? meta?.version ?? null;
  const fieldCount = measure?.fields.length ?? meta?.field_count ?? 0;
  const resultChart = measure?.resultChart ?? meta?.resultChart ?? "none";
  const scoringType = measure?.scoringRule.calculation ?? meta?.scoring_type ?? "total";

  if (!title) {
    return (
      <Card className="ui-content-card">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Measure not found: {slug}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ui-content-card">
      <CardHeader>
        <CardTitle className="text-base">General Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <HermesPromptHint
          prompt={`Generate a clinical description and administration instructions for the "${title}" measure (${slug}). The description should explain the clinical purpose, target population, and key psychometric properties. The instructions should guide the patient on how to complete the assessment.`}
          agent="mental-health-editor"
        />
        <div>
          <span className="text-muted-foreground">Title</span>
          <p className="font-medium">{title}</p>
        </div>
        {desc && (
          <div>
            <span className="text-muted-foreground">Description</span>
            <p className="text-foreground/85">{desc}</p>
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          <Badge variant="outline">v{version}</Badge>
          <Badge variant="outline">{fieldCount} fields</Badge>
          <Badge variant="secondary">{resultChart}</Badge>
          <Badge variant="secondary">{scoringType}</Badge>
        </div>
        {measure?.instructions && (
          <div>
            <span className="text-muted-foreground">Instructions</span>
            <p className="text-foreground/85">{measure.instructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}