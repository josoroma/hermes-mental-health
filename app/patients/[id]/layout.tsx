import { getPatientById } from "@/lib/data/patients-server";
import { PatientLayoutClient } from "./_components/patient-layout-client";

interface PatientLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function PatientLayout({ children, params }: PatientLayoutProps) {
  const { id } = await params;
  const patient = getPatientById(id);

  if (!patient) return <>{children}</>;

  return (
    <PatientLayoutClient patientId={id} patient={patient}>
      {children}
    </PatientLayoutClient>
  );
}