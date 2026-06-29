import { notFound } from "next/navigation";
import { validatePatientId } from "@/lib/scope";
import { getPatientById } from "@/lib/data/patients-server";
import { SessionsPageClient } from "./_components/sessions-page-client";

interface Props { params: Promise<{ id: string }> }

export default async function SessionsPage({ params }: Props) {
  const { id } = await params;
  if (!validatePatientId(id)) notFound();
  if (!getPatientById(id)) notFound();
  return <SessionsPageClient />;
}