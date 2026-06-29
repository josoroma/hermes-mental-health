import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { getPatientById } from "@/lib/data/patients-server";
import { getMeasure } from "@/lib/data/measures";
import { readResultFile } from "@/lib/actions/result-files";
import type { Measure } from "@/lib/domain/_schema";
import { ResultDetailClient } from "./_components/result-detail-client";

interface ResultPageProps {
  params: Promise<{ id: string; resultId: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id, resultId } = await params;

  if (!validatePatientId(id)) notFound();

  const patient = getPatientById(id);
  if (!patient) notFound();

  const result = await readResultFile(id, resultId);
  if (!result) notFound();

  const measure: Measure | undefined = getMeasure(result.assessmentSlug);

  return <ResultDetailClient result={result} measure={measure ?? null} />;
}