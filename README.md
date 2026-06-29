# Hermes Mental Health

[![](docs/logo.png)](https://youtu.be/8tiaDHI6uGo)

*[▶ Watch the walkthrough video](https://youtu.be/8tiaDHI6uGo)*

Next.js practitioner web app + Hermes Agent runtime for DSM-5-TR assessment management. A dark-mode shadcn/ui dashboard for mental health practitioners — patient profiles, assessment invites, scored results with charts, clinical notes, and AI-powered workflows.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Makefile Commands](#makefile-commands)
- [.hermes Agent Infrastructure](#hermes-agent-infrastructure)
- [Data & Persistence](#data--persistence)
- [Documentation](#documentation)
- [Code Style](#code-style)
- [License](#license)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Next.js dev server
npm run dev           # → http://localhost:3000

# 3. Start Hermes Gateway (for AI features)
make hermes-gateway   # → http://127.0.0.1:8642
```

**Prerequisites:** Node.js 20+, Hermes Agent CLI (for gateway/chat features), ffmpeg (for video walkthrough).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Next.js App (:3000)                    │
│  Dashboard │ Patient Profile │ Invites │ Results │ ...   │
│  shadcn/ui (luma preset, dark mode only)                 │
│  Jotai state │ React Hook Form + Zod │ Recharts          │
├──────────────────────────────────────────────────────────┤
│               Hermes Gateway (:8642)                     │
│  POST /v1/runs → AI generation (create, clinical, chat)  │
├──────────────────────────────────────────────────────────┤
│               .hermes/ Agent Runtime                     │
│  15 mental-health skills │ plugins │ hooks │ commands    │
│  5 skill bundles │ patient-scope guard                   │
├──────────────────────────────────────────────────────────┤
│              File-Backed Data Layer                      │
│  data/patients/<id>/*.json,*.md                          │
│  data/shared/templates/ (68 DSM-5-TR measures)           │
│  data/shared/assessments/ (AI-generated)                 │
│  data/corpus/assessment-measures/ (68 verified .md)      │
└──────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard: patient table, assessments
│   ├── patients/[id]/            # Patient profile, invites, results
│   │   ├── assessments/          # Invite creation + lifecycle
│   │   ├── results/              # Scored results + charts
│   │   ├── sessions/             # Clinical session notes
│   │   └── notes/                # General clinical notes
│   ├── a/[token]/                # Patient-facing assessment form
│   ├── agent/                    # AI chat interface
│   ├── editor/[slug]/            # Assessment editor
│   └── api/                      # API routes (generate, chat, run)
├── components/                   # Shared UI components
│   ├── app-nav.tsx               # Top navigation bar
│   ├── charts/                   # Recharts visualizations
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── domain/                   # Zod schemas + enums
│   ├── scoring/                  # Scoring engine
│   ├── actions/                  # Server actions (file I/O)
│   ├── data/                     # Measure loader, patients
│   └── state/                    # Jotai atoms
├── data/
│   ├── corpus/assessment-measures/  # 68 DSM-5-TR Markdown corpus files
│   ├── shared/templates/            # Generated JSON templates + index
│   ├── shared/assessments/          # AI-generated custom assessments
│   └── patients/<id>/               # Per-patient file-backed data
│       ├── profile.json, consent.json
│       ├── clinical-summary.md, clinical-background.md, care-plan.md
│       ├── results/, invites/
│       └── sessions/, notes/
├── .hermes/
│   ├── skills/mental-health/     # 15 clinical AI skills
│   ├── plugins/                  # hermes-mental-health plugin
│   ├── hooks/                    # Patient scope guard
│   ├── agents/                   # Agent definitions
│   ├── commands/                 # Slash commands
│   └── skill-bundles/            # 5 skill bundles
├── scripts/corpus/               # Template generation pipeline
├── docs/                         # Documentation + screenshots + video
├── Makefile                      # All commands
├── AGENTS.md                     # Canonical agent context
├── SPECS.md                      # Feature specs + progress
├── SOUL.md                       # Project identity
└── README.md                     # This file
```

---

## Makefile Commands

### Next.js App

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server → `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run vitest tests |
| `npm run lint` | ESLint |

### Hermes Runtime (requires Hermes Agent CLI)

| Command | Description |
|---------|-------------|
| `make hermes-gateway` | Hermes API server → `http://127.0.0.1:8642` |
| `make hermes-chat` | Chat with default mental-health skills |
| `make hermes-desktop` | Launch Hermes Desktop with this repo's `.hermes/` |
| `make hermes-dashboard` | Dashboard → `http://127.0.0.1:9120` |
| `make hooks-test` | Test patient-scope-guard + privacy hooks |

### Hermes Agents

| Command | Skills |
|---------|--------|
| `make agent-assessment-review` | Review patient assessment + score + interpret |
| `make agent-patient-intake` | New patient intake workflow |
| `make agent-patient-progress` | Weekly progress summary + trends |
| `make agent-privacy-audit` | Audit session output for PHI leakage |

### Video Walkthrough

## .hermes Agent Infrastructure

The `.hermes/` directory contains the agentic runtime configuration loaded by the Hermes platform.

### 15 Mental Health Skills

| Skill | Purpose |
|-------|---------|
| `mental-health-core` | DSM-5-TR domain vocabulary, severity bands, scoring, patient scoping |
| `mental-health-assessment-review` | Score submissions, interpret results, render charts |
| `mental-health-patient-summary` | Clinical summaries, profile UI, file persistence |
| `mental-health-care-plan` | Draft and audit care plans |
| `mental-health-dashboard` | Practitioner dashboard documentation |
| `mental-health-editor` | Assessment editor workflows |
| `mental-health-safety` | Safety screening, C-SSRS, crisis protocols |
| `mental-health-development` | Development patterns and pitfalls |
| `mental-health-infrastructure` | .hermes infrastructure maintenance |
| `mental-health-commands` | Slash-command workflows |
| `mental-health-assessment-invite` | Assessment invite lifecycle |
| `mental-health-results` | Results display and data-quality management |
| `mental-health-corpus` | DSM-5-TR template pipeline |
| `mental-health-scoping` | Patient scope enforcement |
| `mental-health-video` | Walkthrough video creation |

### Skill Bundles

| Bundle | Skills Included |
|--------|----------------|
| `mental-health` | core, assessment-review, patient-summary, care-plan, safety |
| `assessment-review` | core, assessment-review, results |
| `patient-session` | core, patient-summary, care-plan |
| `care-plan` | core, care-plan |
| `safety-check` | core, safety |

### Hooks

- `patient-scope-guard.sh` — Enforces one-patient-per-session
- `output-privacy-review.sh` — Audits agent output for PHI leakage

---

## Data & Persistence

**File-backed only.** No database, no localStorage, no dual-writes.

| Concern | Location |
|---------|----------|
| DSM-5-TR templates (68) | `data/shared/templates/json/*.json` |
| Custom assessments | `data/shared/assessments/*.json` |
| Patient demographics | `data/patients/<id>/profile.json` |
| Clinical documents | `data/patients/<id>/{care-plan,clinical-summary,clinical-background}.md` |
| Assessment results | `data/patients/<id>/results/taken-<ts>-<slug>.json` |
| Assessment invites | `data/patients/<id>/invites/<ts>-<token>.json` |
| Session notes | `data/patients/<id>/sessions/<ts>-<itemId>.json` |
| Clinical notes | `data/patients/<id>/notes/<ts>-<itemId>.json` |
| Versioned backups | `data/patients/<id>/version/<type>-{ts}.md` |
| Deleted items | Moved to `*-deleted/` folders (never truly erased) |

---

## Documentation

| File | Content |
|------|---------|
| [`docs/index.md`](docs/index.md) | Architecture overview, route table, data flow |
| [`docs/dashboard.md`](docs/dashboard.md) | Dashboard: patient table, assessments, Create With AI |
| [`docs/patient-profile.md`](docs/patient-profile.md) | Profile: header, cards, consent, MDX editor |
| [`docs/assessments.md`](docs/assessments.md) | Invites: create, send, track, taken log |
| [`docs/results.md`](docs/results.md) | Results: list, detail, charts, edit mode |
| [`docs/sessions.md`](docs/sessions.md) | Session notes: list, view, MDX editor |
| [`docs/notes.md`](docs/notes.md) | Clinical notes: same as sessions |
| [`docs/agent-chat.md`](docs/agent-chat.md) | Agent chat: context-aware prompts, quick-inject buttons |
| [`docs/editor.md`](docs/editor.md) | Assessment editor: metadata, fields, scoring, chart |
| [`docs/assessment-form.md`](docs/assessment-form.md) | Patient-facing form: token-resolved, dynamic fields |
| [`docs/SPECS.md`](docs/SPECS.md) | Feature specs: 16 epics, 48 stories, 100% complete |
| [`docs/VIDEO.md`](docs/VIDEO.md) | Walkthrough video: production pipeline, narration script |
| [`SOUL.md`](SOUL.md) | Project identity and guiding principles |
| [`AGENTS.md`](AGENTS.md) | Canonical agent operating context |

---

## Code Style

Enforced across `app/`, `components/`, and `lib/`.

- 2-space indentation, single quotes, no semicolons, trailing commas
- Named exports only (`export const`) — `export default` only for `page.tsx`, `layout.tsx`, `route.ts`
- Always `@/` path alias — never relative imports up more than one level
- Route files: `_actions.ts`, `_schema.ts`, `_atoms.ts`, `_components/`
- Components: kebab-case files, PascalCase names, `const` arrow functions
- Full rules: [`docs/SPECS.md § Code Style`](docs/SPECS.md#code-style-rules)

---

## License

MIT — see [`LICENSE`](LICENSE) for details.