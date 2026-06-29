"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Copy, Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface PromptOption {
  label: string;
  prompt: string;
  agent?: string;
}

interface AgentModalProps {
  /** All available prompts to show in the select */
  prompts: PromptOption[];
  /** If provided, this prompt is prepended as the first "context-aware" option */
  contextPrompt?: PromptOption;
}

/** Maps agent bundle names to their .hermes mental-health skills */
const AGENT_SKILLS: Record<string, string> = {
  "assessment-review": "mental-health-core,mental-health-assessment-review",
  "patient-intake": "mental-health-core,mental-health-patient-summary",
  "care-plan": "mental-health-core,mental-health-care-plan",
  "patient-session": "mental-health-core,mental-health-patient-summary",
  "patient-progress-weekly": "mental-health-core,mental-health-patient-summary",
  "mental-health-editor": "mental-health-core,mental-health-editor",
  "mental-health-safety": "mental-health-core,mental-health-assessment-review",
};

function formatSkills(agent?: string): string {
  if (!agent) return "mental-health-core";
  const skills = AGENT_SKILLS[agent] ?? agent;
  return skills.split(",").join(", ");
}

export function AgentModal({ prompts, contextPrompt }: AgentModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [command, setCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const allPrompts = contextPrompt
    ? [contextPrompt, ...prompts]
    : prompts;

  const handleSelect = (value: string | null) => {
    if (!value) return;
    setSelectedPrompt(value);
    const option = allPrompts.find((p) => p.prompt === value);
    if (option) {
      const skills = formatSkills(option.agent);
      setCommand(`/goal You are a helpful senior Mental Health Practitioner, use [${skills}] to: ${option.prompt}`);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!command.trim()) return;
    setRunning(true);
    setOutput("");
    setError("");

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: command.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Agent run failed (${response.status})`);
      } else {
        setOutput(data.output || "(no output)");
        toast("Agent completed", { description: "Hermes agent run finished successfully." });
      }
    } catch (err) {
      setError(`Failed to connect: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
      >
        <Bot className="size-3.5" />
        Agent
      </Button>

      <DialogContent className="!max-w-[95vw] !w-[95vw] !max-h-[95vh] !h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Bot className="size-5 text-emerald-400" />
            Hermes Agent
          </DialogTitle>
          <DialogDescription>
            Select a prompt to generate the corresponding <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">/goal</code> command
            with mental-health skills. Edit it, then submit to run via Hermes agent.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pt-2 pb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Prompts</label>
            <Select value={selectedPrompt} onValueChange={handleSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a prompt…" />
              </SelectTrigger>
              <SelectContent>
                {allPrompts.map((option) => (
                  <SelectItem key={option.prompt} value={option.prompt}>
                    <div className="flex flex-col gap-0.5 py-0.5">
                      <span className="text-sm">{option.label}</span>
                      {option.agent && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          skills: {formatSkills(option.agent)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {command && (
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-sm font-medium shrink-0">
                Hermes <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">/goal</code> Command
              </label>
              <div className="relative flex-1 min-h-0">
                <textarea
                  className="w-full h-full min-h-[200px] rounded-md border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm font-mono shadow-sm resize-none"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  disabled={running}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0"
                  onClick={handleCopy}
                  disabled={running}
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {output && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent Output</label>
              <pre className="text-xs bg-muted rounded-md p-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                {output}
              </pre>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
            Close
          </Button>
          {running ? (
            <Button disabled>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              Running…
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!command.trim()}>
              <Send className="size-3.5 mr-1.5" />
              Submit to Agent
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}