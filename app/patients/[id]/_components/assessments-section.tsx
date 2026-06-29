"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { activePatientIdAtom } from "@/lib/state/_atoms";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { listInviteFiles, deleteInviteFile, updateInviteFile } from "@/lib/actions/invite-files";
import type { Invite } from "@/lib/domain/_schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateInvite, inviteUrl, addDuration } from "./create-invite";
import { toast } from "sonner";
import { Trash2, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";

const DURATION_OPTIONS = [
  { label: "1 day", value: "1d" },
  { label: "1 week", value: "1w" },
  { label: "1 month", value: "1m" },
] as const;

type Duration = (typeof DURATION_OPTIONS)[number]["value"];

function formatDateRange(start: string, end?: string): string {
  const startDate = new Date(start).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });
  if (!end) return `Created: ${startDate}`;
  const endDate = new Date(end).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });
  return `${startDate} → ${endDate}`;
}

function isExpired(invite: Invite): boolean {
  if (!invite.expiresAt) return false;
  return new Date(invite.expiresAt) < new Date();
}

export function AssessmentsSection({ customSlugs }: { customSlugs: string[] }) {
  const patientId = useAtomValue(activePatientIdAtom);

  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invite | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [renewTarget, setRenewTarget] = useState<Invite | null>(null);
  const [renewDuration, setRenewDuration] = useState<Duration>("1w");

  const loadData = () => {
    if (!patientId) return;
    listInviteFiles(patientId).then(setInvites);
  };

  useEffect(() => {
    loadData();
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const allWithNames = useMemo(
    () =>
      (invites ?? [])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((inv) => ({
          ...inv,
          measureName: getMeasureTitle(inv.measureSlug) ?? inv.measureSlug,
        })),
    [invites]
  );

  const pending = allWithNames.filter((inv) => inv.status === "pending");
  const completed = allWithNames.filter((inv) => inv.status !== "pending");

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}${inviteUrl(token)}`;
    navigator.clipboard.writeText(url).then(() => {
      toast("Link copied", { description: "Share this link with the patient." });
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !patientId) return;
    await deleteInviteFile(deleteTarget.patientId, deleteTarget.token);
    toast("Deleted", { description: "Invite deleted." });
    setDeleteTarget(null);
    loadData();
  };

  const handleRenew = async () => {
    if (!renewTarget || !patientId) return;
    const now = new Date();
    const newExpiresAt = addDuration(now, renewDuration).toISOString();
    await updateInviteFile(patientId, renewTarget.token, {
      expiresAt: newExpiresAt,
      createdAt: now.toISOString(),
    });
    toast("Renewed", {
      description: `Invite extended by ${DURATION_OPTIONS.find((d) => d.value === renewDuration)?.label}.`,
    });
    setRenewTarget(null);
    setRenewDuration("1w");
    loadData();
  };

  const loading = invites === null;

  return (
    <>
      <CreateInvite patientId={patientId ?? ""} onCreated={loadData} customSlugs={customSlugs} />

      <div className="mt-2">
        <HermesPromptHint
          prompt={`Review the current patient profile (clinical-summary.md and clinical-background.md) and the internal catalog files in .data/shared/assessments, .data/shared/templates and data/patients/{CURRENT_PATIENT}/results, then recommend 3–5 existing measures that best match the patient's clinical presentation, citing each measure's file path and briefly justifying the choice by linking it to symptoms, risks, history, impairments, or treatment goals; do not invent measures, and state "No matching measure found in the available catalog" when relevant.`}
          agent="patient-intake"
        />
      </div>

      {loading ? (
        <Card className="ui-content-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : pending.length === 0 ? (
        <Card className="ui-content-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No pending assessments. Create an invite above.
          </CardContent>
        </Card>
      ) : (
        <Card className="ui-content-card">
          <CardHeader>
            <CardTitle className="text-base">Pending ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((inv) => {
                const expired = isExpired(inv);
                return (
                  <div
                    key={inv.token}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{inv.measureName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{inviteUrl(inv.token)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateRange(inv.createdAt, inv.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {!expired && (
                        <Link href={inviteUrl(inv.token)}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            <ExternalLink className="size-3 mr-1" />Take
                          </Button>
                        </Link>
                      )}
                      {expired && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setRenewTarget(inv)}
                        >
                          <RefreshCw className="size-3 mr-1" />Renew
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleCopyLink(inv.token)} className="text-xs">
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(inv); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed assessments log */}
      {completed.length > 0 && (
        <Card className="ui-content-card">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              Taken Assessments ({completed.length})
              {showCompleted ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </CardTitle>
          </CardHeader>
          {showCompleted && (
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                {completed.map((inv) => (
                  <div key={inv.token} className="flex justify-between border-b border-border pb-2 last:border-0">
                    <span>{inv.measureName}</span>
                    <span>{new Date(inv.createdAt).toLocaleDateString("es-MX")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invite</DialogTitle>
            <DialogDescription>
              {deleteTarget?.status === "completed"
                ? "This assessment has been completed. Deleting the invite will only remove this record."
                : "This invite hasn't been completed yet. Are you sure you want to delete it?"}
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

      {/* Renew dialog */}
      <Dialog open={!!renewTarget} onOpenChange={(open) => !open && setRenewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Invite</DialogTitle>
            <DialogDescription>
              Extend the validity period for{" "}
              <span className="font-medium text-foreground">
                {renewTarget ? getMeasureTitle(renewTarget.measureSlug) ?? renewTarget.measureSlug : ""}
              </span>
              . A new expiration date will be set from now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <span className="text-sm text-muted-foreground">Duration:</span>
            <Select value={renewDuration} onValueChange={(v) => v && setRenewDuration(v as Duration)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenewTarget(null)}>Cancel</Button>
            <Button onClick={handleRenew}>
              <RefreshCw className="size-3.5 mr-1.5" />Renew
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
