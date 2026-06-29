"use server";

import { measureSchema, type Measure } from "@/lib/domain/_schema";
import fs from "fs";
import path from "path";

/**
 * Load a measure template from the filesystem by slug.
 * Called from the client-side assessment page.
 */
export async function loadMeasure(slug: string): Promise<Measure | null> {
  // Security: validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]?$/i.test(slug)) return null;

  // Try template directory first, then custom assessments
  const dirs = [
    path.join(process.cwd(), "data/shared/templates/json"),
    path.join(process.cwd(), "data/shared/assessments"),
  ];

  for (const dir of dirs) {
    const measurePath = path.join(dir, `${slug}.json`);
    try {
      if (!fs.existsSync(measurePath)) continue;
      const raw = JSON.parse(fs.readFileSync(measurePath, "utf-8"));
      const parsed = measureSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch { /* try next dir */ }
  }

  return null;
}