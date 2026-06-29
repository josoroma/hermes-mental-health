# Next.js Client Component Patterns

## The `fs` boundary problem

`lib/data/measures.ts` imports `fs` and `path` for server-side template loading.
Client components cannot import modules that use Node.js builtins. If a client component
imports `getMeasure()` from `measures.ts`, Next.js throws:

```
Module not found: Can't resolve 'fs'
```

Import trace shows: Client Component Browser → measures.ts → fs

## Solution: Static JSON imports for client-safe lookups

Create a separate module (`lib/data/measure-meta.ts`) that imports JSON statically:

```ts
import indexData from "@/data/shared/templates/index.json";

const slugToTitle: Record<string, string> = {};
for (const entry of indexData) {
  slugToTitle[entry.slug] = entry.title;
}

export function getMeasureTitle(slug: string): string | undefined {
  return slugToTitle[slug];
}
```

Static JSON imports work in both server and client components because Next.js
inlines the JSON at build time — no `fs` needed at runtime.

## When to use which

| Module | Import from | Works in |
|--------|------------|----------|
| `lib/data/measures.ts` | `getMeasure()`, `listMeasures()` | Server components only (uses `fs`) |
| `lib/data/measure-meta.ts` | `getMeasureTitle()`, `getMeasureMeta()` | Server + client (static JSON import) |

**Rule**: If a client component needs measure metadata, use `measure-meta.ts`.
If a server component needs the full `Measure` object (fields, scoring rules), use `measures.ts`.

## Patient profile pattern

For patient-facing pages:
1. `page.tsx` (server component) — validates patient ID, loads patient, 404 on invalid
2. `_components/patient-profile.tsx` (client) — sets `activePatientIdAtom`, renders tabs
3. `_components/profile-tabs.tsx` (client) — reads scoped atoms, uses `getMeasureTitle()`
4. `_components/clinical-summary.tsx` (client) — reads `scopedResultsAtom`, uses `getMeasureTitle()`

All client components that need measure names import from `measure-meta.ts`, never from `measures.ts`.

## Hydration safety

See `references/hydration-patterns.md` for SSR-safe patterns when using
`useSearchParams()`, `atomWithStorage`, and date formatting in client components.
Key rules:
- Badge counts from localStorage-backed atoms: use `suppressHydrationWarning`
- `useSearchParams()` in render: defer to `useEffect` sync, keep atom as source of truth
- Date formatting with locale: avoid in SSR path or suppress hydration warning