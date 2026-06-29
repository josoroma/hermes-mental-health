---
name: mental-health-development
description: Development patterns, pitfalls, and workflows for the Hermes Mental Health Next.js app — MDX Editor dark theming, hydration fixes, component patterns, data file architecture.
version: 0.1.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, development, nextjs, mdx-editor, hydration]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-dashboard
      - mental-health-patient-summary
---

# Mental Health Development

## When to use

Load this skill for any development work on the Hermes Mental Health Next.js app — adding features, fixing styling, resolving hydration errors, or working with the data file architecture.

## Code Style Rules

All code in `app/`, `components/`, and `lib/` follows these enforced conventions:

| Rule | Detail |
|------|--------|
| **Indentation** | 2-space |
| **Quotes** | Single quotes (`'`) for JS/TS strings. JSX attributes use double quotes (`"`). |
| **Semicolons** | None. No trailing semicolons. |
| **Trailing commas** | Always in multi-line objects, arrays, and parameter lists. |
| **Exports** | Named exports only (`export const`, `export async function`). `export default` allowed ONLY for `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`. |
| **Path alias** | Always `@/` — never relative imports up more than one level. |
| **Route files** | Underscore prefix: `_actions.ts`, `_schema.ts`, `_hooks.ts`, `_atoms.ts`, `_types.ts`, `_utils.ts`, `_constants.ts`. |
| **Components** | Folder `_components/` with kebab-case file names, PascalCase component names. One component per file. |
| **Function style** | `const` arrow functions: `export const MyComponent = (props) => {}`. Destructure props in signature. |
| **Types** | Colocate with route. Extract to `lib/` only if used by 3+ routes. |
| **Schemas** | `export const <Name>Schema = z.object({...})` + `export type <Name> = z.infer<typeof <Name>Schema>`. |
| **Actions** | `export async function <verbNoun>(...)` — e.g., `createPatient`, `saveClinicalFile`. |
| **Server directives** | `'use server'` / `'use client'` at top of file with single quotes. |

### Code quality gates

```bash
npx tsc --noEmit          # Must pass before commit
npm run lint              # ESLint
```

### Pitfall: Bulk sed/perl refactoring

See `references/code-style-refactoring-pitfalls.md` for the full list of breakage patterns when doing bulk find-and-replace across `.ts`/`.tsx` files — apostrophe breaks, generic parameter conversion, mixed JSX/TS contexts.

---

## Data file architecture

Patient data is stored as files under `data/patients/<id>/`:

```
data/patients/<id>/
  profile.json           # Demographics only: id, name, ageRange, gender, timestamps
  consent.json           # Consent status + timestamps
  clinical-summary.md    # Practitioner-editable markdown
  clinical-background.md # Practitioner-editable markdown
  sessions/              # Clinical session JSON files
  notes/                 # Clinical note JSON files
  results/               # Assessment result JSON files (taken-ts-slug.json)
  invites/               # Assessment invite JSON files (yyyy-mm-dd-hh-mm-ss-token.json)
  sessions-deleted/      # Moved-from sessions/ with deleted-ts- prefix
  notes-deleted/         # Moved-from notes/ with deleted-ts- prefix
  results-deleted/       # Moved-from results/ with deleted-ts-original-name.json
```

**File naming conventions:**
- **Results:** `taken-<yyyy-mm-dd-hh-mm-ss>-<slug>.json`
- **Invites:** `<yyyy-mm-dd-hh-mm-ss>-<token>.json`
- **Sessions/Notes:** `<yyyy-mm-dd-hh-mm-ss>-<id>.json`
- **Deleted result:** `deleted-<now-ts>-<original-filename>` (e.g. `deleted-2026-06-22-01-00-00-taken-2026-06-21-12-00-00-phq-9.json`)
- **Deleted patient:** moved to `data/patients-deleted/<ts>-<patientId>/`

**Rules:**
- `profile.json` must NOT contain `clinicalBackground` or `consentStatus`
- New patients created via `createPatient` server action copy files from `data/shared/templates/md/` with `{{PLACEHOLDER}}` substitution — see Patient creation from templates below
- `listPatients()` (client-safe) only returns `SEED_PATIENTS`. Use `listAllPatients()` from `lib/data/patients-server.ts` (server-only) to scan filesystem for dynamically created patients
- **Seed patient overlay is mandatory.** When `listAllPatients()` or `getPatientById()` returns a seed patient, you MUST overlay `profile.json` and `consent.json` from disk if they exist. The seed data has hardcoded `consentStatus: "granted"` — if the practitioner changes consent to "pending" or "revoked" via the UI, `consent.json` is written to disk but the seed patient's hardcoded value would be returned unless explicitly overlaid. Same for `profile.json` (name, ageRange, gender, timestamps). The canonical implementation is in `lib/data/patients-server.ts` with `overlayProfile()` and `overlayConsent()` helpers. **Both overlays are mandatory** — always call `overlayProfile()` first (profile.json may have updated name/age/gender), then `overlayConsent()` (consent.json is a separate file). Filesystem-only patients (non-seed) only need `overlayConsent()` since their profile.json already contains their current demographics.
- **Pagination for data tables:** Use client-side pagination with `useMemo` slicing. Pattern: `const pagedData = useMemo(() => data.slice((safePage - 1) * pageSize, safePage * pageSize), [data, safePage, pageSize]);`. Page size selector via shadcn `<Select>` with options `[1, 5, 10, 15, 20, 25, 50, 100]`. Prev/Next buttons via `<ChevronLeft>`/`<ChevronRight>` with disabled states at boundaries. Show "X–Y of Z" range label. Clamp page when data or pageSize changes: `const totalPages = Math.max(1, Math.ceil(data.length / pageSize)); const safePage = Math.min(page, totalPages);`. Handle `onValueChange` type: `(value: string | null) => void` for base-ui Select.
- **DialogFooter button spacing:** The default `gap-2` in `DialogFooter` (from `components/ui/dialog.tsx`) is tight for Cancel + destructive Delete pairs. Use `gap-3` instead for visible separation.
- **Sonner closeButton:** Enable `closeButton` prop on `<Sonner>` toaster in `components/ui/sonner.tsx` so all toasts get an X dismiss button. Add it alongside `className` and `icons` props.
- Deleted items are NEVER permanently removed — always moved to `*-deleted/` folders
- Deleted filenames preserve the original filename, prepending `deleted-<timestamp>-`
- Custom assessments live in `data/shared/assessments/<slug>.json` (loaded via `loadCustomMeasure`)

### Patient creation from templates

New patients are created by copying template files from `data/shared/templates/md/` and substituting placeholders:

**Template files (always present):**
- `data/shared/templates/md/profile.json` — `{{PATIENT_ID}}`, `{{PATIENT_NAME}}`, `{{AGE_RANGE}}`, `{{GENDER}}`, `{{CREATED_AT}}`
- `data/shared/templates/md/consent.json` — `{{CREATED_AT}}`
- `data/shared/templates/md/clinical-background.md` — default placeholder markdown
- `data/shared/templates/md/clinical-summary.md` — default placeholder markdown

**Template creation:** If these files don't exist in `data/shared/templates/md/`, create them from the reference patient at `data/patients/josoroma-mqn4h6m8` using clean placeholder values (NOT patient-specific data). Templates should be stock starter files — no real patient info.

**Server action (`lib/actions/create-patient.ts`):**
- Accepts `{ name, ageRange?, gender? }` — NOT FormData
- Generates patient ID via `generatePatientId(name)`: sanitized name + base36 timestamp
- Creates patient directory under `data/patients/<id>/`
- Reads each template file, replaces `{{PLACEHOLDER}}` tokens with actual values via `String.replaceAll()`
- Creates empty subdirectories: `invites/`, `results/`, `results-deleted/`, `sessions/`, `sessions-deleted/`, `notes/`, `notes-deleted/`
- Returns the validated `Patient` object

