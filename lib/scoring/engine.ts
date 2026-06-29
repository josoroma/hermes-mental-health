import {
  type Measure,
  type ScoringOutput,
  type Result,
  SeverityBand,
  ScoringType,
} from '@/lib/domain/_schema';

// ── PROMIS T-score lookup tables ──────────────────────────────────────────
// Simplified lookup for common adult PROMIS short forms.
// Full tables are larger; these cover the most-used measures.
// Source: PROMIS Health Organization scoring manuals.

const PROMIS_T_SCORE_LOOKUP: Record<string, Record<number, number>> = {
  // Depression 8-item short form (Level 2—Depression—Adult)
  'level2-depression-adult': {
    8: 37.1, 9: 38.7, 10: 40.2, 11: 41.7, 12: 42.9, 13: 44.0, 14: 45.1,
    15: 46.2, 16: 47.2, 17: 48.2, 18: 49.3, 19: 50.4, 20: 51.5, 21: 52.6,
    22: 53.7, 23: 54.9, 24: 56.1, 25: 57.3, 26: 58.6, 27: 60.0, 28: 61.5,
    29: 63.1, 30: 64.9, 31: 66.8, 32: 68.9, 33: 71.1, 34: 73.5, 35: 76.1,
    36: 79.0, 37: 81.8, 38: 84.8, 39: 84.8, 40: 84.8,
  },
  // Anxiety 7-item short form (Level 2—Anxiety—Adult)
  'level2-anxiety-adult': {
    7: 36.3, 8: 38.6, 9: 40.4, 10: 42.0, 11: 43.5, 12: 44.8, 13: 46.0,
    14: 47.1, 15: 48.2, 16: 49.3, 17: 50.3, 18: 51.4, 19: 52.4, 20: 53.5,
    21: 54.5, 22: 55.6, 23: 56.7, 24: 57.9, 25: 59.2, 26: 60.6, 27: 62.1,
    28: 63.7, 29: 65.4, 30: 67.3, 31: 69.4, 32: 71.7, 33: 74.1, 34: 76.6,
    35: 79.1,
  },
  // Anger 5-item short form (Level 2—Anger—Adult)
  'level2-anger-adult': {
    5: 33.8, 6: 36.8, 7: 39.7, 8: 42.0, 9: 44.1, 10: 46.0, 11: 47.8,
    12: 49.4, 13: 50.9, 14: 52.4, 15: 53.8, 16: 55.3, 17: 56.9, 18: 58.6,
    19: 60.4, 20: 62.3, 21: 64.4, 22: 66.6, 23: 69.0, 24: 71.6, 25: 74.2,
  },
  // Sleep Disturbance 8-item short form (PROMIS)
  'level2-sleep-adult': {
    8: 30.1, 9: 32.1, 10: 33.9, 11: 35.4, 12: 36.7, 13: 37.9, 14: 39.0,
    15: 40.0, 16: 41.0, 17: 41.9, 18: 42.9, 19: 43.8, 20: 44.8, 21: 45.8,
    22: 46.8, 23: 47.9, 24: 49.0, 25: 50.1, 26: 51.3, 27: 52.5, 28: 53.8,
    29: 55.1, 30: 56.5, 31: 58.1, 32: 59.8, 33: 61.7, 34: 63.7, 35: 65.9,
    36: 68.3, 37: 70.9, 38: 73.7, 39: 76.7, 40: 79.8,
  },
};

// ── Severity from T-score ──────────────────────────────────────────────────

function tScoreSeverity(tScore: number): SeverityBand {
  if (tScore < 55) return SeverityBand.NONE;
  if (tScore < 60) return SeverityBand.MILD;
  if (tScore < 70) return SeverityBand.MODERATE;
  return SeverityBand.SEVERE;
}

// ── Reverse scoring ────────────────────────────────────────────────────────

function applyReverseScoring(
  answers: Record<string, string | number | string[]>,
  reverseItems: string[],
  maxScale: number
): Record<string, number> {
  const scored: Record<string, number> = {};
  for (const [key, value] of Object.entries(answers)) {
    const num = typeof value === 'number' ? value : parseFloat(value as string);
    if (isNaN(num)) continue;
    scored[key] = reverseItems.includes(key) ? maxScale - num : num;
  }
  return scored;
}

// ── Data quality detection ─────────────────────────────────────────────────

function detectDataQuality(
  answers: Record<string, string | number | string[]>,
  requiredFields: string[],
  fields: Measure['fields']
): string[] {
  const flags: string[] = [];

  // Check required fields
  for (const fieldId of requiredFields) {
    const value = answers[fieldId];
    if (value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      flags.push(`missing_required:${fieldId}`);
    }
  }

  // Check scale fields for out-of-range
  for (const field of fields) {
    if (field.type !== 'scale') continue;
    const value = answers[field.id];
    if (value === undefined || value === null) continue;
    const num = typeof value === 'number' ? value : parseFloat(value as string);
    if (isNaN(num)) continue;
    if (field.min !== undefined && num < field.min) {
      flags.push(`out_of_range:${field.id}`);
    }
    if (field.max !== undefined && num > field.max) {
      flags.push(`out_of_range:${field.id}`);
    }
  }

  return flags;
}

