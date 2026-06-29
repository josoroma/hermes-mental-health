import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { getPatientById } from "@/lib/data/patients-server";
import { listCustomAssessments } from "@/lib/data/measures";
import { AssessmentsPageClient } from "./_components/assessments-page-client";

interface AssessmentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssessmentsPage({ params }: AssessmentsPageProps) {
  const { id } = await params;

  if (!validatePatientId(id)) notFound();

  const patient = getPatientById(id);
  if (!patient) notFound();

  const customSlugs = listCustomAssessments().map((m) => m.slug);

  return <AssessmentsPageClient patientId={id} patient={patient} customSlugs={customSlugs} />;
}