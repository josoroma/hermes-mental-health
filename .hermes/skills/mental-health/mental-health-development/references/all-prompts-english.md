# All-prompts-English rule

**Rule:** Every `HermesPromptHint` prompt string, agent chat pre-fill, and prompt-inject button
text MUST be in English. Never Spanish.

This was enforced in a single session where all 12 HermesPromptHint placements across 7 files
were translated from Spanish to English.

## Files with HermesPromptHint prompts

| File | Prompt purpose |
|---|---|
| `app/(dashboard)/_components/dashboard-hints.tsx` | Patients review + Measures catalog review |
| `app/editor/[slug]/_components/metadata-form.tsx` | Generate clinical description for measure |
| `app/a/[token]/_components/assessment-form.tsx` | Patient completed assessment notification |
| `app/patients/[id]/_components/assessments-section.tsx` | Recommend DSM-5-TR measures |
| `app/patients/[id]/_components/results-section.tsx` | Synthesize results into unified report |
| `app/patients/[id]/_components/patient-profile.tsx` | Clinical summary + Clinical history generation |
| `app/patients/[id]/_components/clinical-items-section.tsx` | Session template + Progress note generation |
| `app/patients/[id]/results/[resultId]/_components/result-detail.tsx` | Interpret result + Generate care plan |

## Verification

To verify no Spanish remains, search for common Spanish clinical terms:

```bash
rg -l "(español|Genera|Revisa|Sintetiza|Interpreta|Basado|paciente|puntaje|sesión|perfil)" app/
```

Matches to "Genera" within "Generate", "Interpreta" within "Interpret", etc. are false
positives from English words sharing prefixes. Check each match manually.

## Agent chat pre-fill prompts

The editor pre-fill prompt in `app/agent/_components/agent-chat.tsx` and the prompt-inject
button text are also in English. These are not `HermesPromptHint` components but follow
the same rule.