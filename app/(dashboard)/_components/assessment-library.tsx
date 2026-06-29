"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { deleteCustomAssessment } from "@/lib/actions/assessment-files";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface MeasureSummary {
  slug: string;
  title: string;
  description: string;
  version: string;
  fieldCount: number;
  resultChart: string;
  scoringType: string;
}

interface AssessmentLibraryProps {
  measures: MeasureSummary[];
  custom?: boolean;
  subsection?: string;
}

const CHART_LABELS: Record<string, string> = {
  severity_bar: "Severity Bar",
  t_score_gauge: "T-Score Gauge",
  domain_bars: "Domain Bars",
  trend_line: "Trend Line",
  none: "No Chart",
};

export function AssessmentLibrary({ measures, custom, subsection }: AssessmentLibraryProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<MeasureSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCustomAssessment(deleteTarget.slug);
    if (result.success) {
      toast("Deleted", {
        description: `Custom assessment "${deleteTarget.title}" removed.`,
      });
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast("Error", { description: result.error });
    }
    setDeleting(false);
  };

  return (
    <>
      <div className={`ui-content-section ${subsection ? `ui-content-section-${subsection}` : ""} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
        {measures.map((measure) => (
          <div key={measure.slug} className="relative group/card">
            <Link href={`/editor/${measure.slug}`}>
              <Card className="ui-content-card h-full hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-tight">
                      {measure.title}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {measure.fieldCount} items
                    </Badge>
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {measure.description || measure.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground font-mono mb-2 truncate">
                    {measure.slug}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {CHART_LABELS[measure.resultChart] ?? measure.resultChart}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {measure.scoringType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      v{measure.version}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            {custom && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute bottom-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget(measure);
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Custom Assessment</DialogTitle>
            <DialogDescription>
              This will permanently delete the assessment{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>{" "}
              ({deleteTarget?.slug}.json). This action cannot be undone.
              Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              <Trash2 className="size-3.5 mr-1.5" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}