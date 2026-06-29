"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HERMES_ASSESSMENT_AI_MODEL } from "@/lib/ai/_env";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function CreateWithAI() {
  const [open, setOpen] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!assessmentId.trim() || !prompt.trim()) return;
    setGenerating(true);
    setOutput("");
    setError("");

    try {
      const response = await fetch("/api/assessments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: assessmentId.trim(), prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Generation failed (${response.status})`);
        if (data.issues) {
          setError(prev => `${prev}\n\nIssues:\n${data.issues.join("\n")}`);
        }
        if (data.raw) {
          setOutput(data.raw);
        }
      } else {
        setOutput(JSON.stringify(data.json, null, 2));
        toast("Assessment created", { description: `${data.assessmentId}.json saved to shared/assessments/` });
      }
    } catch (err) {
      setError(`Failed to connect: ${String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className="group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer">
          Create With AI
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shared Assessment With AI</DialogTitle>
          <DialogDescription className="space-y-2">
            <span>Describe the assessment you want and the AI will generate its JSON for editing.</span>
            <span className="flex gap-2 flex-wrap text-xs">
              <Badge variant="outline">Scope: data/shared/assessments/*.json</Badge>
              <Badge variant="outline">API: Hermes Agent</Badge>
              <Badge variant="outline">Model: {HERMES_ASSESSMENT_AI_MODEL}</Badge>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="assessment-id">Assessment ID (slug)</Label>
            <Input
              id="assessment-id"
              placeholder="e.g. my-custom-phq-9"
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              disabled={generating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-prompt">AI Prompt</Label>
            <textarea
              id="ai-prompt"
              className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe the assessment you need, e.g.: A 5-item anxiety screening tool for adolescents, scored 0-4 per item with severity bands..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
            />
          </div>

          {output && (
            <div className="space-y-2">
              <Label>Generated JSON</Label>
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

          <div className="flex gap-2 justify-end">
            {generating ? (
              <Button disabled>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Generating…
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                <Button onClick={handleGenerate} disabled={!assessmentId.trim() || !prompt.trim()}>
                  Create JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}