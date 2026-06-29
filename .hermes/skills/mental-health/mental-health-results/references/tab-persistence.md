# Tab State Persistence on Patient Profile

## Pattern

Tab state is persisted via two mechanisms:
1. **URL query param** (`?tab=profile|assessments|results`) — source of truth, shareable
2. **Jotai atom** (`patientTabAtom: Record<patientId, tab>`) — fallback when URL has no `?tab=`

## How it works

### Reading the active tab
```tsx
const searchParams = useSearchParams();
const [tabState] = useAtom(patientTabAtom);

const urlTab = searchParams.get("tab");
const validTabs = ["profile", "assessments", "results"];
const activeTab = urlTab && validTabs.includes(urlTab)
  ? urlTab                                    // URL takes priority
  : patientId
    ? (tabState[patientId] ?? "profile")      // atom fallback
    : "profile";                              // default
```

### Writing the active tab
```tsx
const setActiveTab = (value: string) => {
  if (patientId) {
    setTabState((prev) => ({ ...prev, [patientId]: value }));
  }
  // Sync URL without full navigation
  const params = new URLSearchParams(searchParams.toString());
  params.set("tab", value);
  router.replace(`/patients/${patientId}?${params.toString()}`, { scroll: false });
};
```

### Navigating to a specific tab from another page
```tsx
// From result detail back button:
setTabState((prev) => ({ ...prev, [pid]: "results" }));
router.push(`/patients/${pid}?tab=results`);
```

## Implementation files

- **Atom**: `lib/state/_atoms.ts` — `patientTabAtom: atom<Record<string, string>>({})`
- **Component**: `app/patients/[id]/_components/profile-tabs.tsx` — uses `useSearchParams()` + `useRouter()`
- **Parent**: `app/patients/[id]/_components/patient-profile.tsx` — wraps `ProfileTabs` in `<Suspense>` for `useSearchParams()` compatibility
- **Tabs**: shadcn/ui `<Tabs value={activeTab} onValueChange={setActiveTab}>` (controlled, not `defaultValue`)

## Pitfalls

- `useSearchParams()` in Next.js App Router requires a `<Suspense>` boundary. The `patient-profile.tsx`
  wraps `ProfileTabs` in `<Suspense fallback={null}>`.
- `router.replace()` with `{ scroll: false }` avoids page scroll jumps on tab switch.
- The URL param takes priority because it's the only way to deep-link to a specific tab
  (e.g., from the result detail back button).