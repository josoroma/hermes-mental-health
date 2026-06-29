export interface PromptOption {
  label: string
  prompt: string
  agent?: string
}

export const ALL_PROMPTS: PromptOption[] = [
  {
    label: 'Dashboard — Patient Review',
    prompt: 'Review active patients and their recent assessments. Which ones need priority follow-up or have scores in the severe range?',
    agent: 'assessment-review',
  },
  {
    label: 'Dashboard — Catalog Review',
    prompt: 'Review the catalog of available DSM-5-TR measures. Are there gaps in coverage for specific clinical domains (e.g., trauma, sleep, personality)? Suggest additional measures if needed.',
    agent: 'assessment-review',
  },
  {
    label: 'Patient — Recommend Measures',
    prompt: "Review the current patient profile (clinical-summary.md and clinical-background.md) and the internal catalog files in .data/shared/assessments, .data/shared/templates and data/patients/{CURRENT_PATIENT}/results, then recommend 3–5 existing measures that best match the patient's clinical presentation, citing each measure's file path and briefly justifying the choice by linking it to symptoms, risks, history, impairments, or treatment goals; do not invent measures, and state 'No matching measure found in the available catalog' when relevant.",
    agent: 'patient-intake',
  },
  {
    label: 'Patient — Synthesize Results',
    prompt: "Synthesize all of this patient's results into a unified clinical report. Include severity trends, changes over time, and areas of clinical concern. Respond in Markdown format.",
    agent: 'assessment-review',
  },
  {
    label: 'Result — Clinical Interpretation',
    prompt: 'Interpret this clinical result. Generate a narrative interpretation citing the specific measure and key clinical findings.',
    agent: 'assessment-review',
  },
  {
    label: 'Result — Audit Care Plan',
    prompt: "Audit the existing care plans for the current patient. Do not draft a new care plan from scratch. Evaluate the current care plans against the patient's assessment results, treatment goals, timelines, interventions, medications, safety considerations, and follow-up schedule. Return: overall quality score, strengths, clinical gaps, measurable-goal issues, missing evidence-based interventions, safety concerns, and recommended revisions. Use your mental-health-core and mental-health-care-plan skills.",
    agent: 'care-plan',
  },
  {
    label: 'Clinical — Session Template',
    prompt: 'Generate a clinical session template in Markdown for this patient. Include sections for Opening, Symptom Review, Interventions, Session Plan, and Notes.',
    agent: 'patient-session',
  },
  {
    label: 'Clinical — Progress Note',
    prompt: "Generate a progress note synthesizing the patient's recent results and sessions. Include severity changes and recommendations.",
    agent: 'patient-progress-weekly',
  },
  {
    label: 'Editor — Generate Metadata',
    prompt: 'Generate a clinical description and administration instructions for the measure. The description should explain the clinical purpose, target population, and key psychometric properties. The instructions should guide the patient on how to complete the assessment.',
    agent: 'mental-health-editor',
  },
  {
    label: 'Assessment — Post-Submission Review',
    prompt: 'The patient completed the assessment. Upon submission, the score will be calculated locally. To receive an AI-generated clinical interpretation, the practitioner can request a review from the results page.',
    agent: 'assessment-review',
  },
]