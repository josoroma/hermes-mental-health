# MDX Editor Dark Theme

## The problem

`@mdxeditor/editor` uses CSS modules with hashed class names (e.g., `_contentEditable_f3hmk_379`, `_toolbar_f3hmk_208`). Standard CSS selectors like `.mdxeditor-rich-text-editor` don't match the actual rendered DOM. Tailwind's `dark:` prefix also doesn't penetrate the editor's internal DOM.

The editor renders with dark text (`rgb(28, 32, 36)`) on dark background — invisible content.

## Solution: prefix-match on hashed class names

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

.mdx-dark-editor [class*="_toolbar"] button svg {
  fill: oklch(0.65 0.02 260) !important;
  color: oklch(0.65 0.02 260) !important;
}

.mdx-dark-editor [class*="_toolbar"] button:hover,
.mdx-dark-editor [class*="_toolbar"] button[data-state="on"],
.mdx-dark-editor [class*="_toolbar"] button[data-active="true"] {
  color: oklch(0.95 0.005 260) !important;
  background: oklch(0.22 0.02 260) !important;
}
```

Apply the `mdx-dark-editor` class to the `<MDXEditor className="mdx-dark-editor" />` root.

## Popups/dropdowns

BlockTypeSelect and other dropdowns render in portals. Need broad selectors:

```css
.mdx-dark-editor [class*="_popupContainer"],
.mdx-dark-editor [class*="_selectContent"],
.mdx-dark-editor [role="listbox"] {
  background: oklch(0.17 0.015 260) !important;
  color: oklch(0.95 0.005 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}

.mdx-dark-editor [role="option"] {
  color: oklch(0.95 0.005 260) !important;
}
```

## Lists

MDX Editor lists lose bullets/numbers with aggressive color overrides. Restore:

```css
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
```

## Hide checklist in ListsToggle

```css
.mdx-dark-editor [class*="_toolbar"] [role="radiogroup"] > :nth-child(3) {
  display: none !important;
}
```

## Code blocks and CodeMirror

The code block container uses `_codeMirrorWrapper_` (not `_codeBlock_`). Include CodeMirror via `codeMirrorPlugin` with `codeBlockPlugin({ defaultCodeBlockLanguage: "" })` — empty string maps to plain text editor, avoiding "No CodeBlockEditor registered" errors on existing content.

```css
.mdx-dark-editor [class*="_codeMirrorWrapper"] {
  background: oklch(0.11 0.01 260) !important;
  border-color: oklch(0.22 0.02 260) !important;
  border-radius: var(--radius-md);
}

.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor {
  background: oklch(0.11 0.01 260) !important;
}

.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .cm-content {
  color: oklch(0.85 0.005 260) !important;
  caret-color: oklch(0.85 0.005 260) !important;
}

.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .cm-line {
  color: oklch(0.85 0.005 260) !important;
}

/* Line number gutter */
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .cm-gutters {
  background: oklch(0.09 0.01 260) !important;
  color: oklch(0.45 0.02 260) !important;
  border-right-color: oklch(0.18 0.02 260) !important;
}

.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .cm-activeLineGutter {
  background: oklch(0.15 0.01 260) !important;
}

/* CodeMirror toolbar (language selector) */
.mdx-dark-editor [class*="_codeMirrorToolbar"] {
  background: oklch(0.15 0.01 260) !important;
  border-color: oklch(0.22 0.02 260) !important;
}

.mdx-dark-editor [class*="_codeMirrorToolbar"] button,
.mdx-dark-editor [class*="_codeMirrorToolbar"] [role="combobox"] {
  color: oklch(0.85 0.005 260) !important;
  background: oklch(0.17 0.015 260) !important;
  border-color: oklch(0.22 0.02 260) !important;
}

/* Syntax highlighting */
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .ͼ1.cm-keyword { color: oklch(0.7 0.15 280) !important; }
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .ͼ1.cm-string  { color: oklch(0.7 0.15 150) !important; }
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .ͼ1.cm-number  { color: oklch(0.7 0.15 80) !important; }
.mdx-dark-editor [class*="_codeMirrorWrapper"] .cm-editor .ͼ1.cm-comment { color: oklch(0.5 0.02 260) !important; font-style: italic; }
```

Plugin setup:
```tsx
codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
codeMirrorPlugin({
  codeBlockLanguages: { "": "Plain Text", js: "JavaScript", ts: "TypeScript", json: "JSON", md: "Markdown", txt: "Plain Text", py: "Python", sql: "SQL" },
}),
```

## BlockTypeSelect combobox trigger

The combobox that shows "Paragraph" / "Heading 1" uses `_selectTrigger_` class. It's a `<button>` with `role="combobox"`. Style it directly:

```css
.mdx-dark-editor [class*="_toolbar"] [class*="_selectTrigger"] {
  color: oklch(0.9 0.005 260) !important;
  background: oklch(0.17 0.015 260) !important;
}
```

## Portal-rendered popups need GLOBAL selectors

MDX Editor renders dropdowns in React portals outside the editor tree. Use unscoped selectors:

```css
[class*="_selectContent_"],
[class*="_popupContainer_"] {
  background: oklch(0.17 0.015 260) !important;
  color: oklch(0.95 0.005 260) !important;
  border-color: oklch(0.28 0.02 260) !important;
}

[class*="_codeMirrorToolbar_"] [role="listbox"] {
  background: oklch(0.17 0.015 260) !important;
  color: oklch(0.95 0.005 260) !important;
}
```

## Prevent setState during MDX Editor init

MDX Editor calls `onChange` during initialization, which triggers setState before mount. Guard with a ref:

```tsx
const mountedRef = useRef(false);
useEffect(() => { mountedRef.current = true; }, []);

<MDXEditor
  onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
  ...
/>
```
