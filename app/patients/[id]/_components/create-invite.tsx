"use client";

import { useState } from "react";
import { generateInviteToken } from "@/lib/invites/token";
import { saveInviteFile } from "@/lib/actions/invite-files";
import { InviteStatus } from "@/lib/domain/_schema";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Invite } from "@/lib/domain/_schema";
import indexData from "@/data/shared/templates/index.json";

interface CreateInviteProps {
  patientId: string;
  onCreated?: () => void;
  customSlugs: string[];
  /** Pre-selected measure slug for renew flows */
  preselectedSlug?: string;
}

interface MeasureEntry {
  slug: string;
  title: string;
  description: string;
}

const DURATION_OPTIONS = [
  { label: "1 day", value: "1d" },
  { label: "1 week", value: "1w" },
  { label: "1 month", value: "1m" },
] as const;

type Duration = (typeof DURATION_OPTIONS)[number]["value"];

export function addDuration(date: Date, duration: Duration): Date {
  const d = new Date(date);
  switch (duration) {
    case "1d":
      d.setDate(d.getDate() + 1);
      break;
    case "1w":
      d.setDate(d.getDate() + 7);
      break;
    case "1m":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

export function CreateInvite({
  patientId,
  onCreated,
  customSlugs,
  preselectedSlug,
}: CreateInviteProps) {
  const [open, setOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>(preselectedSlug ?? "");
  const [duration, setDuration] = useState<Duration>("1w");

  // Merge template index with custom assessment slugs from filesystem
  const allMeasures: MeasureEntry[] = [
    ...(indexData as MeasureEntry[]),
    ...customSlugs
      .filter((slug) => !(indexData as MeasureEntry[]).some((m) => m.slug === slug))
      .map((slug) => ({ slug, title: `${slug} (custom)`, description: "" })),
  ];

  const handleCreate = async () => {
    if (!selectedSlug) return;

    const token = generateInviteToken();
    const now = new Date();
    const invite: Invite = {
      token,
      measureSlug: selectedSlug,
      patientId,
      createdAt: now.toISOString(),
      expiresAt: addDuration(now, duration).toISOString(),
      status: InviteStatus.PENDING,
    };

    await saveInviteFile(patientId, invite);

    toast("Invite created", {
      description: `${getMeasureTitle(selectedSlug) ?? selectedSlug} — expires in ${DURATION_OPTIONS.find((d) => d.value === duration)?.label}`,
    });

    setSelectedSlug("");
    setDuration("1w");
    setOpen(false);
    onCreated?.();
  };

  return (
    <div className="ui-header ui-header-create-invite">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          + New Invite
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-card flex-wrap">
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a measure…</option>
            {allMeasures.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
          <Select value={duration} onValueChange={(v) => v && setDuration(v as Duration)}>
            <SelectTrigger className="w-[120px]">
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
          <Button size="sm" onClick={handleCreate} disabled={!selectedSlug}>
            Create
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function inviteUrl(token: string): string {
  return `/a/${token}`;
}
