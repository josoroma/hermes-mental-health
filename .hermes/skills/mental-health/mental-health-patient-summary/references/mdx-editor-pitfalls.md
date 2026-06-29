# MDX Editor Pitfalls

## Summary

Three critical bugs discovered while implementing AI-generated clinical markdown editing:

1. **`next/dynamic` SSR-off wrapper drops server-component props** — the editor renders empty
2. **MDXEditor v4 `onChange` fires during init** — overwrites loaded content with empty string
3. **`export type` in `"use server"` files causes runtime crash** — `ClinicalFileType is not defined`

Combined, bugs 1+2 make every edit page silently blank even when files exist on disk.

---

## Bug 1: `dynamic(() => import(), { ssr: false })` drops server-component props

### Symptom

Edit page shows toolbar but empty content area. `<p><br></p>` in the DOM. File exists on disk with valid content. RSC payload contains the `initialContent` data (verified via `document.querySelectorAll('script')`). Clinical Background (29 bytes) works, Care Plan (19KB) doesn't — same component, different content size.

### Root Cause

`next/dynamic` with `{ ssr: false }` does NOT reliably pass props from server components through to the dynamically loaded component. The `initialContent` prop (loaded from disk via `readClinicalFile()` server action) is dropped during Next.js's dynamic import serialization.

### Why `dynamic()` is STILL required

Removing `dynamic()` and using a direct import + `useEffect` mount guard causes SSR crashes because `@mdxeditor/editor` references `window`/`document` at module import time — even with the mount guard, the module is evaluated before the component function runs.

### Fix — keep `dynamic()`, load content client-side via server action

```tsx
// edit-page.tsx (loaded via dynamic)
export function EditMarkdownPage({ patientId, fileType, title, initialContent }: Props) {
  // Start null — only render editor after content is loaded
  const [markdown, setMarkdown] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const [saving, setSaving] = useState(false);

  // Load content from file via server action on mount.
  // Do NOT use the initialContent prop — dynamic() drops it.
  useEffect(() => {
    let cancelled = false;
    readClinicalFile(patientId, fileType).then((text) => {
      if (!cancelled) {
        setMarkdown(text ?? "");
        requestAnimationFrame(() => { mountedRef.current = true; });
      }
    });
    return () => { cancelled = true; mountedRef.current = false; };
  }, [patientId, fileType]);

  // Only render MDXEditor after content loads
  return markdown !== null ? (
    <MDXEditor
      key={`${patientId}-${fileType}`}
      markdown={markdown}
      onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
      ...
    />
  ) : (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </div>
  );
}
```

Key points:
- `markdown` starts as `null` → shows loading spinner
- `useEffect` calls `readClinicalFile()` server action (bypasses prop chain entirely)
- On success → `setMarkdown(text)` → re-render with MDXEditor
- `key={`${patientId}-${fileType}`}` ensures fresh mount when switching files
- Works for files of any size (19KB tested)

### Debugging Checklist

1. Check file exists on disk: `ls -la data/patients/<id>/<fileType>.md`
2. Check DOM: `document.querySelector('[contenteditable]')?.innerHTML`
3. Check RSC payload: `document.querySelectorAll('script')` for content
4. Check for errors: DevTools console
5. Compare with working page — Clinical Background (29B) vs Care Plan (19KB)
6. If toolbar shows but content is empty → `dynamic()` dropped props → load via server action

---

## Bug 2: MDXEditor v4 `onChange` fires during initialization

### Symptom

Editor briefly shows content then goes blank, or shows blank even though `useState(initialContent ?? "")` was called with valid content.

### Root Cause

MDXEditor v4 fires `onChange` during internal initialization (markdown → Lexical AST parsing/normalization). This happens after mount but before user interaction. If `mountedRef.current` is `true` at that point (set synchronously in `useEffect`), the `onChange` handler calls `setMarkdown(v)` with the parsed/normalized value, which may overwrite or clear the loaded content.

### Wrong pattern (DO NOT USE)

```tsx
// ❌ mountedRef set synchronously in useEffect — onChange during init will overwrite content
useEffect(() => { mountedRef.current = true; }, []);
```

### Fix — delay `mountedRef` by one animation frame

```tsx
useEffect(() => {
  const id = requestAnimationFrame(() => { mountedRef.current = true; });
  return () => { mountedRef.current = false; cancelAnimationFrame(id); };
}, []);

// onChange guard ignores initial fire, captures user edits:
<MDXEditor
  onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
/>
```

The `requestAnimationFrame` defers `mountedRef.current = true` past the init-time `onChange` calls, so they're silently ignored. User edits after that point are captured normally.