**Dialog (`app/(dashboard)/_components/create-patient-dialog.tsx`):**
- Only fields: Name (required), Age Range, Gender — NO clinical background textarea
- Uses controlled `useState` inputs, calls `createPatient({ name, ageRange, gender })` directly
- On success: resets form, closes dialog, calls `router.refresh()`
- Clinical background markdown comes from the template, not user input

## MDX Editor dark theming

The `@mdxeditor/editor` package uses CSS modules with hashed class names. Direct Tailwind classes on the editor do NOT work.

### Critical class name patterns

MDX Editor v2 uses patterns like `_contentEditable_f3hmk_379`, `_toolbar_f3hmk_208`, `_codeMirrorWrapper_f3hmk_391`, etc. Hash suffix varies by build.

**CSS targeting strategy:** Use `[class*="_prefix"]` attribute selectors — never rely on exact class names:

```css
.mdx-dark-editor [class*="_contentEditable"] { ... }
.mdx-dark-editor [class*="_toolbar"] { ... }
.mdx-dark-editor [class*="_codeMirrorWrapper"] { ... }
```

### Portal-rendered popups

MDX Editor renders dropdowns/selects in React portals (outside the editor's DOM tree). The `.mdx-dark-editor` parent selector won't reach them.

**Fix:** Use GLOBAL selectors (no parent scope) for popup elements:
```css
[class*="_selectContent_"],
[class*="_popupContainer_"],
[role="listbox"] { ... }
```

### In-component `<style>` tags — limited use

Embedded `<style>` tags CAN work if placed directly in the component that renders the MDX Editor (not a parent wrapper), but global CSS (`globals.css`) is more reliable and preferred. Embedded styles were confirmed to load with the component and target the right elements, but global CSS is the primary recommended approach.

### Universal `*` selector + `[data-lexical-text]` for text visibility

The MDX Editor uses Lexical internally, which wraps text in `<span data-lexical-text="true">`. These spans are rendered deep inside the ProseMirror contentEditable and may not inherit the parent color. Use BOTH a universal `*` selector AND the explicit attribute selector:

```css
.mdxeditor-rich-text-editor * { color: oklch(0.95 0.005 260) !important; }
[data-lexical-text="true"] { color: oklch(0.95 0.005 260) !important; }
```

The `[data-lexical-text]` selector MUST be global (no parent scope) — it resolves cases
where the `*` wildcard is overridden by more specific Lexical internal styles.

### Active block, focused, and selected element backgrounds

The MDX Editor shows a white/light background on active blocks (current heading), focused
elements, and selected text ranges. Override ALL of these with dark backgrounds:

```css
[class*="_activeBlock"] { background: oklch(0.17 0.015 260) !important; }
[class*="focused"], [class*="selected"] { background: oklch(0.17 0.015 260) !important; }
.mdxeditor-rich-text-editor [class*="_blockTypeSelect"] { background: oklch(0.17 0.015 260) !important; }
```

These must also be global (no parent scope) or applied via in-component `<style>` tags
directly in the editor component. The `_activeBlock` class appears on the currently-selected
heading/paragraph wrapper. The `focused`/`selected` classes appear on inline selection ranges.

### Active block and selected element backgrounds

The MDX Editor shows a white/light background on active blocks (current heading), focused elements, and selected text. Override all of these:

```css
[class*="_activeBlock"] { background: oklch(0.17 0.015 260) !important; }
[class*="focused"], [class*="selected"] { background: oklch(0.17 0.015 260) !important; }
.mdxeditor-rich-text-editor [class*="_blockTypeSelect"] { background: oklch(0.17 0.015 260) !important; }
```

### Combobox trigger styling

The BlockTypeSelect trigger button is NOT in a portal — it's inside the editor's toolbar DOM. The MDX Editor uses a `<button>` with class `_selectTrigger_XXXXX` and `role="combobox"`. The MDX Editor's internal CSS often overrides even `!important` rules backed by `[class*="_toolbar"]` scoping.

**Fix:** Use global `[role="combobox"]` and `[aria-haspopup="listbox"]` selectors (no parent scoping), AND explicitly target the `_selectTrigger` class:
```css
[role="combobox"] { background: oklch(0.17 0.015 260) !important; color: var(--foreground) !important; }
[role="combobox"] * { color: var(--foreground) !important; background: transparent !important; }
[aria-haspopup="listbox"] { background: oklch(0.17 0.015 260) !important; color: var(--foreground) !important; }
.mdx-dark-editor [class*="_toolbar"] [class*="_selectTrigger"] { color: oklch(0.9 0.005 260) !important; background: oklch(0.17 0.015 260) !important; }
```

**Key insight:** The combobox trigger is inside the toolbar DOM (not a portal), but its internal `<span>` and `<svg>` children inherit white backgrounds from MDX Editor defaults. `[role="combobox"] *` with `background: transparent` is essential to override child-level backgrounds. The `[class*="_selectTrigger"]` selector is the most specific way to target the actual trigger button element.

### CodeMirror inside code blocks

When `codeMirrorPlugin` is active (required for code blocks with `codeBlockPlugin`):
- Editor wrapper: `[class*="_codeMirrorWrapper"]`
- Toolbar: `[class*="_codeMirrorToolbar"]`
- Content: `.cm-editor .cm-content`, `.cm-editor .cm-line`
- Gutters: `.cm-editor .cm-gutters`, `.cm-editor .cm-gutterElement`
- Syntax: `.cm-editor .ͼ1.cm-keyword`, `.ͼ1.cm-string`, etc.

### codeBlockPlugin pitfall

`codeBlockPlugin({ defaultCodeBlockLanguage: "txt" })` throws `"No CodeBlockEditor registered for language=txt"` if `codeMirrorPlugin` doesn't have "txt" in its `codeBlockLanguages` map. Either:
- Use `codeBlockPlugin({ defaultCodeBlockLanguage: "" })` with `codeMirrorPlugin({ codeBlockLanguages: { "": "Plain Text", ... } })`
- Or omit `defaultCodeBlockLanguage` entirely

### `export type` in `"use server"` files causes runtime crash

Do NOT add `export type { SomeType }` at the bottom of `"use server"` action files. Next.js's server action bundler can choke on it, producing a runtime error like `ReferenceError: ClinicalFileType is not defined` even though TypeScript erases types at compile time.

✅ Keep the `type` alias at module scope (non-exported) — consumers can still `import type` it.
❌ Do NOT add `export type { ... }` in `"use server"` modules.

### Simple markdown constraint for AI-generated clinical content

All AI-generated clinical markdown files (care-plan.md, clinical-summary.md, clinical-background.md) MUST use only these elements to ensure MDXEditor and react-markdown can render them reliably:

- `##` / `###` headings (no `#`)
- Paragraphs, bullet lists (`-`), numbered lists (`1.`)
- `**bold**` text, `---` horizontal rules

**Forbidden:** HTML tags, tables, code blocks, blockquotes, nested formatting, special Unicode (em dashes → `-`, smart quotes → `"`).

This constraint is enforced in both the API system prompt (`app/api/clinical/generate/route.ts`) and the user-facing prompts (`patient-profile.tsx`). The prompts explicitly state "Use ONLY these markdown elements" and "No HTML, no tables, no special Unicode beyond basic ASCII".

### Editor SSR

The MDX Editor cannot be server-rendered — it causes hydration mismatches on toolbar buttons (UndoRedo disabled state, aria-label attributes differ). The server renders `aria-label="Undo %Z"` while the client renders `aria-label="Undo Ctrl+Z"`, producing a `Recoverable Error: Hydration failed` overlay in dev mode.

**Fix:** Wrap in a client component with `dynamic(..., { ssr: false })`:
```tsx
// edit-page-client.tsx ("use client")
const EditMarkdownPage = dynamic(
  () => import("./edit-page").then(m => ({ default: m.EditMarkdownPage })),
  { ssr: false }
);
```

**IMPORTANT:** `dynamic(..., { ssr: false })` throws in Server Components. The dynamic call MUST be in a `"use client"` wrapper component.

**CRITICAL PITFALL — `dynamic()` drops server-component props:** `next/dynamic`'s SSR-off serialization silently drops props passed from server components. If the edit page receives content loaded from disk (e.g., `initialContent` from `readClinicalFile()`), the MDX editor will render **empty** — toolbar visible, content area blank (`<p><br></p>`), no console errors, file exists on disk. This is a Next.js `dynamic()` bug, not a React bug.

**Fix for prop-dropping:** Do NOT rely on props from server components. Load content client-side via server action in the dynamically-loaded component:

```tsx
// Inside edit-page.tsx (loaded via dynamic)
const [markdown, setMarkdown] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;
  readClinicalFile(patientId, fileType).then((text) => {
    if (!cancelled) {
      setMarkdown(text ?? "");
      requestAnimationFrame(() => { mountedRef.current = true; });
    }
  });
  return () => { cancelled = true; };
}, [patientId, fileType]);

return markdown !== null ? <MDXEditor markdown={markdown} ... /> : <Loading/>;
```

This keeps `dynamic()` for SSR safety while bypassing the prop bug.

**All MDX Editor instances must have this wrapper.** Every page that renders an `<MDXEditor>` needs its own `edit-page-client.tsx` wrapper.

| Edit page | Editor component | Client wrapper |
|---|---|---|
| Clinical Summary / Background | `app/patients/[id]/edit/[fileType]/_components/edit-page.tsx` | `edit-page-client.tsx` (same dir) |
| Session / Note edit | `app/patients/[id]/sessions/[itemId]/edit/_components/edit-page.tsx` | `edit-page-client.tsx` (same dir) |

**Pitfall — forgetting the wrapper on a new MDX Editor page:** If you add a new route that uses `<MDXEditor>`, you MUST create a corresponding `edit-page-client.tsx` wrapper. The server page (`page.tsx`) imports the wrapper, not the editor directly. A missing wrapper produces the hydration error above — the page loads but shows a red error overlay. If you see `aria-label="Undo %Z"` vs `aria-label="Undo Ctrl+Z"` in the error, the wrapper is missing.

### Editor onChange during mount

MDX Editor v4 calls `onChange` during initialization (markdown → Lexical AST parsing/normalization). This happens after mount but before user interaction. If `mountedRef.current` is `true` at that point, `onChange` will call `setMarkdown(v)` with whatever normalized value the parser produces, potentially overwriting or clearing the loaded content.

**Fix:** Delay `mountedRef.current = true` by one animation frame so init-time `onChange` calls are silently ignored:

```tsx
const mountedRef = useRef(false);

useEffect(() => {
  const id = requestAnimationFrame(() => { mountedRef.current = true; });
  return () => { mountedRef.current = false; cancelAnimationFrame(id); };
}, []);

<MDXEditor onChange={(v) => { if (mountedRef.current) setMarkdown(v); }} />
```

**DO NOT use the simpler pattern** — it enables the init-time overwrite:
```tsx
// ❌ WRONG — enables init-time onChange to overwrite content
useEffect(() => { mountedRef.current = true; }, []);
```

## Hydration error patterns

### useHydrateAtoms vs useSetAtom+useEffect

`useHydrateAtoms` from `jotai/utils` sets atom values **synchronously during render**. This
triggers React's \"Cannot update a component while rendering a different component\" error
when any component reading the atom (e.g. AppNav) re-renders as a result.

**Fix:** Use `useEffect` + `useSetAtom` instead — deferred to after mount, no
cross-component render conflict:

```tsx
// ❌ WRONG — causes cross-component setState error
useHydrateAtoms([[activePatientIdAtom, patientId]]);

// ✅ RIGHT — deferred to after mount
const setActivePatient = useSetAtom(activePatientIdAtom);
useEffect(() => {
  setActivePatient(patientId);
}, [patientId, setActivePatient]);
```

This applies to ALL patient sub-page clients (results, assessments, view, edit,
result detail). The layout (app/patients/[id]/layout.tsx) uses `useHydrateAtoms`
in `PatientLayoutClient` — this is the ONLY safe place because AppNav doesn't
read the atom during the layout's render pass (it only reads it in its own
component subtree). For child clients loaded within the layout's children
slot, use `useEffect`+`useSetAtom`.

