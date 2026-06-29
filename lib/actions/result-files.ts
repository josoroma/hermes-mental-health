'use server';

import fs from 'fs';
import path from 'path';
import type { Result } from '@/lib/domain/_schema';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');

export interface ResultFileData extends Result {
  resultChart?: string;
}

function resultFilename(createdAt: string, slug: string): string {
  const d = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `taken-${ts}-${slug}.json`;
}

export async function saveResultFile(
  patientId: string,
  result: ResultFileData
): Promise<{ success: true; filename: string } | { success: false; error: string }> {
  try {
    const dir = path.join(PATIENTS_DIR, patientId, 'results');
    fs.mkdirSync(dir, { recursive: true });
    const filename = resultFilename(result.createdAt ?? new Date().toISOString(), result.assessmentSlug);
    const filePath = path.join(dir, filename);
    const data = { ...result, createdAt: result.createdAt ?? new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, filename };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function readResultFile(
  patientId: string,
  resultId: string
): Promise<ResultFileData | null> {
  try {
    const dir = path.join(PATIENTS_DIR, patientId, 'results');
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as ResultFileData;
      if (data.resultId === resultId) return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function listResultFiles(patientId: string): Promise<ResultFileData[]> {
  try {
    const dir = path.join(PATIENTS_DIR, patientId, 'results');
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const results: ResultFileData[] = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      results.push(JSON.parse(raw) as ResultFileData);
    }
    return results.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  } catch {
    return [];
  }
}

export async function updateResultFile(
  patientId: string,
  result: ResultFileData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const dir = path.join(PATIENTS_DIR, patientId, 'results');
    if (!fs.existsSync(dir)) return { success: false, error: 'Results directory not found' };
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as ResultFileData;
      if (data.resultId === result.resultId) {
        const updated = { ...data, ...result, createdAt: result.createdAt ?? data.createdAt };
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
        return { success: true };
      }
    }
    return { success: false, error: 'Result file not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function moveResultToDeleted(
  patientId: string,
  resultId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const srcDir = path.join(PATIENTS_DIR, patientId, 'results');
    if (!fs.existsSync(srcDir)) return { success: true };
    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const raw = fs.readFileSync(srcPath, 'utf-8');
      const data = JSON.parse(raw) as ResultFileData;
      if (data.resultId === resultId) {
        // Move to results-deleted/ preserving original filename, prepending deleted-ts-
        const dstDir = path.join(PATIENTS_DIR, patientId, 'results-deleted');
        fs.mkdirSync(dstDir, { recursive: true });
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const nowTs = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
        const dstPath = path.join(dstDir, `deleted-${nowTs}-${file}`);
        fs.renameSync(srcPath, dstPath);
        return { success: true };
      }
    }
    return { success: false, error: 'Result file not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export interface DeletedResultFile extends ResultFileData {
  filename: string;
  deletedAt: string;
}

export async function listDeletedResultFiles(patientId: string): Promise<DeletedResultFile[]> {
  try {
    const dir = path.join(PATIENTS_DIR, patientId, 'results-deleted');
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const results: DeletedResultFile[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const data = JSON.parse(raw) as ResultFileData;
      // Extract deleted date from filename: deleted-YYYY-MM-DD-HH-MM-SS-taken-...
      const deletedMatch = file.match(/^deleted-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})-/);
      const deletedAt = deletedMatch ? deletedMatch[1] : '';
      results.push({ ...data, filename: file, deletedAt });
    }
    return results.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  } catch {
    return [];
  }
}