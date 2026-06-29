'use server';

import fs from 'fs';
import path from 'path';
import { patientSchema, type Patient } from '@/lib/domain/_schema';

const PATIENTS_DIR = path.join(process.cwd(), 'data/patients');
const TEMPLATES_DIR = path.join(process.cwd(), 'data/shared/templates/md');

function generatePatientId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const timestamp = Date.now().toString(36);
  return `${sanitized}-${timestamp}`;
}

interface CreatePatientInput {
  name: string;
  ageRange?: string;
  gender?: string;
}

export async function createPatient(
  input: CreatePatientInput
): Promise<{ success: true; patient: Patient } | { success: false; error: string }> {
  const id = generatePatientId(input.name);
  const now = new Date().toISOString();

  const raw = {
    id,
    name: input.name,
    ageRange: input.ageRange || undefined,
    gender: input.gender || undefined,
    clinicalBackground: undefined,
    consentStatus: 'granted' as const,
    createdAt: now,
    updatedAt: now,
  };

  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const patient = parsed.data;
  const dir = path.join(PATIENTS_DIR, patient.id);
  fs.mkdirSync(dir, { recursive: true });

  const replacements: Record<string, string> = {
    '{{PATIENT_ID}}': patient.id,
    '{{PATIENT_NAME}}': patient.name,
    '{{AGE_RANGE}}': patient.ageRange ?? '',
    '{{GENDER}}': patient.gender ?? '',
    '{{CREATED_AT}}': now,
  };

  // Copy files from templates, substituting placeholders
  const FILE_TEMPLATES = [
    'profile.json',
    'consent.json',
    'care-plan.md',
    'clinical-background.md',
    'clinical-summary.md',
  ];

  for (const filename of FILE_TEMPLATES) {
    const templatePath = path.join(TEMPLATES_DIR, filename);
    if (!fs.existsSync(templatePath)) continue;

    let content = fs.readFileSync(templatePath, 'utf-8');
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(key, value);
    }
    fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
  }

  // Ensure empty subdirectories
  fs.mkdirSync(path.join(dir, 'invites'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'results'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'results-deleted'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'sessions-deleted'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'notes-deleted'), { recursive: true });

  return { success: true, patient };
}