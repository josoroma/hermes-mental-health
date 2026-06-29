"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveClinicalFile, readClinicalFile } from "@/lib/actions/clinical-files";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  BlockTypeSelect,
  ListsToggle,
  InsertThematicBreak,
  InsertCodeBlock,
  InsertTable,
  codeBlockPlugin,
  codeMirrorPlugin,
  tablePlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditPageProps {
  patientId: string;
  fileType: "clinical-summary" | "clinical-background" | "care-plan";
  title: string;
  initialContent: string | null;
}

const TITLES: Record<string, string> = {
  "clinical-summary": "Clinical Summary",
  "clinical-background": "Clinical Background",
  "care-plan": "Care Plan",
};

export function EditMarkdownPage({
  patientId,
  fileType,
  title,
  initialContent,
}: EditPageProps) {
  const router = useRouter();
  // Start null — only render editor after content is loaded from server action
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(false);

  // Load content from file via server action on mount.
  // We DON'T use the initialContent prop because next/dynamic's SSR-off
  // wrapper drops props from server components.
  useEffect(() => {
    let cancelled = false;
    readClinicalFile(patientId, fileType).then((text) => {
      if (!cancelled) {
        setMarkdown(text ?? "");
        // Delay mountedRef so MDXEditor's init-time onChange doesn't overwrite
        requestAnimationFrame(() => { mountedRef.current = true; });
      }
    });
    return () => { cancelled = true; mountedRef.current = false; };
  }, [patientId, fileType]);

  const handleSave = useCallback(async () => {
    if (markdown === null) return;
    setSaving(true);
    const result = await saveClinicalFile(patientId, fileType, markdown);
    if (result.success) {
      toast("Saved", { description: `${title} updated.` });
      router.push(`/patients/${patientId}`);
    } else {
      toast("Error", { description: result.error });
    }
    setSaving(false);
  }, [patientId, fileType, markdown, title, router]);

  const handleCancel = () => {
    router.push(`/patients/${patientId}`);
  };

  return (
    <div className="flex flex-col h-screen">
      <style>{`
        .mdxeditor-rich-text-editor {
          color: oklch(0.95 0.005 260) !important;
          caret-color: oklch(0.95 0.005 260) !important;
        }
        .mdxeditor-rich-text-editor p,
        .mdxeditor-rich-text-editor h1,
        .mdxeditor-rich-text-editor h2,
        .mdxeditor-rich-text-editor h3,
        .mdxeditor-rich-text-editor h4,
        .mdxeditor-rich-text-editor h5,
        .mdxeditor-rich-text-editor h6,
        .mdxeditor-rich-text-editor li,
        .mdxeditor-rich-text-editor blockquote,
        .mdxeditor-rich-text-editor code,
        .mdxeditor-rich-text-editor span {
          color: oklch(0.95 0.005 260) !important;
        }
        .mdxeditor-toolbar {
          background: oklch(0.17 0.015 260) !important;
          border-color: oklch(0.28 0.02 260) !important;
        }
        .mdxeditor-toolbar button {
          color: oklch(0.65 0.02 260) !important;
        }
        .mdxeditor-toolbar button svg {
          fill: oklch(0.65 0.02 260) !important;
          color: oklch(0.65 0.02 260) !important;
        }
        .mdxeditor-toolbar button:hover,
        .mdxeditor-toolbar button[data-state="on"],
        .mdxeditor-toolbar button[data-active="true"] {
          color: oklch(0.95 0.005 260) !important;
          background: oklch(0.22 0.02 260) !important;
        }
        .mdxeditor-toolbar button:hover svg,
        .mdxeditor-toolbar button[data-state="on"] svg,
        .mdxeditor-toolbar button[data-active="true"] svg {
          fill: oklch(0.95 0.005 260) !important;
          color: oklch(0.95 0.005 260) !important;
        }
        .mdxeditor-popup-container,
        .mdxeditor-select-content {
          background: oklch(0.17 0.015 260) !important;
          color: oklch(0.95 0.005 260) !important;
          border-color: oklch(0.28 0.02 260) !important;
        }
        .mdxeditor-popup-container [role="option"]:hover {
          background: oklch(0.22 0.02 260) !important;
        }
      `}</style>
      {/* Top bar */}
      <div className="ui-header ui-header-edit-clinical flex items-center justify-between h-14 px-6 border-b glass-panel shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="size-4 mr-1.5" />
            Back
          </Button>
          <h1 className="text-sm font-semibold tracking-tight">Edit {title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || markdown === null}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div
        className="ui-content-card flex-1 overflow-hidden [&_.mdxeditor-popup-container]:!z-[9999]"
        style={
          {
            "--mdxeditor-text": "oklch(0.95 0.005 260)",
            "--mdxeditor-bg": "var(--background)",
            "--mdxeditor-toolbar-bg": "var(--card)",
            color: "oklch(0.95 0.005 260)",
          } as React.CSSProperties
        }
      >
        {markdown !== null ? (
          <MDXEditor
            key={`${patientId}-${fileType}`}
            markdown={markdown}
            onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
            className="mdx-dark-editor"
            plugins={[
              toolbarPlugin({
                toolbarContents: () => (
                  <>
                    <UndoRedo />
                    <BoldItalicUnderlineToggles />
                    <StrikeThroughSupSubToggles />
                    <ListsToggle />
                    <BlockTypeSelect />
                    <InsertThematicBreak />
                    <InsertCodeBlock />
                    <InsertTable />
                  </>
                ),
              }),
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              markdownShortcutPlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
              codeMirrorPlugin({
                codeBlockLanguages: {
                  "": "Plain Text",
                  js: "JavaScript",
                  ts: "TypeScript",
                  json: "JSON",
                  md: "Markdown",
                  txt: "Plain Text",
                  py: "Python",
                  sql: "SQL",
                },
              }),
              tablePlugin(),
            ]}
            contentEditableClassName="prose prose-base dark:prose-invert max-w-none p-6"
          />
        ) : (
          <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading {TITLES[fileType] ?? fileType}…
          </div>
        )}
      </div>
    </div>
  );
}