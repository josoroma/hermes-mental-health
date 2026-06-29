---
name: mental-health-care-plan
description: Draft, audit, and manage patient care plans — synthesize assessment results into structured treatment plans, and evaluate existing plans for clinical gaps, safety concerns, and grounding issues.
version: 0.2.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, care-plan, treatment, clinical, audit]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-assessment-review
      - mental-health-patient-summary
---

# Mental Health Care Plan

## When to use

Use when the practitioner needs to:
- Draft a care plan based on assessment results
- **Audit an existing care plan** — evaluate against assessment results, check goal grounding, flag phantom baselines, identify missing interventions, and score quality
- Define treatment goals and interventions
- Schedule follow-up assessments
- Document clinical rationale and expected outcomes
- Document clinical rationale and expected outcomes

## Care plan structure

### Draft workflow

Sections (in order):

- Treatment Goals — numbered list, each goal measurable and time-bound with specific score targets
- Recommended Interventions — bullet list, each with modality, frequency, and timeline
- Follow-up Plan — bullet list of measures, frequency, and key review milestones
- Discharge Criteria — bullet list of concrete, verifiable exit conditions
- Risk Mitigation — bullet list covering suicide screening, safety planning, substance use, non-response flags, and missed session protocols

### Audit workflow

When auditing an existing care plan (not drafting from scratch):

1. **Load all assessment results** from `data/patients/<id>/results/` — every goal must be grounded in a real result file
2. **Verify measure versions** — check that cited measures match what was actually administered (e.g., adult vs child version)
3. **Check for phantom baselines** — goals referencing PHQ-9, GAD-7, or other scores that have no result file on disk
4. **Validate time-sensitive data** — medication doses, appointment dates, assessment due dates against current date
5. **Cross-reference clinical background** — ensure interventions match documented history (prior med trials, family history, substance use)
6. **Score the plan** — return: overall quality score (0-100), strengths, clinical gaps, measurable-goal issues, missing interventions, safety concerns, and recommended revisions

Audit output sections:
- Overall quality score (numeric + rating)
- Strengths
- Clinical gaps (each rated Critical/Moderate/Minor)
- Measurable-goal issues (tabulated: goal, issue, severity)
- Missing evidence-based interventions
- Safety concerns
- Recommended revisions (grouped: immediate, short-term, medium-term)

### Formatting constraints

ONLY these markdown elements are permitted:
- ## and ### headings
- Bullet lists (-)
- Numbered lists (1.)
- **bold**
- --- horizontal rules

Never use: HTML, tables, code blocks, blockquotes, nested blocks, or special Unicode beyond basic ASCII.

### Data grounding

Every care plan must be grounded in the patient's actual assessment results. Read the latest results from `data/patients/<id>/results/` and the clinical-background.md before drafting. Goals must reference specific baseline scores from real assessment data. Never generate a plan from only the outline or prior plan summary.

### Common audit findings (pitfalls to check)

- **Phantom baselines** — goals reference PHQ-9/GAD-7 scores that were never collected. Verify every score target has a corresponding result file.
- **Wrong measure version** — plan cites \"Adult version\" but only a Child 11-17 result exists. Check the result's `assessmentSlug` against the plan's claims.
- **Safety gate deferred** — plan gates suicide screening behind PHQ-9 item 9 ≥2 but no PHQ-9 has been administered. For patients with passive ideation + family history, baseline C-SSRS should be done at session 1 regardless.
- **Missing baselines** — AUDIT-C, DAST-10, C-SSRS, or somatic measures (PHQ-15/SSS-8) are scheduled but never administered.
- **Time-sensitive staleness** — medication doses, appointment dates, or week-based milestones that have passed without update.

## Care Plan Audit

When the practitioner requests an audit of existing care plans, do NOT draft a new plan from scratch. Evaluate the existing care plan against the patient's actual assessment results, clinical background, and safety profile.

### Audit procedure

