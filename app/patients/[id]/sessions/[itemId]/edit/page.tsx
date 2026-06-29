import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { readClinicalItem } from "@/lib/actions/clinical-notes";
import { EditClinicalItemPageClient } from "./_components/edit-page-client";

interface EditPageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function EditClinicalItemRoute({ params }: EditPageProps) {
  const { id, itemId } = await params;
  if (!validatePatientId(id)) notFound();

  const item = await readClinicalItem(id, "session", itemId)
    || await readClinicalItem(id, "note", itemId);

  if (!item) notFound();

  return <EditClinicalItemPageClient patientId={id} item={item} />;
}