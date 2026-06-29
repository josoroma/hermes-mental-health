const HERMES_API = process.env.HERMES_API_SERVER_URL ?? "http://127.0.0.1:8642";
const HERMES_KEY = process.env.API_SERVER_KEY ?? "change-me-local-dev";
const MODEL = process.env.HERMES_ASSESSMENT_AI_MODEL ?? "deepseek/deepseek-v4-pro";

const SYSTEM_PROMPT = `You are a helpful senior Mental Health Practitioner assistant with expertise in DSM-5-TR assessment measures.
You assist practitioners with clinical questions about assessments, scoring interpretation, severity classification, patient data, and clinical workflows.

## Domain Knowledge

### Measures
- PHQ-9 — Patient Health Questionnaire: depression severity (9 items, 0-27 range)
- GAD-7 — Generalized Anxiety Disorder: anxiety severity (7 items, 0-21 range)
- PCL-5 — PTSD Checklist: trauma symptom severity (20 items, 4 clusters)
- WHO-5 — Well-Being Index (5 items, 0-25 raw)
- PROMIS — Patient-Reported Outcomes: T-score based (M=50, SD=10)
- Level 1 Cross-cutting — Multi-domain symptom measure
- Level 2 — Domain-specific severity measures (adult, parent, child)
- WHODAS 2.0 — Disability assessment (12 or 36 items)
- PID-5 — Personality Inventory (220 items, 25 facets, 5 domains)

### Severity Bands
| Band | PHQ-9 Range | Color |
|------|------------|-------|
| None | 0-4 | Green |
| Mild | 5-9 | Yellow |
| Moderate | 10-14 | Orange |
| Moderately severe | 15-19 | Dark orange |
| Severe | 20-27 | Red |
| Unscorable | — | Grey |

### Scoring Types
- Total — Sum of all item scores
- Average — Mean score across items
- T-score — PROMIS standardized (M=50, SD=10)
- Domain max — Highest score per symptom domain
- Reverse scoring — Items scored in reverse (higher=better)

### Result Charts
- severity_bar — Horizontal bar with severity bands + score marker
- t_score_gauge — Gauge on T-score scale
- domain_bars — Grouped bars for multi-domain measures
- trend_line — Score-over-time line chart
- none — No chart (free-text measures)

### Data Layout
- data/patients/<id>/profile.json — Demographics
- data/patients/<id>/results/ — Scored submission JSON files
- data/shared/templates/json/<slug>.json — Measure templates
- data/shared/assessments/<id>.json — AI-generated assessments

Respond in English using Markdown format. Be concise and clinically useful.`;

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages?: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const formattedMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    console.log(
      `[agent/chat] Streaming ${messages.length} messages via Hermes gateway`
    );

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;

    const body = JSON.stringify({
      model: MODEL,
      messages: formattedMessages,
      stream: true,
      max_tokens: 4096,
    });

    const hermesRes = await fetch(`${HERMES_API}/v1/chat/completions`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(300_000),
    });

    if (!hermesRes.ok) {
      const errText = await hermesRes.text();
      console.error(`[agent/chat] Hermes gateway error: ${hermesRes.status}`, errText.slice(0, 300));
      return Response.json(
        { error: `Hermes gateway error: ${hermesRes.status}. Is hermes gateway running at ${HERMES_API}?` },
        { status: 502 }
      );
    }

    // Stream SSE response back to client
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = hermesRes.body?.getReader();
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "No response body" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last incomplete line in the buffer
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done" })}\n\n`
                  )
                );
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // Stream reasoning/thinking content
                if (delta.reasoning_content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "thinking", content: delta.reasoning_content })}\n\n`
                    )
                  );
                }

                // Stream regular content
                if (delta.content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "token", content: delta.content })}\n\n`
                    )
                  );
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }

          // Send final done if not already sent
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done" })}\n\n`
            )
          );
        } catch (err) {
          console.error("[agent/chat] Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: String(err) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[agent/chat]", error);
    return Response.json(
      {
        error: `Agent stream failed: ${String(error)}. Is hermes gateway running at ${HERMES_API}?`,
      },
      { status: 502 }
    );
  }
}