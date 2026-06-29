# Patient Shared Layout

## Architecture

All patient sub-pages share a common layout at `app/patients/[id]/layout.tsx` that renders
the patient info header above every child page. This avoids duplicating the header and
`useHydrateAtoms` call across every page component.

## File structure

```
app/patients/[id]/
├── layout.tsx                          # Server: loads patient, wraps with PatientLayoutClient
├── _components/
│   ├── patient-layout-client.tsx       # "use client": useHydrateAtoms + PatientHeader + {children}
│   └── patient-header.tsx             # "use client": editable demographics (name, age, gender)
├── page.tsx                           # Profile page: PatientProfile (no header)
├── assessments/page.tsx               # Assessments page: AssessmentsPageClient (no header)
├── results/page.tsx                   # Results page: ResultsPageClient (no header)
├── results/[resultId]/page.tsx        # Result detail (no header)
├── view/[fileType]/page.tsx           # View page (no header)
└── edit/[fileType]/page.tsx           # Edit page (no header)
```

## What child pages should NOT include

- `useHydrateAtoms` — the layout handles this
- Outer wrapper `<div className="flex flex-col flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full ...">` — the layout provides this
- `PatientHeader` — the layout renders it

## layout.tsx

```tsx
// Server component
export default async function PatientLayout({ children, params }: PatientLayoutProps) {
  const { id } = await params;
  const patient = getPatientById(id);
  if (!patient) return <>{children}</>;
  return <PatientLayoutClient patientId={id} patient={patient}>{children}</PatientLayoutClient>;
}
```

## patient-layout-client.tsx

```tsx
"use client";
export function PatientLayoutClient({ patientId, patient, children }) {
  useHydrateAtoms([[activePatientIdAtom, patientId]]);
  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      <PatientHeader patientId={patientId} name={patient.name} ageRange={patient.ageRange} gender={patient.gender} />
      {children}
    </div>
  );
}
```

## patient-header.tsx

Extracted from the old `patient-profile.tsx`. A standalone "use client" component:
- Reads demographics from `profile.json` via `readDemographics()`
- Inline edit toggle (Pencil → Input/Select fields → Save/Cancel)
- Displays patient ID as read-only monospace
- Saves via `saveDemographics()` server action

## Migration notes

When this layout was introduced, the following changes were needed:
1. `patient-profile.tsx` was simplified to remove header + `useHydrateAtoms` — only renders Clinical Summary, Clinical Background, Consent
2. `results-page-client.tsx` removed `useHydrateAtoms` and wrapper div
3. `assessments-page-client.tsx` removed `useHydrateAtoms` and wrapper div
4. `result-detail-client.tsx` removed `useEffect` + `useSetAtom` (layout hydrates atom)
5. `view-page.tsx` removed `h-screen` wrapper — now fits within layout container
6. Result-detail wrapper div simplified from `flex flex-col flex-1 p-6 md:p-8 max-w-3xl` to `space-y-6`
