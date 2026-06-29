/**
 * Client-safe measure metadata lookup.
 * Imports the static index.json at build time — no `fs` needed at runtime.
 */
import indexData from '@/data/shared/templates/index.json';

interface MeasureMeta {
  slug: string;
  title: string;
  description: string;
  version: string;
  field_count: number;
  resultChart: string;
  scoring_type: string;
}

/** Build a slug→title map from the index at import time */
const slugToTitle: Record<string, string> = {};
const slugToMeta: Record<string, MeasureMeta> = {};

for (const entry of indexData as MeasureMeta[]) {
  slugToTitle[entry.slug] = entry.title;
  slugToMeta[entry.slug] = entry;
}

/**
 * Get a measure's title by slug. Client-safe — no fs import.
 */
export function getMeasureTitle(slug: string): string | undefined {
  return slugToTitle[slug];
}

/**
 * Get full measure metadata by slug. Client-safe.
 */
export function getMeasureMeta(slug: string): MeasureMeta | undefined {
  return slugToMeta[slug];
}

/**
 * Total measure count from the index.
 */
export function measureMetaCount(): number {
  return Object.keys(slugToMeta).length;
}