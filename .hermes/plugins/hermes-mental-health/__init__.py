"""Hermes Mental Health plugin — DSM-5-TR assessment management tools."""

from __future__ import annotations

from .tools import (
    assess_patient,
    generate_clinical_summary,
    list_assessments,
    list_patients,
    patient_root,
    score_submission,
    template_root,
    validate_patient_id,
)
from .schemas import (
    AssessmentResult,
    PatientRecord,
    ScoringOutput,
    SeverityBand,
)

__all__ = [
    "AssessmentResult",
    "PatientRecord",
    "ScoringOutput",
    "SeverityBand",
    "assess_patient",
    "generate_clinical_summary",
    "list_assessments",
    "list_patients",
    "patient_root",
    "score_submission",
    "template_root",
    "validate_patient_id",
]