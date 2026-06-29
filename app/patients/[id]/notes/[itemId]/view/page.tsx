import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { readClinicalItem } from "@/lib/actions/clinical-notes";
import { ViewClinicalItemPage } from "@/app/patients/[id]/sessions/[itemId]/view/_components/view-page";

interface Props { params: Promise<{ id: string; itemId: string }> }

export default async function NotesViewPage({ params }: Props) {
  const { id, itemId } = await params;
  if (!validatePatientId(id)) notFound();
  const item = await readClinicalItem(id, "note", itemId);
  if (!item) notFound();
  return <ViewClinicalItemPage patientId={id} item={item} />;
}