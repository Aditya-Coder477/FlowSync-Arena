"""
Unit tests for queue prediction service.

Tests cover:
- _get_peak_multiplier: correct multiplier by hour
- _predict_wait: blended EMA prediction model
- _enrich_queue: raw doc → Queue model enrichment
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from app.services.queue_pred import (
    _get_peak_multiplier,
    _predict_wait,
    _enrich_queue,
    SERVICE_RATE_PER_MIN,
    PEAK_MULTIPLIERS,
)


# ---------------------------------------------------------------------------
# _get_peak_multiplier
# ---------------------------------------------------------------------------

class TestGetPeakMultiplier:
    @pytest.mark.parametrize("hour,expected", [
        (9, 1.3),
        (10, 1.5),
        (11, 1.6),
        (18, 1.7),
        (19, 1.8),
        (20, 1.5),
    ])
    def test_known_peak_hours(self, hour, expected):
        """Peak hours should return their specific multiplier."""
        with patch("app.services.queue_pred.datetime") as mock_dt:
            mock_dt.now.return_value.hour = hour
            result = _get_peak_multiplier()
        assert result == expected

    def test_off_peak_hour_returns_1(self):
        """Hours not in PEAK_MULTIPLIERS should return 1.0."""
        with patch("app.services.queue_pred.datetime") as mock_dt:
            mock_dt.now.return_value.hour = 3  # 3am — definitely not peak
            result = _get_peak_multiplier()
        assert result == 1.0

    def test_multiplier_always_positive(self):
        """All possible hour values should yield a positive multiplier."""
        for hour in range(24):
            multiplier = PEAK_MULTIPLIERS.get(hour, 1.0)
            assert multiplier > 0


# ---------------------------------------------------------------------------
# _predict_wait
# ---------------------------------------------------------------------------

class TestPredictWait:
    def test_zero_queue_zero_wait(self):
        """No one in line should predict near-zero wait."""
        # With off-peak (multiplier=1.0)
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            result = _predict_wait(0, 0.0)
        assert result == 0.0

    def test_reasonable_prediction_range(self):
        """47 people at 4.5 people/min ≈ 10.4 model wait."""
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            result = _predict_wait(47, 8.5)
        # model_wait = 47/4.5 = 10.44, avg=8.5, blended = 0.6*10.44 + 0.4*8.5 = 9.66
        assert 9.0 <= result <= 11.0

    def test_peak_multiplier_increases_wait(self):
        """Peak multiplier > 1 should increase predicted wait."""
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            off_peak = _predict_wait(20, 5.0)
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.8):
            peak = _predict_wait(20, 5.0)
        assert peak > off_peak

    def test_result_is_never_negative(self):
        """Prediction must always be non-negative."""
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=0.5):
            result = _predict_wait(0, 0.0)
        assert result >= 0.0

    def test_blending_weight_is_60_40(self):
        """Verify the 60/40 blend ratio is applied correctly."""
        queue_length = 10
        avg_wait = 4.0
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            result = _predict_wait(queue_length, avg_wait)
        model_wait = queue_length / SERVICE_RATE_PER_MIN
        expected = round((0.6 * model_wait + 0.4 * avg_wait) * 1.0, 1)
        assert result == expected


# ---------------------------------------------------------------------------
# _enrich_queue
# ---------------------------------------------------------------------------

class TestEnrichQueue:
    def _raw_queue(self, **overrides):
        base = {
            "id": "q-test",
            "zone_id": "gate-a",
            "zone_name": "Gate A",
            "name": "Main Entry Queue",
            "length": 20,
            "avg_wait_min": 5.0,
            "is_virtual": False,
            "status": "open",
            "last_updated": datetime.now(timezone.utc),
        }
        return {**base, **overrides}

    def test_enriches_with_predicted_wait(self):
        raw = self._raw_queue()
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            queue = _enrich_queue(raw)
        assert queue.predicted_wait_min >= 0

    def test_missing_last_updated_uses_now(self):
        raw = self._raw_queue()
        del raw["last_updated"]
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            queue = _enrich_queue(raw)
        assert isinstance(queue.last_updated, datetime)

    def test_all_fields_populated(self):
        raw = self._raw_queue()
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            queue = _enrich_queue(raw)
        assert queue.id == "q-test"
        assert queue.zone_id == "gate-a"
        assert queue.name == "Main Entry Queue"
        assert queue.is_virtual is False
        assert queue.status == "open"

    def test_virtual_queue_flag(self):
        raw = self._raw_queue(is_virtual=True)
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            queue = _enrich_queue(raw)
        assert queue.is_virtual is True

    def test_closed_queue_preserved(self):
        raw = self._raw_queue(status="closed")
        with patch("app.services.queue_pred._get_peak_multiplier", return_value=1.0):
            queue = _enrich_queue(raw)
        assert queue.status == "closed"