1. **Load all assessment results** from `data/patients/<id>/results/` — read every JSON file
2. **Load the existing care plan** from `data/patients/<id>/care-plan.md`
3. **Load clinical background** from `data/patients/<id>/clinical-background.md`
4. **Cross-reference every goal** against actual result files — flag any goal that references a score from a measure that was never administered (phantom baselines)
5. **Verify measure versions** — confirm the measure version in the plan matches the actual result file (e.g., adult vs child version of Level 1)
6. **Check safety gaps** — suicide risk stratification, safety plan timing, emergency contact documentation
7. **Check missing assessments** — identify assessments the plan references but were never collected (PHQ-9, GAD-7, AUDIT-C, DAST-10, C-SSRS)
8. **Evaluate goal measurability** — each goal must have a concrete score target, timeline, and tracking mechanism
9. **Check intervention evidence basis** — interventions should match gold-standard protocols for the condition (e.g., CBT-I for insomnia, not just sleep hygiene)
10. **Score the plan** — assign an overall quality score (0-100) and rating (Excellent/Good/Needs Revision/Unreliable)

### Audit output format

```
# Care Plan Audit — <patient-id>

**Audit date:** <date>
**Plan under review:** care-plan.md (generated <date>)
**Assessment results on file:** <N> (<list slugs>)

---

## Overall Quality Score: <N>/100

**Rating:** <Excellent | Good | Needs Major Revision | Unreliable>

---

## Strengths
[bullet list of what the plan does well]

---

## Clinical Gaps (Critical)
### GAP 1 — <title> (Critical)
[description, impact, recommended revision]

---

## Measurable-Goal Issues
[table: Goal | Issue | Severity]

---

## Missing Evidence-Based Interventions
[bullet list]

---

## Safety Concerns
[numbered list]

---

## Recommended Revisions (Summary)
### Immediate
### Short-term
### Medium-term

---

## Bottom Line
[one-sentence verdict]
```

### Common audit findings (pitfalls to check)

- **Wrong measure version** — Child/adolescent measure administered to an adult (or vice versa); plan references "Adult version" but result file is child version
- **Phantom baselines** — Plan sets PHQ-9/GAD-7 targets but no PHQ-9/GAD-7 result file exists on disk
- **Safety plan deferred** — Safety plan scheduled at session 2+ for a patient with documented passive death ideation and family history of suicide
- **Suicide risk gated behind screening** — C-SSRS deferred behind PHQ-9 item 9 trigger when baseline suicide risk is already elevated
- **Somatic discrepancy unvalidated** — Self-report vs clinician-rating gap noted but no validated somatic measure (PHQ-15, SSS-8) scheduled
- **Substance use baselines missing** — AUDIT-C/DAST-10 mentioned in risk mitigation but never administered
- **Sleep hygiene only** — Sleep hygiene recommended for depression-linked insomnia when CBT-I (stimulus control, sleep restriction) is gold standard
- **Couples/family component underspecified** — Mentions spouse involvement but no session allocation, modality, or outcome measure

## Data sources

All care plan data comes from local sources:
- Profile data from `data/patients/<id>/profile.json`
- Assessment results from `data/patients/<id>/results/`
- Clinical background from `data/patients/<id>/clinical-background.md`
- Clinical summary from `data/patients/<id>/clinical-summary.md`

## Storage

Care plans are stored in `data/patients/<id>/care-plan.md`.
Versioned backups are stored in `data/patients/<id>/version/care-plan-<ts>.md` before each overwrite.
Never store care plans outside the patient's scoped directory.

## Agent prompt mapping

The "Result — Audit Care Plan" prompt in `lib/prompts.ts` maps to agent `care-plan`, which loads skills `mental-health-core,mental-health-care-plan` (defined in `AGENT_SKILLS` in `app/(dashboard)/_components/agent-modal.tsx`). The prompt instructs the agent to audit existing plans, not draft from scratch — see the data grounding and audit sections above.

## References

- `references/care-plan-example-josoroma.md` — concrete example with baseline scores, targets, and grounded interventions
- `references/care-plan-audit-pitfalls.md` — detailed audit failure modes with real examples from josoroma-mqn4h6m8 audit (June 2026)