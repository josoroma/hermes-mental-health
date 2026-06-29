# AppNav — Active State Highlighting

## Pattern

The top nav (`components/app-nav.tsx`) highlights the current page's link using `usePathname()`:

```tsx
const activeClass = "text-foreground font-medium";
const inactiveClass = "hover:text-foreground transition-colors";

const isProfile = pathname === `/patients/${activePatientId}`;
const isAssessments = pathname.startsWith(`/patients/${activePatientId}/assessments`);
const isResults = pathname.startsWith(`/patients/${activePatientId}/results`);
```

- Profile uses exact match (`===`)
- Assessments and Results use `startsWith()` to match sub-routes (e.g., `/results/<rid>`)
- Only rendered when `activePatientId` is set AND `pathname` starts with `/patients/<activePatientId>`

## Dashboard removed

The user explicitly asked to remove the Dashboard link from the nav. Nav only shows:
- Hermes Mental Health (brand, links to `/`)
- Profile | Assessments | Results (when on a patient page)
- GitHub (external link)

## Pitfall: useHydrateAtoms in patient route tree

Calling `useHydrateAtoms([[activePatientIdAtom, patientId]])` in ANY component that renders
under the patient route tree triggers **"Cannot update a component (AppNav) while rendering
a different component"**. This happens because `useHydrateAtoms` sets atom values synchronously
during the render pass, and AppNav reads `activePatientIdAtom` from the same Jotai scope.

**Fix:** Use `useEffect` + `useSetAtom` in a wrapper component (e.g., `ResultDetailClient`):

```tsx
export function ResultDetailClient({ result, measure }) {
  const setActivePatient = useSetAtom(activePatientIdAtom);
  useEffect(() => {
    setActivePatient(result.patientId);
  }, [result.patientId, setActivePatient]);
  return <ResultDetail result={result} measure={measure} />;
}
```

This defers atom setting to after mount, avoiding the render-phase collision with AppNav.