### atomWithStorage vs seed data mismatch

`atomWithStorage("hermes-results", SEED_RESULTS)` renders seed data on server but localStorage on client. If localStorage differs (e.g., after edits), badge counts mismatch.

**Fix:** `suppressHydrationWarning` on affected elements.

### useSearchParams() in client components

`useSearchParams()` returns null on server but actual params on client, causing hydration mismatch when `?tab=results` is in the URL.

**Fix (for tab state):** Read from atom for initial render (consistent server+client), sync URL in `useEffect` post-mount.

### activePatientIdAtom timing

Setting `activePatientIdAtom` in `useEffect` means derived atoms (`scopedResultsAtom`) return `[]` on first render, causing badge counts of 0.

**Fix:** Use `useHydrateAtoms([[activePatientIdAtom, patientId]])` from `jotai/utils` to set the atom BEFORE first render.

## Component patterns

### Semantic UI class conventions

All page sections and Card components carry semantic CSS classes for UI zone identification. These have **no styling** — they are hooks for debugging, targeting, or future CSS rules.

| Class | Meaning | Where to use |
|---|---|---|
| `ui-header` | Top-level header area | Page titles, gradient covers, back-button rows, nav bar, create-invite wrapper |
| `ui-content-section` | Content grouping section | Patient table section, assessment grid, clinical items header, section headings |
| `ui-content-card` | Individual Card component | Every `<Card>` — results, invites, editor metadata, clinical summaries, consent, etc. |
| `ui-content-page` | Page-level content wrapper | Form wrappers, detail page containers, editor inline sections |
| `ui-bottom` | Bottom-of-section element | Submit buttons, deleted-item toggle buttons |

**Nesting convention:**
- Pages flow: `ui-header` → `ui-content-section` → `ui-content-card` → `ui-bottom`
- A page may have multiple `ui-content-section` blocks
- Every `<Card>` gets `ui-content-card`

**Subsection naming (required for ui-header, ui-content-section, ui-content-page, ui-bottom):**

Every element with one of these base classes MUST also carry a subsection-qualified variant: `ui-header-dashboard`, `ui-content-section-patients`, `ui-bottom-deleted-results`, etc. Cards (`ui-content-card`) are the EXCEPTION — they stay just `ui-content-card` without a subsection suffix.

The most specific class is shown by the debug overlay. Use kebab-case subsection names derived from page or purpose:

