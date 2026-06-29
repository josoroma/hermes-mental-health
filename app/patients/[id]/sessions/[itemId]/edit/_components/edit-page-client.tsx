"use client";

import dynamic from "next/dynamic";
import type { ClinicalItem } from "@/lib/actions/clinical-notes";

const EditClinicalItemPage = dynamic(
  () => import("./edit-page").then((m) => ({ default: m.EditClinicalItemPage })),
  { ssr: false }
);

export function EditClinicalItemPageClient(props: {
  patientId: string;
  item: ClinicalItem;
}) {
  return <EditClinicalItemPage {...props} />;
}