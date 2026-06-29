# Tab State Persistence Pattern

## Problem

Patient profile tabs (Profile, Assessments, Results) should remember the active tab
when navigating away and back, and reflect it in the URL.

## Solution: Jotai atom + URL search params + Suspense

```tsx
// 1. Atom in lib/state/_atoms.ts
export const patientTabAtom = atom<Record<string, string>>({});

// 2. ProfileTabs component
const router = useRouter();
const searchParams = useSearchParams();
const [tabState, setTabState] = useAtom(patientTabAtom);

// Atom-first (stable across SSR/hydration)
const activeTab = patientId ? (tabState[patientId] ?? "profile") : "profile";

// Sync URL ?tab= → atom on client mount (avoids hydration mismatch)
useEffect(() => {
  const urlTab = searchParams.get("tab");
  if (urlTab && validTabs.includes(urlTab) && patientId) {
    setTabState((prev) => ({ ...prev, [patientId]: urlTab }));
  }
}, []);

// On tab change: update atom + URL (no full nav)
const setActiveTab = (value: string) => {
  setTabState((prev) => ({ ...prev, [patientId]: value }));
  router.replace(`/patients/${patientId}?${value}`, { scroll: false });
};

// 3. Controlled tabs (not defaultValue)
<Tabs value={activeTab} onValueChange={setActiveTab}>
```

## Back button from sub-pages

Set atom + navigate with URL param:

```tsx
router.push(`/patients/${patientId}?tab=results`);
setTabState((prev) => ({ ...prev, [patientId]: "results" }));
```

## Suspense boundary

`useSearchParams()` requires `<Suspense>` in the parent:

```tsx
<Suspense fallback={null}>
  <ProfileTabs patient={patient} />
</Suspense>
```
