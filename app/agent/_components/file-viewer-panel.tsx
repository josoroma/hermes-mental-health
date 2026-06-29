"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface FileViewerPanelProps {
  filePath: string;
  onClose: () => void;
}

export function FileViewerPanel({ filePath, onClose }: FileViewerPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const fileName = filePath.split("/").pop() ?? filePath;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError("");
    setEditing(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(`/api/agent/file?path=${encodeURIComponent(filePath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setContent(null);
        } else {
          setContent(data.content ?? "");
          setDraft(data.content ?? "");
        }
      })
      .catch((err) => setError(`Failed to load: ${String(err)}`))
      .finally(() => setLoading(false));
  }, [filePath]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agent/file?path=${encodeURIComponent(filePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setContent(draft);
        setEditing(false);
      }
    } catch (err) {
      setError(`Failed to save: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [filePath, draft]);

  const isMarkdown = fileName.endsWith(".md");

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="ui-header ui-header-file-viewer shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono text-muted-foreground truncate">
            {filePath}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!loading && !error && content !== null && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => { setEditing(true); setDraft(content); }}
            >
              <Pencil className="size-3 mr-1" />
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => { setEditing(false); setDraft(content ?? ""); }}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-emerald-400"
                onClick={handleSave}
                disabled={saving}
              >
                <Check className="size-3 mr-1" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="size-3 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive py-2">{error}</div>
        )}

        {!loading && !error && content !== null && (
          editing ? (
            <textarea
              className="w-full h-full min-h-[300px] bg-muted rounded-md border border-border p-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : isMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:text-foreground
              prose-p:text-foreground/85 prose-p:leading-relaxed
              prose-li:text-foreground/85
              prose-strong:text-foreground
              prose-code:text-foreground/80 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-blockquote:border-l-primary prose-blockquote:text-foreground/70
              prose-a:text-primary">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-muted rounded-md p-3 overflow-x-auto">
              {content}
            </pre>
          )
        )}
      </div>
    </div>
  );
}