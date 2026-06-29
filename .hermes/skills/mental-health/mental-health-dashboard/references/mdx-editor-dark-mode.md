# MDX Editor Dark Mode — Battle-Tested Integration

`@mdxeditor/editor` uses **hashed CSS module class names** (e.g., `_contentEditable_f3hmk_379`).
Tailwind's `dark:` prefix and semantic class names like `.mdxeditor-rich-text-editor` **do not match**.
All styling MUST use `[class*="_substring"]` attribute selectors.

## Architecture: client-only with SSR guard

MDX Editor cannot SSR — it causes hydration mismatches on toolbar buttons. The pattern:

```
page.tsx (server) → reads file content → renders EditMarkdownPageClient (client)
edit-page-client.tsx (client) → dynamic(() => import("edit-page"), { ssr: false })
edit-page.tsx (client, lazy) → actual MDXEditor component
```

**`edit-page-client.tsx`** (the `ssr: false` must be in a client component):
```tsx
"use client";
import dynamic from "next/dynamic";
const EditMarkdownPage = dynamic(
  () => import("./edit-page").then((m) => ({ default: m.EditMarkdownPage })),
  { ssr: false }
);
export function EditMarkdownPageClient(props) {
  return <EditMarkdownPage {...props} />;
}
```

## mountedRef guard for onChange

MDX Editor calls `onChange` during initialization (before React mount), causing
"Can't perform a React state update on a component that hasn't mounted yet."

```tsx
const mountedRef = useRef(false);
useEffect(() => { mountedRef.current = true; }, []);

<MDXEditor
  onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
/>
```

## Global CSS (globals.css)

All selectors target hashed class name fragments. Use `!important` everywhere.
**Portal-rendered popups** (BlockTypeSelect dropdown, etc.) need GLOBAL selectors
without `.mdx-dark-editor` prefix — they render outside the editor tree.

```css
/* ── Content area (text must be visible) ── */
.mdx-dark-editor [class*="_contentEditable"] {
  color: oklch(0.95 0.005 260) !important;
  caret-color: oklch(0.95 0.005 260) !important;
}
.mdx-dark-editor [class*="_contentEditable"] * {
  color: oklch(0.95 0.005 260) !important;
}

/* ── Lists ── */
.mdx-dark-editor [class*="_contentEditable"] ul {
  list-style-type: disc !important;
  padding-left: 1.5em !important;
}
.mdx-dark-editor [class*="_contentEditable"] ol {
  list-style-type: decimal !important;
  padding-left: 1.5em !important;
}
.mdx-dark-editor [class*="_contentEditable"] li {
  display: list-item !important;
}

/* ── Toolbar ── */
.mdx-dark-editor [class*="_toolbar"] {
  background: oklch(0.17 0.015 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}
.mdx-dark-editor [class*="_toolbar"] button {
  color: oklch(0.65 0.02 260) !important;
}
.mdx-dark-editor [class*="_toolbar"] button svg {
  fill: oklch(0.65 0.02 260) !important;
  color: oklch(0.65 0.02 260) !important;
}
.mdx-dark-editor [class*="_toolbar"] button:hover,
.mdx-dark-editor [class*="_toolbar"] button[data-state="on"] {
  color: oklch(0.95 0.005 260) !important;
  background: oklch(0.22 0.02 260) !important;
}

/* ── Hide check-list (3rd button in ListsToggle group) ── */
.mdx-dark-editor [class*="_toolbar"] [role="radiogroup"] > :nth-child(3) {
  display: none !important;
}

/* ── Code blocks (CodeMirror) ── */
.mdx-dark-editor [class*="_codeMirrorWrapper"] {
  background: oklch(0.11 0.01 260) !important;
  border-color: oklch(0.22 0.02 260) !important;
}
.mdx-dark-editor [class*="_codeMirrorToolbar"] {
  background: oklch(0.15 0.01 260) !important;
  border-color: oklch(0.22 0.02 260) !important;
}
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor {
  background: oklch(0.11 0.01 260) !important;
}
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-content {
  color: oklch(0.85 0.005 260) !important;
}
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-gutters {
  background: oklch(0.13 0.01 260) !important;
  color: oklch(0.5 0.02 260) !important;
}

/* ── PORTAL popups (GLOBAL selectors — no .mdx-dark-editor prefix) ── */
[class*="_selectContent_"],
[class*="_popupContainer_"],
[role="listbox"] {
  background: oklch(0.17 0.015 260) !important;
  color: oklch(0.95 0.005 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}
[class*="_selectContent_"] [role="option"],
[class*="_popupContainer_"] [role="option"],
[role="listbox"] [role="option"] {
  color: oklch(0.95 0.005 260) !important;
}
[class*="_selectContent_"] [role="option"]:hover,
[role="listbox"] [role="option"]:hover {
  background: oklch(0.22 0.02 260) !important;
}

/* ── Combobox TRIGGER buttons (BlockTypeSelect, code block language) ── */
/* These are the buttons that show the CURRENT selection (e.g., "Paragraph").
   Critical: use GLOBAL selectors — comboboxes may be toolbar items or portal-rendered. */
[role="combobox"] {
  color: oklch(0.95 0.005 260) !important;
  background: oklch(0.17 0.015 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}
[role="combobox"] * {
  color: oklch(0.95 0.005 260) !important;
  background: transparent !important;
}
[role="combobox"]:hover {
  background: oklch(0.22 0.02 260) !important;
}
[role="combobox"] svg,
[role="combobox"] svg * {
  fill: oklch(0.95 0.005 260) !important;
  color: oklch(0.95 0.005 260) !important;
}
/* MDX Editor uses data-toolbar-item for the BlockTypeSelect specifically */
[data-toolbar-item="blockTypeSelect"],
[aria-haspopup="listbox"] {
  background: oklch(0.17 0.015 260) !important;
  color: oklch(0.95 0.005 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}
[data-toolbar-item="blockTypeSelect"] *,
[aria-haspopup="listbox"] * {
  color: oklch(0.95 0.005 260) !important;
  background: transparent !important;
}
```

