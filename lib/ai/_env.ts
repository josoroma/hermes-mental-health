/** Environment configuration for the Hermes agent integration. */

export const HERMES_ASSESSMENT_AI_URL =
  process.env.HERMES_ASSESSMENT_AI_URL ?? 'http://127.0.0.1:9120/api/ws';

export const HERMES_ASSESSMENT_AI_MODEL =
  process.env.HERMES_ASSESSMENT_AI_MODEL ?? 'deepseek/deepseek-v4-pro';