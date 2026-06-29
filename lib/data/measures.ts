import { measureSchema, type Measure } from '@/lib/domain/_schema';
import fs from 'fs';
import path from 'path';

// ── Server-side measure store ──────────────────────────────────────────────

const TEMPLATES_DIR = path.join(process.cwd(), 'data/shared/templates/json');
const INDEX_PATH = path.join(process.cwd(), 'data/shared/templates/index.json');

let measures: Measure[] | null = null;

/**
 * Load all measures from the generated template catalog.
 * Uses fs on the server side.
 */
export function loadMeasures(): Measure[] {
  if (measures) return measures;

  const validated: Measure[] = [];
  const errors: string[] = [];

  // Read index
  let index: Array<{ slug: string }> = [];
  try {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  } catch {
    console.warn('[measures] Failed to read index.json');
  }

  for (const entry of index) {
    try {
      const filePath = path.join(TEMPLATES_DIR, `${entry.slug}.json`);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const parsed = measureSchema.safeParse(raw);

      if (parsed.success) {
        validated.push(parsed.data);
      } else {
        errors.push(
          `${entry.slug}: schema drift — ${parsed.error.issues
            .map((i) => i.message)
            .join('; ')}`
        );
      }
    } catch {
      errors.push(`${entry.slug}: failed to load template`);
    }
  }

  if (errors.length > 0) {
    console.warn(`[measures] ${errors.length} template(s) failed:`, errors);
  }

  measures = validated;
  return measures;
}

/**
 * Get a single measure by slug.
 */
export function getMeasure(slug: string): Measure | undefined {
  return loadMeasures().find((m) => m.slug === slug);
}

/**
 * List all measures (returns shallow copies for UI).
 */
export function listMeasures() {
  return loadMeasures().map(
    ({ slug, title, description, version, fields, resultChart, scoringRule }) => ({
      slug,
      title,
      description,
      version,
      fieldCount: fields.length,
      resultChart,
      scoringType: scoringRule.calculation,
    })
  );
}

export function measureCount(): number {
  return loadMeasures().length;
}

// ── Custom assessments (data/shared/assessments/) ────────────────────────────

const CUSTOM_DIR = path.join(process.cwd(), 'data/shared/assessments');

export function listCustomAssessments() {
  const results: ReturnType<typeof listMeasures> = [];
  try {
    if (!fs.existsSync(CUSTOM_DIR)) return results;
    const files = fs.readdirSync(CUSTOM_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(CUSTOM_DIR, file), 'utf-8'));
        const parsed = measureSchema.safeParse(raw);
        if (parsed.success) {
          const m = parsed.data;
          results.push({
            slug: m.slug,
            title: m.title,
            description: m.description,
            version: m.version,
            fieldCount: m.fields.length,
            resultChart: m.resultChart,
            scoringType: m.scoringRule.calculation,
          });
        }
      } catch { /* skip invalid */ }
    }
  } catch { /* dir missing */ }
  return results;
}

export type { Measure };