#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  patient-scope-guard.sh — Hermes Mental Health agent hook
#  Enforces one-patient-per-session: blocks cross-patient access.
#
#  Called before every tool invocation. Receives the patient ID context
#  and the current active patient. Exits non-zero to block the operation.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# The agent passes context via environment variables
PATIENT_ID="${HERMES_PATIENT_ID:-}"
ACTIVE_PATIENT_ID="${HERMES_ACTIVE_PATIENT_ID:-}"
CALLING_TOOL="${HERMES_TOOL_NAME:-unknown}"

# If no patient is active, allow the call (initial setup)
if [ -z "$ACTIVE_PATIENT_ID" ]; then
    exit 0
fi

# If no patient ID in context, allow (non-patient-scoped tools)
if [ -z "$PATIENT_ID" ]; then
    exit 0
fi

# Block cross-patient access
if [ "$PATIENT_ID" != "$ACTIVE_PATIENT_ID" ]; then
    printf '[PATIENT-SCOPE-GUARD] BLOCKED: %s tried to access patient "%s" while patient "%s" is active\n' \
        "$CALLING_TOOL" "$PATIENT_ID" "$ACTIVE_PATIENT_ID" >&2
    exit 1
fi

exit 0