## Editor wrapper div

Use `overflow-visible` (dropdowns get clipped with `overflow-hidden`).
Add `mdx-dark-editor` class on `<MDXEditor>` for CSS scoping.

```html
<div class="flex-1 overflow-hidden [&_.mdxeditor-popup-container]:!z-[9999]">
  <MDXEditor className="mdx-dark-editor" ... />
</div>
```

The inline `<style>` tag approach (embedding CSS in the component) does NOT work reliably —
MDX Editor renders with hashed classes that the embedded stylesheet may not reach.
Always use `globals.css` with `!important`.

## Plugin stack

```tsx
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
      js: "JavaScript", ts: "TypeScript", json: "JSON",
      md: "Markdown", txt: "Plain Text", py: "Python", sql: "SQL",
    },
  }),
  tablePlugin(),
]}
```

## Critical gotchas

1. **Hasched class names** — always use `[class*="_fragment"]` selectors, never semantic names
2. **Portal popups** — BlockTypeSelect, language selectors render in React portals OUTSIDE the editor tree. Use GLOBAL selectors (no `.mdx-dark-editor` prefix)
3. **`ssr: false` must be in client component** — Next.js rejects it in server components
4. **`onChange` fires pre-mount** — guard with `mountedRef`
5. **`codeBlockPlugin({ defaultCodeBlockLanguage: "" })`** — empty string mapped to "Plain Text" in `codeMirrorPlugin`. Without this, existing code blocks with no language cause "No CodeBlockEditor registered" error
6. **`overflow-visible`** on wrapper — `overflow-hidden` clips the BlockTypeSelect dropdown
7. **Lists need explicit CSS** — `list-style-type` and `padding-left` are stripped by the dark theme reset
8. **Highlight** — works via `==text==` markdown syntax (built into `markdownShortcutPlugin`), no separate button needed
9. **Check-list removal** — hide 3rd button in ListsToggle radiogroup via CSS `:nth-child(3)`
