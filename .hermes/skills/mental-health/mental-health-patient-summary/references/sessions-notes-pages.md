# Sessions and Notes pages — full implementation reference

## Route structure

```
app/patients/[id]/
├── sessions/
│   ├── page.tsx                              → Server: validates patient, renders sessions-page-client
│   ├── _components/sessions-page-client.tsx  → Client: renders ClinicalItemsSection type="session"
│   └── [itemId]/
│       ├── edit/
│       │   ├── page.tsx                      → Server: reads item from file, renders EditClinicalItemPage
│       │   └── _components/edit-page.tsx     → MDX editor with toolbar, title input, save/cancel/back
│       └── view/
│           ├── page.tsx                      → Server: reads item from file, renders ViewClinicalItemPage
│           └── _components/view-page.tsx     → react-markdown read-only view with Back/Edit
└── notes/
    ├── page.tsx                              → Same pattern, type="note"
    ├── _components/notes-page-client.tsx
    └── [itemId]/edit/page.tsx                → Reuses EditClinicalItemPage from sessions
    └── [itemId]/view/page.tsx                → Reuses ViewClinicalItemPage from sessions
```

## Data model

```json
{
  "id": "session-1782081600000-abc12",
  "type": "session",
  "title": "Session #1",
  "content": "## Clinical Session\n\n...",
  "createdAt": "2026-06-22T00:00:00.000Z",
  "updatedAt": "2026-06-22T00:00:00.000Z"
}
```

## File system

```
data/patients/<id>/
├── sessions/
│   └── 2026-06-22-00-00-00-session-1782081600000-abc12.json
├── sessions-deleted/
│   └── deleted-2026-06-22-01-00-00-2026-06-22-00-00-00-session-1782081600000-abc12.json
├── notes/
│   └── 2026-06-22-00-00-00-note-1782081600000-def34.json
└── notes-deleted/
    └── deleted-2026-06-22-01-00-00-2026-06-22-00-00-00-note-1782081600000-def34.json
```

## Templates

`data/shared/templates/md/session-template.json`:
```json
{
  "type": "session",
  "title": "New Session",
  "content": "## Clinical Session\n\n**Date:** \n**Duration:** \n**Type:** Individual / Group / Family\n...",
  "version": "1.0.0"
}
```

`data/shared/templates/md/note-template.json`:
```json
{
  "type": "note",
  "title": "New Note",
  "content": "## Clinical Note\n\n**Date:** \n**Author:** \n...",
  "version": "1.0.0"
}
```

## Pitfalls

- The notes [itemId] routes import edit-page and view-page from `@/app/patients/[id]/sessions/...` — they share components
- Edit page uses `dynamic(() => import(), { ssr: false })` wrappers for MDXEditor? NO — this project's edit-page uses direct import with `"use client"` since the page itself is client-rendered
- Edit page has `h-[calc(100vh-12rem)]` to fit within the patient layout's padding
- View page does NOT use `h-screen` — it flows within the patient layout container
