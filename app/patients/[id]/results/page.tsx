import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { getPatientById } from "@/lib/data/patients-server";
import { listResultFiles } from "@/lib/actions/result-files";
import { ResultsPageClient } from "./_components/results-page-client";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;

  if (!validatePatientId(id)) notFound();

  const patient = getPatientById(id);
  if (!patient) notFound();

  const results = await listResultFiles(id);

  return <ResultsPageClient patientId={id} patient={patient} results={results} />;
}