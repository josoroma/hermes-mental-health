# Next.js Hydration & Jotai Patterns

## `useHydrateAtoms` for synchronous atom initialization

Problem: setting atoms in `useEffect` causes first render with stale/null values.
Derived atoms (like `scopedResultsAtom`) that depend on `activePatientIdAtom` return
empty data on first render, causing wrong badge counts or empty lists.

```tsx
// ❌ Bad — atom set asynchronously
useEffect(() => setActivePatient(patientId), [patientId]);

// ✅ Good — atom hydrated before first render
import { useHydrateAtoms } from "jotai/utils";
useHydrateAtoms([[activePatientIdAtom, patientId]]);
```

## `suppressHydrationWarning` for localStorage-backed values

Problem: `atomWithStorage` falls back to seed data on server but reads localStorage
on client. If localStorage was mutated (e.g., through editing), counts differ.
Server renders seed count (2), client renders localStorage count (7) — hydration error.

```tsx
<Badge suppressHydrationWarning>
  {invites.length + results.length}
</Badge>
```

## `useSearchParams` hydration fix

Problem: `useSearchParams()` on server returns null for `?tab=results`, but client
returns `"results"`. Server renders Profile tab, client renders Results tab — mismatch.

Fix: atom-first rendering, URL sync deferred to `useEffect`:

```tsx
// Use atom as source of truth (consistent server+client)
const activeTab = patientId ? (tabState[patientId] ?? "profile") : "profile";

// Sync URL → atom post-mount
useEffect(() => {
  const urlTab = searchParams.get("tab");
  if (urlTab && validTabs.includes(urlTab) && patientId) {
    setTabState((prev) => ({ ...prev, [patientId]: urlTab }));
  }
}, []);

// On tab change, update URL (no full nav)
const setActiveTab = (value: string) => {
  setTabState((prev) => ({ ...prev, [patientId]: value }));
  router.replace(`/patients/${patientId}?tab=${value}`, { scroll: false });
};
```

## Server-only file splitting

Problem: importing `fs` in a shared module leaks to client bundle via transitive imports
(e.g., `_repository.ts` → `profile-tabs.tsx` → client component).

Fix: split into two files:
- `lib/data/patients.ts` — client-safe, seed data only, no `fs`
- `lib/data/patients-server.ts` — `"server-only"` guard, `fs` imports, filesystem scanning

Use `"server-only"` npm package at the top of server-only files.
