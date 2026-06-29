'use server';

import fs from 'fs';
import path from 'path';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');

export interface ClinicalItem {
  id: string;
  type: 'session' | 'note';
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function itemDir(patientId: string, type: 'session' | 'note'): string {
  return path.join(PATIENTS_DIR, patientId, type === 'session' ? 'sessions' : 'notes');
}

function deletedDir(patientId: string, type: 'session' | 'note'): string {
  return path.join(PATIENTS_DIR, patientId, type === 'session' ? 'sessions-deleted' : 'notes-deleted');
}

function ts(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/** Filter out companion .appointment.json files from session directories */
function isItemFile(f: string): boolean {
  return f.endsWith('.json') && !f.endsWith('.appointment.json');
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createClinicalItem(
  patientId: string,
  type: 'session' | 'note',
  appointmentDate?: string
): Promise<ClinicalItem> {
  const now = new Date().toISOString();
  const template = loadTemplate(type);
  const item: ClinicalItem = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: template.title,
    content: template.content,
    createdAt: now,
    updatedAt: now,
  };

  const dir = itemDir(patientId, type);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${ts()}-${item.id}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(item, null, 2), 'utf-8');

  // Write appointment date companion file for sessions
  if (type === 'session' && appointmentDate) {
    const appointmentFilename = `${ts()}-${item.id}.appointment.json`;
    fs.writeFileSync(
      path.join(dir, appointmentFilename),
      JSON.stringify({ appointmentDate }, null, 2),
      'utf-8'
    );
  }

  return item;
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listClinicalItems(
  patientId: string,
  type: 'session' | 'note'
): Promise<ClinicalItem[]> {
  const dir = itemDir(patientId, type);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(isItemFile);
  const items: ClinicalItem[] = [];
  for (const file of files) {
    try {
      items.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')));
    } catch { /* skip */ }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Deleted list ────────────────────────────────────────────────────────────

export async function listDeletedClinicalItems(
  patientId: string,
  type: 'session' | 'note'
): Promise<ClinicalItem[]> {
  const dir = deletedDir(patientId, type);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(isItemFile);
  const items: ClinicalItem[] = [];
  for (const file of files) {
    try {
      items.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')));
    } catch { /* skip */ }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function readClinicalItem(
  patientId: string,
  type: 'session' | 'note',
  itemId: string
): Promise<ClinicalItem | null> {
  const dir = itemDir(patientId, type);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(isItemFile);
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as ClinicalItem;
    if (data.id === itemId) return data;
  }
  return null;
}

// ── Save ────────────────────────────────────────────────────────────────────

export async function saveClinicalItem(
  patientId: string,
  item: ClinicalItem
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const dir = itemDir(patientId, item.type);
    if (!fs.existsSync(dir)) return { success: false, error: 'Directory not found' };
    const files = fs.readdirSync(dir).filter(isItemFile);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ClinicalItem;
      if (data.id === item.id) {
        fs.writeFileSync(filePath, JSON.stringify({ ...item, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
        return { success: true };
      }
    }
    return { success: false, error: 'Item not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Delete (move to deleted folder) ─────────────────────────────────────────

export async function deleteClinicalItem(
  patientId: string,
  type: 'session' | 'note',
  itemId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const srcDir = itemDir(patientId, type);
    if (!fs.existsSync(srcDir)) return { success: true };
    const files = fs.readdirSync(srcDir).filter(isItemFile);
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const data = JSON.parse(fs.readFileSync(srcPath, 'utf-8')) as ClinicalItem;
      if (data.id === itemId) {
        const dstDir = deletedDir(patientId, type);
        fs.mkdirSync(dstDir, { recursive: true });
        const dstPath = path.join(dstDir, `deleted-${ts()}-${file}`);
        fs.renameSync(srcPath, dstPath);
        // Also move companion appointment file
        const appointmentFile = file.replace(/\.json$/, '.appointment.json');
        const appointmentSrc = path.join(srcDir, appointmentFile);
        if (fs.existsSync(appointmentSrc)) {
          const appointmentDst = path.join(dstDir, `deleted-${ts()}-${appointmentFile}`);
          fs.renameSync(appointmentSrc, appointmentDst);
        }
        return { success: true };
      }
    }
    return { success: false, error: 'Item not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Load template ───────────────────────────────────────────────────────────

function loadTemplate(type: 'session' | 'note'): { title: string; content: string } {
  try {
    const templatePath = path.join(process.cwd(), 'data/shared/templates/md', `${type}-template.json`);
    const raw = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    return { title: raw.title, content: raw.content };
  } catch {
    return { title: type === 'session' ? 'New Session' : 'New Note', content: '' };
  }
}