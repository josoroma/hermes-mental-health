"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { readClinicalFile } from "@/lib/actions/clinical-files";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Sparkles, Loader2 } from "lucide-react";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";
import { toast } from "sonner";

interface EditableMarkdownCardProps {
  patientId: string;
  fileType: "clinical-summary" | "clinical-background" | "care-plan";
  title: string;
  fallback: string;
  hint?: string;
  hintAgent?: string;
}

export function EditableMarkdownCard({
  patientId,
  fileType,
  title,
  fallback,
  hint,
  hintAgent,
}: EditableMarkdownCardProps) {
  const router = useRouter();
  const [content, setContent] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load file on mount / patient change
  useEffect(() => {
    let cancelled = false;
    readClinicalFile(patientId, fileType).then((text) => {
      if (!cancelled) setContent(text);
    });
    return () => { cancelled = true; };
  }, [patientId, fileType]);

  const handleGenerate = async () => {
    if (!hint || generating) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/clinical/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, fileType, prompt: hint }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("AI Generation failed", {
          description: data.error || `Request failed (${response.status})`,
        });
        return;
      }

      // Refresh from the saved file
      const saved = await readClinicalFile(patientId, fileType);
      setContent(saved);

      const msg = data.backedUp
        ? `${title} generated. Previous version saved as ${data.backedUp}.`
        : `${title} generated successfully.`;
      toast.success("AI Generated", { description: msg });
    } catch (err) {
      toast.error("AI Generation failed", {
        description: String(err),
      });
    } finally {
      setGenerating(false);
    }
  };

  const displayContent = content ?? fallback;

  return (
    <>
      <Card className="ui-content-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex gap-1">
            {hint && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  {generating ? (
                    <Loader2 className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5 mr-1" />
                  )}
                  {generating ? "Generating…" : "AI Generate"}
                </Button>
                <HermesPromptHint compact prompt={hint} agent={hintAgent} />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/patients/${patientId}/view/${fileType}`)}
            >
              <Eye className="size-3.5 mr-1.5" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/patients/${patientId}/edit/${fileType}`)}
            >
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-y-auto text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </>
  );
}