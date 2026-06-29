# Agent Chat Prompt Patterns

The agent chat page (`app/agent/_components/agent-chat.tsx`) has four quick-inject buttons. These inject pre-written prompts into the chat input with the patient ID interpolated.

## Current Prompts

### Care Plan — Audit Pattern

```
Audit the existing care plans for patient <patientId>. Do not draft a new care plan from scratch. Evaluate the current care plans against the patient's assessment results, treatment goals, timelines, interventions, medications, safety considerations, and follow-up schedule. Return: overall quality score, strengths, clinical gaps, measurable-goal issues, missing evidence-based interventions, safety concerns, and recommended revisions. Use your mental-health-core and mental-health-care-plan skills.
```

### Session Note — Audit Pattern

```
Audit the existing clinical session notes for patient <patientId>. Do not generate new notes from scratch. Evaluate the clinical content of the current notes against the patient's clinical background, assessment results, and care plan. Analyze what the notes reveal about: symptom trajectory, treatment response, intervention effectiveness, medication adherence and side effects, safety status, functional changes, and session-to-session progress. Return: overall quality score, clinical strengths documented, gaps in clinical documentation, symptom trajectory issues, treatment fidelity concerns, safety documentation gaps, and recommended revisions. Use your mental-health-core and mental-health-patient-summary skills.
```

### Progress Report — Generate Pattern

```
Generate a weekly progress report for patient <patientId>. Load results from the past 30 days, compute score-over-time trends, render trend-line charts, and synthesize a narrative progress note. Flag any worsening severity patterns. Use your mental-health-core and mental-health-patient-summary skills.
```

### Safety Check — Generate Pattern

```
Run a safety check for patient <patientId>. Review PHQ-9 item 9 (self-harm), check for SI/HI flags in free-text fields, review crisis-level severity scores (PHQ-9 >= 20, PCL-5 >= 33), and generate a safety assessment with recommended actions. Use your mental-health-core and mental-health-safety skills.
```

## Skills Mapping

The inject functions live in `agent-chat.tsx` and map to the following skill combinations:

| Button | Skills |
|--------|--------|
| Care Plan | mental-health-core, mental-health-care-plan |
| Session Note | mental-health-core, mental-health-patient-summary |
| Progress Report | mental-health-core, mental-health-patient-summary |
| Safety Check | mental-health-core, mental-health-safety |

There's also a legacy `lib/prompts.ts` catalog and `agent-modal.tsx` with `AGENT_SKILLS` mapping, but these are **not wired to the chat page UI** — the chat page has its own hardcoded inject functions.

## Prompt Guidelines

- All prompts are clinical-only — no format instructions, no file paths
- Use `pid ?? "the current patient"` for patient ID interpolation
- Audit patterns evaluate existing data; generate patterns create new content
- Context page determines query params: `?dashboard`, `?profile&patientId=<id>`, etc.
