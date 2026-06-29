---
name: mental-health-infrastructure
description: Maintain and extend the .hermes mental-health domain infrastructure — plugin, hooks, commands, agents, skills, and skill bundles. Use when adding, modifying, or understanding the relationship between these layers.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, infrastructure, hermes, plugin, hooks, agents, skills, bundles]
    category: mental-health
    related_skills:
      - mental-health-core
      - hermes-agent-skill-authoring
---

# Hermes Mental Health Infrastructure

## Overview

The `.hermes/` directory for this project contains a full domain-specific agentic runtime: a Python plugin with clinical tools, shell hooks for patient scoping and privacy, slash commands for practitioner workflows, named agent configurations, 15 domain skills, and 5 skill bundles. This skill documents the architecture so future sessions can maintain and extend it.

## Directory Layout

```
.hermes/
├── plugins/
│   └── hermes-mental-health/
│       ├── plugin.yaml          # Manifest: corpus roots, smart context, source formats
│       ├── __init__.py          # Exports all tools and schemas
│       ├── tools.py             # Clinical tools (score, summarize, validate, list)
│       └── schemas.py           # Domain dataclasses (PatientRecord, ScoringOutput, etc.)
├── hooks/
│   ├── patient-scope-guard.sh   # Pre-tool: blocks cross-patient access
│   └── output-privacy-review.sh # Post-response: scans for PHI leakage
├── commands/
│   └── mental-health.md         # 5 slash commands: /assess, /intake, /progress, /safety-check, /privacy-audit
├── agents/
  │   ├── assessment-review.yaml   # Scores submissions, renders charts, generates interpretations
  │   ├── patient-intake.yaml      # Creates workspaces, captures clinical background
  │   └── patient-progress-weekly.yaml  # Score-over-time trends + progress notes
├── skills/
│   └── mental-health/
│       ├── mental-health-core/              # Domain vocabulary, scoring, severity, data layout
│       ├── mental-health-scoping/           # Patient scope discipline
│       ├── mental-health-commands/          # Slash command documentation
│       ├── mental-health-assessment-review/ # Scoring + interpretation + charts
│       ├── mental-health-patient-summary/   # Clinical narratives + progress notes
│       ├── mental-health-assessment-invite/ # Token generation + invite lifecycle
│       ├── mental-health-results/           # Result display + data quality
│       ├── mental-health-editor/            # Measure editing + Create With AI
│       ├── mental-health-dashboard/         # Dashboard UI + navigation
│       ├── mental-health-care-plan/         # Treatment plans + goals
│       ├── mental-health-safety/            # PHQ-9 item 9 + crisis detection
│       ├── mental-health-corpus/            # DSM-5-TR template pipeline
│       ├── mental-health-development/       # Dev patterns, MDX Editor, hydration
│       ├── mental-health-infrastructure/    # .hermes infrastructure maintenance
│       └── mental-health-video/             # Walkthrough recording + publishing
└── skill-bundles/
    ├── mental-health.yaml        # All 15 skills (the "everything" bundle)
    ├── assessment-review.yaml    # Core + assessment-review + results
    ├── patient-session.yaml      # Core + scoping + summary + invites + care-plan
    ├── care-plan.yaml            # Core + summary + care-plan + assessment-review
    └── safety-check.yaml         # Core + safety + assessment-review
```

## Layer Relationships

### Plugin → Tools
The plugin (`plugins/hermes-mental-health/`) provides Python tools importable by Hermes sessions. The `plugin.yaml` declares corpus roots and smart context paths. `tools.py` defines clinical functions: `validate_patient_id`, `list_patients`, `list_assessments`, `score_submission`, `generate_clinical_summary`, `assess_patient`.

### Hooks → Lifecycle
Hooks are shell scripts triggered at agent lifecycle events:
- `patient-scope-guard.sh` — pre-tool, checks `HERMES_PATIENT_ID` vs `HERMES_ACTIVE_PATIENT_ID`
- `output-privacy-review.sh` — post-response, scans for PHI patterns

### Commands → Skills
Each slash command maps to a skills list + hook:
- `/assess` → `mental-health-core, mental-health-assessment-review` + `patient-scope-guard`
- `/intake` → `mental-health-core, mental-health-patient-summary` + `patient-scope-guard`
- `/progress` → `mental-health-core, mental-health-patient-summary` + `patient-scope-guard`
- `/safety-check` → `mental-health-core, mental-health-safety` + `patient-scope-guard`
- `/privacy-audit` → `mental-health-core` + `output-privacy-review`

### Agents → Skills + Hooks
Each agent YAML binds skills, hooks, and a system prompt:

