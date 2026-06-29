# MDX Editor Dark Mode CSS

All MDX editors in this project (Clinical Summary, Sessions, Notes) need aggressive `!important`
dark mode overrides because `@mdxeditor/editor` uses hashed class names that Tailwind can't target.

## Full dark mode stylesheet

```css
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
```

## Critical selectors explained

- `[data-lexical-text="true"]` — Lexical editor's raw text spans. Without this, text appears dark/gray in dark mode.
- `[class*="_activeBlock"]` — The active/focused block highlight. Default is a white background; override to dark.
- `[class*="_contentEditable"] *` — All children inside the editable area. Catch-all for nested elements.
- The universal `*` selector inside `.mdxeditor-rich-text-editor` is the broadest safety net.

## Where to apply

Every MDX editor page needs this `<style>` block:
- `app/patients/[id]/edit/[fileType]/_components/edit-page.tsx` (Clinical Summary/Background)
- `app/patients/[id]/sessions/[itemId]/edit/_components/edit-page.tsx` (Sessions/Notes)
- `app/editor/[slug]/_components/editor-page.tsx` (Assessment Editor)