---

## Bug 3: `export type` in `"use server"` files causes runtime crash

### Symptom

Runtime error: `ReferenceError: ClinicalFileType is not defined` at `lib/actions/clinical-files.ts:62`.

### Root Cause

Next.js's `"use server"` bundler chokes on type-only exports (`export type { SomeType }`). Even though TypeScript erases types at compile time, the bundler's module evaluation step tries to resolve the exported symbol at runtime and fails.

### Fix

Remove `export type { ... }` from `"use server"` files. Keep the `type` alias at module scope (non-exported). Consumers can still use `import type`:

```ts
// ✅ OK — type alias at module scope, NOT exported
type ClinicalFileType = "clinical-summary" | "clinical-background" | "care-plan";
export async function saveClinicalFile(p: string, type: ClinicalFileType, ...) { ... }

// ❌ Do NOT add this in "use server" files:
export type { ClinicalFileType };
```

---

## MDXEditor v4 API Notes

From `node_modules/@mdxeditor/editor/dist/index.d.ts`:

- **`markdown: string`** — "read only when the component is mounted. To change dynamically, use `MDXEditorMethods.setMarkdown`."
- **`onChange?: (markdown: string, initialMarkdownNormalize: boolean) => void`** — the second param is `true` when the change is triggered by initial markdown normalization.
- **`MDXEditorMethods.setMarkdown(value: string): void`** — imperative method to update content after mount.
- **`MDXEditorMethods.getMarkdown(): string`** — gets current markdown.

The `initialMarkdownNormalize` parameter could distinguish init-time changes from user edits, but the `mountedRef` + `requestAnimationFrame` pattern is simpler and proven.

---

## Simple Markdown Constraint

AI-generated clinical markdown MUST use only these elements:

- `##` / `###` headings (no `#`)
- Paragraphs
- Bullet lists (`-`)
- Numbered lists (`1.`)
- `**bold**` text
- `---` horizontal rules

**Forbidden:** HTML tags, tables, code blocks, blockquotes, nested formatting, special Unicode (em dashes → `-`, smart quotes → `"`).

This constraint is enforced in both the API system prompt (`app/api/clinical/generate/route.ts`) and the user-facing prompts (`patient-profile.tsx`). MDXEditor and `react-markdown` both handle this subset reliably.

---

## AI Preamble Stripping

### Symptom

AI-generated clinical files have useless preamble lines before the actual markdown content:
```
Care plan written to `data/patients/josoroma-mqn4h6m8/care-plan.md`. Five sections:
```

The user explicitly demanded: "strictly don't say where the file was written and avoid writing something not useful to the markdown file."

### Root Cause

Even with explicit system prompt instructions to start with `##`, some models still output meta-commentary describing what they generated before the clinical content. Hermes Agent runs often produce a natural-language response wrapping the markdown.

### Fix — two-layer defense

**Layer 1: Strict system prompt** (`app/api/clinical/generate/route.ts`):
```
STRICT OUTPUT RULES:
1. Start the very first line with "## " — a level-2 markdown heading. No exceptions.
2. Do NOT write a single word before the first "## " heading.
3. Do NOT mention any file name, file path, or where content is written.
4. Do NOT write "Here is", "I've generated", "The following", or any meta-commentary.
5. Do NOT describe the structure or say "sections include".
6. Your ENTIRE output must be valid clinical markdown only — nothing else.
```

**Layer 2: Post-processing cleanup** (same route, after code fence stripping):
```ts
// Strip preamble lines that mention files, paths, or meta-commentary
const lines = cleaned.split("\n");
const contentStart = lines.findIndex(
  (line) => line.startsWith("## ") || line.startsWith("# ")
);
if (contentStart > 0) {
  cleaned = lines.slice(contentStart).join("\n").trim();
}

// Remove lines that are pure meta-commentary (no markdown value)
const filtered = lines.slice(contentStart > 0 ? contentStart : 0).filter(
  (line) => {
    const t = line.trim().toLowerCase();
    if (t.startsWith("written to ") || t.startsWith("saved to ")) return false;
    if (t.startsWith("care plan written") || t.startsWith("clinical summary written")
        || t.startsWith("clinical background written")) return false;
    if (t.startsWith("i've ") || t.startsWith("here is ")
        || t.startsWith("the following")) return false;
    return true;
  }
);
cleaned = filtered.join("\n").trim();
```

This finds the first real heading and truncates everything before it, then filters out remaining meta-commentary lines. The combination of strict system prompt + post-processing ensures the saved file always starts directly with clinical content.