"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveClinicalItem, type ClinicalItem } from "@/lib/actions/clinical-notes";
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
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Props {
  patientId: string;
  item: ClinicalItem;
}

export function EditClinicalItemPage({ patientId, item }: Props) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState(item.content);
  const [title, setTitle] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => { mountedRef.current = true; }, []);

  const displayName = item.type === "session" ? "Session" : "Note";
  const listPath = `/patients/${patientId}/${item.type}s`;

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await saveClinicalItem(patientId, {
      ...item,
      title,
      content: markdown,
      updatedAt: new Date().toISOString(),
    });
    if (result.success) {
      toast("Saved", { description: `${displayName} updated.` });
      router.push(listPath);
    } else {
      toast("Error", { description: result.error });
    }
    setSaving(false);
  }, [patientId, item, title, markdown, router, listPath, displayName]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <style>{`
        .mdxeditor-rich-text-editor { color: oklch(0.95 0.005 260) !important; caret-color: oklch(0.95 0.005 260) !important; }
        .mdxeditor-rich-text-editor * { color: oklch(0.95 0.005 260) !important; }
        .mdxeditor-rich-text-editor p, .mdxeditor-rich-text-editor h1, .mdxeditor-rich-text-editor h2,
        .mdxeditor-rich-text-editor h3, .mdxeditor-rich-text-editor h4, .mdxeditor-rich-text-editor h5,
        .mdxeditor-rich-text-editor h6, .mdxeditor-rich-text-editor li, .mdxeditor-rich-text-editor blockquote,
        .mdxeditor-rich-text-editor code, .mdxeditor-rich-text-editor span { color: oklch(0.95 0.005 260) !important; }
        .mdxeditor-rich-text-editor [class*="_contentEditable"] { color: oklch(0.95 0.005 260) !important; }
        .mdxeditor-rich-text-editor [class*="_contentEditable"] * { color: oklch(0.95 0.005 260) !important; }
        [data-lexical-text="true"] { color: oklch(0.95 0.005 260) !important; }
        .mdxeditor-toolbar { background: oklch(0.17 0.015 260) !important; border-color: oklch(0.28 0.02 260) !important; }
        .mdxeditor-toolbar button { color: oklch(0.65 0.02 260) !important; }
        .mdxeditor-toolbar button svg { fill: oklch(0.65 0.02 260) !important; color: oklch(0.65 0.02 260) !important; }
        .mdxeditor-toolbar button:hover, .mdxeditor-toolbar button[data-state="on"] { color: oklch(0.95 0.005 260) !important; background: oklch(0.22 0.02 260) !important; }
        .mdxeditor-toolbar button:hover svg, .mdxeditor-toolbar button[data-state="on"] svg { fill: oklch(0.95 0.005 260) !important; color: oklch(0.95 0.005 260) !important; }
        [class*="_activeBlock"] { background: oklch(0.17 0.015 260) !important; }
        [class*="focused"], [class*="selected"] { background: oklch(0.17 0.015 260) !important; }
        .mdxeditor-rich-text-editor [class*="_blockTypeSelect"] { background: oklch(0.17 0.015 260) !important; }
      `}</style>

      <div className="ui-header ui-header-edit-item flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(listPath)}>
            <ArrowLeft className="size-4 mr-1.5" />Back
          </Button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push(listPath)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="ui-content-card flex-1 overflow-auto border rounded-lg bg-card">
        <MDXEditor
          markdown={markdown}
          onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
          plugins={[
            toolbarPlugin({ toolbarContents: () => (<><UndoRedo /><BoldItalicUnderlineToggles /><StrikeThroughSupSubToggles /><ListsToggle /><BlockTypeSelect /><InsertThematicBreak /><InsertCodeBlock /><InsertTable /></>) }),
            headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(),
            markdownShortcutPlugin(), linkPlugin(), linkDialogPlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
            codeMirrorPlugin({ codeBlockLanguages: { "": "Plain Text", js: "JavaScript", ts: "TypeScript", json: "JSON", md: "Markdown", txt: "Plain Text", py: "Python", sql: "SQL" } }),
            tablePlugin(),
          ]}
          contentEditableClassName="prose prose-base dark:prose-invert max-w-none p-6"
        />
      </div>
    </div>
  );
}