// ── Main scoring function ──────────────────────────────────────────────────

/**
 * Score a patient's assessment submission against a Measure.
 *
 * Returns a ScoringOutput with totals, severity, T-scores, and data-quality flags.
 */
export function scoreResult(
  measure: Measure,
  answers: Record<string, string | number | string[]>
): ScoringOutput {
  const rule = measure.scoringRule;
  const dataQualityFlags = detectDataQuality(answers, rule.requiredFields, measure.fields);

  // Compute scored values (after reverse scoring)
  const scored = applyReverseScoring(answers, rule.reverseScoredItems, rule.maxScale);
  const values = Object.values(scored);

  if (values.length === 0) {
    return {
      assessmentSlug: measure.slug,
      patientId: '', // filled by caller
      total: null,
      average: null,
      tScore: null,
      severity: SeverityBand.UNSCORABLE,
      dataQualityFlags: [...dataQualityFlags, 'no_numeric_answers'],
    };
  }

  const total = values.reduce((sum, v) => sum + v, 0);
  const average = values.length > 0 ? total / values.length : 0;
  const calcType = rule.calculation as ScoringType;

  // Compute severity based on scoring type
  let severity: SeverityBand;
  let tScore: number | null = null;

  switch (calcType) {
    case ScoringType.T_SCORE: {
      // Look up T-score from built-in table or measure's custom lookup
      const rawTotal = Math.round(total);
      const lookup =
        rule.tScoreLookup?.[rawTotal] ??
        PROMIS_T_SCORE_LOOKUP[measure.slug]?.[rawTotal];

      if (lookup !== undefined) {
        tScore = lookup;
        severity = tScoreSeverity(lookup);
      } else {
        // Fallback: estimate T-score
        tScore = 50 + ((rawTotal - values.length * 3) / values.length) * 10;
        severity = tScoreSeverity(tScore);
      }
      break;
    }

    case ScoringType.AVERAGE: {
      const avg = Math.round(average);
      severity = resolveSeverityThreshold(avg, rule.severityThresholds, rule.maxScale);
      break;
    }

    case ScoringType.DOMAIN_MAX: {
      const domainMax = values.length > 0 ? Math.max(...values) : 0;
      severity = resolveSeverityThreshold(domainMax, rule.severityThresholds, rule.maxScale);
      break;
    }

    case ScoringType.TOTAL:
    default: {
      const rawTotal = Math.round(total);
      severity = resolveSeverityThreshold(rawTotal, rule.severityThresholds, values.length * rule.maxScale);
      break;
    }
  }

  // If too many required fields missing, override to unscorable
  const missingRequired = dataQualityFlags.filter((f) =>
    f.startsWith('missing_required:')
  ).length;
  if (missingRequired > 0 && missingRequired >= rule.requiredFields.length * 0.5) {
    severity = SeverityBand.UNSCORABLE;
    dataQualityFlags.push('incomplete');
  }

  // Check diagnostic threshold (e.g. PCL-5 >= 33)
  if (rule.diagnosticThreshold !== undefined && total >= rule.diagnosticThreshold) {
    dataQualityFlags.push('above_diagnostic_threshold');
  }

  return {
    assessmentSlug: measure.slug,
    patientId: '',
    total: Math.round(total * 100) / 100,
    average: Math.round(average * 100) / 100,
    tScore: tScore !== null ? Math.round(tScore * 10) / 10 : null,
    severity,
    dataQualityFlags,
  };
}

// ── Severity threshold resolver ────────────────────────────────────────────

/**
 * Map a numeric score to a severity band using configured thresholds.
 *
 * Thresholds are a map of band -> [min, max]. Falls through bands in order;
 * first matching range wins.
 */
export function resolveSeverityThreshold(
  score: number,
  thresholds: Record<string, [number, number]>,
  maxScore: number = 27
): SeverityBand {
  if (!thresholds || Object.keys(thresholds).length === 0) {
    // Auto-compute severity when no thresholds are defined
    const pct = maxScore > 0 ? score / maxScore : 0;
    if (score === 0 || pct < 0.2) return SeverityBand.NONE;
    if (pct < 0.4) return SeverityBand.MILD;
    if (pct < 0.6) return SeverityBand.MODERATE;
    if (pct < 0.8) return SeverityBand.MODERATELY_SEVERE;
    return SeverityBand.SEVERE;
  }

  for (const band of Object.values(SeverityBand)) {
    if (band === SeverityBand.UNSCORABLE) continue;
    const range = thresholds[band];
    if (range && score >= range[0] && score <= range[1]) {
      return band;
    }
  }

  // If score is above all known bands, return the highest severity
  const highest: SeverityBand = SeverityBand.SEVERE;
  return highest;
}

// ── Helper: score a Result object ──────────────────────────────────────────

/**
 * Score a complete Result object, filling in the scoring field.
 */
export function scoreResultObject(
  measure: Measure,
  result: Omit<Result, 'scoring'> & { patientId: string }
): Result {
  const scoring = scoreResult(measure, result.answers);
  scoring.patientId = result.patientId;

  return {
    ...result,
    scoring,
  };
}