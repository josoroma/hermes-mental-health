import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { getPatientById } from "@/lib/data/patients-server";
import { readClinicalFile } from "@/lib/actions/clinical-files";
import { EditMarkdownPageClient } from "./_components/edit-page-client";

interface EditPageProps {
  params: Promise<{ id: string; fileType: string }>;
}

const VALID_TYPES = ["clinical-summary", "clinical-background", "care-plan"] as const;

export default async function EditPage({ params }: EditPageProps) {
  const { id, fileType } = await params;

  if (!validatePatientId(id)) notFound();
  if (!VALID_TYPES.includes(fileType as (typeof VALID_TYPES)[number])) notFound();

  const patient = getPatientById(id);
  if (!patient) notFound();

  const content = (await readClinicalFile(id, fileType as "clinical-summary" | "clinical-background" | "care-plan")) ?? "";

  const title =
    fileType === "clinical-summary" ? "Clinical Summary" : fileType === "care-plan" ? "Care Plan" : "Clinical Background";

  return (
    <EditMarkdownPageClient
      patientId={id}
      fileType={fileType as "clinical-summary" | "clinical-background" | "care-plan"}
      title={title}
      initialContent={content}
    />
  );
}