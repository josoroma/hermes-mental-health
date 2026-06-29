"use client";

import { useAtomValue } from "jotai";
import { scopedResultsAtom } from "@/lib/scope";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { severityLabel } from "@/lib/domain/_enums";
import type { Patient } from "@/lib/domain/_schema";
import { EditableMarkdownCard } from "./editable-markdown-card";
import { ConsentCard } from "./consent-card";

function deriveClinicalSummary(results: ReturnType<typeof useAtomValue<typeof scopedResultsAtom>>): string {
  if (results.length === 0) {
    return "No assessment results available. Administer an assessment to generate a clinical summary.";
  }

  const sorted = [...results].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );
  const seen = new Set<string>();
  const latest: typeof sorted = [];
  for (const r of sorted) {
    if (!seen.has(r.assessmentSlug)) {
      seen.add(r.assessmentSlug);
      latest.push(r);
    }
  }

  const measureNames = latest
    .map((r) => getMeasureTitle(r.assessmentSlug) ?? r.assessmentSlug)
    .join(", ");

  const hasConcern = latest.some(
    (r) =>
      r.scoring.severity === "moderate" ||
      r.scoring.severity === "moderately_severe" ||
      r.scoring.severity === "severe"
  );

  let summary = `Results available for ${results.length} assessment${results.length !== 1 ? "s" : ""} across ${seen.size} measure${seen.size !== 1 ? "s" : ""}: ${measureNames}.`;

  if (hasConcern) {
    summary += " Clinical attention warranted — scores in the moderate to severe range detected.";
  }

  summary += "\n\n";
  for (const r of latest) {
    summary += `${getMeasureTitle(r.assessmentSlug) ?? r.assessmentSlug}: ${severityLabel(r.scoring.severity)}\n`;
  }

  return summary;
}

interface PatientProfileProps {
  patientId: string;
  patient: Patient;
}

export function PatientProfile({ patientId, patient }: PatientProfileProps) {
  const results = useAtomValue(scopedResultsAtom);

  return (
    <>
      <EditableMarkdownCard
        patientId={patientId}
        fileType="care-plan"
        title="Care Plan"
        fallback="No care plan recorded. Generate one using the AI prompt."
        hint={`Generate a clinical care plan for ${patient.name} (${patientId}). Include treatment goals with measurable targets, recommended interventions, follow-up schedule, discharge criteria, and risk mitigation strategies.`}
        hintAgent="care-plan"
      />
      <EditableMarkdownCard
        patientId={patientId}
        fileType="clinical-summary"
        title="Clinical Summary"
        fallback={deriveClinicalSummary(results)}
        hint={`Generate a clinical summary for ${patient.name} (${patientId}). Synthesize recent assessment results, severity trends across measures, clinical changes observed, and actionable recommendations.`}
        hintAgent="assessment-review"
      />
      <EditableMarkdownCard
        patientId={patientId}
        fileType="clinical-background"
        title="Clinical Background"
        fallback={patient.clinicalBackground ?? "No clinical background recorded."}
        hint={`Generate a clinical history for ${patient.name} (${patientId}). Age: ${patient.ageRange ?? "N/A"}, Gender: ${patient.gender ?? "N/A"}. Cover reason for consultation, previous diagnoses, current medication, risk factors, and psychosocial context.`}
        hintAgent="patient-intake"
      />
      <ConsentCard patientId={patientId} seedPatient={patient} />
    </>
  );
}