| Page | Header | Section | Bottom |
|---|---|---|---|
| Dashboard | `ui-header-dashboard` | `-patients`, `-custom-assessments`, `-available-assessments` | — |
| Patient profile | `ui-header-patient` | `-sessions`, `-notes` (via ClinicalItemsSection) | `-deleted-sessions`, `-deleted-notes` |
| Assessments page | `ui-header-create-invite` | `-assessments` | — |
| Results page | — | `-results` | `-deleted-results` |
| Result detail | `ui-header-result-detail` | — | — |
| Editor | `ui-header-editor` | — | — |
| Assessment form | `ui-header-assessment-form` | — | `ui-bottom-submit-assessment` |
| Session/Note view | `ui-header-view-item` | — | — |
| Session/Note edit | `ui-header-edit-item` | — | — |
| Clinical view | `ui-header-view-clinical` | — | — |
| Clinical edit | `ui-header-edit-clinical` | — | — |
| Top nav | `ui-header-nav` | — | — |

**Adding these classes across a large codebase:**
1. Batch-read all component files to identify structural patterns
2. Map each visual zone (header, card, section, bottom) to its semantic class
3. Use `replace_all` mode for repeated patterns (e.g., all `<Card>` → `<Card className="ui-content-card">`)
4. Use unique-context patches for one-off elements (specific headers, containers)
5. Run `typecheck` + `lint` after all edits; verify no malformed elements were created

**Pitfall:** Using `patch` `old_string` that matches `<Card>` (bare, no className) will match across many files — always narrow by including surrounding context or use `replace_all` only within a single file. When a patch produces a malformed element (e.g., double `<div><div className="...">`), re-read the affected area and apply a corrected patch using the exact current text.

### UI labels debug overlay

A checkbox in the navbar ("UI Labels") toggles colored position-absolute labels on every `ui-*` element for visual debugging. See `references/ui-labels-overlay.md` for the full implementation, color mapping, label lifecycle, and pitfalls (scroll binding, position restoration).

### Inline editing card

Pattern used by DemographicsCard and ConsentCard:
- Read from file via server action in `useEffect`
- Toggle between read view (Badge + text) and edit view (Select + Input fields)
- Save calls server action, updates local state, shows toast
- Patient ID is always read-only

### Full-page nested route editing

Pattern for markdown files (Clinical Summary, Clinical Background):
- Card component (`EditableMarkdownCard`) shows summary with Edit button
- Edit navigates to `/patients/[id]/edit/[fileType]`
- Edit page is a full-screen MDX Editor with Save/Back buttons
- Server page loads file content, passes as prop to client editor
- Save writes file via server action, redirects back to patient profile

### Server-only vs client-safe data modules

All filesystem operations (`fs`, `path`) must be isolated in server-only modules:
- `lib/data/patients.ts` — client-safe (seed data only)
- `lib/data/patients-server.ts` — server-only (filesystem scanning, imports `"server-only"`)
- `lib/actions/*.ts` — server actions (marked `"use server"`)

**Pitfall:** Importing `fs` in `patients.ts` causes `Module not found: Can't resolve 'fs'` in client bundles because `_repository.ts` → `profile-tabs.tsx` transitively imports `patients.ts`.

## Patient layout with shared header

All patient sub-pages (Profile, Assessments, Results, Sessions, Notes, and their nested
routes) share a common patient header via `app/patients/[id]/layout.tsx`. The layout:

1. **`layout.tsx` (server)** — loads patient via `getPatientById`, passes to client
2. **`PatientLayoutClient` (client)** — hydrates `activePatientIdAtom` via `useHydrateAtoms`,
   renders `PatientHeader` with editable demographics, wraps `{children}`
3. **Child pages** — omit their own `useHydrateAtoms` and wrapper divs (layout handles both)

The header shows patient name, ID, age range, gender. Edit button toggles inline form
fields (Name input, Age Range/Gender selects) with Save/Cancel. Demographics persist to
`data/patients/<id>/profile.json` via `saveDemographics`.

### Patient header dynamic Agent URL

The `PatientHeader` component uses `usePathname()` to detect which sub-page the user is on and constructs the correct Agent chat link URL dynamically:

```tsx
import { usePathname } from "next/navigation";

const pathname = usePathname();
const agentHref = (() => {
  if (pathname.endsWith("/assessments"))
    return `/agent?assessments&patientId=${patientId}`;
  if (pathname.endsWith("/results") || pathname.includes("/results/"))
    return `/agent?results&patientId=${patientId}`;
  if (pathname.endsWith("/sessions") || pathname.includes("/sessions/"))
    return `/agent?sessions&patientId=${patientId}`;
  if (pathname.endsWith("/notes") || pathname.includes("/notes/"))
    return `/agent?notes&patientId=${patientId}`;
  return `/agent?profile&patientId=${patientId}`;
})();
```

The `includes("/results/")` etc. handles nested routes like `/patients/<id>/results/<resultId>`. The fallback is `?profile` for the main patient page. **Never hardcode a single query param** — each sub-page needs its own context so the chat back button resolves correctly.

## Clinical items: Sessions & Notes

Sessions and Notes use a shared `ClinicalItemsSection` component parameterized by `type`.
Each item is a JSON file with `{ id, type, title, content, createdAt, updatedAt }`.

**File locations:**
- `data/patients/<id>/sessions/<ts>-<id>.json`
- `data/patients/<id>/sessions-deleted/deleted-<ts>-<original>.json`
- `data/patients/<id>/notes/<ts>-<id>.json`
- `data/patients/<id>/notes-deleted/deleted-<ts>-<original>.json`

**Server actions:** `lib/actions/clinical-notes.ts`
- `createClinicalItem(patientId, type)` — loads template from `data/shared/templates/md/<type>-template.json`
- `listClinicalItems(patientId, type)` / `listDeletedClinicalItems`
- `readClinicalItem(patientId, type, itemId)`
- `saveClinicalItem(patientId, item)` — overwrites file in-place
- `deleteClinicalItem(patientId, type, itemId)` — moves to `*-deleted/`

**Routes:**
- List: `/patients/[id]/sessions`, `/patients/[id]/notes`
- View: `/patients/[id]/sessions/[itemId]/view`, `/patients/[id]/notes/[itemId]/view`
- Edit: `/patients/[id]/sessions/[itemId]/edit`, `/patients/[id]/notes/[itemId]/edit`

**MDX Editor:** Reuses the same editor pattern as Clinical Summary — `MDXEditor` with
toolbar, dark theme CSS (`_contentEditable`, `_toolbar`, `_activeBlock` selectors),
`mountedRef` guard, title input, Save/Cancel buttons. Editor is wrapped in
`h-[calc(100vh-12rem)]` to fill available space within the patient layout.

**Deleted items:** Expandable section below the active list, loaded via `listDeletedClinicalItems`,
showing title + creation date. Not permanently deleted — always recoverable.

### Session appointment dates

When creating a new session (not a note), a date/time picker dialog appears before the
session is actually created. This captures the appointment date in `yyyy-mm-dd hh:mm` format.

**Server action** (`createClinicalItem`): accepts optional `appointmentDate?: string` param.
When provided and type is `"session"`, writes a companion file:

```
data/patients/<id>/sessions/<ts>-<id>.json              # Session data
data/patients/<id>/sessions/<ts>-<id>.appointment.json  # { "appointmentDate": "yyyy-mm-dd hh:mm" }
```

**Dialog** (in `ClinicalItemsSection`):
- Opens when creating a session, defaults date/time to now
- Date picker (`type="date"`) + Time picker (`type="time"`) in a 2-column grid
- "Skip" button creates the session without an appointment date
- "Create Session" button creates the session + appointment companion file
- Notes are unaffected — the dialog only appears for `type === "session"`

State pattern:
```tsx
const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
const [appointmentDate, setAppointmentDate] = useState("");
const [appointmentTime, setAppointmentTime] = useState("");

// On "New Session" click:
if (type === "session") {
  const now = new Date();
  setAppointmentDate(now.toISOString().slice(0, 10));
  setAppointmentTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  setShowAppointmentDialog(true);
  return;
}
```

