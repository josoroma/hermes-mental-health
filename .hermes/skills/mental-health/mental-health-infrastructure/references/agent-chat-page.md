# Agent Chat Page Architecture

## Overview

The `/agent` route (`app/agent/page.tsx`) is a full-page chat interface for communicating with a DeepSeek model via OpenRouter. It uses **SSE streaming** to show the model's reasoning/thinking in real time — not just a spinner.

## Key files

| File | Purpose |
|------|---------|
| `app/agent/page.tsx` | Route page, wraps `AgentChat` in `<Suspense>` |
| `app/agent/_components/agent-chat.tsx` | Main chat UI — messages, input, header, sidebar, SSE streaming client, ThinkingSection |
| `app/agent/_components/filesystem-tree.tsx` | Left sidebar — data/ + .hermes/ directory tree |
| `app/agent/_components/file-viewer-panel.tsx` | Inline file viewer panel |
| `app/api/agent/chat/route.ts` | POST endpoint — SSE streaming via OpenRouter with reasoning capture |
| `app/api/agent/tree/route.ts` | GET endpoint — returns filesystem tree JSON |

## Back navigation

The Agent button links pass URL query params to encode the return context:

| Link from | Query params | Back goes to |
|-----------|-------------|-------------|
| Dashboard | `?dashboard` | `/` |
| Patient profile | `?profile&patientId=xxx` | `/patients/xxx` |
| Patient assessments | `?assessments&patientId=xxx` | `/patients/xxx/assessments` |
| Patient results | `?results&patientId=xxx` | `/patients/xxx/results` |
| Patient sessions | `?sessions&patientId=xxx` | `/patients/xxx/sessions` |
| Patient notes | `?notes&patientId=xxx` | `/patients/xxx/notes` |
| Editor | `?editor&slug=xxx` | `/editor/xxx` |
| Result detail | `?result&patientId=xxx&resultId=yyy` | `/patients/xxx/results/yyy` |

`PatientHeader` uses `usePathname()` to auto-detect which sub-page it's on and construct the correct query params.

## Filesystem tree

The sidebar shows two sections:
- **data/** (green icons) — corpus/, patients/, shared/
- **.hermes/** (amber icons) — agents/, skill-bundles/, skills/mental-health/

Context-aware: when `activePatientIdAtom` is set (patient pages), the tree shows the specific patient folder instead of the full data/ tree.

## Chat API — SSE Streaming Architecture

The chat uses **direct OpenRouter streaming** (not the Hermes Gateway), because the gateway's `/v1/runs` API only returns the final output — it does not expose the model's reasoning/thinking tokens that DeepSeek generates.

### Route: `POST /api/agent/chat`

**Request:** `{ messages: [{ role: "user" | "assistant", content: string }] }`

**Response:** `text/event-stream` (SSE) with these event types:

| Event type | Delta field | Meaning |
|-----------|------------|---------|
| `thinking` | `reasoning_content` | DeepSeek chain-of-thought reasoning tokens |
| `token` | `content` | Regular assistant response tokens |
| `done` | — | Stream complete |
| `error` | — | Stream error message |

**How it works:**

1. Builds a system prompt with embedded mental-health-core domain knowledge (measures, severity bands, scoring types, data layout)
2. Calls `POST https://openrouter.ai/api/v1/chat/completions` with:
   - `model`: `HERMES_ASSESSMENT_AI_MODEL` (default `deepseek/deepseek-v4-pro`)
   - `stream: true`
   - `reasoning: { enabled: true }` — enables DeepSeek's chain-of-thought
3. Reads the OpenRouter SSE response with `ReadableStream`
4. Parses each `data:` line, extracting `delta.reasoning_content` → `thinking` events and `delta.content` → `token` events
5. Sends these as SSE to the client with `Content-Type: text/event-stream`

**Required env vars:**
```
OPENROUTER_API_KEY=sk-or-...
HERMES_ASSESSMENT_AI_MODEL=deepseek/deepseek-v4-pro
```

### Frontend: SSE Client in `agent-chat.tsx`

The client uses `fetch` + `ReadableStream` (not `EventSource`, which doesn't support POST):

```typescript
const res = await fetch("/api/agent/chat", { method: "POST", body: ... });
const reader = res.body?.getReader();
const decoder = new TextDecoder();
// Accumulate buffer, split on \n, parse "data: {...}" lines
```

Progressive rendering:
- An empty assistant `Message` is inserted immediately (content: "", thinking: "")
- `thinking` events append to `message.thinking` in-place
- `token` events append to `message.content` in-place
- While `content` is empty but `thinking` exists, shows "Generating response…" spinner
- While both are empty, shows "Thinking…" spinner

## ThinkingSection Component

A collapsible panel rendered below each assistant message bubble when `message.thinking` is non-empty:

- **Header:** `Brain` icon + "Thinking" label (with "…" suffix when streaming) + expand/collapse chevron
- **Body:** The accumulated reasoning text, dimmed (`text-muted-foreground/80`), `max-h-60` with scroll
- **Style:** `border-border/60` border, `bg-background/30` background, `rounded-lg`
- Default state: expanded during streaming, user can toggle

## Smart UI labels

The agent page uses semantic CSS classes for the UI Labels debug overlay:
- `ui-content-page-agent-chat`
- `ui-header-agent-chat`
- `ui-content-section-agent-sidebar`
- `ui-content-section-agent-messages`
- `ui-content-card-agent-empty` / `-error`
- `ui-bottom-agent-input`

## Pitfalls

1. **Hermes Gateway does not support streaming or thinking.** The `/v1/runs` API only returns the final `output` field when `status: "completed"`. There is no SSE endpoint, no `events` field during "running" status, and no `thinking`/`reasoning_content` exposure. For chat with reasoning display, use direct OpenRouter calls — not the gateway.

2. **`EventSource` doesn't support POST.** Use `fetch` + `ReadableStream` for SSE from POST endpoints.

3. **`deepseek/deepseek-v4-pro` may not support native reasoning.** If the model doesn't return `reasoning_content` deltas, the `thinking` section will simply be empty and the user sees a regular streaming response. The `reasoning: { enabled: true }` parameter is a no-op for non-reasoning models.

## Language requirement

All content must be in English — never use Spanish in chat responses, .hermes skill files, agent/bundle configurations, or clinical content.