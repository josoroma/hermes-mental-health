"""Tool implementations for the Hermes Mental Health plugin.

Provides patient-scoped helpers for DSM-5-TR assessment management:
- Patient ID validation and workspace resolution
- Assessment template discovery and loading
- Submission scoring (totals, severity, T-scores, reverse scoring, data quality)
- Clinical summary generation from results
"""

from __future__ import annotations

import json
import re
from pathlib import Path

# ── Patient scoping ──────────────────────────────────────────────────────────


def patient_root() -> str:
    """Return the local patient data root."""
    return "data/processed/patients"


def template_root() -> str:
    """Return the local assessment template root."""
    return "data/shared/templates"


def validate_patient_id(patient_id: str) -> bool:
    """Check that a patient ID is well-formed (no path traversal, legal chars)."""
    if not patient_id or not isinstance(patient_id, str):
        return False
    if len(patient_id) > 64:
        return False
    # Block path traversal and illegal chars
    if re.search(r"[./\\\x00-\x1f]", patient_id):
        return False
    return bool(re.match(r"^[a-zA-Z0-9_-]+$", patient_id))


def list_patients() -> list[dict[str, str]]:
    """Return all local patient records (de-identified)."""
    root = Path(patient_root())
    if not root.exists():
        return []
    patients: list[dict[str, str]] = []
    for pdir in sorted(root.iterdir()):
        if not pdir.is_dir():
            continue
        pid = pdir.name
        if not validate_patient_id(pid):
            continue
        profile = pdir / "profile.yaml"
        patients.append({
            "patient_id": pid,
            "profile_path": str(profile) if profile.exists() else "",
        })
    return patients


# ── Assessment discovery ─────────────────────────────────────────────────────


def list_assessments() -> list[dict[str, str]]:
    """Enumerate available DSM-5-TR assessment measures from the template catalog."""
    root = Path(template_root())
    index_path = root / "index.json"
    if index_path.exists():
        try:
            data = json.loads(index_path.read_text())
            if isinstance(data, list):
                return [
                    {
                        "slug": item.get("slug", ""),
                        "title": item.get("title", ""),
                        "description": item.get("description", ""),
                        "version": item.get("version", ""),
                        "field_count": str(item.get("field_count", 0)),
                    }
                    for item in data
                ]
        except (json.JSONDecodeError, OSError):
            pass

    # Fallback: scan json template directory
    json_dir = root / "json"
    if not json_dir.exists():
        return []
    assessments: list[dict[str, str]] = []
    for tmpl in sorted(json_dir.glob("*.json")):
        try:
            data = json.loads(tmpl.read_text())
            assessments.append({
                "slug": data.get("slug", tmpl.stem),
                "title": data.get("title", tmpl.stem),
                "description": data.get("description", ""),
                "version": data.get("version", ""),
                "field_count": str(len(data.get("fields", []))),
            })
        except (json.JSONDecodeError, OSError):
            continue
    return assessments


# ── Scoring engine ───────────────────────────────────────────────────────────


