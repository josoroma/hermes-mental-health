"use client";

import { HermesPromptHint } from "@/components/hermes-prompt-hint";

export function DashboardPatientsHint({ patientCount }: { patientCount: number }) {
  return (
    <HermesPromptHint
      compact
      prompt={`Review the ${patientCount} active patients and their recent assessments. Which ones need priority follow-up or have scores in the severe range?`}
      agent="assessment-review"
    />
  );
}

export function DashboardMeasuresHint({ measureCount }: { measureCount: number }) {
  return (
    <HermesPromptHint
      compact
      prompt={`Review the catalog of ${measureCount} available DSM-5-TR measures. Are there gaps in coverage for specific clinical domains (e.g., trauma, sleep, personality)? Suggest additional measures if needed.`}
      agent="assessment-review"
    />
  );
}