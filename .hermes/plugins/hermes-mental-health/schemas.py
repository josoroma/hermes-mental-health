"""Schemas for the Hermes Mental Health plugin tools."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class SeverityBand(Enum):
    """DSM-5-TR severity classification bands."""

    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    MODERATELY_SEVERE = "moderately_severe"
    SEVERE = "severe"
    UNSCORABLE = "unscorable"


class FieldType(Enum):
    """Assessment field types supported by the platform."""

    SCALE = "scale"
    TEXT = "text"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    BOOLEAN = "boolean"


class ResultChartType(Enum):
    """Chart visualization types driven by the measure's scoring shape."""

    SEVERITY_BAR = "severity_bar"
    T_SCORE_GAUGE = "t_score_gauge"
    DOMAIN_BARS = "domain_bars"
    TREND_LINE = "trend_line"
    NONE = "none"


class InviteStatus(Enum):
    """Assessment invite lifecycle states."""

    PENDING = "pending"
    COMPLETED = "completed"


@dataclass(frozen=True)
class PatientRecord:
    """De-identified patient record scoped to one session."""

    patient_id: str
    profile_path: str
    active: bool = True


@dataclass(frozen=True)
class AssessmentMeasure:
    """A DSM-5-TR assessment measure definition."""

    slug: str
    title: str
    description: str
    version: str
    field_count: int
    result_chart: ResultChartType = ResultChartType.SEVERITY_BAR
    instructions: str = ""


@dataclass(frozen=True)
class ScoringOutput:
    """Machine-readable scoring result for one assessment submission."""

    assessment_slug: str
    patient_id: str
    total: float | None = None
    average: float | None = None
    t_score: float | None = None
    severity: SeverityBand = SeverityBand.UNSCORABLE
    data_quality_flags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class AssessmentResult:
    """A completed assessment submission with scores and answers."""

    result_id: str
    invite_token: str
    patient_id: str
    assessment_slug: str
    scoring: ScoringOutput
    answers: dict[str, str | int | list[str]] = field(default_factory=dict)
    created_at: str = ""