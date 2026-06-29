"use client";

import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { type ClinicalItem } from "@/lib/actions/clinical-notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil } from "lucide-react";

interface Props {
  patientId: string;
  item: ClinicalItem;
}

export function ViewClinicalItemPage({ patientId, item }: Props) {
  const router = useRouter();
  const listPath = `/patients/${patientId}/${item.type}s`;

  return (
    <div>
      <div className="ui-header ui-header-view-item flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(listPath)}>
          <ArrowLeft className="size-4 mr-1.5" />Back
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => router.push(`${listPath}/${item.id}/edit`)}>
          <Pencil className="size-3.5 mr-1.5" />Edit
        </Button>
      </div>
      {item.content ? (
        <Card className="ui-content-card">
          <CardHeader>
            <CardTitle className="text-base">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-base dark:prose-invert max-w-none
              prose-headings:text-foreground prose-p:text-foreground/85 prose-p:leading-relaxed
              prose-li:text-foreground/85 prose-li:leading-relaxed prose-strong:text-foreground
              prose-code:text-foreground/80 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-blockquote:border-l-primary prose-blockquote:text-foreground/70
              prose-a:text-primary prose-hr:border-border prose-img:rounded-lg [&_*]:!border-border">
              <ReactMarkdown>{item.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="ui-content-card">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground italic text-sm">No content yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}