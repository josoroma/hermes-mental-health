# Next.js Pitfalls & Patterns

Lessons from implementing the mental-health practitioner web app.

## Jotai Hydration

**Problem**: `useSetAtom` in `useEffect` sets atom AFTER first render. Derived atoms
(`scopedResultsAtom`, `scopedInvitesAtom`) see `null` patientId → return `[]` → UI flashes empty.

**Fix**: `useHydrateAtoms` from `jotai/utils` sets the atom BEFORE first render:

```tsx
import { useHydrateAtoms } from "jotai/utils";
// In the component:
useHydrateAtoms([[activePatientIdAtom, patientId]]);
```

No `useEffect` needed. All derived atoms resolve synchronously on first render.

## atomWithStorage + SSR

`atomWithStorage` reads from localStorage on client, seed data on server. If localStorage
has been mutated (e.g., edited results), counts differ → hydration mismatch on badges.

**Fix**: `suppressHydrationWarning` on elements showing localStorage-backed counts.

## useSearchParams hydration

`useSearchParams()` returns different values on server (null) vs client (?tab=results).
Using it in render causes mismatch.

**Fix**: Defer to `useEffect` (only runs client-side) to sync URL param → state.
Never use `useSearchParams()` value directly in the render tree for initial state.

## fs in client bundle

Adding `import fs from "fs"` to a file imported by any client component chain
(even transitively) leaks `fs` into browser bundle → "Module not found: fs".

**Fix**: Split server-only code into separate file with `import "server-only"`.
Client-safe file exports seed data only.

```tsx
// lib/data/patients.ts         ← client-safe (seed data, no fs)
// lib/data/patients-server.ts  ← server-only (filesystem scan, "server-only")
```

## Patient data file architecture

Patients created via the dashboard are stored as files under `data/patients/<id>/`:

```
data/patients/<id>/
  profile.json           ← demographics only (id, name, ageRange, gender, timestamps)
  consent.json           ← consentStatus, timestamps
  clinical-background.md ← practitioner-editable markdown
  clinical-summary.md    ← practitioner-editable markdown (auto-populated from results)
```

Server actions handle read/write:
- `lib/actions/create-patient.ts` — creates profile.json + consent.json + clinical-background.md
- `lib/actions/patient-files.ts` — readDemographics, saveDemographics, readConsent, saveConsent
- `lib/actions/clinical-files.ts` — readClinicalFile, saveClinicalFile

**Key rule**: `profile.json` should NOT contain `clinicalBackground` or `consentStatus`.
Those live in separate files. The server action that creates patients splits the data accordingly.

## `ssr: false` with next/dynamic

`ssr: false` is NOT allowed in Server Components with `next/dynamic`.
Must wrap in a client component:

```tsx
// edit-page-client.tsx (client component)
"use client";
import dynamic from "next/dynamic";
const Heavy = dynamic(() => import("./heavy"), { ssr: false });

// page.tsx (server component)
import { HeavyClient } from "./edit-page-client";
```

## MDX Editor: onChange fires pre-mount

MDX Editor's `onChange` callback fires during initialization, before React mount.
This causes: "Can't perform a React state update on a component that hasn't mounted yet."

**Fix**: Guard with `mountedRef`:

```tsx
const mountedRef = useRef(false);
useEffect(() => { mountedRef.current = true; }, []);

<MDXEditor
  onChange={(v) => { if (mountedRef.current) setMarkdown(v); }}
/>
```

## shadcn DialogTrigger + Button

`<DialogTrigger asChild><Button>...</Button></DialogTrigger>` nests `<button>` inside
`<button>` → hydration error.

**Fix**: Remove `DialogTrigger`, use `<Button onClick={() => setOpen(true)}>` directly.

## Inline editing pattern (no modal)

For simple fields like consent status, use inline editing rather than a modal:

```tsx
// Edit button toggles to form fields, Save/Cancel replace the Edit button
{!editing ? (
  <Button onClick={() => setEditing(true)}>Edit</Button>
) : (
  <>
    <Button onClick={handleCancel}>Cancel</Button>
    <Button onClick={handleSave}>Save</Button>
  </>
)}
// CardContent shows form fields when editing, read-only when not
```

This pattern is used for Demographics and Consent & Dates cards.