The appointment file uses the same base filename as the session so they stay paired
through renames. The `.appointment.json` suffix distinguishes it from the session data.

**Pitfall — companion files break list operations:** The `listClinicalItems()`, `listDeletedClinicalItems()`,
`readClinicalItem()`, `saveClinicalItem()`, and `deleteClinicalItem()` functions all scan the
sessions directory with `.filter((f) => f.endsWith(".json"))`. The `.appointment.json` companion
files match this filter. When parsed, they lack `id`, `type`, `title`, `content`, and `createdAt`
fields, causing `.sort((a, b) => b.createdAt.localeCompare(a.createdAt))` to crash
(`Cannot read properties of undefined (reading 'localeCompare')`). The entire sessions list
renders as "Loading…" permanently.

**Fix:** Add an `isItemFile()` helper that excludes `.appointment.json` files:
```ts
function isItemFile(f: string): boolean {
  return f.endsWith(".json") && !f.endsWith(".appointment.json");
}
```
Use `isItemFile` instead of `.filter((f) => f.endsWith(".json"))` in ALL functions that
read the sessions directory. Also, `deleteClinicalItem()` should move the companion
`.appointment.json` alongside the session file (or it becomes an orphan).

Custom assessments live in `data/shared/assessments/<slug>.json` and are loaded
alongside the 68 DSM-5-TR template measures. They appear in the **Custom Assessments**
section on the dashboard (above Available Assessments).

**Loading:** `lib/data/custom-assessments.ts` — `loadCustomMeasure(slug)` reads and
validates against `measureSchema`. `listCustomAssessments()` from `measures.ts` returns
`MeasureSummary[]` for the dashboard cards.

**Editor:** `app/editor/[slug]/page.tsx` checks template measures first, falls back to
`loadCustomMeasure(slug)`. `MetadataForm` accepts `measure: Measure | null` prop to
display full metadata (title, description, version, fields count, instructions).

**AI generation:** The Create With AI button calls `POST /api/assessments/generate`\nwhich creates a Hermes agent run via `POST /v1/runs` and polls for completion.\nThe agent writes the assessment JSON directly to `data/shared/assessments/<slug>.json`\nusing a `terminal` Python one-liner (the API-triggered agent does NOT have `write_file`).\nThe route handler reads back the file, validates against `measureSchema`, and returns the result.\n\n**Deletion:** Custom assessments show a delete button (Trash2 icon) on hover in the bottom-right\ncorner of their dashboard card. The button appears via `opacity-0 group-hover/card:opacity-100`\non a wrapping `<div className=\"relative group/card\">` around the card and Link. Clicking opens\na confirmation dialog (`<Dialog>`) asking to confirm permanent deletion. On confirm,\n`deleteCustomAssessment(slug)` from `lib/actions/assessment-files.ts` unlinks the JSON file\nand calls `revalidatePath(\"/\")` + `router.refresh()`. Built-in DSM-5-TR measures do NOT get\nthe delete button — only assessments in the Custom Assessments section have it.\n\n**Delete server action (`lib/actions/assessment-files.ts`):**\n```ts\n\"use server\";\nexport async function deleteCustomAssessment(slug: string) {\n  const filePath = path.join(process.cwd(), \"data/shared/assessments\", `${slug}.json`);\n  if (!fs.existsSync(filePath)) return { success: false, error: \"Not found.\" };\n  fs.unlinkSync(filePath);\n  revalidatePath(\"/\");\n  return { success: true };\n}\n```

Start the gateway with `make hermes-gateway`. Test with `make hermes-gateway-curl-test`.
See `references/hermes-api-server.md` for full API details, `HERMES_HOME` requirements,
agent tool availability, schema validation pitfalls, and common fixes.
See `README-CREATE-WITH-AI.md` for end-to-end setup: prerequisites, architecture diagram,
step-by-step run instructions, troubleshooting table, and env vars reference.

### Custom assessments integration points

When adding or changing the custom assessments pipeline, all of these need updating:

| Layer | File | What |
|-------|------|------|
| Generate | `app/api/assessments/generate/route.ts` | Writes to `data/shared/assessments/<slug>.json` |
| Dashboard list | `lib/data/measures.ts` → `listCustomAssessments()` | Reads filesystem for dashboard cards |
| Editor loader | `app/editor/[slug]/page.tsx` | Falls back to `loadCustomMeasure(slug)` |
| Invite dropdown | `app/patients/[id]/assessments/page.tsx` → `create-invite.tsx` | Must pass `customSlugs` from server |
| Form loader | `app/a/[token]/_actions.ts` → `loadMeasure()` | Must check `data/shared/assessments/` too |
| Display names | `lib/data/measure-meta.ts` → `getMeasureTitle()` | Only knows template index; custom slugs fall through to `?? slug` |
| Delete | `lib/actions/assessment-files.ts` → `deleteCustomAssessment(slug)` | Server action: unlinks `data/shared/assessments/<slug>.json`, revalidates `/` |

**Rule:** Custom assessments NEVER touch `data/shared/templates/index.json`. Create With AI and
`listCustomAssessments()` are filesystem-only on `data/shared/assessments/`.

## Recharts chart components — all types

All assessment charts use shared Recharts components from `components/charts/`. Never hand-roll SVGs, divs, or inline charting code. Import from `@/components/charts`.

**Available chart types (15 total):**

| Chart type | Component | Use case |
|---|---|---|
| `severity_bar` | `SeverityBarChart` | DSM-5-TR severity bands + score indicator (stacked) |
| `t_score_gauge` | `TScoreGaugeChart` | PROMIS T-score with ReferenceLine at T=50 |
| `domain_bars` | `DomainBarsChart` | Multi-domain max scores (Level 1 cross-cutting) |
| `trend_line` | (not yet implemented) | Repeat administrations over time |
| `none` | — | Free-text / no chart |
| `radar_chart` | `RadarChartView` | Multi-axis readiness spider |
| `bar_chart` | `VerticalBarChartView` | Factor comparison vertical bars |
| `radial_bar_chart` | `RadialBarChartView` | Circular progress rings |
| `composed_chart` | `ComposedChartView` | Bars + dashed average line |
| `pie_chart` | `PieChartView` | Donut with need distribution |
| `line_chart` | `LineChartView` | Dimension profile line |
| `area_chart` | `AreaChartView` | Filled readiness coverage |
| `scatter_chart` | `ScatterChartView` | Needs vs capacity scatter points |
| `funnel_chart` | `FunnelChartView` | Support levels / process stages funnel |
| `sunburst_chart` | `SunburstChartView` | Hierarchical process stages rings |

**Shared helpers** in `components/charts/`:
- `severityColors`, `severityBadgeVariant`, `computeSeverityBands`, `computeDomainScores`, `resolveValueLabel` — from `chart-helpers.ts`
- `extractFieldScores`, `extractFieldLabels` — from `field-score-helpers.ts` (used by all new chart types)

**Chart type dispatch:** `ResultChartType` enum in `lib/domain/_enums.ts` drives which chart renders. The `ResultChart` dispatcher (in `result-detail.tsx`) and `ChartPreview` (in `editor-page.tsx`) use a switch on `chartType`.

**Adding a new chart type:**
1. Add enum value to `ResultChartType` in `lib/domain/_enums.ts`
2. Create component in `components/charts/<name>.tsx`
3. Export from `components/charts/index.ts`
4. Add case to `ResultChart` dispatcher in `result-detail.tsx`
5. Add case to `ChartPreview` in `editor-page.tsx`

### Stacked bar tooltip pitfall

