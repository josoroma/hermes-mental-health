import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { readClinicalItem } from "@/lib/actions/clinical-notes";
import { ViewClinicalItemPage } from "./_components/view-page";

interface ViewPageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function ViewClinicalItemRoute({ params }: ViewPageProps) {
  const { id, itemId } = await params;
  if (!validatePatientId(id)) notFound();

  const item = await readClinicalItem(id, "session", itemId)
    || await readClinicalItem(id, "note", itemId);

  if (!item) notFound();

  return <ViewClinicalItemPage patientId={id} item={item} />;
}