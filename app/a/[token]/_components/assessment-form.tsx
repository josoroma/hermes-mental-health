"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  type Measure,
  type Invite,
  type Result,
  InviteStatus,
} from "@/lib/domain/_schema";
import { scoreResult } from "@/lib/scoring/engine";
import { saveResultFile } from "@/lib/actions/result-files";
import { updateInviteFile } from "@/lib/actions/invite-files";
import { FieldRenderer } from "./field-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";

interface AssessmentPageProps {
  invite: Invite;
  measure: Measure;
}

export function AssessmentForm({ invite, measure }: AssessmentPageProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of measure.fields) {
      if (field.type === "boolean") initial[field.id] = undefined;
      else if (field.type === "multi_select") initial[field.id] = [];
      else if (field.type === "scale") initial[field.id] = undefined;
      else initial[field.id] = "";
    }
    return initial;
  });

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of measure.fields) {
      const value = answers[field.id];

      if (field.required) {
        if (value === undefined || value === null || value === "" ||
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = "This field is required";
          continue;
        }
      }

      if (field.type === "scale" && value !== undefined && value !== null) {
        const num = Number(value);
        if (isNaN(num)) {
          newErrors[field.id] = "Must be a number";
        } else if (field.min !== undefined && num < field.min) {
          newErrors[field.id] = `Minimum value is ${field.min}`;
        } else if (field.max !== undefined && num > field.max) {
          newErrors[field.id] = `Maximum value is ${field.max}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [answers, measure]);

  const handleSubmit = () => {
    if (!validate()) return;

    const scoring = scoreResult(measure, answers as Record<string, string | number | string[]>);
    scoring.patientId = invite.patientId;

    const result: Result = {
      resultId: `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inviteToken: invite.token,
      patientId: invite.patientId,
      assessmentSlug: measure.slug,
      scoring,
      answers: answers as Record<string, string | number | string[]>,
      createdAt: new Date().toISOString(),
    };

    // Save result to file
    saveResultFile(invite.patientId, { ...result, resultChart: measure.resultChart });

    // Update invite status to completed in file
    updateInviteFile(invite.patientId, invite.token, { status: InviteStatus.COMPLETED });

    // Redirect to result page
    router.push(`/patients/${invite.patientId}/results/${result.resultId}`);
  };

  const completedCount = Object.values(answers).filter((v) => {
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;

  return (
    <div className="ui-content-page ui-content-page-assessment-form max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div className="ui-header ui-header-assessment-form">
        <h1 className="text-xl font-semibold">{measure.title}</h1>
        {measure.description && (
          <p className="text-muted-foreground text-sm mt-1">{measure.description}</p>
        )}
      </div>

      {measure.instructions && (
        <Card className="ui-content-card">
          <CardHeader><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{measure.instructions}</p>
          </CardContent>
        </Card>
      )}

      <Card className="ui-content-card">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {completedCount} of {measure.fields.length} answered
            </span>
            <Badge variant="secondary">
              {completedCount === measure.fields.length ? "Complete" : "In Progress"}
            </Badge>
          </div>

          {measure.fields.map((field, idx) => (
            <div key={field.id} className="pb-4 border-b border-border last:border-0">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">{idx + 1}.</span>
                <FieldRenderer
                  field={field}
                  value={answers[field.id]}
                  onChange={(value: unknown) => setAnswers((prev) => ({ ...prev, [field.id]: value }))}
                  error={errors[field.id]}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="ui-bottom ui-bottom-submit-assessment flex justify-end">
        <Button size="lg" onClick={handleSubmit}>Submit Assessment</Button>
      </div>

      <HermesPromptHint
        prompt={`The patient completed "${measure.title}" (${measure.slug}). Upon submission, the score will be calculated locally. To receive an AI-generated clinical interpretation, the practitioner can request a review from the results page.`}
        agent="assessment-review"
      />
    </div>
  );
}