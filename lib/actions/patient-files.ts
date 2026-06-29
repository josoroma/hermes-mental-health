'use server';

import fs from 'fs';
import path from 'path';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');

// ── Demographics (profile.json) ────────────────────────────────────────────

export interface DemographicsData {
  name: string;
  ageRange?: string;
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function readDemographics(
  patientId: string
): Promise<DemographicsData | null> {
  try {
    const p = path.join(PATIENTS_DIR, patientId, 'profile.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export async function saveDemographics(
  patientId: string,
  data: DemographicsData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const p = path.join(PATIENTS_DIR, patientId, 'profile.json');
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(p)) {
      existing = JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
    const updated = {
      ...existing,
      name: data.name,
      ageRange: data.ageRange ?? existing.ageRange,
      gender: data.gender ?? existing.gender,
      updatedAt: new Date().toISOString(),
      createdAt: (existing.createdAt as string) ?? data.createdAt,
    };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Consent (consent.json) ─────────────────────────────────────────────────

export interface ConsentData {
  consentStatus: 'granted' | 'pending' | 'revoked';
  createdAt?: string;
  updatedAt?: string;
}

export async function readConsent(
  patientId: string
): Promise<ConsentData | null> {
  try {
    const p = path.join(PATIENTS_DIR, patientId, 'consent.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export async function saveConsent(
  patientId: string,
  data: ConsentData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const p = path.join(PATIENTS_DIR, patientId, 'consent.json');
    const updated: ConsentData = {
      ...data,
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Delete Patient (move to patients-deleted/) ──────────────────────────────

export async function deletePatient(
  patientId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const srcDir = path.join(PATIENTS_DIR, patientId);
    if (!fs.existsSync(srcDir)) return { success: true };

    const deletedDir = path.join(process.cwd(), 'data', 'patients-deleted');
    fs.mkdirSync(deletedDir, { recursive: true });

    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const dstDir = path.join(deletedDir, `${ts}-${patientId}`);

    fs.renameSync(srcDir, dstDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}