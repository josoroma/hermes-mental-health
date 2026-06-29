"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";

interface HermesPromptHintProps {
  /** The agent prompt template that could generate this content */
  prompt: string;
  /** Optional: which agent/bundle to use */
  agent?: string;
  /** Optional: more compact inline variant */
  compact?: boolean;
}

export function HermesPromptHint({
  prompt,
  agent,
  compact,
}: HermesPromptHintProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className="group/hint inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-[10px] text-emerald-500/50 hover:text-emerald-400 transition-colors cursor-pointer"
          title="Hermes agent prompt available"
        >
          <Bot className="size-3" />
          AI Prompt
        </button>
        {expanded && (
          <div className="absolute z-50 mt-1 w-80 rounded-md border border-emerald-500/30 bg-emerald-950/90 p-2.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] leading-relaxed text-emerald-300/80 font-mono whitespace-pre-wrap">
                {prompt}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="shrink-0 p-0.5 rounded-sm text-emerald-500/40 hover:text-emerald-300/80 hover:bg-emerald-400/10 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="size-3" />
              </button>
            </div>
            {agent && (
              <p className="text-[9px] text-emerald-500/40 mt-1.5">
                agent: {agent}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-emerald-500/20 bg-emerald-500/[0.03] rounded-md p-2.5">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[10px] text-emerald-500/50 hover:text-emerald-400 transition-colors cursor-pointer text-left"
        >
          <Bot className="size-3 shrink-0" />
          <span className="font-medium">Hermes AI Prompt</span>
          {expanded ? " ▲" : " ▼"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="shrink-0 p-0.5 rounded-sm text-emerald-500/40 hover:text-emerald-300/80 hover:bg-emerald-400/10 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="size-3" />
        </button>
      </div>
      {expanded && (
        <div className="mt-2">
          <p className="text-[10px] leading-relaxed text-emerald-300/70 font-mono whitespace-pre-wrap">
            {prompt}
          </p>
          {agent && (
            <p className="text-[9px] text-emerald-500/40 mt-1.5">
              agent: {agent}
            </p>
          )}
        </div>
      )}
    </div>
  );
}