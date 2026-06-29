import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';
import type { Patient, Invite, Result } from '@/lib/domain/_schema';
import { SEED_PATIENTS, SEED_INVITES, SEED_RESULTS } from './patients';
import { activePatientIdAtom } from '@/lib/state/_atoms';

// ═══════════════════════════════════════════════════════════════════════════
//  PatientScopeError — thrown on cross-patient access
// ═══════════════════════════════════════════════════════════════════════════

export class PatientScopeError extends Error {
  constructor(requestedId: string, activeId: string | null) {
    super(
      `Patient scope violation: attempted to access patient '${requestedId}' while '${activeId ?? 'none'}' is active`
    );
    this.name = 'PatientScopeError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Scoped storage atoms (backed by localStorage via atomWithStorage)
// ═══════════════════════════════════════════════════════════════════════════

/** All invites across patients: { [patientId]: Invite[] } */
export const invitesAtom = atomWithStorage<Record<string, Invite[]>>(
  'hermes-invites',
  SEED_INVITES
);

/** All results across patients: { [patientId]: Result[] } */
export const resultsAtom = atomWithStorage<Record<string, Result[]>>(
  'hermes-results',
  SEED_RESULTS
);

/** Patients registry (static seed, but atom-backed for future mutation) */
export const patientsAtom = atomWithStorage<Patient[]>(
  'hermes-patients',
  SEED_PATIENTS
);

// ═══════════════════════════════════════════════════════════════════════════
//  Scope guard
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assert that the given patientId matches the active patient.
 * Throws PatientScopeError on mismatch.
 */
export function assertScoped(
  patientId: string,
  activeId: string | null
): void {
  if (activeId !== null && patientId !== activeId) {
    throw new PatientScopeError(patientId, activeId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Patient ID validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a patient ID for well-formedness.
 * Allows alphanumeric + hyphens + underscores, 1-64 chars.
 * Blocks path traversal and control characters.
 */
export function validatePatientId(id: string): boolean {
  if (!id || id.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Scoped selectors (read atoms, enforce scope)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read-only scoped atom helper: derive patient-scoped data from a store atom.
 */
function scopedReadAtom<T>(
  storeAtom: ReturnType<typeof atomWithStorage<Record<string, T[]>>>,
  patientIdAtom: typeof activePatientIdAtom
) {
  return atom((get) => {
    const patientId = get(patientIdAtom);
    if (!patientId) return [];
    const store = get(storeAtom);
    return store[patientId] ?? [];
  });
}

/** Scoped invites for the active patient (derived atom) */
export const scopedInvitesAtom = scopedReadAtom(invitesAtom, activePatientIdAtom);

/** Scoped results for the active patient (derived atom) */
export const scopedResultsAtom = scopedReadAtom(resultsAtom, activePatientIdAtom);

// ═══════════════════════════════════════════════════════════════════════════
//  Read operations (always scoped)
// ═══════════════════════════════════════════════════════════════════════════

export function getInvites(
  patientId: string,
  activeId: string | null,
  store: Record<string, Invite[]>
): Invite[] {
  assertScoped(patientId, activeId);
  return store[patientId] ?? [];
}

export function getResults(
  patientId: string,
  activeId: string | null,
  store: Record<string, Result[]>
): Result[] {
  assertScoped(patientId, activeId);
  return store[patientId] ?? [];
}

export function getResultById(
  patientId: string,
  resultId: string,
  activeId: string | null,
  store: Record<string, Result[]>
): Result | undefined {
  assertScoped(patientId, activeId);
  const results = store[patientId] ?? [];
  return results.find((r) => r.resultId === resultId);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Write operations
// ═══════════════════════════════════════════════════════════════════════════

export function addInvite(
  invite: Invite,
  store: Record<string, Invite[]>
): Record<string, Invite[]> {
  const patientInvites = store[invite.patientId] ?? [];
  return {
    ...store,
    [invite.patientId]: [...patientInvites, invite],
  };
}

export function addResult(
  result: Result,
  store: Record<string, Result[]>
): Record<string, Result[]> {
  const patientResults = store[result.patientId] ?? [];
  return {
    ...store,
    [result.patientId]: [...patientResults, result],
  };
}

export function updateInviteStatus(
  token: string,
  status: Invite['status'],
  store: Record<string, Invite[]>
): Record<string, Invite[]> {
  const next = { ...store };
  for (const patientId of Object.keys(next)) {
    const invites = next[patientId];
    const idx = invites.findIndex((i) => i.token === token);
    if (idx !== -1) {
      next[patientId] = [
        ...invites.slice(0, idx),
        { ...invites[idx], status },
        ...invites.slice(idx + 1),
      ];
      break;
    }
  }
  return next;
}

/**
 * Update an existing result in the store (in-place replacement by resultId).
 */
export function updateResult(
  result: Result,
  store: Record<string, Result[]>
): Record<string, Result[]> {
  const patientResults = store[result.patientId] ?? [];
  const idx = patientResults.findIndex((r) => r.resultId === result.resultId);
  if (idx === -1) return store;
  return {
    ...store,
    [result.patientId]: [
      ...patientResults.slice(0, idx),
      result,
      ...patientResults.slice(idx + 1),
    ],
  };
}

/**
 * Remove an invite by token from the store.
 */
export function removeInvite(
  token: string,
  store: Record<string, Invite[]>
): Record<string, Invite[]> {
  const next = { ...store };
  for (const patientId of Object.keys(next)) {
    const invites = next[patientId];
    const idx = invites.findIndex((i) => i.token === token);
    if (idx !== -1) {
      next[patientId] = [
        ...invites.slice(0, idx),
        ...invites.slice(idx + 1),
      ];
      break;
    }
  }
  return next;
}