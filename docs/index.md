# Hermes Mental Health — Practitioner Dashboard

![](logo.png)

A Next.js web application for DSM-5-TR assessment management. This dashboard enables mental health practitioners to manage patients, administer and score clinical assessments, generate AI-assisted content, and track treatment progress.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AppNav (top bar)                           │
│  Hermes Mental Health  │  Profile  │  Assessments  │  Results   │
│                                                  Agent  GitHub  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐      │
│   │                   Page Content                       │      │
│   │                                                      │      │
│   │  Dashboard    Patient Profile    Assessments         │      │
│   │  Results      Sessions          Notes                │      │
│   │  Agent Chat   Editor            Assessment Form      │      │
│   └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — patient table, assessment library, Create With AI |
| `/patients/[id]` | Patient Profile — header, clinical summary, care plan, background, consent |
| `/patients/[id]/assessments` | Assessments — create invites, pending list, taken log |
| `/patients/[id]/results` | Results — scored results list with delete |
| `/patients/[id]/results/[resultId]` | Result Detail — scores, chart, editable answers |
| `/patients/[id]/view/[fileType]` | View — read-only markdown render (clinical-summary, clinical-background, care-plan) |
| `/patients/[id]/edit/[fileType]` | Edit — MDX editor for clinical markdown files |
| `/patients/[id]/sessions` | Sessions — session list, create, delete |
| `/patients/[id]/sessions/[itemId]/edit` | Session Edit — MDX editor |
| `/patients/[id]/sessions/[itemId]/view` | Session View — read-only markdown |
| `/patients/[id]/notes` | Notes — notes list, create, delete |
| `/patients/[id]/notes/[itemId]/edit` | Note Edit — MDX editor |
| `/patients/[id]/notes/[itemId]/view` | Note View — read-only markdown |
| `/agent` | Agent Chat — AI chat interface with context-aware prompts |
| `/editor/[slug]` | Assessment Editor — edit measure metadata, fields, scoring, chart |
| `/a/[token]` | Assessment Form — patient-facing form for completing assessments |
| `/api/clinical/generate` | API — AI clinical markdown generation (care plan, summary, background) |
| `/api/assessments/generate` | API — AI assessment JSON generation via Hermes Gateway |
| `/api/agent/chat` | API — Agent chat endpoint |
| `/api/agent/run` | API — Agent modal run endpoint |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, TypeScript strict) |
| UI | shadcn/ui (luma preset, dark mode only) |
| Styling | Tailwind CSS |
| State | Jotai (activePatientIdAtom) |
| Forms | React Hook Form + Zod |
| Charts | Recharts (severity bars, domain bars, trend lines) |
| Markdown | react-markdown (view), @mdxeditor/editor (edit) |
| Toasts | sonner |
| Data | File-backed JSON/MD on disk — no localStorage, no database |

---

## Data Flow

```
┌──────────────┐     Server Actions     ┌────────────────────┐
│  Client UI   │ ◄────────────────────► │  data/patients/    │
│  Components  │    read/write files    │  <id>/*.json,*.md  │
└──────────────┘                        └────────────────────┘
       │                                         ▲
       │ AI Generation                           │
       ▼                                         │
┌──────────────┐     POST /v1/runs      ┌──────────────────┐
│  Hermes API  │ ◄────────────────────► │  Hermes Gateway  │
│  /api/*      │    poll for result     │  :8642           │
└──────────────┘                        └──────────────────┘
```

---

## Pages

Detailed documentation for each page:

- [Dashboard](./dashboard.md) — Patient table, assessment library, Create With AI
- [Patient Profile](./patient-profile.md) — Header, clinical summary, care plan, background, consent
- [Assessments](./assessments.md) — Invite creation, pending list, taken log
- [Results](./results.md) — Results list, result detail with charts and edit
- [Sessions](./sessions.md) — Session notes list, MDX editor
- [Notes](./notes.md) — Clinical notes list, MDX editor
- [Agent Chat](./agent-chat.md) — AI chat with context-aware prompts
- [Assessment Editor](./editor.md) — Measure metadata, fields, scoring, chart configuration
- [Assessment Form](./assessment-form.md) — Patient-facing form submission flow