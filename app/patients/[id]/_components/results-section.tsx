"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { activePatientIdAtom } from "@/lib/state/_atoms";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { severityLabel } from "@/lib/domain/_enums";
import { severityBadgeVariant } from "@/components/charts";
import type { Result } from "@/lib/domain/_schema";
import { moveResultToDeleted, listDeletedResultFiles, type DeletedResultFile } from "@/lib/actions/result-files";
import { deleteInviteFile } from "@/lib/actions/invite-files";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronRight, Trash2 } from "lucide-react";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";

function formatFilenameDate(ts: string): string {
  if (!ts) return "—";
  const parts = ts.split("-");
  if (parts.length < 3) return ts;
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3] || 0, +parts[4] || 0);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

interface ResultsSectionProps {
  results: Result[];
  onDeleted?: () => void;
}

export function ResultsSection({ results, onDeleted }: ResultsSectionProps) {
  const patientId = useAtomValue(activePatientIdAtom);
  const [deleteTarget, setDeleteTarget] = useState<Result | null>(null);
  const [deletedResults, setDeletedResults] = useState<DeletedResultFile[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  const loadDeleted = () => {
    if (!patientId) return;
    listDeletedResultFiles(patientId).then(setDeletedResults);
  };

  useEffect(() => {
    loadDeleted();
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultsWithNames = useMemo(
    () =>
      results
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .map((r) => ({ ...r, measureName: getMeasureTitle(r.assessmentSlug) ?? r.assessmentSlug })),
    [results]
  );

  const deletedWithNames = useMemo(
    () =>
      deletedResults
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .map((r) => ({ ...r, measureName: getMeasureTitle(r.assessmentSlug) ?? r.assessmentSlug })),
    [deletedResults]
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !patientId) return;
    await moveResultToDeleted(deleteTarget.patientId, deleteTarget.resultId);
    await deleteInviteFile(deleteTarget.patientId, deleteTarget.inviteToken);
    toast("Deleted", { description: "Result moved to deleted folder." });
    setDeleteTarget(null);
    loadDeleted();
    onDeleted?.();
  };

  const hasResults = resultsWithNames.length > 0 || deletedWithNames.length > 0;
  if (!hasResults) {
    return (
      <Card className="ui-content-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No results yet. Results appear after a patient completes an assessment.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {resultsWithNames.length === 0 ? (
        <Card className="ui-content-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No active results.
          </CardContent>
        </Card>
      ) : (
        <Card className="ui-content-card">
          <CardHeader>
            <CardTitle className="text-base">
              Assessment Results ({resultsWithNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resultsWithNames.map((result) => (
                <div
                  key={result.resultId}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <Link
                    href={`/patients/${patientId}/results/${result.resultId}`}
                    className="flex items-center justify-between flex-1 hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{result.measureName}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.scoring.total != null ? `Total: ${result.scoring.total}` : ""}
                        {result.scoring.average != null ? ` · Avg: ${result.scoring.average.toFixed(1)}` : ""}
                        {result.scoring.tScore != null ? ` · T: ${result.scoring.tScore}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.createdAt ? new Date(result.createdAt).toLocaleDateString("es-MX") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant={severityBadgeVariant(result.scoring.severity)}>
                        {severityLabel(result.scoring.severity)}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(result); }}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deleted results log */}
      <Button
        variant="ghost"
        size="sm"
        className="ui-bottom ui-bottom-deleted-results text-muted-foreground"
        onClick={() => { setShowDeleted(!showDeleted); if (!showDeleted) loadDeleted(); }}
      >
        Deleted Results ({deletedWithNames.length})
      </Button>

      <div className="mt-2">
        <HermesPromptHint
          prompt="Synthesize all of this patient's results into a unified clinical report. Include severity trends, changes over time, and areas of clinical concern. Respond in Markdown format."
          agent="assessment-review"
        />
      </div>
      {showDeleted && (
        <Card className="ui-content-card">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              {deletedWithNames.length === 0 ? (
                <p className="text-center py-4">No deleted results.</p>
              ) : (
                deletedWithNames.map((r) => (
                  <div key={r.resultId} className="flex justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <span>{r.measureName}</span>
                      {r.filename && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.filename}</p>
                      )}
                    </div>
                    <span className="text-xs shrink-0 ml-2">
                      Taken: {formatShortDate(r.createdAt)}
                      {r.deletedAt && <> · Deleted: {formatFilenameDate(r.deletedAt)}</>}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Result</DialogTitle>
            <DialogDescription>
              This will move the result to the deleted folder and remove the assessment. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="size-3.5 mr-1.5" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}