"use client";

import { useEffect, useState, use } from "react";
import { type Measure, type Invite } from "@/lib/domain/_schema";
import { getInviteByToken } from "@/lib/actions/invite-files";
import { loadMeasure } from "./_actions";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AssessmentForm } from "./_components/assessment-form";

interface AssessmentPageProps {
  params: Promise<{ token: string }>;
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const { token } = use(params);
  const [resolved, setResolved] = useState<{
    invite: Invite;
    measure: Measure;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setError(null);

      // Find invite by token from file system
      const invite = await getInviteByToken(token);

      if (!invite) {
        if (!cancelled) setError("not_found");
        if (!cancelled) setLoading(false);
        return;
      }

      if (invite.status === "completed") {
        if (!cancelled) setError("completed");
        if (!cancelled) setLoading(false);
        return;
      }

      // Check expiration
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        if (!cancelled) setError("expired");
        if (!cancelled) setLoading(false);
        return;
      }

      const measure = await loadMeasure(invite.measureSlug);
      if (!measure) {
        if (!cancelled) setError("measure_load_failed");
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) {
        setResolved({ invite, measure });
        setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !resolved) {
    const errorMessages: Record<string, string> = {
      not_found: "This invite link is no longer available. It may have already been completed or expired. Please contact your practitioner for a new invite.",
      completed: "This assessment has already been completed. Please contact your practitioner for a new invite.",
      expired: "This invite has expired. Please contact your practitioner for a new invite.",
      measure_load_failed: "Unable to load the assessment. Please contact your practitioner.",
    };

    return (
      <div className="flex flex-col flex-1 items-center justify-center p-8">
        <Card className="ui-content-card max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <h2 className="text-lg font-semibold">Invite Not Available</h2>
            <p className="text-sm text-muted-foreground">
              {errorMessages[error ?? ""] ?? errorMessages.not_found}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {resolved.invite.patientId && (
        <div className="max-w-2xl mx-auto pt-4 px-4 md:px-8">
          <Link
            href={`/patients/${resolved.invite.patientId}/assessments`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Assessments
          </Link>
        </div>
      )}
      <AssessmentForm invite={resolved.invite} measure={resolved.measure} />
    </div>
  );
}