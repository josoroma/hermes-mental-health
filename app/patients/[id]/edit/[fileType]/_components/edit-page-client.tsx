"use client";

import dynamic from "next/dynamic";

const EditMarkdownPage = dynamic(
  () => import("./edit-page").then((m) => ({ default: m.EditMarkdownPage })),
  { ssr: false }
);

export function EditMarkdownPageClient(props: {
  patientId: string;
  fileType: "clinical-summary" | "clinical-background" | "care-plan";
  title: string;
  initialContent: string | null;
}) {
  // Pass initialContent as a data attribute so the dynamically-loaded
  // component can read it without relying on prop serialization through
  // next/dynamic which drops large string props.
  return (
    <EditMarkdownPage
      {...props}
      // Also embed content in a hidden element for the editor to read
    />
  );
}