# CLAUDE.md

This project's operational instructions, coding conventions, commands, ports, and architecture notes
live in **[`AGENTS.md`](./AGENTS.md)** — the canonical context file. Read it first and follow it.

Supporting docs:
- [`SPECS.md`](./SPECS.md) — epics, user stories, and tasks (the build plan).
- [`README-MENTAL-HEALTH-PY.md`](./README-MENTAL-HEALTH-PY.md) — product/domain background.

Quick reminders (full detail in `AGENTS.md`):
- Stack: Next.js (App Router, TS strict) · shadcn/ui (**luma** theme, **dark mode only**) · Jotai · React Hook Form · Zod · **shadcn Chart (Recharts)** for all graphs.
- **Charts:** use shadcn `Chart`/Recharts only — never hand-roll SVG; color via `ChartConfig` + luma `--chart-*` tokens.
- **Dark mode only** — `<html class="dark">` is unconditional; never add a light theme or a theme toggle.
- Run `npm run typecheck` and `npm run lint` before finishing any task.
- **Patient scope is sacred:** one active patient per session; all scoped reads go through
  `assertScoped`. Never read across patients.
- Zod is the single source of truth — derive types with `z.infer`, don't hand-write interfaces.
- **Measures are generated, not hand-written:** `npm run corpus` generates templates from the existing Markdown corpus →
  verified HTML → `data/shared/templates/` (JSON). Templates must validate against the `Measure`
  schema and each carries **instructions**, **scoring rules**, and a **`resultChart`** type
  (severity_bar | t_score_gauge | domain_bars | trend_line | none) that drives the results view.
- **Create With AI talks to the Hermes agent over a WebSocket** (`HERMES_ASSESSMENT_AI_URL`, default
  `http://127.0.0.1:9120/api/ws`; model `HERMES_ASSESSMENT_AI_MODEL`, default `deepseek/deepseek-v4-pro`),
  generating shared assessment JSON into `data/shared/assessments/` (validated vs `Measure`). It's the
  only external call; never send patient-scoped data to the agent (only assessment id + prompt + model).
- Build Parts 1–6 only; the `.hermes` runtime / Python / FastAPI back end is out of scope (the Hermes
  agent is external — we only call it).
