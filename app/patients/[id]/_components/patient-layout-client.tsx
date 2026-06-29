"use client";

import { useHydrateAtoms } from "jotai/utils";
import { activePatientIdAtom } from "@/lib/state/_atoms";
import type { Patient } from "@/lib/domain/_schema";
import { PatientHeader } from "./patient-header";

interface PatientLayoutClientProps {
  patientId: string;
  patient: Patient;
  children: React.ReactNode;
}

export function PatientLayoutClient({ patientId, patient, children }: PatientLayoutClientProps) {
  useHydrateAtoms([[activePatientIdAtom, patientId]]);

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      <PatientHeader
        patientId={patientId}
        name={patient.name}
        ageRange={patient.ageRange}
        gender={patient.gender}
      />
      {children}
    </div>
  );
}