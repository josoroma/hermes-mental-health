"use client";

import { useAtomValue } from "jotai";
import { scopedInvitesAtom } from "@/lib/scope";
import { getMeasureTitle } from "@/lib/data/measure-meta";
import { inviteUrl } from "./create-invite";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InvitesTable() {
  const invites = useAtomValue(scopedInvitesAtom);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}${inviteUrl(token)}`;
    navigator.clipboard.writeText(url).then(() => {
      toast("Link copied", {
        description: "Share this link with the patient to complete the assessment.",
      });
    });
  };

  if (invites.length === 0) {
    return null;
  }

  const sorted = [...invites].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <Card className="ui-content-card">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {sorted.map((inv) => (
            <div
              key={inv.token}
              className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {getMeasureTitle(inv.measureSlug) ?? inv.measureSlug}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {inviteUrl(inv.token)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created:{" "}
                  {new Date(inv.createdAt).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge
                  variant={
                    inv.status === "completed" ? "default" : "secondary"
                  }
                >
                  {inv.status === "completed" ? "Completed" : "Pending"}
                </Badge>
                {inv.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyLink(inv.token)}
                    className="text-xs"
                  >
                    Copy Link
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}