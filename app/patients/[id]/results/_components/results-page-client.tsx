"use client";

import { useRouter } from "next/navigation";
import type { Patient, Result } from "@/lib/domain/_schema";
import { ResultsSection } from "../../_components/results-section";

interface Props {
  patientId: string;
  patient: Patient;
  results: Result[];
}

export function ResultsPageClient({ results }: Props) {
  const router = useRouter();

  return (
    <>
      <h1 className="ui-content-section ui-content-section-results text-xl font-semibold tracking-tight">Results</h1>
      <ResultsSection results={results} onDeleted={() => router.refresh()} />
    </>
  );
}