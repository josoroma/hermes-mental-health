import { z } from 'zod';
import {
  FieldType,
  SeverityBand,
  ResultChartType,
  InviteStatus,
  ScoringType,
} from './_enums';

// ── MeasureField ───────────────────────────────────────────────────────────

export const measureFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(500),
  type: z.nativeEnum(FieldType),
  required: z.boolean().default(true),
  domain: z.string().max(100).optional(),
  options: z
    .array(
      z.object({
        value: z.number().or(z.string()),
        label: z.string(),
      })
    )
    .optional(),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
});

export type MeasureField = z.infer<typeof measureFieldSchema>;

// ── ScoringRule ────────────────────────────────────────────────────────────

export const scoringRuleSchema = z.object({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculation: z.nativeEnum(ScoringType).default('total' as any),
  maxScale: z.number().int().min(1).max(10).default(3),
  severityThresholds: z
    .record(z.string(), z.tuple([z.number(), z.number()]))
    .default({}),
  reverseScoredItems: z.array(z.string()).default([]),
  requiredFields: z.array(z.string()).default([]),
  t_score: z.boolean().default(false),
  /** PROMIS raw→T lookup: { rawSum: tScore } */
  tScoreLookup: z.record(z.number(), z.number()).optional(),
  /** Diagnostic threshold (e.g. PCL-5 >= 33) */
  diagnosticThreshold: z.number().optional(),
});

export type ScoringRule = z.infer<typeof scoringRuleSchema>;

// ── Measure ────────────────────────────────────────────────────────────────

export const measureSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]?$/i, 'Slug must be URL-friendly'),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).default(''),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  /** Administration/clinical guidance shown to the patient before the form */
  instructions: z.string().max(5000).default(''),
  /** Which chart/visualization to render for results */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultChart: z.nativeEnum(ResultChartType).default('severity_bar' as any),
  fields: z.array(measureFieldSchema).min(1),
  scoringRule: scoringRuleSchema,
});

export type Measure = z.infer<typeof measureSchema>;

// ── Patient ────────────────────────────────────────────────────────────────

export const patientSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid patient ID'),
  name: z.string().min(1).max(200),
  ageRange: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  demographics: z.string().max(2000).optional(),
  clinicalBackground: z.string().max(5000).optional(),
  consentStatus: z.enum(['granted', 'pending', 'revoked']).default('granted'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Patient = z.infer<typeof patientSchema>;

// ── Invite ─────────────────────────────────────────────────────────────────

export const inviteSchema = z.object({
  token: z.string().length(32),
  measureSlug: z.string().min(1).max(128),
  patientId: z.string().min(1).max(64),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status: z.nativeEnum(InviteStatus).default('pending' as any),
});

export type Invite = z.infer<typeof inviteSchema>;

// ── Result / Submission ────────────────────────────────────────────────────

export const scoringOutputSchema = z.object({
  assessmentSlug: z.string(),
  patientId: z.string(),
  total: z.number().nullable(),
  average: z.number().nullable(),
  tScore: z.number().nullable(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  severity: z.nativeEnum(SeverityBand).default('unscorable' as any),
  dataQualityFlags: z.array(z.string()).default([]),
});

export type ScoringOutput = z.infer<typeof scoringOutputSchema>;

export const resultSchema = z.object({
  resultId: z.string().min(1).max(128),
  inviteToken: z.string().length(32),
  patientId: z.string().min(1).max(64),
  assessmentSlug: z.string().min(1).max(128),
  scoring: scoringOutputSchema,
  answers: z.record(
    z.string(),
    z.string().or(z.number()).or(z.array(z.string()))
  ),
  createdAt: z.string().datetime().optional(),
});

export type Result = z.infer<typeof resultSchema>;

// ── Answer schema builder (used by dynamic assessment forms) ───────────────

/**
 * Build a Zod schema for validating assessment answers from a Measure.
 * Scale fields get min..max range validation; required fields become non-optional.
 */
export function buildAnswerSchema(measure: Measure) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of measure.fields) {
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'scale': {
        let numSchema: z.ZodNumber = z.number().int();
        if (field.min !== undefined) numSchema = numSchema.min(field.min);
        if (field.max !== undefined) numSchema = numSchema.max(field.max);
        schema = numSchema;
        break;
      }
      case 'text': {
        let strSchema: z.ZodString = z.string();
        if (field.required) strSchema = strSchema.min(1);
        schema = strSchema;
        break;
      }
      case 'select': {
        let strSchema: z.ZodType<string> = z.string();
        if (field.options?.length) {
          const optionValues = field.options.map((o) => String(o.value));
          strSchema = strSchema.refine((v) => optionValues.includes(v), {
            message: `Must be one of: ${optionValues.join(', ')}`,
          });
        }
        schema = strSchema;
        break;
      }
      case 'multi_select':
        schema = z.array(z.string());
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      default:
        schema = z.string();
    }

    if (!field.required) {
      schema = schema.optional();
    }

    shape[field.id] = schema;
  }

  return z.object(shape);
}

export type AnswerData = z.infer<ReturnType<typeof buildAnswerSchema>>;

// Re-export enums for convenience
export { FieldType, SeverityBand, ResultChartType, InviteStatus, ScoringType };