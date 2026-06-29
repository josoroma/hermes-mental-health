import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

/** The single active patient per session. null means no patient selected. */
export const activePatientIdAtom = atom<string | null>(null);

/** UI preference: sidebar collapsed state */
export const sidebarCollapsedAtom = atomWithStorage('sidebar-collapsed', false);

/** UI debug: show semantic layout labels */
export const showUiLabelsAtom = atomWithStorage('show-ui-labels', false);

/** Last viewed patient (for restoring context) */
export const lastViewedPatientAtom = atomWithStorage<string | null>(
  'last-viewed-patient',
  null
);

/**
 * Per-patient active tab in the patient profile view.
 * Maps patientId → tab value ('profile' | 'assessments' | 'results').
 * Defaults to 'profile' the first time a patient is visited.
 */
export const patientTabAtom = atom<Record<string, string>>({});