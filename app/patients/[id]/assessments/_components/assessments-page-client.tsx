"use client";

import type { Patient } from "@/lib/domain/_schema";
import { AssessmentsSection } from "../../_components/assessments-section";

interface Props {
  patientId: string;
  patient: Patient;
  customSlugs: string[];
}

export function AssessmentsPageClient({ customSlugs }: Props) {
  return (
    <>
      <h1 className="ui-content-section ui-content-section-assessments text-xl font-semibold tracking-tight">Assessments</h1>
      <AssessmentsSection customSlugs={customSlugs} />
    </>
  );
}