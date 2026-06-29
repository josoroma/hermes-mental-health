#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  output-privacy-review.sh — Hermes Mental Health agent hook
#  Reviews agent output before delivery to ensure no PHI is leaked.
#
#  Called after the agent produces a response, before it reaches the user.
#  Scans for patterns that may indicate accidental PHI inclusion.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RESPONSE_TEXT="${HERMES_RESPONSE_TEXT:-}"
DELIVERY_TARGET="${HERMES_DELIVERY_TARGET:-cli}"

# Skip if no response text
if [ -z "$RESPONSE_TEXT" ]; then
    exit 0
fi

# ── PHI detection heuristics ─────────────────────────────────────────────────
# These patterns look for potential PHI in synthetic/seed data context.
# In production, this would integrate with a PHI detection model.

HAS_WARNING=0

# Email addresses (should not appear in clinical output)
if echo "$RESPONSE_TEXT" | grep -qiE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'; then
    printf '[PRIVACY-REVIEW] WARNING: response may contain email address\n' >&2
    HAS_WARNING=1
fi

# Phone numbers (US format)
if echo "$RESPONSE_TEXT" | grep -qE '\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4}'; then
    printf '[PRIVACY-REVIEW] WARNING: response may contain phone number\n' >&2
    HAS_WARNING=1
fi

# SSN-like patterns
if echo "$RESPONSE_TEXT" | grep -qE '[0-9]{3}-[0-9]{2}-[0-9]{4}'; then
    printf '[PRIVACY-REVIEW] WARNING: response may contain SSN-like pattern\n' >&2
    HAS_WARNING=1
fi

# Date-of-birth patterns (should be de-identified)
if echo "$RESPONSE_TEXT" | grep -qiE 'date of birth|dob[:\s]|born[:\s]'; then
    printf '[PRIVACY-REVIEW] WARNING: response may contain date-of-birth reference\n' >&2
    HAS_WARNING=1
fi

if [ "$HAS_WARNING" -eq 1 ]; then
    printf '[PRIVACY-REVIEW] Response flagged for human review before delivery\n' >&2
fi

exit 0