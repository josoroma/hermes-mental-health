import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { readClinicalItem } from "@/lib/actions/clinical-notes";
import { EditClinicalItemPage } from "@/app/patients/[id]/sessions/[itemId]/edit/_components/edit-page";

interface Props { params: Promise<{ id: string; itemId: string }> }

export default async function NotesEditPage({ params }: Props) {
  const { id, itemId } = await params;
  if (!validatePatientId(id)) notFound();
  const item = await readClinicalItem(id, "note", itemId);
  if (!item) notFound();
  return <EditClinicalItemPage patientId={id} item={item} />;
}