When using Recharts stacked `Bar` with `ChartTooltipContent` from shadcn, the tooltip shows ALL stacked segments with their raw dataKey values — not useful for severity charts where you want to show the actual score, not segment widths. **Fix:** Use a custom tooltip component (see `SeverityTooltip` in `severity-bar-chart.tsx`).

### chartType resolution for custom assessments

Custom assessments (`data/shared/assessments/*.json`) are NOT in `data/shared/templates/index.json`. `getMeasureMeta()` won't find them. Always prefer `measure.resultChart` over `meta?.resultChart`:

```tsx
// ✅ RIGHT — works for both corpus and custom assessments
const chartType = measure?.resultChart ?? meta?.resultChart ?? "severity_bar";

// ❌ WRONG — custom assessments will always fall through to severity_bar
const chartType = meta?.resultChart ?? "severity_bar";
```

The `@mdxeditor/editor` package has these commonly needed exports (verify before use):
- `BlockTypeSelect` ✓
- `ListsToggle` ✓ (toggle group: bulleted, numbered, checklist)
- `InsertUnorderedList` ✗ (does NOT exist — use `ListsToggle`)
- `InsertOrderedList` ✗ (does NOT exist — use `ListsToggle`)
- `InsertTable` ✓
- `codeMirrorPlugin` ✓
- `StrikeThroughSupSubToggles` ✓

To hide checklist from `ListsToggle`: CSS `[class*="_toolbar"] [role="radiogroup"] > :nth-child(3) { display: none }`

## Agent integration pattern (wiring Hermes to UI buttons)

To call a Hermes agent from a Next.js UI button, follow this pattern (used by Create With AI):

1. **Create an API route** at `app/api/agent/run/route.ts` that calls `POST /v1/runs` on the Hermes gateway (:8642) and polls `GET /v1/runs/{id}` until `status: "completed"`
2. **Call from a client component** via `fetch("/api/agent/run", { method: "POST", body: JSON.stringify({ input, instructions }) })`
3. **Render the output** via `react-markdown` or save to file via server action
4. **Show a loading state** while polling (3s intervals, ~5min timeout)

## Agent chat page (`/agent`)

The Agent button on the dashboard navigates to a **dedicated full-route chat page** at `/agent` (NOT a modal dialog). The page uses a chat-bubble interface with markdown rendering.

### Chat API endpoint (`POST /api/agent/chat`)

Uses the **Hermes gateway streaming chat completions** endpoint — NEVER calls OpenRouter directly.

```ts
// ✅ RIGHT — Hermes gateway via API server
const HERMES_API = process.env.HERMES_API_SERVER_URL ?? "http://127.0.0.1:8642";
const HERMES_KEY = process.env.API_SERVER_KEY ?? "change-me-local-dev";
const res = await fetch(`${HERMES_API}/v1/chat/completions`, {
  headers: { Authorization: `Bearer ${HERMES_KEY}` },
  body: JSON.stringify({ model: MODEL, messages, stream: true, max_tokens: 4096 }),
});
```

```ts
// ❌ WRONG — OpenRouter directly (will get 401 if no OPENROUTER_API_KEY set)
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const res = await fetch(OPENROUTER_URL, {
  headers: { Authorization: `Bearer ${OPENROUTER_KEY}` },
});
```

**Pitfall:** All three Hermes API routes (`/api/agent/chat`, `/api/agent/run`, `/api/assessments/generate`) must use the same Hermes gateway base URL and `API_SERVER_KEY` auth. Never mix OpenRouter in one route and the gateway in another. The gateway proxies model calls internally — the app never calls providers directly.

Key implementation details:
- **Streaming** — uses `ReadableStream` to pipe SSE chunks from the gateway to the client
- Response format: `data: {"type":"token","content":"..."}`, `data: {"type":"thinking","content":"..."}`, `data: {"type":"done"}`
- Messages include a system prompt (`SYSTEM_PROMPT` constant) with DSM-5-TR domain knowledge
- Auth: `Bearer ${API_SERVER_KEY}` header, matching the other Hermes routes
- Timeout: 300s via `AbortSignal.timeout`
- Responses rendered with `react-markdown` in the chat bubble

### Chat page component (`app/agent/_components/agent-chat.tsx`)

Features:
- Chat bubbles with user/assistant avatars (Bot icon for assistant, "U" initial for user)
- Loading state shows spinner + "Thinking…" in a styled bubble
- Error state shows red bubble with error message
- Empty state shows Bot icon + helper text
- Input: `Textarea` (shadcn) in a glass-panel footer, Enter to send, Shift+Enter for newline
- Auto-scroll to bottom on new messages/loading
- Back button (ArrowLeft) navigating to `/` (dashboard)
- **No select options, no prompt picker** — just type and send

### Navigation

The "Agent" button on every page is now a simple `<Link href="/agent?...">` (not a dialog trigger) with **context-specifying query params** that tell the chat page where to return. No more `AgentModal` import, no more `ALL_PROMPTS` import, no more select dropdowns.

**Link hrefs with query params:**
```tsx
// Dashboard
<Link href="/agent?dashboard" ...>Agent</Link>

// Patient profile
<Link href={`/agent?profile&patientId=${patientId}`} ...>Agent</Link>

// Editor
<Link href={`/agent?editor&slug=${slug}`} ...>Agent</Link>

// Result detail
<Link href={`/agent?result&patientId=${result.patientId}&resultId=${result.resultId}`} ...>Agent</Link>
```

**Back button URL resolution** (in `app/agent/_components/agent-chat.tsx`):
The `backHref` is derived from query params via `useMemo`:
- `?dashboard` → `/` (dashboard)
- `?profile&patientId=<id>` → `/patients/<id>` (profile)
- `?assessments&patientId=<id>` → `/patients/<id>/assessments`
- `?results&patientId=<id>` → `/patients/<id>/results`
- `?sessions&patientId=<id>` → `/patients/<id>/sessions`
- `?notes&patientId=<id>` → `/patients/<id>/notes`
- `?editor&slug=<slug>` → `/editor/<slug>`
- `?result&patientId=<id>&resultId=<rid>` → `/patients/<id>/results/<rid>`
- Default (no recognized param) → `/`

The Agent page wraps `<AgentChat />` in `<Suspense>` because it uses `useSearchParams()`.

**Pitfall:** When replacing a component pattern across a codebase, ALWAYS search comprehensively FIRST (`search_files` for the component name) before implementing. The AgentModal was used in 4 files — replacing only the dashboard required a user correction to finish the job.

### Prompt-inject buttons (above textarea)

The agent chat page has four emerald-themed quick-inject buttons above the textarea
for common clinical workflows. All inject pre-written prompts into the textarea so the
practitioner can review/edit before sending. Patient ID is interpolated from query params.

