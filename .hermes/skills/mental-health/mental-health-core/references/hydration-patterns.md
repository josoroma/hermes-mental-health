# Hydration Patterns for Next.js + Jotai

## Pattern 1: `useSearchParams()` in client components

**Problem**: `useSearchParams()` returns different values on server (empty) vs client (actual query params), causing hydration mismatch.

**Fix**: Keep a Jotai atom as the source of truth for state. Sync URL params → atom in a `useEffect` that only runs on the client (post-hydration). Write atom → URL on user action.

```tsx
// ❌ BAD: reads searchParams in render body
const urlTab = searchParams.get("tab");
const activeTab = urlTab ?? atomDefault;

// ✅ GOOD: atom-first, URL sync in useEffect
const activeTab = atomValue;
useEffect(() => {
  const urlTab = searchParams.get("tab");
  if (urlTab) setAtom(urlTab);
}, []);

const setActiveTab = (value: string) => {
  setAtom(value);
  router.replace(`?tab=${value}`, { scroll: false });
};
```

## Pattern 2: `atomWithStorage` counts vs seed data

**Problem**: `atomWithStorage("key", SEED_DATA)` renders with seed data on server but localStorage values on client. Badge counts, totals, or any derived numbers differ → hydration mismatch.

**Fix**: Add `suppressHydrationWarning` on the DOM element containing the count. React will render the server value first, then update to the client value without error.

```tsx
<Badge suppressHydrationWarning>
  {results.length}
</Badge>
```

Do NOT use a `mounted` state + `useEffect` approach — this triggers `react-hooks/set-state-in-effect` lint errors and causes an unnecessary second render.

## Pattern 3: Derived atoms and `useEffect`-set base atoms

**Problem**: A derived atom (`scopedResultsAtom`) depends on a base atom (`activePatientIdAtom`) that is set in a `useEffect`. On the first render, the base atom is `null` → derived atom returns empty → UI shows wrong count. After the effect runs, the derived atom recomputes, causing a flash.

**Fix**: Use `useHydrateAtoms` from `jotai/utils` to set the base atom **before** the first render. This ensures derived atoms resolve correctly from the start.

```tsx
// ❌ BAD: set in useEffect — first render has null
const setActive = useSetAtom(activePatientIdAtom);
useEffect(() => { setActive(patientId); }, [patientId]);

// ✅ GOOD: hydrate synchronously before first render
useHydrateAtoms([[activePatientIdAtom, patientId]]);
```

`useHydrateAtoms` is designed for SSR hydration — it sets atom values during the render phase, so all derived atoms reading from it get the correct value immediately.

## Pattern 4: Server component → client component prop drilling for `fs`-dependent data

**Problem**: A client component needs a full `Measure` object (with fields, scoring rules) but `getMeasure()` uses `fs` which doesn't work client-side.

**Fix**: Load the data in the server component (`page.tsx`) and pass it as a serialized prop to the client component.

```tsx
// page.tsx (server component)
import { getMeasure } from "@/lib/data/measures";
const measure = getMeasure(result.assessmentSlug);
return <ResultDetail measure={measure ?? null} />;

// result-detail.tsx (client component)
export function ResultDetail({ measure }: { measure: Measure | null }) {
  // measure.fields, measure.scoringRule, etc. all available
}
```

Next.js serializes the prop through the RSC boundary. The client component receives the full object without touching `fs`.

## Pattern 5: `ssr: false` for third-party editors (MDX Editor, etc.)

**Problem**: Third-party rich editor components (like `@mdxeditor/editor`) produce hydration mismatches because their internal DOM (toolbar buttons, aria attributes, disabled states) differs between server and client renders.

**Fix**: Use `next/dynamic` with `{ ssr: false }` wrapped in a client component. The dynamic import with `ssr: false` CANNOT live in a server component `page.tsx` — it must be in a `"use client"` wrapper.

```tsx
// _components/edit-page-client.tsx (client wrapper)
"use client";
import dynamic from "next/dynamic";

const EditPage = dynamic(
  () => import("./edit-page").then((m) => ({ default: m.EditMarkdownPage })),
  { ssr: false }
);

export function EditMarkdownPageClient(props: EditPageProps) {
  return <EditPage {...props} />;
}
```

```tsx
// page.tsx (server component)
import { EditMarkdownPageClient } from "./_components/edit-page-client";
// ...
return <EditMarkdownPageClient patientId={id} ... />;
```

The editor renders entirely client-side — no SSR → no hydration mismatch.

## Pattern 6: `"server-only"` + separate module for `fs` isolation

**Problem**: A shared data module (e.g., `patients.ts`) gains `fs` imports when you add filesystem scanning. The module is imported by client components (via `_repository.ts` → Jotai atoms) causing `Module not found: Can't resolve 'fs'`.

**Fix**: Split into two modules:
- `patients.ts` — client-safe, seed data only, NO `fs`
- `patients-server.ts` — server-only, `import "server-only"`, uses `fs`, re-exports seed constants

```ts
// patients-server.ts
import "server-only";
import fs from "fs";
import { SEED_PATIENTS, SEED_RESULTS } from "./patients";

export function listAllPatients(): Patient[] {
  const patients = [...SEED_PATIENTS];
  // fs.readdirSync, fs.readFileSync for filesystem profiles...
  return patients;
}

export function getPatientById(id: string): Patient | undefined {
  const seed = SEED_PATIENTS.find(p => p.id === id);
  if (seed) return seed;
  // Check filesystem...
}

export { SEED_RESULTS };
```

Server components import from `patients-server`, client-safe modules import from `patients`. The `"server-only"` package enforces the boundary at build time.