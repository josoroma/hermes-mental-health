import { getPatientById } from "@/lib/data/patients-server";
import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { PatientProfile } from "./_components/patient-profile";

interface PatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params;

  // Validate patient ID at route boundary (blocks path traversal / illegal chars)
  if (!validatePatientId(id)) {
    notFound();
  }

  const patient = getPatientById(id);
  if (!patient) {
    notFound();
  }

  return <PatientProfile patientId={id} patient={patient} />;
}