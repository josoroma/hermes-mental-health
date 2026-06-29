# Care Plan Audit — Common Pitfalls

Real failure modes discovered during care plan audits. Each entry includes the finding, impact, and fix pattern.

---

## Wrong Measure Version (Critical)

**Finding:** Care plan references "DSM-5-TR Level 1 Cross-Cutting Symptom Measure (Adult version)" but the only Level 1 result on disk is `level1-child-11-17` — a child/adolescent measure administered to an adult.

**Impact:** All quantitative targets derived from the Level 1 average and domain scores are referenced against child/adolescent normative frameworks, not adult ones. Severity classification may differ under adult scoring. Goals anchored to these scores are clinically unreliable.

**Example (josoroma-mqn4h6m8, June 2026):** Plan goals 1, 2, 3 all reference Level 1 scores from `taken-2026-06-27-16-58-03-level1-child-11-17.json`. The clinical summary correctly flagged this but the care plan was generated without cross-referencing the actual result file slug.

**Fix:** Re-administer the adult version. Until then, flag all Level 1-derived goals as **provisional — pending adult re-administration**.

---

## Phantom Baselines (Critical)

**Finding:** Care plan sets PHQ-9 and GAD-7 targets (e.g., "PHQ-9 ≤9 within 12 weeks") but no PHQ-9 or GAD-7 result files exist in `data/patients/<id>/results/`. The plan's non-response flag (25% improvement at week 6) and discharge criteria both depend on scores that were never collected.

**Example (josoroma-mqn4h6m8, June 2026):** Goal 4 targets PHQ-9 ≤9, Goal 2 targets GAD-7 ≤9. Follow-up plan says "administer at baseline (session 1)" — but session 1 baseline was never collected.

**Fix:** Add "Administer PHQ-9 and GAD-7 immediately" as pending action items at the top of the care plan. All derived targets and the 12-week clock must start from the actual administration date, not the plan generation date.

---

## Safety Plan Deferred (Critical)

**Finding:** Care plan schedules collaborative safety plan at session 2+ for a patient endorsing passive death ideation with documented family history of completed suicide.

**Example (josoroma-mqn4h6m8, June 2026):** Clinical background documents "passive thoughts about not wanting to wake up on particularly difficult mornings" and "paternal uncle died by suicide at age 52." Risk mitigation says "complete a collaborative safety plan at session 2."

**Fix:** Initiate safety plan at session 1, completing collaboratively across sessions 1-2.

---

## Suicide Risk Gated Behind Screening (Critical)

**Finding:** C-SSRS is deferred behind PHQ-9 item 9 ≥2 trigger, but baseline suicide risk is already elevated based on documented passive ideation and family history. No PHQ-9 has been administered, so item 9 has never been screened.

**Fix:** Administer C-SSRS at session 1 — do not wait for PHQ-9 item 9 trigger.

---

## Somatic Discrepancy Unvalidated

**Finding:** Large gap between self-reported somatic severity (mild) and clinician-rated severity (severe, 4/4). Plan acknowledges the gap but only recommends psychoeducation and a daily log — no validated somatic measure (PHQ-15, SSS-8) is scheduled.

**Fix:** Add baseline PHQ-15 or SSS-8 administration to the follow-up plan as a third data point to triangulate the discrepancy.

---

## Substance Use Baselines Missing

**Finding:** Risk mitigation says "administer AUDIT-C at intake" and "DAST-10 at intake for baseline" but neither has been administered. The patient reports 2-3 beers on weekends.

**Fix:** Add AUDIT-C and DAST-10 as pending action items at session 1.

---

## Sleep Hygiene Instead of CBT-I

**Finding:** Plan recommends "sleep hygiene intervention" for early-morning awakening with depression. Sleep hygiene alone is insufficient for depression-linked insomnia. CBT-I (stimulus control, sleep restriction, cognitive restructuring for insomnia) is the gold standard.

**Fix:** Replace or augment sleep hygiene with CBT-I components: stimulus control, consistent sleep-wake schedule with sleep restriction, and cognitive restructuring around sleep-related catastrophizing.

---

## Couples/Family Component Underspecified

**Finding:** Plan mentions "communication skills training and scheduled positive activity planning with spouse" but has no session allocation, no modality (individual vs conjoint), and no outcome measure.

**Fix:** Define session allocation (e.g., 2 conjoint sessions at weeks 4 and 8), modality (conjoint), and tracking mechanism (spouse-reported relationship satisfaction or DAS-7).