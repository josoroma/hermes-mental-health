# Agent Chat File Viewer/Editor

Built this session (2026-06-26) — clicking any `.md`, `.json`, `.yaml`, `.yml`, `.txt`, `.css`, `.ts`, `.tsx`, `.js`, or `.jsx` file in the filesystem tree opens a viewer/editor panel.

## Architecture (3 layers)

| Layer | File | Purpose |
|-------|------|---------|
| API | `app/api/agent/file/route.ts` | `GET` reads file content, `PUT` writes file content. Path-traversal protection via `resolve()` + prefix check. Allowed extensions whitelist. |
| Panel | `app/agent/_components/file-viewer-panel.tsx` | Fetches file content on mount. View mode renders `.md` via `ReactMarkdown` with dark prose, other files as `<pre>`. Edit mode uses `<textarea>`. Save/Cancel buttons. |
| Integration | `app/agent/_components/filesystem-tree.tsx` + `agent-chat.tsx` | Tree accepts `onSelectFile` + `selectedFile` props. File nodes are clickable (call `onSelectFile(path)`). Selected file highlighted with accent bg. |

## Pattern

```tsx
// Tree calls onSelectFile when a file is clicked
<FilesystemTree onSelectFile={setSelectedFile} selectedFile={selectedFile} />

// Panel renders between tree and chat when file is selected
{selectedFile && (
  <aside className="w-96 shrink-0">
    <FileViewerPanel filePath={selectedFile} onClose={() => setSelectedFile(null)} />
  </aside>
)}
```

## Resizable columns

The tree sidebar and file viewer panel use drag-to-resize handles between them:

```tsx
const [treeWidth, setTreeWidth] = useState(224);
const [viewerWidth, setViewerWidth] = useState(384);
const resizing = useRef<{ target: "tree" | "viewer"; startX: number; startWidth: number } | null>(null);

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const delta = e.clientX - resizing.current.startX;
    const newWidth = Math.max(160, Math.min(600, resizing.current.startWidth + delta));
    if (resizing.current.target === "tree") setTreeWidth(newWidth);
    else setViewerWidth(newWidth);
  };
  const handleMouseUp = () => { resizing.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
}, []);

const startResize = useCallback((target: "tree" | "viewer", startWidth: number) => (e: React.MouseEvent) => {
  resizing.current = { target, startX: e.clientX, startWidth };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
}, []);
```

**Resize handles** are 1px wide divs with `cursor-col-resize` between the panels:
```tsx
<div className="shrink-0 w-1 cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors"
     onMouseDown={startResize("tree", treeWidth)} />
```

**eslint caveat**: Wrap `startResize` in `useCallback` to avoid `react-hooks/refs` errors about accessing refs during render.

- **Path traversal protection**: Always `resolve()` then prefix check before `readFileSync`/`writeFileSync`
- **Allowed extensions**: Whitelist — never allow `.env`, `.secret`, or binary files
- **UTF-8 only**: Both read and write use `utf-8` encoding
- **Panel width**: Default 384px but resizable via drag handle (160–600px range)
- **markdown rendering**: Use `prose prose-sm dark:prose-invert` for `.md` files, raw `<pre>` for everything else
- **API route creation**: When creating new `app/api/.../route.ts` files with `write_file`, verify the file actually exists on disk (e.g., via `search_files`). The write may silently fail — if the API returns 404 HTML instead of JSON, the route file may not have been created. Re-create with `write_file` after `mkdir -p` for the parent directory.
