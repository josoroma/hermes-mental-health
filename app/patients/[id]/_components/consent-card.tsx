"use client";

import { useState, useEffect } from "react";
import type { Patient } from "@/lib/domain/_schema";
import { readConsent, saveConsent } from "@/lib/actions/patient-files";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

interface ConsentCardProps {
  patientId: string;
  seedPatient: Patient;
}

export function ConsentCard({ patientId, seedPatient }: ConsentCardProps) {
  const [consent, setConsent] = useState<{
    consentStatus: string;
    createdAt?: string;
    updatedAt?: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState("granted");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    readConsent(patientId).then((data) => {
      if (data) setConsent(data);
    });
  }, [patientId]);

  const display = consent ?? {
    consentStatus: seedPatient.consentStatus,
    createdAt: seedPatient.createdAt,
    updatedAt: seedPatient.updatedAt,
  };

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

  const handleEdit = () => {
    setDraftStatus(display.consentStatus);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveConsent(patientId, {
      consentStatus: draftStatus as "granted" | "pending" | "revoked",
      createdAt: display.createdAt,
    });
    if (result.success) {
      setConsent((prev) =>
        prev
          ? { ...prev, consentStatus: draftStatus, updatedAt: new Date().toISOString() }
          : null
      );
      setEditing(false);
      toast("Saved", { description: "Consent updated." });
    } else {
      toast("Error", { description: result.error });
    }
    setSaving(false);
  };

  const statusLabel = (s: string) =>
    s === "granted" ? "Granted" : s === "pending" ? "Pending" : "Revoked";

  return (
    <Card className="ui-content-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Consent & Dates</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="size-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="size-3.5 mr-1.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {editing ? (
          <div className="space-y-2">
            <Label>Consent Status</Label>
            <Select value={draftStatus} onValueChange={(v) => v && setDraftStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="granted">Granted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <span className="text-muted-foreground text-sm">Consent Status</span>
            <div className="mt-1">
              <Badge
                variant={
                  display.consentStatus === "granted" ? "default" : "destructive"
                }
              >
                {statusLabel(display.consentStatus)}
              </Badge>
            </div>
          </div>
        )}
        <div className="text-sm">
          <span className="text-muted-foreground">Created: </span>
          {formatDate(display.createdAt)}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Last Updated: </span>
          {formatDate(display.updatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}