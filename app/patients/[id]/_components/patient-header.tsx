"use client";

import { useState, useEffect } from "react";
import { readDemographics, saveDemographics } from "@/lib/actions/patient-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, X, Check, Bot } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface PatientHeaderProps {
  patientId: string;
  name: string;
  ageRange?: string;
  gender?: string;
}

export function PatientHeader({ patientId, name, ageRange, gender }: PatientHeaderProps) {
  const pathname = usePathname();

  // Resolve the agent URL based on current sub-page
  const agentHref = (() => {
    if (pathname.endsWith("/assessments"))
      return `/agent?assessments&patientId=${patientId}`;
    if (pathname.endsWith("/results") || pathname.includes("/results/"))
      return `/agent?results&patientId=${patientId}`;
    if (pathname.endsWith("/sessions") || pathname.includes("/sessions/"))
      return `/agent?sessions&patientId=${patientId}`;
    if (pathname.endsWith("/notes") || pathname.includes("/notes/"))
      return `/agent?notes&patientId=${patientId}`;
    return `/agent?profile&patientId=${patientId}`;
  })();
  const [draft, setDraft] = useState<{ name: string; ageRange: string; gender: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    readDemographics(patientId).then((data) => {
      if (data) {
        setDraft({ name: data.name, ageRange: data.ageRange ?? "", gender: data.gender ?? "" });
      }
    });
  }, [patientId]);

  const display = draft ?? {
    name,
    ageRange: ageRange ?? "",
    gender: gender ?? "",
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const result = await saveDemographics(patientId, {
      name: draft.name,
      ageRange: draft.ageRange || undefined,
      gender: draft.gender || undefined,
    });
    if (result.success) {
      setEditing(false);
      toast("Saved", { description: "Demographics updated." });
    } else {
      toast("Error", { description: result.error });
    }
    setSaving(false);
  };

  return (
    <div className="ui-header ui-header-patient gradient-cover rounded-xl p-6">
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Name</Label>
              <Input
                value={draft?.name ?? ""}
                onChange={(e) => setDraft((prev) => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Age Range</Label>
              <Select
                value={draft?.ageRange ?? ""}
                onValueChange={(v) => setDraft((prev) => prev ? { ...prev, ageRange: v ?? "" } : prev)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-24">18-24</SelectItem>
                  <SelectItem value="25-34">25-34</SelectItem>
                  <SelectItem value="35-44">35-44</SelectItem>
                  <SelectItem value="45-54">45-54</SelectItem>
                  <SelectItem value="55-64">55-64</SelectItem>
                  <SelectItem value="65+">65+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Gender</Label>
              <Select
                value={draft?.gender ?? ""}
                onValueChange={(v) => setDraft((prev) => prev ? { ...prev, gender: v ?? "" } : prev)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="No binario">No binario</SelectItem>
                  <SelectItem value="Prefiero no decirlo">Prefiero no decirlo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Patient ID: <span className="font-mono text-xs">{patientId}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="size-3.5 mr-1.5" />Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="size-3.5 mr-1.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{display.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Patient ID: {patientId} · {display.ageRange || "—"} · {display.gender || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={agentHref}
              className="inline-flex items-center gap-1.5 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              <Bot className="size-3.5" />
              Agent
            </Link>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5 mr-1.5" />Edit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}