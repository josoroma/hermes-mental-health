import fs from 'fs';
import path from 'path';
import { measureSchema, type Measure } from '@/lib/domain/_schema';

const CUSTOM_DIR = path.join(process.cwd(), 'data/shared/assessments');

export function loadCustomMeasure(slug: string): Measure | undefined {
  try {
    const filePath = path.join(CUSTOM_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) return undefined;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const parsed = measureSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function loadAllCustomMeasures(): Measure[] {
  const measures: Measure[] = [];
  try {
    if (!fs.existsSync(CUSTOM_DIR)) return measures;
    const files = fs.readdirSync(CUSTOM_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const measure = loadCustomMeasure(file.replace('.json', ''));
      if (measure) measures.push(measure);
    }
  } catch { /* dir missing */ }
  return measures;
}