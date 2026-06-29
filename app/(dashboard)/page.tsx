import { listAllPatients } from "@/lib/data/patients-server";
import { listMeasures, listCustomAssessments } from "@/lib/data/measures";
import { PatientTable } from "./_components/patient-table";
import { AssessmentLibrary } from "./_components/assessment-library";
import { CreateWithAI } from "./_components/create-with-ai";
import { CreatePatientDialog } from "./_components/create-patient-dialog";
import { DashboardPatientsHint, DashboardMeasuresHint } from "./_components/dashboard-hints";
import Link from "next/link";
import { Bot } from "lucide-react";

export default function DashboardPage() {
  const patients = listAllPatients();
  const measures = listMeasures();
  const customAssessments = listCustomAssessments();

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="ui-header ui-header-dashboard gradient-cover rounded-xl p-6 -mx-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              DSM-5-TR assessment management — {patients.length} patient
              {patients.length !== 1 ? "s" : ""} · {measures.length + customAssessments.length} measures
              available
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/agent?dashboard"
              className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              <Bot className="size-3.5" />
              Agent
            </Link>
            <CreateWithAI />
          </div>
        </div>
      </div>

      <section className="ui-content-section ui-content-section-patients">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Patients</h2>
            <DashboardPatientsHint patientCount={patients.length} />
          </div>
          <CreatePatientDialog />
        </div>
        <PatientTable patients={patients} />
      </section>

      {customAssessments.length > 0 && (
        <section className="ui-content-section ui-content-section-custom-assessments">
          <h2 className="text-lg font-medium mb-4">
            Custom Assessments ·{" "}
            <span className="text-muted-foreground">{customAssessments.length}</span>
          </h2>
          <AssessmentLibrary measures={customAssessments} custom subsection="custom-assessments" />
        </section>
      )}

      <section className="ui-content-section ui-content-section-available-assessments">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-medium">
            Available Assessments ·{" "}
            <span className="text-muted-foreground">{measures.length}</span>
          </h2>
          <DashboardMeasuresHint measureCount={measures.length} />
        </div>
        <AssessmentLibrary measures={measures} subsection="available-assessments" />
      </section>
    </div>
  );
}