```yaml
name: assessment-review
skills: [mental-health-core, mental-health-assessment-review, mental-health-patient-summary]
hooks:
  pre_tool: patient-scope-guard
  post_response: output-privacy-review
prompt: |
  You are a DSM-5-TR assessment review specialist...
```

### Skill Bundles → Skills + Instruction
Bundles group skills with a shared instruction prompt:

```yaml
name: assessment-review
skills: [mental-health-core, mental-health-assessment-review, mental-health-results]
instruction: |
  You are a DSM-5-TR assessment review specialist.

  Procedure:
  1. Load the measure from data/shared/templates/json/<slug>.json.
  2. Load the patient's submission.
  3. Compute the score (total, average, T-score as applicable).
  4. Determine the severity band.
  5. Render the correct chart per resultChart.
  6. Detect data-quality issues.
  7. Generate clinical interpretation in English.

  Always cite the specific measure, the score, and the severity.
  Mark incomplete data as "unscorable" with an explanation.
```

### Makefile → Everything
The Makefile (`HERMES_HOME=.hermes`) wraps all layers as targets:
- `make hermes-chat` — CLI with default skills
- `make hermes-gateway` — Hermes API server on :8642 (Create With AI)
- `make hermes-gateway-curl-test` — Verify gateway connectivity
- `make hermes-dashboard` — Dashboard on :9120
- `make agent-assessment-review` — named agent launch
- `make hooks-test` — hook verification
- `make hermes-chat-bundle BUNDLE=safety-check` — bundle launch

## Makefile Bundle Mapping

The `hermes-chat-bundle` target uses nested `$(if $(filter ...))` to map bundle names to skill lists. When adding a new bundle:
1. Create `skill-bundles/<name>.yaml`
2. Add the mapping to the `hermes-chat-bundle` target's `--skills` argument
3. Add to help text

```makefile
HERMES_BUNDLE ?= mental-health

hermes-chat-bundle:
    # Validates bundle file exists, then launches hermes with mapped skills
```

## Adding a New Skill

1. Create `skills/mental-health/<name>/manifest.yaml` (name, entrypoint, files list)
2. Create `skills/mental-health/<name>/SKILL.md` with YAML frontmatter + markdown body
3. If it has references, create `skills/mental-health/<name>/references/<topic>.md`
4. Add to the `mental-health` bundle in `skill-bundles/mental-health.yaml`
5. Add to any relevant sub-bundles (assessment-review, patient-session, etc.)
6. If a Makefile agent target should load it, update the agent target

## Adding a New Agent

1. Create `agents/<name>.yaml` with `name`, `skills`, `hooks`, `prompt`
2. Add `make agent-<name>` target to Makefile in the Hermes Agents section
3. Add help line for the target

## Adding a New Hook

1. Create `hooks/<name>.sh` (must be executable: `chmod +x`)
2. Reference it from agent YAML files (`hooks.pre_tool` or `hooks.post_response`)
3. Add test cases to `make hooks-test`

## Hermes Gateway API Server (Create With AI)

The Next.js "Create With AI" feature (`app/api/assessments/generate/route.ts`) calls the Hermes gateway's REST API at `127.0.0.1:8642`. The app **never calls OpenRouter (or any model provider) directly** — the Hermes agent gateway is the single proxy for all AI model calls. The gateway must be started with `HERMES_HOME` pointing to the project's `.hermes/` so it loads the project-scoped model config (provider + model, e.g. `openrouter` → `deepseek/deepseek-v4-pro`), which it uses internally when proxying requests.

### Starting the gateway

```bash
# Via Makefile (preferred — auto-kills stale process, sets HERMES_HOME)
make hermes-gateway

# Or manually
HERMES_HOME=/Users/josoroma/projects/hermes-mental-health/.hermes \
  API_SERVER_ENABLED=true \
  API_SERVER_KEY=change-me-local-dev \
  hermes gateway
```

Override key or port: `make hermes-gateway HERMES_GATEWAY_KEY=my-key HERMES_GATEWAY_PORT=8643`.

The `API_SERVER_KEY` must match the value in the Next.js `.env` file (`API_SERVER_KEY=change-me-local-dev`).

### Verifying the gateway is up

```bash
# Makefile target — checks connectivity, sends test run, prints result
make hermes-gateway-curl-test

# Quick manual connectivity check (expect anything but "connection refused")
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8642/v1/runs

# Full test — create a run (expect a run_id in response)
curl -s http://127.0.0.1:8642/v1/runs \
  -H "Authorization: Bearer change-me-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"input": "/goal test", "instructions": "You are a test."}'
```

