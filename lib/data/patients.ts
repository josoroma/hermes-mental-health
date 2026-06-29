import { patientSchema, type Patient } from '@/lib/domain/_schema';
import { type Result, type Invite, SeverityBand, InviteStatus } from '@/lib/domain/_schema';

// ── Seed patients ──────────────────────────────────────────────────────────

/**
 * 3 synthetic seed patients with profiles, assessment history, and results.
 * All data is de-identified — no real PHI.
 */
export const SEED_PATIENTS: Patient[] = [
  {
    id: 'patient-001',
    name: 'María González',
    ageRange: '35-44',
    gender: 'Femenino',
    demographics: '35-year-old female, employed full-time, lives with spouse and two children',
    clinicalBackground:
      'Presenta síntomas depresivos desde hace 3 meses. Refiere anhedonia, fatiga, alteraciones del sueño (insomnio de mantenimiento), y disminución de apetito. Sin antecedentes psiquiátricos previos. No medicación actual. Antecedentes familiares: madre con depresión mayor tratada con sertralina.',
    consentStatus: 'granted',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-15T14:30:00Z',
  },
  {
    id: 'patient-002',
    name: 'Carlos Ramírez',
    ageRange: '25-34',
    gender: 'Masculino',
    demographics: '28-year-old male, single, works as software developer, lives alone',
    clinicalBackground:
      'Consulta por ansiedad generalizada. Síntomas de preocupación excesiva, tensión muscular, irritabilidad y dificultad para concentrarse durante los últimos 6 meses. Antecedentes: episodio depresivo hace 2 años tratado con fluoxetina 20mg por 8 meses con buena respuesta. Actualmente sin medicación. Refiere consumo de alcohol social (2-3 cervezas, 2 veces por semana).',
    consentStatus: 'granted',
    createdAt: '2026-06-05T09:00:00Z',
    updatedAt: '2026-06-18T11:00:00Z',
  },
  {
    id: 'patient-003',
    name: 'Ana Vega',
    ageRange: '45-54',
    gender: 'Femenino',
    demographics: '48-year-old female, divorced, works as teacher, lives with one teenage child',
    clinicalBackground:
      'Evaluación por síntomas de estrés postraumático tras accidente automovilístico hace 4 meses. Reporta recuerdos intrusivos, pesadillas, conductas de evitación (no conduce desde el accidente), hipervigilancia y respuesta de sobresalto exagerada. Antecedentes: hipotiroidismo tratado con levotiroxina 50mcg. Sin antecedentes psiquiátricos previos. Escala de depresión PHQ-9 inicial: 18 (moderadamente severa).',
    consentStatus: 'granted',
    createdAt: '2026-06-10T08:30:00Z',
    updatedAt: '2026-06-19T16:00:00Z',
  },
];

// ── Seed results ───────────────────────────────────────────────────────────

export const SEED_RESULTS: Record<string, Result[]> = {
  'patient-001': [
    {
      resultId: 'phq-9-20260601-100000',
      inviteToken: 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
      patientId: 'patient-001',
      assessmentSlug: 'severity-depression-adult',
      scoring: {
        assessmentSlug: 'severity-depression-adult',
        patientId: 'patient-001',
        total: 15,
        average: 1.67,
        tScore: null,
        severity: SeverityBand.MODERATELY_SEVERE,
        dataQualityFlags: [],
      },
      answers: {
        item_1: 2,
        item_2: 2,
        item_3: 2,
        item_4: 1,
        item_5: 1,
        item_6: 2,
        item_7: 1,
        item_8: 1,
        item_9: 0,
      },
      createdAt: '2026-06-01T10:00:00Z',
    },
    {
      resultId: 'phq-9-20260615-143000',
      inviteToken: 'B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7',
      patientId: 'patient-001',
      assessmentSlug: 'severity-depression-adult',
      scoring: {
        assessmentSlug: 'severity-depression-adult',
        patientId: 'patient-001',
        total: 11,
        average: 1.22,
        tScore: null,
        severity: SeverityBand.MODERATE,
        dataQualityFlags: [],
      },
      answers: {
        item_1: 1,
        item_2: 1,
        item_3: 1,
        item_4: 1,
        item_5: 1,
        item_6: 2,
        item_7: 1,
        item_8: 1,
        item_9: 0,
      },
      createdAt: '2026-06-15T14:30:00Z',
    },
  ],
  'patient-002': [
    {
      resultId: 'gad-7-20260605-090000',
      inviteToken: 'C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8',
      patientId: 'patient-002',
      assessmentSlug: 'severity-gad-adult',
      scoring: {
        assessmentSlug: 'severity-gad-adult',
        patientId: 'patient-002',
        total: 28,
        average: 2.8,
        tScore: null,
        severity: SeverityBand.MODERATELY_SEVERE,
        dataQualityFlags: [],
      },
      answers: {
        item_1: 2, item_2: 3, item_3: 3, item_4: 2, item_5: 3,
        item_6: 3, item_7: 3, item_8: 3, item_9: 2, item_10: 2,
      },
      createdAt: '2026-06-05T09:00:00Z',
    },
  ],
  'patient-003': [
    {
      resultId: 'phq-9-20260610-083000',
      inviteToken: 'D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9',
      patientId: 'patient-003',
      assessmentSlug: 'severity-depression-adult',
      scoring: {
        assessmentSlug: 'severity-depression-adult',
        patientId: 'patient-003',
        total: 18,
        average: 2.0,
        tScore: null,
        severity: SeverityBand.MODERATELY_SEVERE,
        dataQualityFlags: [],
      },
      answers: {
        item_1: 2, item_2: 2, item_3: 2, item_4: 2, item_5: 1,
        item_6: 2, item_7: 2, item_8: 2, item_9: 1,
      },
      createdAt: '2026-06-10T08:30:00Z',
    },
  ],
};

// ── Seed invites ───────────────────────────────────────────────────────────

export const SEED_INVITES: Record<string, Invite[]> = {
  'patient-001': [
    {
      token: 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
      measureSlug: 'severity-depression-adult',
      patientId: 'patient-001',
      createdAt: '2026-06-01T10:00:00Z',
      status: InviteStatus.COMPLETED,
    },
    {
      token: 'B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7',
      measureSlug: 'severity-depression-adult',
      patientId: 'patient-001',
      createdAt: '2026-06-15T14:00:00Z',
      status: InviteStatus.COMPLETED,
    },
    {
      token: 'E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0',
      measureSlug: 'severity-gad-adult',
      patientId: 'patient-001',
      createdAt: '2026-06-20T09:00:00Z',
      status: InviteStatus.PENDING,
    },
  ],
  'patient-002': [
    {
      token: 'C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8',
      measureSlug: 'severity-gad-adult',
      patientId: 'patient-002',
      createdAt: '2026-06-05T09:00:00Z',
      status: InviteStatus.COMPLETED,
    },
  ],
  'patient-003': [
    {
      token: 'D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9',
      measureSlug: 'severity-depression-adult',
      patientId: 'patient-003',
      createdAt: '2026-06-10T08:30:00Z',
      status: InviteStatus.COMPLETED,
    },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function getPatientById(id: string): Patient | undefined {
  return SEED_PATIENTS.find((p) => p.id === id);
}

export function listPatients(): Patient[] {
  return SEED_PATIENTS;
}

// Validate all seed data on module load
for (const p of SEED_PATIENTS) {
  patientSchema.parse(p);
}