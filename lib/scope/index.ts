// Re-export scope utilities from the repository module
export {
  PatientScopeError,
  assertScoped,
  validatePatientId,
  scopedInvitesAtom,
  scopedResultsAtom,
} from '@/lib/data/_repository';

// Re-export the active patient atom from state
export { activePatientIdAtom } from '@/lib/state/_atoms';