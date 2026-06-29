'use server';

import fs from 'fs';
import path from 'path';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');

type ClinicalFileType = 'clinical-summary' | 'clinical-background' | 'care-plan';

function filePath(patientId: string, type: ClinicalFileType): string {
  return path.join(PATIENTS_DIR, patientId, `${type}.md`);
}

function versionPath(patientId: string, type: ClinicalFileType, ts: string): string {
  return path.join(PATIENTS_DIR, patientId, 'version', `${type}-${ts}.md`);
}

function formatTimestamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}-${h}-${min}-${s}`;
}

export async function readClinicalFile(
  patientId: string,
  type: ClinicalFileType
): Promise<string | null> {
  try {
    const p = filePath(patientId, type);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

export async function saveClinicalFile(
  patientId: string,
  type: ClinicalFileType,
  content: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const p = filePath(patientId, type);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Save with automatic versioning: if the file already exists,
 * back it up to version/<type>-{yyyy-mm-dd-hh-mm-ss}.md first.
 * Returns the version filename if a backup was created.
 */
export async function saveClinicalFileWithBackup(
  patientId: string,
  type: ClinicalFileType,
  content: string
): Promise<
  | { success: true; backedUp: string | null }
  | { success: false; error: string }
> {
  try {
    const p = filePath(patientId, type);
    const dir = path.dirname(p);
    const versionDir = path.join(dir, 'version');

    let backedUp: string | null = null;
    if (fs.existsSync(p)) {
      const ts = formatTimestamp();
      const vp = versionPath(patientId, type, ts);
      fs.mkdirSync(versionDir, { recursive: true });
      fs.copyFileSync(p, vp);
      backedUp = `${type}-${ts}.md`;
    } else {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(p, content, 'utf-8');
    return { success: true, backedUp };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}