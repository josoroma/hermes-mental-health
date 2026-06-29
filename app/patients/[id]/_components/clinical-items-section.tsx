"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { activePatientIdAtom } from "@/lib/state/_atoms";
import {
  createClinicalItem,
  listClinicalItems,
  listDeletedClinicalItems,
  deleteClinicalItem,
  type ClinicalItem,
} from "@/lib/actions/clinical-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Calendar } from "lucide-react";
import { HermesPromptHint } from "@/components/hermes-prompt-hint";

interface ClinicalItemsSectionProps {
  type: "session" | "note";
}

export function ClinicalItemsSection({ type }: ClinicalItemsSectionProps) {
  const patientId = useAtomValue(activePatientIdAtom);
  const [items, setItems] = useState<ClinicalItem[] | null>(null);
  const [deletedItems, setDeletedItems] = useState<ClinicalItem[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClinicalItem | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  const loadData = () => {
    if (!patientId) return;
    listClinicalItems(patientId, type).then(setItems);
  };

  useEffect(() => { loadData(); }, [patientId]); // eslint-disable-line

  const loadDeleted = () => {
    if (!patientId) return;
    listDeletedClinicalItems(patientId, type).then(setDeletedItems);
  };

  useEffect(() => { loadDeleted(); }, [patientId]); // eslint-disable-line

  const itemsWithDates = useMemo(
    () => (items ?? []).map((i) => ({ ...i, dateStr: new Date(i.createdAt).toLocaleDateString("es-MX") })),
    [items]
  );

  const displayName = type === "session" ? "Session" : "Note";

  const handleCreate = async () => {
    if (!patientId) return;
    if (type === "session") {
      // Set default to now
      const now = new Date();
      setAppointmentDate(now.toISOString().slice(0, 10));
      setAppointmentTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
      setShowAppointmentDialog(true);
      return;
    }
    await createClinicalItem(patientId, type);
    toast("Created", { description: `New ${displayName.toLowerCase()} created.` });
    loadData();
  };

  const handleCreateWithAppointment = async () => {
    if (!patientId) return;
    const dateTime = appointmentDate && appointmentTime
      ? `${appointmentDate} ${appointmentTime}`
      : undefined;
    await createClinicalItem(patientId, type, dateTime);
    toast("Created", {
      description: dateTime
        ? `New session created with appointment on ${dateTime}.`
        : `New ${displayName.toLowerCase()} created.`,
    });
    setShowAppointmentDialog(false);
    setAppointmentDate("");
    setAppointmentTime("");
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !patientId) return;
    await deleteClinicalItem(patientId, type, deleteTarget.id);
    toast("Deleted", { description: `${displayName} moved to deleted.` });
    setDeleteTarget(null);
    loadData();
    loadDeleted();
  };

  return (
    <>
      <div className={`ui-content-section ui-content-section-${type}s flex items-center justify-between`}>
        <h1 className="text-xl font-semibold tracking-tight">{displayName}s</h1>
        <div className="flex items-center gap-2">
          <HermesPromptHint
            compact
            prompt={type === "session"
              ? `Generate a clinical session template in Markdown for this patient. Include sections for Opening, Symptom Review, Interventions, Session Plan, and Notes.`
              : `Generate a progress note synthesizing the patient's recent results and sessions. Include severity changes and recommendations.`}
            agent={type === "session" ? "patient-session" : "patient-progress-weekly"}
          />
          <Button size="sm" onClick={handleCreate}>
            <Plus className="size-3.5 mr-1.5" />New {displayName}
          </Button>
        </div>
      </div>

      {items === null ? (
        <Card className="ui-content-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : itemsWithDates.length === 0 ? (
        <Card className="ui-content-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No {displayName.toLowerCase()}s yet. Create one above.
          </CardContent>
        </Card>
      ) : (
        <Card className="ui-content-card">
          <CardHeader>
            <CardTitle className="text-base">{displayName}s ({itemsWithDates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {itemsWithDates.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/patients/${patientId}/${type}s/${item.id}/view`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.dateStr} · {item.content.length} chars
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Link href={`/patients/${patientId}/${type}s/${item.id}/edit`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <FileText className="size-3 mr-1" />Edit
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deleted items */}
      <Button
        variant="ghost"
        size="sm"
        className={`ui-bottom ui-bottom-deleted-${type}s text-muted-foreground`}
        onClick={() => { setShowDeleted(!showDeleted); if (!showDeleted) loadDeleted(); }}
      >
        Deleted {displayName}s ({deletedItems.length})
      </Button>
      {showDeleted && (
        <Card className="ui-content-card">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              {deletedItems.length === 0 ? (
                <p className="text-center py-4">No deleted {displayName.toLowerCase()}s.</p>
              ) : (
                deletedItems.map((d) => (
                  <div key={d.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                    <span>{d.title}</span>
                    <span className="text-xs">{new Date(d.createdAt).toLocaleDateString("es-MX")}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {displayName}</DialogTitle>
            <DialogDescription>
              This will move the {displayName.toLowerCase()} to the deleted folder. Are you sure?
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

      {/* Appointment date picker for session creation */}
      <Dialog open={showAppointmentDialog} onOpenChange={(open) => !open && setShowAppointmentDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Appointment</DialogTitle>
            <DialogDescription>
              Set the appointment date and time for this session. The session file will be linked to an appointment record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointment-date" className="text-xs">Date</Label>
                <Input
                  id="appointment-date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-time" className="text-xs">Time</Label>
                <Input
                  id="appointment-time"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAppointmentDialog(false)}>Skip</Button>
            <Button onClick={handleCreateWithAppointment}>
              <Calendar className="size-3.5 mr-1.5" />Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}