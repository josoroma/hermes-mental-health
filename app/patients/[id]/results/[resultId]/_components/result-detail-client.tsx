"use client";

import type { Measure, Result } from "@/lib/domain/_schema";
import { ResultDetail } from "./result-detail";

interface Props {
  result: Result;
  measure: Measure | null;
}

export function ResultDetailClient({ result, measure }: Props) {
  return <ResultDetail result={result} measure={measure} />;
}