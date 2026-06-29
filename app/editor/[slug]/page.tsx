import { notFound } from "next/navigation";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { getMeasure } from "@/lib/data/measures";
import { loadCustomMeasure } from "@/lib/data/custom-assessments";
import type { Measure } from "@/lib/domain/_schema";
import { EditorPage } from "./_components/editor-page";

interface EditorProps {
  params: Promise<{ slug: string }>;
}

export default async function Editor({ params }: EditorProps) {
  const { slug } = await params;

  let measure: Measure | undefined = getMeasure(slug);
  if (!measure) {
    measure = loadCustomMeasure(slug);
  }

  const title = getMeasureTitle(slug) ?? measure?.title ?? null;
  if (!title && !measure) notFound();

  return <EditorPage slug={slug} measure={measure ?? null} />;
}