**Button 1: "Care Plan"** — injects an audit prompt (NOT a generate prompt):
```ts
const injectCarePlanPrompt = () => {
  const pid = searchParams.get("patientId")
  setInput(
    `Audit the existing care plans for patient ${pid ?? "the current patient"}. Do not draft a new care plan from scratch. Evaluate the current care plans against the patient's assessment results, treatment goals, timelines, interventions, medications, safety considerations, and follow-up schedule. Return: overall quality score, strengths, clinical gaps, measurable-goal issues, missing evidence-based interventions, safety concerns, and recommended revisions. Use your mental-health-core and mental-health-care-plan skills.`
  )
  inputRef.current?.focus()
}
```

**Button 2: "Session Note"** — injects an audit prompt for clinical session notes:
```ts
const injectSessionNotePrompt = () => {
  const pid = searchParams.get("patientId")
  setInput(
    `Audit the existing clinical session notes for patient ${pid ?? "the current patient"}. Do not generate new notes from scratch. Evaluate the clinical content of the current notes against the patient's clinical background, assessment results, and care plan. Analyze what the notes reveal about: symptom trajectory, treatment response, intervention effectiveness, medication adherence and side effects, safety status, functional changes, and session-to-session progress. Return: overall quality score, clinical strengths documented, gaps in clinical documentation, symptom trajectory issues, treatment fidelity concerns, safety documentation gaps, and recommended revisions. Use your mental-health-core and mental-health-patient-summary skills.`
  )
  inputRef.current?.focus()
}
```

**Button 3: "Progress Report"** — generates a weekly progress report:
```ts
const injectProgressReportPrompt = () => { ... }
```

**Button 4: "Safety Check"** — runs a safety screening (PHQ-9 item 9, SI/HI, crisis scores):
```ts
const injectSafetyCheckPrompt = () => { ... }
```

**Key principle:** Care Plan and Session Note buttons use AUDIT-oriented prompts that evaluate existing
clinical data against baselines — they do NOT generate new content from scratch. This was a deliberate
change from the original generate-oriented prompts.

**Pitfall — two prompt sources:** The `lib/prompts.ts` `ALL_PROMPTS` array is NO LONGER the source
for agent chat buttons. The quick-inject buttons are hardcoded in `app/agent/_components/agent-chat.tsx`
with `inject*Prompt()` functions. `lib/prompts.ts` is only used by the legacy `AgentModal` component.
When updating a prompt, verify you're editing the right source.

### Agent chat class names for CSS targeting

Elements carry these class names for future CSS rules:

| Class | Element |
|---|---|
| `agent-chat-header` | Header bar (back button + title) |
| `agent-chat-messages` | Messages scroll container |
| `agent-chat-input-area` | Input footer wrapper |
| `agent-chat-prompt-buttons` | Prompt-inject buttons row |
| `agent-chat-textarea` | Chat textarea |

All class names are in addition to the semantic `ui-*` classes. They follow kebab-case
with an `agent-chat-` prefix.

### Prompt construction for agents

- **Instructions**: The system prompt (what the agent IS). Pick the agent YAML's `prompt` field or a bundle's `instruction`.
- **Input**: The user-facing prompt with patient context. Include structured data (JSON results, patient demographics).
- **Model**: `deepseek/deepseek-v4-pro` via the Hermes agent gateway (configured in `.hermes/config.yaml`). The app never calls OpenRouter directly — the gateway proxies all model calls.

### Filesystem tree sidebar (`/agent` page)

The `/agent` chat page includes a left sidebar showing a live filesystem tree. The tree is **context-aware** via Jotai's `activePatientIdAtom`:

- **Dashboard context** (`activePatientId === null`): shows `data/` with `corpus/`, `patients/`, and `shared/` subdirectories, followed by a `.hermes` section with `agents/`, `skill-bundles/`, and `skills/mental-health/` (all 15 skill directories with their SKILL.md and references/)
- **Patient context** (`activePatientId` is set): shows only that patient's folder at `data/patients/<id>/` with all subdirectories (`sessions/`, `notes/`, `results/`, `invites/`, and `*-deleted/` variants)

**Visual distinction:** Data paths use emerald-green folder/file icons. `.hermes` paths use amber/gold icons with a `.hermes` section label (Puzzle icon) between the data and hermes tree sections.

**Architecture (3 files):**

| Layer | File | Purpose |
|-------|------|---------|
| API | `app/api/agent/tree/route.ts` | `GET /api/agent/tree?patientId=<id>` returns `{ tree: TreeNode[] }` — recursively reads filesystem via `fs.readdirSync`. In dashboard mode, also calls `buildHermesTree()` which adds `agents/`, `skill-bundles/`, and `skills/mental-health/` nodes from `.hermes/`. Sorts directories-first then alphabetical. |
| Component | `app/agent/_components/filesystem-tree.tsx` | Client component — fetches tree on mount, renders expandable/collapsible tree with folder/file icons. Splits tree into `dataNodes` (non-hermes paths) and `hermesNodes` (paths starting with `.hermes`). Renders a `.hermes` section header between them. |
| Integration | `app/agent/_components/agent-chat.tsx` | `<aside className="w-56">` on the left, `<FilesystemTree />` inside |

**`.hermes` tree building** (in `buildHermesTree()`):
- `agents/` — lists all `.yaml` files in `.hermes/agents/`
- `skill-bundles/` — lists all `.yaml` files in `.hermes/skill-bundles/`
- `skills/mental-health/` — recursive tree under `.hermes/skills/mental-health/` showing skill directories each with `SKILL.md` and `references/*.md`

**Path filtering:** `isHermesPath(path)` checks `path.startsWith(".hermes")`. The tree nodes from the API use `path` prefixes like `.hermes/agents` and `.hermes/skills/mental-health`.

**Tree node structure:**
```ts
interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}
```

**Key implementation details:**
- API validates `patientId` with `/^[a-zA-Z0-9_-]+$/` regex to prevent path traversal
- Root node is auto-expanded (`depth === 0`); children are collapsed by default
- Uses `ChevronRight`/`ChevronDown` for expand/collapse, `Folder`/`FolderOpen`/`File` icons
- Empty directories show `(empty)` suffix and are not clickable
- Loading state: `Loader2` spinner; error state: red text
- Tree re-fetches when `activePatientId` changes (useEffect dependency)
- eslint `react-hooks/set-state-in-effect` suppression required for loading/error state resets in the fetch effect — this is a valid data-fetching pattern despite the lint rule
- Styled with emerald accents matching `HermesPromptHint` theme

### Prompt construction for agents

1. `assessment-review` → Clinical Summary generation (Patient Profile, currently deterministic stub)
2. `patient-intake` → Clinical Background generation (Patient Profile, currently placeholder markdown)
3. `safety-check` bundle → Safety screening (Results page, not yet implemented)
4. `care-plan` bundle → Treatment plans (Result Detail, not yet implemented)

Full priority list with ready-to-use prompt templates: `docs/HERMES-MENTAL-HEALTH.md` §6.

## Shared prompts library

**NOTE:** As of the `/agent` chat page migration, `lib/prompts.ts` is no longer imported by any page. The prompts and `AgentModal`/`ALL_PROMPTS` still exist in the codebase but are not wired to the UI. The Agent button on every page is a simple `<Link href="/agent">`. If re-wiring prompts to buttons in the future, use the structure below.

**Pitfall — `.data/` vs `data/` prefix in prompt paths:** Prompts that reference filesystem paths (e.g., "Review the catalog files in ...") must use `data/shared/assessments` and `data/shared/templates` — NOT `.data/shared/...` (with a dot prefix). The actual project root directory is `data/`, not `.data/`. A dot-prefixed path will cause the agent to look for a hidden directory that doesn't exist. All 3 prompt locations must match: `lib/prompts.ts`, `app/agent/_components/agent-chat.tsx` (`injectRecommendMeasuresPrompt`), and `app/patients/[id]/_components/assessments-section.tsx` (`HermesPromptHint`). If updating one, update all three.

Prompts used by the Agent modal are centralized in `lib/prompts.ts`:

```ts
// lib/prompts.ts
export interface PromptOption {
  label: string;
  prompt: string;
  agent?: string;
}

export const ALL_PROMPTS: PromptOption[] = [ ... ];
```

Both the dashboard page (`app/(dashboard)/page.tsx`) and editor page (`app/editor/[slug]/_components/editor-page.tsx`) import from here. Adding a new prompt means adding one entry to `ALL_PROMPTS` — all Agent buttons pick it up automatically. **All prompts must be in English** — never Spanish.

### Agent command format

**NOTE:** As of the `/agent` chat page migration, the `AgentModal` component (`app/(dashboard)/_components/agent-modal.tsx`) is NO LONGER used by any page. The shared prompts library (`lib/prompts.ts`) and `AGENT_SKILLS` mapping still exist in the codebase but are not wired to any UI button — the Agent button on all pages is a simple `<Link href="/agent">` with no select options. If re-wiring prompts to buttons in the future, use the format below.

The Hermes agent `/goal` command uses this format:

```
/goal You are a helpful senior Mental Health Practitioner, use [mental-health-core, mental-health-editor] to: <prompt>
```

Key rules:
- Skills are comma+space separated inside `[square brackets]`
- Prefixed with `You are a helpful senior Mental Health Practitioner, use [skills] to:`
- All prompts MUST be in English (not Spanish)
- Skills are mapped from agent bundle names via `AGENT_SKILLS` in `agent-modal.tsx`
- Unknown agents fall back to the agent name as-is

**AGENT_SKILLS mapping** (in `app/(dashboard)/_components/agent-modal.tsx`):

```ts
const AGENT_SKILLS: Record<string, string> = {
  "assessment-review": "mental-health-core,mental-health-assessment-review",
  "patient-intake": "mental-health-core,mental-health-patient-summary",
  "care-plan": "mental-health-core,mental-health-care-plan",
  "patient-session": "mental-health-core,mental-health-patient-summary",
  "patient-progress-weekly": "mental-health-core,mental-health-patient-summary",
  "mental-health-editor": "mental-health-core,mental-health-editor",
  "mental-health-safety": "mental-health-core,mental-health-assessment-review",
};
```

The `formatSkills(agent)` helper adds spaces after commas for display: `"mental-health-core,mental-health-editor"` → `"mental-health-core, mental-health-editor"`. This formatted version is what goes inside the `[brackets]` in the command.

### base-ui Select onValueChange type

The `@base-ui/react/select` `onValueChange` callback signature is `(value: string | null, eventDetails: SelectRootChangeEventDetails) => void`. Always handle `null`:

```tsx
const handleSelect = (value: string | null) => {
  if (!value) return;
  // ...
};
```

This differs from Radix UI Select which passes `string` (never null). The base-ui variant can pass `null` on clear/reset.

To call a Hermes agent from a Next.js UI button, follow this pattern (used by Create With AI):

1. **Gateway must be running**: `make hermes-gateway` (sets `HERMES_HOME=.hermes`, `API_SERVER_ENABLED=true`, `API_SERVER_KEY=change-me-local-dev`)
2. **Create an API route** at `app/api/hermes/run/route.ts` that calls `POST /v1/runs` on :8642 and polls `GET /v1/runs/{id}` every 3s until `status: "completed"`
3. **Call from a client component** via `fetch("/api/hermes/run", { method: "POST", body: JSON.stringify({ input, instructions }) })`
4. **Render the output** via `react-markdown` or save to file via server action (e.g., `saveClinicalFile()`)

### Prompt construction for agents

- **Instructions**: The system prompt (what the agent IS). Use the agent YAML's `prompt` field or a bundle's `instruction`.
- **Input**: The user-facing prompt with patient context. Include structured data (JSON results, demographics) inline — the agent has filesystem access so it can look up files, but explicit data in the prompt improves reliability.
- **Command format**: `/goal You are a helpful senior Mental Health Practitioner, use [skills with spaces] to: <prompt>` — skills are comma+space separated inside square brackets. Mapped from agent bundle names via `AGENT_SKILLS` in `app/(dashboard)/_components/agent-modal.tsx`.
- **Model**: `deepseek/deepseek-v4-pro` via the Hermes agent gateway (configured in `.hermes/config.yaml`). The app never calls OpenRouter directly — the gateway proxies all model calls.

### HermesPromptHint component

`components/hermes-prompt-hint.tsx` — a reusable green callout (collapsible, border-emerald-500/20, bg-emerald-500/3) that shows the ready-to-use agent prompt for a page section. Used across all pages to telegraph AI capabilities.

**Props:**
- `prompt: string` — the exact agent prompt template
- `agent?: string` — which agent/bundle to use (shown below prompt)
- `compact?: boolean` — inline variant with popover tooltip (for headings); default is full-width block

**Close button:** Both variants have a close button (X icon, `lucide-react`). Clicking it sets `expanded = false` — the green box collapses but the trigger button ("AI Prompt" or "Hermes AI Prompt") remains visible and can be clicked again to re-expand.

**Expanded state:** `useState(false)` — controls whether the green prompt box is shown. The trigger button is always visible. Clicking X collapses the box back to the trigger-only state. State is local to the component instance and resets on remount/navigation.

**Compact variant placement pattern (next to section headings):**
```tsx
<div className="flex items-center gap-2">
  <h2 className="text-lg font-medium">Patients</h2>
  <HermesPromptHint compact prompt="..." agent="assessment-review" />
</div>
```

**Full variant placement pattern (below content sections):**
```tsx
<HermesPromptHint
  prompt="Sintetiza todos los resultados..."
  agent="assessment-review"
/>
```

**12 placements across the app (ALL IN ENGLISH):**
| Page | Section | Agent |
|------|---------|-------|
| Dashboard | Patients heading | `assessment-review` |
| Dashboard | Available Assessments heading | `assessment-review` |
| Patient Profile | Clinical Summary card (via `EditableMarkdownCard` hint prop) | `assessment-review` |
| Patient Profile | Clinical Background card (via `EditableMarkdownCard` hint prop) | `patient-intake` |
| Assessments | Below Create Invite | `patient-intake` |
| Results | Below results list | `assessment-review` |
| Result Detail | Below chart | `assessment-review` |
| Result Detail | Bottom of Scores card | `care-plan` |
| Assessment Form | Below Submit button | `assessment-review` |
| Editor | Metadata tab | `mental-health-editor` |
| Sessions | Next to New Session button | `patient-session` |
| Notes | Next to New Note button | `patient-progress-weekly` |

**EditableMarkdownCard hint integration:** The card accepts optional `hint` and `hintAgent` props. When set, a compact `HermesPromptHint` renders in the card header next to the title buttons.

Full agent-to-page mapping with ready-to-use prompt templates, priority ranking, and implementation code: `docs/HERMES-MENTAL-HEALTH.md`.

## References

- `docs/HERMES-MENTAL-HEALTH.md` — Complete architecture: every Next.js page mapped to Hermes agents, bundles, prompts. Priority AI buttons and implementation code.
- `references/agent-file-viewer-editor.md` — Agent chat page file viewer/editor panel: API, component, integration pattern, pitfalls
- `references/mdx-editor-class-names.md` — Actual MDX Editor DOM class names discovered via browser inspection
- `references/hermes-api-server.md` — Hermes API server setup, agent run lifecycle, WebSocket gateway
- `references/recharts-v3-type-quirks.md` — Recharts 3.8.1 TypeScript type pitfalls: LabelFormatter, PieLabel, scatter Tooltip formatter, SunburstData shape
- `references/ui-labels-overlay.md` — UI debug overlay: label injection, scroll binding, cleanup lifecycle, color mapping
- `references/invite-expiration-system.md` — Invite expiration: expiresAt schema, duration selector (1d/1w/1m), renew flow, expired badge
- `references/all-prompts-english.md` — English-only rule for all prompts: HermesPromptHint placements, agent chat pre-fills, verification command
- `references/code-style-refactoring-pitfalls.md` — Bulk sed/perl refactoring on .ts/.tsx files: apostrophe breaks, generics, safe patterns
- `references/screenshot-capture-workflow.md` — macOS Edge browser window screenshot capture: osascript bounds + screencapture -R, scrolling, modal states, pitfalls