def score_submission(
    assessment_slug: str,
    patient_id: str,
    answers: dict[str, str | int | list[str]],
    scoring_rules: dict | None = None,
) -> dict:
    """Score a patient's assessment submission.

    Computes total, average, severity band, and data-quality flags
    based on the measure's scoring rules.
    """
    if not scoring_rules:
        scoring_rules = {}

    thresholds = scoring_rules.get("severity_thresholds", {})
    reverse_items = set(scoring_rules.get("reverse_scored_items", []))
    required_fields = scoring_rules.get("required_fields", [])

    data_quality_flags: list[str] = []
    numeric_values: list[float] = []

    for key, value in answers.items():
        # Check required fields
        if key in required_fields and (value is None or value == "" or value == []):
            data_quality_flags.append(f"missing_required:{key}")

        # Parse numeric values for scoring
        try:
            num = float(value) if not isinstance(value, (list, dict)) else 0
            numeric_values.append(num)
        except (ValueError, TypeError):
            continue

    if not numeric_values:
        return {
            "assessment_slug": assessment_slug,
            "patient_id": patient_id,
            "total": None,
            "average": None,
            "t_score": None,
            "severity": "unscorable",
            "data_quality_flags": ["no_numeric_answers"] + data_quality_flags,
        }

    # Apply reverse scoring
    max_scale = scoring_rules.get("max_scale", 3)
    scored_values = []
    for i, val in enumerate(numeric_values):
        field_id = list(answers.keys())[i] if i < len(answers) else ""
        if field_id in reverse_items:
            scored_values.append(max_scale - val)
        else:
            scored_values.append(val)

    total = sum(scored_values)
    average = total / len(scored_values) if scored_values else 0.0

    # Determine severity band from thresholds
    severity = _resolve_severity(total, thresholds)

    # If required fields are missing, mark unscorable
    if data_quality_flags:
        # Only flag as unscorable if truly missing required data
        missing_required = [f for f in data_quality_flags if f.startswith("missing_required:")]
        if missing_required and len(missing_required) >= len(required_fields) * 0.5:
            severity = "unscorable"

    return {
        "assessment_slug": assessment_slug,
        "patient_id": patient_id,
        "total": total,
        "average": round(average, 2),
        "t_score": None,  # PROMIS T-score lookup would go here
        "severity": severity,
        "data_quality_flags": data_quality_flags,
    }


def _resolve_severity(total: float, thresholds: dict) -> str:
    """Map a numeric total to a severity band label using configured thresholds."""
    if not thresholds:
        # Default PHQ-9 thresholds
        thresholds = {
            "none": (0, 4),
            "mild": (5, 9),
            "moderate": (10, 14),
            "moderately_severe": (15, 19),
            "severe": (20, 27),
        }

    for band, (lo, hi) in thresholds.items():
        if lo <= total <= hi:
            return band

    return "severe" if total > max(hi for _, hi in thresholds.values()) else "none"


# ── Clinical summary ─────────────────────────────────────────────────────────


def generate_clinical_summary(patient_id: str, recent_results: list[dict]) -> str:
    """Generate a deterministic clinical summary from recent assessment results.

    This is a local, privacy-preserving summary that never calls external APIs.
    """
    if not recent_results:
        return f"No assessment results available for patient {patient_id}."

    lines = [f"## Clinical Summary — Patient {patient_id}", ""]

    # Count by severity
    severity_counts: dict[str, int] = {}
    for r in recent_results:
        sev = r.get("severity", "unscorable")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    lines.append("### Severity Distribution")
    for sev in ["none", "mild", "moderate", "moderately_severe", "severe"]:
        count = severity_counts.get(sev, 0)
        if count > 0:
            lines.append(f"- **{sev.replace('_', ' ').title()}**: {count} result(s)")

    # Latest result
    latest = recent_results[-1] if recent_results else None
    if latest:
        lines.append("")
        lines.append("### Most Recent Assessment")
        lines.append(f"- **Assessment**: {latest.get('assessment_slug', 'Unknown')}")
        lines.append(f"- **Severity**: {latest.get('severity', 'Unknown')}")
        if latest.get("total") is not None:
            lines.append(f"- **Total Score**: {latest['total']}")

    # Trend note
    if len(recent_results) >= 2:
        first_sev = recent_results[0].get("severity", "")
        last_sev = recent_results[-1].get("severity", "")
        if first_sev != last_sev:
            lines.append("")
            lines.append(
                f"### Trend\nSeverity shifted from **{first_sev}** to **{last_sev}** "
                f"across {len(recent_results)} assessments."
            )

    return "\n".join(lines)


def assess_patient(patient_id: str, assessment_slug: str, prompt: str = "") -> dict:
    """Prepare context for an assessment review session.

    Returns the patient context, measure metadata, and scoring rules
    that an agent needs to perform an informed review.
    """
    if not validate_patient_id(patient_id):
        return {"error": f"Invalid patient ID: {patient_id}"}

    return {
        "patient_id": patient_id,
        "assessment_slug": assessment_slug,
        "prompt": prompt,
        "scope": f"Patient {patient_id} — Assessment {assessment_slug}",
        "status": "ready",
    }