### API flow (what route.ts does)

1. `POST /v1/runs` with `{"input": "...", "instructions": "..."}` → returns `{"run_id": "...", "status": "started"}`
2. Poll `GET /v1/runs/{run_id}` every 3s until `status: "completed"` → `output` field contains the result
3. Status values: `started` → `running` → `completed` | `failed` | `error`

Fields: `input` (not `prompt`), `instructions` (system prompt for the run).

Detailed curl recipes, polling scripts, and response shapes: `references/hermes-gateway-api.md`.

### Required env vars (Next.js `.env`)

```
API_SERVER_KEY=change-me-local-dev
HERMES_API_SERVER_URL=http://127.0.0.1:8642
```

The `HERMES_API_SERVER_URL` points to the Hermes agent gateway — all model calls go through this proxy. There is no direct OpenRouter (or any other provider) endpoint in the app's env vars.

## Common Pitfalls

1. **Gateway must use project `HERMES_HOME`, not global config.** Starting `hermes gateway` without `HERMES_HOME` set picks up `~/.hermes/config.yaml`, which may have a different model provider (e.g., a local GGUF on `:8080`). The gateway will accept API requests but fail all runs with `Connection error.` because the model isn't reachable. Use `make hermes-gateway` (preferred) or `HERMES_HOME=<project>/.hermes hermes gateway`. The Makefile target handles port conflicts and sets the correct env vars automatically.

2. **Skills don't auto-discover from the `mental-health/` category.** Hermes skill loading scans `skills/` recursively, but if a new skill doesn't appear in `skills_list`, run `hermes update` or restart the session. The session's skill loader is cached at startup.

3. **Bundle YAML must list skill names exactly as they appear in `manifest.yaml`.** A mismatch means the skill silently won't load when the bundle is used.

4. **Hook scripts must be executable.** The `hooks-test` Makefile target tests them, but agents will silently skip non-executable hooks.

5. **The `hermes-chat-bundle` Makefile target has a fragile nested `$(if)` chain.** When adding a new bundle, test with `make -n hermes-chat-bundle BUNDLE=<name>` to verify the skill list expands correctly before launching.

6. **Patient scope guard runs on every tool call.** If you add a tool that legitimately needs cross-patient context (e.g., aggregate reporting), it will be blocked. Such tools should run outside the patient scope or the guard should be configured with exceptions.

7. **All patient data is synthetic.** Never introduce real PHI into seeds, templates, or session context. The `output-privacy-review.sh` hook catches common PHI patterns but is a heuristic, not a guarantee.

8. **`execute_code` can corrupt files with line-number prefixes.** When using `execute_code` with `read_file` + `write_file`, written files may embed `NNNN|` prefixes from the read output format. Always verify with `sed -n '1,5p' <file>` after programmatic writes. Fix: `python3 -c "import re; f=open('file'); c=f.read(); f.close(); open('file','w').write(re.sub(r'^\\d{1,4}\\\\|', '', c, flags=re.M))"`. This has happened twice on SPECS.md — prefer terminal-based python heredocs over execute_code for file mutations.

9. **Skill bundle instructions must be in English.** All `.hermes/skill-bundles/*.yaml` metadata, descriptions, and instruction prompts must use English. The practitioner operates in English and the clinical domain uses English — Spanish content in bundle files creates drift and confusion for future sessions. Verify with: `grep -rilE 'Eres|español|especialista|evaluación' .hermes/skill-bundles/` (should return empty).

## Verification Checklist

- [ ] `ls .hermes/plugins/hermes-mental-health/` — 4 files (plugin.yaml, __init__.py, tools.py, schemas.py)
- [ ] `ls .hermes/hooks/` — 2 executable scripts
- [ ] `ls .hermes/commands/` — mental-health.md
- [ ] `ls .hermes/agents/` — 3 YAML files (assessment-review, patient-intake, patient-progress-weekly)
- [ ] `ls .hermes/skills/mental-health/` — 15 directories
- [ ] `ls .hermes/skill-bundles/` — 5 YAML files (mental-health, assessment-review, patient-session, care-plan, safety-check)
- [ ] `make hooks-test` — all 4 scenarios pass
- [ ] `make help` — shows agents, hooks, and bundles sections
- [ ] `docs/HERMES-MENTAL-HEALTH.md` — Complete Next.js → agent mapping with prompt templates (hand-written, not generated)

## Reference

- `docs/HERMES-MENTAL-HEALTH.md` — Cross-reference: maps every Next.js app page and feature to Hermes agents, bundles, and ready-to-use API prompts. Priority AI buttons. Implementation code.