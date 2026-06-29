"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Send, Loader2, ArrowLeft, Brain, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { FilesystemTree } from "./filesystem-tree";
import { FileViewerPanel } from "./file-viewer-panel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

function ThinkingSection({
  thinking,
  isStreaming,
}: {
  thinking: string;
  isStreaming: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!thinking) return null;

  return (
    <div className="mt-2 border border-border/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Brain className="size-3 shrink-0" />
        <span className="flex-1 text-left font-medium">
          Thinking{isStreaming ? "…" : ""}
        </span>
        {expanded ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap border-t border-border/40 bg-background/30 max-h-60 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="shrink-0 size-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Bot className="size-4 text-emerald-400" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "" : "min-w-0"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {message.thinking ? "Generating response…" : "Thinking…"}
              </span>
            </div>
          )}
        </div>
        {!isUser && message.thinking && (
          <ThinkingSection
            thinking={message.thinking}
            isStreaming={isStreaming}
          />
        )}
      </div>
      {isUser && (
        <div className="shrink-0 size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-xs font-medium text-primary-foreground">U</span>
        </div>
      )}
    </div>
  );
}

export function AgentChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(() => {
    // Pre-fill prompt when coming from the assessment editor
    const isEditor = searchParams.get("editor") !== null;
    const slug = searchParams.get("slug");
    if (isEditor && slug) {
      return `Edit the **${slug}** assessment template using your .hermes agents and mental-health skills. Review the current template configuration and suggest improvements for the metadata, fields, scoring rules, and chart settings.`;
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [treeWidth, setTreeWidth] = useState(224);
  const [viewerWidth, setViewerWidth] = useState(384);
  const abortRef = useRef<AbortController | null>(null);

  // Resize handle logic
  const resizing = useRef<{
    target: "tree" | "viewer";
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const { target, startX, startWidth } = resizing.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(160, Math.min(600, startWidth + delta));
      if (target === "tree") setTreeWidth(newWidth);
      else setViewerWidth(newWidth);
    };
    const handleMouseUp = () => {
      resizing.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResize = useCallback(
    (target: "tree" | "viewer", startWidth: number) =>
      (e: React.MouseEvent) => {
        resizing.current = { target, startX: e.clientX, startWidth };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      },
    []
  );

  // Resolve back URL from query params
  const backHref = useMemo(() => {
    const page = searchParams.get("dashboard") !== null
      ? "dashboard"
      : searchParams.get("profile") !== null
        ? "profile"
        : searchParams.get("assessments") !== null
          ? "assessments"
          : searchParams.get("results") !== null
            ? "results"
            : searchParams.get("sessions") !== null
              ? "sessions"
              : searchParams.get("notes") !== null
                ? "notes"
                : searchParams.get("editor") !== null
                  ? "editor"
                  : searchParams.get("result") !== null
                    ? "result"
                    : "dashboard";
    const pid = searchParams.get("patientId");
    const slug = searchParams.get("slug");
    const resultId = searchParams.get("resultId");

    switch (page) {
      case "profile":
        return pid ? `/patients/${pid}` : "/";
      case "assessments":
        return pid ? `/patients/${pid}/assessments` : "/";
      case "results":
        return pid ? `/patients/${pid}/results` : "/";
      case "sessions":
        return pid ? `/patients/${pid}/sessions` : "/";
      case "notes":
        return pid ? `/patients/${pid}/notes` : "/";
      case "editor":
        return slug ? `/editor/${slug}` : "/";
      case "result":
        return pid && resultId ? `/patients/${pid}/results/${resultId}` : "/";
      default:
        return "/";
    }
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const assistantId = crypto.randomUUID();

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      thinking: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);
    setError("");

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Agent stream failed");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "thinking") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        thinking:
                          (m.thinking ?? "") + (event.content as string),
                      }
                    : m
                )
              );
            } else if (event.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:
                          (m.content ?? "") + (event.content as string),
                      }
                    : m
                )
              );
            } else if (event.type === "done") {
              // Stream complete
            } else if (event.type === "error") {
              setError(event.content as string);
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(`Failed to connect: ${String(err)}`);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const injectReviewPatientsPrompt = () => {
    setInput(
      "Review all active patients and their recent assessments. Which ones need priority follow-up or have scores in the severe range? Use your mental-health skills and .hermes agents."
    );
    inputRef.current?.focus();
  };

  const injectReviewCatalogPrompt = () => {
    setInput(
      "Review the catalog of 68 DSM-5-TR measures. Are there gaps in coverage for specific clinical domains (trauma, sleep, personality)? Suggest additional measures if needed. Use your mental-health-core skill."
    );
    inputRef.current?.focus();
  };

  const injectClinicalSummaryPrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Generate a narrative clinical summary for patient ${pid ?? "the current patient"}. Synthesize recent assessment results, severity trends, clinical changes, and recommendations. Respond in structured Markdown format using your mental-health-core and mental-health-patient-summary skills.`
    );
    inputRef.current?.focus();
  };

  const injectRecommendMeasuresPrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Review the current patient profile ${pid ?? "the current patient"} (clinical-summary.md and clinical-background.md) and the internal catalog files in .data/shared/assessments, .data/shared/templates and data/patients/${pid ?? "the current patient"}/results, then recommend 3–5 existing measures that best match the patient's clinical presentation, citing each measure's file path and briefly justifying the choice by linking it to symptoms, risks, history, impairments, or treatment goals; do not invent measures, and state \"No matching measure found in the available catalog\" when relevant.`
    );
    inputRef.current?.focus();
  };

  const injectScoreResultsPrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Score and interpret the latest assessment results for patient ${pid ?? "the current patient"}. Compute totals, determine severity bands, detect data-quality issues, and render the appropriate chart. Generate a clinical interpretation using your mental-health-core and mental-health-assessment-review skills.`
    );
    inputRef.current?.focus();
  };

  const injectSafetyCheckPrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Run a safety check for patient ${pid ?? "the current patient"}. Review PHQ-9 item 9 (self-harm), check for SI/HI flags in free-text fields, review crisis-level severity scores (PHQ-9 ≥ 20, PCL-5 ≥ 33), and generate a safety assessment with recommended actions. Use your mental-health-core and mental-health-safety skills.`
    );
    inputRef.current?.focus();
  };

  const injectCarePlanPrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Audit the existing care plans for patient ${pid ?? "the current patient"}. Do not draft a new care plan from scratch. Evaluate the current care plans against the patient's assessment results, treatment goals, timelines, interventions, medications, safety considerations, and follow-up schedule. Return: overall quality score, strengths, clinical gaps, measurable-goal issues, missing evidence-based interventions, safety concerns, and recommended revisions. Use your mental-health-core and mental-health-care-plan skills.`
    );
    inputRef.current?.focus();
  };

  const injectSessionNotePrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Audit the existing clinical session notes for patient ${pid ?? "the current patient"}. Do not generate new notes from scratch. Evaluate the clinical content of the current notes against the patient's clinical background, assessment results, and care plan. Analyze what the notes reveal about: symptom trajectory, treatment response, intervention effectiveness, medication adherence and side effects, safety status, functional changes, and session-to-session progress. Return: overall quality score, clinical strengths documented, gaps in clinical documentation, symptom trajectory issues, treatment fidelity concerns, safety documentation gaps, and recommended revisions. Use your mental-health-core and mental-health-patient-summary skills.`
    );
    inputRef.current?.focus();
  };

  const injectProgressReportPrompt = () => {
    const pid = searchParams.get("patientId");
    setInput(
      `Generate a weekly progress report for patient ${pid ?? "the current patient"}. Load results from the past 30 days, compute score-over-time trends, render trend-line charts, and synthesize a narrative progress note. Flag any worsening severity patterns. Use your mental-health-core and mental-health-patient-summary skills.`
    );
    inputRef.current?.focus();
  };

  const injectGenerateTemplatePrompt = () => {
    setInput(
      "Generate a new DSM-5-TR shared assessment JSON template using your mental-health-core and mental-health-editor skills. Include metadata (title, slug, description, version), fields (scale, text, select, multi_select, boolean types), scoring rules (thresholds, reverse scoring, T-score lookup), and chart configuration (resultChart type). Follow the schema in lib/domain/_schema.ts."
    );
    inputRef.current?.focus();
  };

  return (
    <div className="ui-content-page ui-content-page-agent-chat flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar — Filesystem Tree */}
      <aside
        className="ui-content-section ui-content-section-agent-sidebar shrink-0 border-r border-border bg-background/50 overflow-hidden flex flex-col"
        style={{ width: treeWidth }}
      >
        <FilesystemTree
          onSelectFile={setSelectedFile}
          selectedFile={selectedFile}
        />
      </aside>

      {/* Resize handle: tree → viewer / chat */}
      <div
        className="shrink-0 w-1 cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors"
        onMouseDown={startResize("tree", treeWidth)}
      />

      {/* File Viewer Panel */}
      {selectedFile && (
        <aside
          className="shrink-0 overflow-hidden flex flex-col border-r border-border"
          style={{ width: viewerWidth }}
        >
          <FileViewerPanel
            filePath={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        </aside>
      )}

      {/* Resize handle: viewer → chat */}
      {selectedFile && (
        <div
          className="shrink-0 w-1 cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors"
          onMouseDown={startResize("viewer", viewerWidth)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="ui-header ui-header-agent-chat agent-chat-header shrink-0 border-b border-border px-6 py-3 flex items-center gap-3 glass-panel">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center size-8 rounded-md border border-input hover:bg-accent transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Bot className="size-5 text-emerald-400" />
          <div>
            <h1 className="text-sm font-semibold">Hermes Agent Chat</h1>
            <p className="text-[11px] text-muted-foreground">
              Powered by DeepSeek · mental-health-core
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="ui-content-section ui-content-section-agent-messages agent-chat-messages flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {messages.length === 0 && !loading && (
            <div className="ui-content-card ui-content-card-agent-empty flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Bot className="size-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Hermes Agent Chat</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Ask anything about patients, assessments, results, or clinical
                  workflows. The agent uses mental-health-core skills to assist you.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={loading && msg.role === "assistant"}
            />
          ))}

          {error && (
            <div className="ui-content-card ui-content-card-agent-error flex gap-3">
              <div className="shrink-0 size-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <Bot className="size-4 text-destructive" />
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                <p className="text-sm text-destructive whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="ui-bottom ui-bottom-agent-input shrink-0 border-t border-border px-6 py-4 glass-panel agent-chat-input-area">
          {/* Prompt-inject buttons */}
          <div className="agent-chat-prompt-buttons flex items-center gap-2 mb-3 max-w-3xl mx-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={injectReviewPatientsPrompt}
              disabled={loading}
              className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Sparkles className="size-3" />
              Review Patients
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={injectReviewCatalogPrompt}
              disabled={loading}
              className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Sparkles className="size-3" />
              Review Catalog
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={injectGenerateTemplatePrompt}
              disabled={loading}
              className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Sparkles className="size-3" />
              Generate Template
            </Button>
            {searchParams.get("patientId") && (
              <>
                <span className="text-[10px] text-muted-foreground mx-0.5">|</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectClinicalSummaryPrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Sparkles className="size-3" />
                  Clinical Summary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectRecommendMeasuresPrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Sparkles className="size-3" />
                  Recommend Measures
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectScoreResultsPrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Sparkles className="size-3" />
                  Score Results
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectSafetyCheckPrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Sparkles className="size-3" />
                  Safety Check
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectCarePlanPrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Sparkles className="size-3" />
                  Care Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectSessionNotePrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Sparkles className="size-3" />
                  Session Note
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={injectProgressReportPrompt}
                  disabled={loading}
                  className="text-xs h-7 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <Sparkles className="size-3" />
                  Progress Report
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Hermes agent…"
              disabled={loading}
              rows={1}
              className="agent-chat-textarea min-h-[44px] max-h-[200px] resize-none rounded-xl"
            />
            <Button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              size="icon"
              className="shrink-0 size-[44px] rounded-xl"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}