# MDX Editor DOM Class Names (v2)

Discovered via browser inspection at runtime. Hash suffix (`_f3hmk_379`) varies by build — use `[class*="_prefix"]` attribute-contains selectors, never exact class names.

## Content editable area
- `_contentEditable_f3hmk_379` — the ProseMirror contentEditable div
- ❌ Does NOT contain "rich-text" substring
- ✅ Target: `[class*="_contentEditable"]`

## Toolbar
- `_toolbar_f3hmk_208` — toolbar container
- `_selectTrigger_f3hmk_308` — BlockTypeSelect trigger button
- `_selectDropdownArrow_f3hmk_373` — dropdown arrow in combobox
- ✅ Target: `[class*="_toolbar"]`

## Code blocks (CodeMirror)
- `_codeMirrorWrapper_f3hmk_391` — code block container (NOT `_codeBlock_`)
- `_codeMirrorToolbar_f3hmk_408` — code block toolbar (language selector)
- `.cm-editor`, `.cm-content`, `.cm-line`, `.cm-gutters`, `.cm-gutterElement`, `.cm-activeLineGutter` — CodeMirror internals
- Syntax: `.ͼ1.cm-keyword`, `.ͼ1.cm-string`, `.ͼ1.cm-number`, `.ͼ1.cm-comment`
- ✅ Target: `[class*="_codeMirrorWrapper"]`, `[class*="_codeMirrorToolbar"]`

## Portal popups (rendered outside editor tree)
- `_selectContent_*` — dropdown options container
- `_popupContainer_*` — general popup container
- `[role="listbox"]` — any dropdown listbox
- `[role="option"]` — individual dropdown options
- ✅ Target: global selectors (no parent scope) — `[class*="_selectContent_"]`, `[role="listbox"]`

## Combobox triggers (in toolbar, NOT portal)
- `[role="combobox"]` — the BlockTypeSelect trigger button
- `[aria-haspopup="listbox"]` — any element that opens a dropdown
- ✅ Target: `[role="combobox"]`, `[aria-haspopup="listbox"]` (global, no parent scope — MDX Editor CSS specificity may require this)

## Lists toggle
- Renders as `<div role="radiogroup">` with 3 buttons (bulleted, numbered, checklist)
- ✅ Target to hide 3rd button: `[class*="_toolbar"] [role="radiogroup"] > :nth-child(3)`
