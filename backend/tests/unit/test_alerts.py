"""
Unit tests for alert triggering logic.

Tests cover:
- AlertCreate schema: field validation and max_length enforcement
- Alert model: serialization of all fields
- AlertSeverity enum: valid values
- _raw_to_alert helper: conversion from Firestore doc to Alert model
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from app.models.schemas import Alert, AlertCreate, AlertSeverity


# ---------------------------------------------------------------------------
# AlertCreate validation
# ---------------------------------------------------------------------------

class TestAlertCreate:
    def test_valid_creation(self):
        alert = AlertCreate(
            severity=AlertSeverity.WARNING,
            title="Gate A congestion",
            message="Queue exceeding safe threshold.",
            zone_id="gate-a",
        )
        assert alert.severity == AlertSeverity.WARNING
        assert alert.zone_id == "gate-a"

    def test_optional_zone_id(self):
        alert = AlertCreate(
            severity=AlertSeverity.INFO,
            title="System notice",
            message="Routine check completed.",
        )
        assert alert.zone_id is None

    def test_invalid_severity_raises(self):
        with pytest.raises(ValidationError):
            AlertCreate(
                severity="SUPER_CRITICAL",  # not a valid enum value
                title="Bad alert",
                message="This should fail.",
            )

    def test_title_max_length_enforced(self):
        """Title must not exceed 120 characters."""
        long_title = "A" * 121
        with pytest.raises(ValidationError):
            AlertCreate(
                severity=AlertSeverity.INFO,
                title=long_title,
                message="Normal message.",
            )

    def test_title_at_max_length_allowed(self):
        """Title at exactly 120 characters should be accepted."""
        exact_title = "A" * 120
        alert = AlertCreate(
            severity=AlertSeverity.INFO,
            title=exact_title,
            message="Normal message.",
        )
        assert len(alert.title) == 120

    def test_message_max_length_enforced(self):
        """Message must not exceed 500 characters."""
        long_message = "B" * 501
        with pytest.raises(ValidationError):
            AlertCreate(
                severity=AlertSeverity.WARNING,
                title="Valid title",
                message=long_message,
            )

    def test_message_at_max_length_allowed(self):
        exact_message = "B" * 500
        alert = AlertCreate(
            severity=AlertSeverity.WARNING,
            title="Valid title",
            message=exact_message,
        )
        assert len(alert.message) == 500

    def test_empty_title_raises(self):
        """Empty string title should fail min_length validation."""
        with pytest.raises(ValidationError):
            AlertCreate(
                severity=AlertSeverity.INFO,
                title="",
                message="Some message",
            )


# ---------------------------------------------------------------------------
# AlertSeverity enum
# ---------------------------------------------------------------------------

class TestAlertSeverity:
    def test_all_valid_values(self):
        for severity in ("info", "warning", "critical"):
            s = AlertSeverity(severity)
            assert s.value == severity

    def test_str_representation(self):
        assert str(AlertSeverity.CRITICAL) == "critical"


# ---------------------------------------------------------------------------
# _raw_to_alert helper (extracted from routers/alerts.py)
# ---------------------------------------------------------------------------

def _raw_to_alert(raw: dict) -> Alert:
    """Duplicate of the helper in alerts.py for isolated testing."""
    created_at = raw.get("created_at")
    if not isinstance(created_at, datetime):
        created_at = datetime.now(timezone.utc)
    resolved_at = raw.get("resolved_at")
    return Alert(
        id=raw["id"],
        severity=raw.get("severity", AlertSeverity.INFO),
        title=raw.get("title", "Alert"),
        message=raw.get("message", ""),
        zone_id=raw.get("zone_id"),
        zone_name=raw.get("zone_name"),
        created_at=created_at,
        resolved=raw.get("resolved", False),
        resolved_at=resolved_at if isinstance(resolved_at, datetime) else None,
    )


class TestRawToAlert:
    def test_basic_conversion(self):
        raw = {
            "id": "alert-001",
            "severity": "warning",
            "title": "Gate problem",
            "message": "Gate B scanner offline.",
            "zone_id": "gate-b",
            "zone_name": "Gate B",
            "created_at": datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc),
            "resolved": False,
        }
        alert = _raw_to_alert(raw)
        assert alert.id == "alert-001"
        assert alert.severity == AlertSeverity.WARNING
        assert alert.resolved is False
        assert alert.zone_id == "gate-b"

    def test_missing_created_at_defaults_to_now(self):
        raw = {
            "id": "alert-002",
            "severity": "info",
            "title": "Info notice",
            "message": "All clear.",
            "resolved": False,
        }
        alert = _raw_to_alert(raw)
        # Should not raise; created_at should be set to approximately now
        assert isinstance(alert.created_at, datetime)

    def test_resolved_alert(self):
        now = datetime.now(timezone.utc)
        raw = {
            "id": "alert-003",
            "severity": "critical",
            "title": "Resolved incident",
            "message": "Cleared.",
            "resolved": True,
            "resolved_at": now,
            "created_at": now,
        }
        alert = _raw_to_alert(raw)
        assert alert.resolved is True
        assert alert.resolved_at == now

    def test_resolved_at_none_if_not_datetime(self):
        raw = {
            "id": "alert-004",
            "severity": "info",
            "title": "Notice",
            "message": "Test.",
            "resolved": True,
            "resolved_at": "not-a-datetime",
            "created_at": datetime.now(timezone.utc),
        }
        alert = _raw_to_alert(raw)
        assert alert.resolved_at is None
