# MDX Editor Integration

## Setup

```tsx
import {
  MDXEditor, headingsPlugin, listsPlugin, quotePlugin,
  thematicBreakPlugin, markdownShortcutPlugin, linkPlugin, linkDialogPlugin,
  toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles, BlockTypeSelect,
  ListsToggle, InsertThematicBreak, InsertCodeBlock, InsertTable,
  codeBlockPlugin, codeMirrorPlugin, tablePlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
```

## SSR: must use client-only loading

MDX Editor hydration fails (UndoRedo `disabled` state, aria attrs differ server vs client).
Use `dynamic(..., { ssr: false })` in a client wrapper:

```tsx
// edit-page-client.tsx ("use client")
const EditMarkdownPage = dynamic(
  () => import("./edit-page").then((m) => ({ default: m.EditMarkdownPage })),
  { ssr: false }
);
```

**Pitfall**: `ssr: false` in `next/dynamic` is NOT allowed in Server Components. Must be in a `"use client"` wrapper.

## onChange during mount

MDX Editor calls `onChange` during initialization (before React mount in dynamic import).
Guard with a `mountedRef`:

```tsx
const mountedRef = useRef(false);
useEffect(() => { mountedRef.current = true; }, []);

<MDXEditor
  markdown={markdown}
  onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
/>
```

## Dark mode CSS

MDX Editor uses hashed class names (e.g., `_contentEditable_f3hmk_379`, `_toolbar_f3hmk_208`).
Use attribute prefix selectors: `[class*="_contentEditable"]`, `[class*="_toolbar"]`.

Global CSS (`globals.css`) with `!important` overrides:

```css
.mdx-dark-editor [class*="_contentEditable"] {
  color: oklch(0.95 0.005 260) !important;
  caret-color: oklch(0.95 0.005 260) !important;
}
.mdx-dark-editor [class*="_contentEditable"] * {
  color: oklch(0.95 0.005 260) !important;
}
.mdx-dark-editor [class*="_toolbar"] {
  background: oklch(0.17 0.015 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}
.mdx-dark-editor [class*="_toolbar"] button {
  color: oklch(0.65 0.02 260) !important;
}
```

Also embed a `<style>` tag in the component for guaranteed loading:

```tsx
<style>{`
  .mdxeditor-rich-text-editor { color: oklch(0.95 ...) !important; }
`}</style>
```

## Code blocks

Need `codeBlockPlugin({ defaultCodeBlockLanguage: "" })` + `codeMirrorPlugin({ codeBlockLanguages: { "": "Plain Text", ... } })`.

Empty string `""` as default language prevents "No CodeBlockEditor registered" errors on existing code blocks with no language set.

CodeMirror dark theme:
```css
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .cm-gutters {
  background: oklch(0.09 0.01 260) !important;
}
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .cm-content {
  color: oklch(0.85 0.005 260) !important;
}
```

## BlockTypeSelect / combobox dark theme

The BlockTypeSelect trigger is a `<button>` with class `_selectTrigger_*` and `role="combobox"`.
Use both class-based and role-based selectors:

```css
.mdx-dark-editor [class*="_toolbar"] [class*="_selectTrigger"] { ... }
[role="combobox"] { ... }
[aria-haspopup="listbox"] { ... }
```

**Pitfall**: MDX Editor popups render in React portals outside the editor DOM tree.
Use GLOBAL selectors (no `.mdx-dark-editor` prefix) for popup containers:
`[class*="_selectContent_"]`, `[class*="_popupContainer_"]`, `[role="listbox"]`.

## Button-inside-button pitfall

Never wrap `<Button>` in `<DialogTrigger>` — both render `<button>` elements, causing invalid HTML nesting and hydration errors:

```tsx
// WRONG:
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// RIGHT:
<Button onClick={() => setOpen(true)}>Open</Button>
```

## Check list removal

`ListsToggle` renders bulleted + numbered + checklist in a radiogroup. Hide checklist via CSS:

```css
.mdx-dark-editor [class*="_toolbar"] [role="radiogroup"] > :nth-child(3) {
  display: none !important;
}
```

## Full-page editor vs modal

For a full-page editing experience, use a nested route (`/patients/[id]/edit/[fileType]`)
instead of a modal dialog. The editor gets full viewport height and avoids z-index/
overflow conflicts with shadcn Dialog.
