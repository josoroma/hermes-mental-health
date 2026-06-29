---
name: mental-health-safety
description: Safety screening and crisis detection — review PHQ-9 item 9, suicide risk, crisis flags, and generate safety assessments with recommended actions.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, safety, suicide-risk, crisis, screening]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-assessment-review
---

# Mental Health Safety

## When to use

Use when the practitioner needs to:
- Review PHQ-9 item 9 (self-harm) responses
- Screen for suicide risk indicators (SI)
- Screen for homicide/violence risk indicators (HI)
- Check for crisis-level severity scores
- Generate a safety assessment with recommended actions
- Document safety check timestamps

## Safety indicators

### PHQ-9 item 9
> "Thoughts that you would be better off dead or of hurting yourself in some way"

| Score | Risk level | Action required |
|-------|-----------|----------------|
| 0 | None | Document; no further action |
| 1 | Low | Assess further; document in notes |
| 2 | Moderate | Urgent clinical attention; safety plan |
| 3 | High | Immediate intervention; do not leave alone |

### Crisis-level severity
- PHQ-9 total >= 20 → Severe depression; assess safety
- PCL-5 >= 33 + intrusion cluster high → PTSD with possible crisis
- Any mention of SI/HI in free-text fields → flag for review

### Safety plan components

1. **Warning signs** — thoughts, images, situations that trigger crisis
2. **Internal coping strategies** — things patient can do without contacting others
3. **Social contacts** — people and places that provide distraction
4. **Family/friends to contact** — trusted people who can help
5. **Professionals/agencies** — clinicians, crisis lines, emergency contacts
6. **Making the environment safe** — removing lethal means

## Safety assessment format

```text
## Evaluación de Seguridad — [Patient ID]

### Indicadores
- PHQ-9 Item 9: [score] — [risk level]
- Severidad actual: [band]
- Banderas de crisis: [list or "Ninguna detectada"]

### Plan de seguridad
[structured safety plan in English]

### Recomendaciones
[clinical recommendations]

### Verificado por
[timestamp + practitioner identifier]
```

## Crisis resources (US)

- **988 Suicide & Crisis Lifeline** — Call or text 988
- **Crisis Text Line** — Text HOME to 741741
- **Emergency** — Call 911

**IMPORTANT:** This is a screening tool, not a substitute for clinical judgment.
If there is ANY concern about imminent risk, activate emergency protocols immediately.