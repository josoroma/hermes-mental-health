'server-only';

import fs from 'fs';
import path from 'path';
import { patientSchema, type Patient } from '@/lib/domain/_schema';
import { SEED_PATIENTS, SEED_RESULTS, getPatientById as getSeedPatientById } from '@/lib/data/patients';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');

/** Overlay consent.json onto a patient if it exists on disk. */
function overlayConsent(patient: Patient): Patient {
  try {
    const consentPath = path.join(PATIENTS_DIR, patient.id, 'consent.json');
    if (fs.existsSync(consentPath)) {
      const consent = JSON.parse(fs.readFileSync(consentPath, 'utf-8'));
      return {
        ...patient,
        consentStatus: consent.consentStatus ?? patient.consentStatus,
        createdAt: consent.createdAt ?? patient.createdAt,
        updatedAt: consent.updatedAt ?? patient.updatedAt,
      };
    }
  } catch {
    // ignore — return patient as-is
  }
  return patient;
}

/** Overlay profile.json onto a patient if it exists on disk. */
function overlayProfile(patient: Patient): Patient {
  try {
    const profilePath = path.join(PATIENTS_DIR, patient.id, 'profile.json');
    if (fs.existsSync(profilePath)) {
      const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      return {
        ...patient,
        name: profile.name ?? patient.name,
        ageRange: profile.ageRange ?? patient.ageRange,
        gender: profile.gender ?? patient.gender,
        createdAt: profile.createdAt ?? patient.createdAt,
        updatedAt: profile.updatedAt ?? patient.updatedAt,
      };
    }
  } catch {
    // ignore
  }
  return patient;
}

export function getPatientById(id: string): Patient | undefined {
  const seed = getSeedPatientById(id);
  if (seed) {
    if (fs.existsSync(path.join(PATIENTS_DIR, id))) {
      let p = overlayProfile(seed);
      p = overlayConsent(p);
      return p;
    }
    return undefined;
  }

  try {
    const profilePath = path.join(PATIENTS_DIR, id, 'profile.json');
    if (!fs.existsSync(profilePath)) return undefined;
    const raw = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    const parsed = patientSchema.safeParse(raw);
    if (parsed.success) {
      return overlayConsent(parsed.data);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export { SEED_RESULTS };

export function listAllPatients(): Patient[] {
  const patients: Patient[] = [];

  // Seed patients: only include if their directory exists
  for (const p of SEED_PATIENTS) {
    if (fs.existsSync(path.join(PATIENTS_DIR, p.id))) {
      let patient = overlayProfile(p);
      patient = overlayConsent(patient);
      patients.push(patient);
    }
  }

  // Filesystem-only patients
  try {
    const entries = fs.readdirSync(PATIENTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SEED_PATIENTS.some((p) => p.id === entry.name)) continue;

      const profilePath = path.join(PATIENTS_DIR, entry.name, 'profile.json');
      if (!fs.existsSync(profilePath)) continue;

      try {
        const raw = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
        const parsed = patientSchema.safeParse(raw);
        if (parsed.success) {
          patients.push(overlayConsent(parsed.data));
        }
      } catch {
        // Skip invalid
      }
    }
  } catch {
    // Directory may not exist
  }

  return patients;
}
