"""
Unit tests for crowd density service.

Tests cover:
- compute_density_pct: edge cases and normal values
- compute_density_level: all five density bands
- thermostat_redirect: crowd thermostat logic
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone

from app.models.schemas import DensityLevel
from app.services.crowd import (
    compute_density_level,
    compute_density_pct,
    thermostat_redirect,
)


# ---------------------------------------------------------------------------
# compute_density_pct
# ---------------------------------------------------------------------------

class TestComputeDensityPct:
    def test_normal_case(self):
        assert compute_density_pct(500, 1000) == 0.5

    def test_zero_count(self):
        assert compute_density_pct(0, 1000) == 0.0

    def test_full_capacity(self):
        assert compute_density_pct(1000, 1000) == 1.0

    def test_over_capacity_capped_at_one(self):
        """Over-capacity count must be capped at 1.0, not overflow."""
        assert compute_density_pct(1500, 1000) == 1.0

    def test_zero_capacity_returns_zero(self):
        """Guard against division by zero."""
        assert compute_density_pct(100, 0) == 0.0

    def test_precision_four_decimal_places(self):
        result = compute_density_pct(1, 3)
        assert result == round(1 / 3, 4)


# ---------------------------------------------------------------------------
# compute_density_level
# ---------------------------------------------------------------------------

class TestComputeDensityLevel:
    def test_empty_level(self):
        """Below 20% → empty."""
        assert compute_density_level(0.10) == DensityLevel.EMPTY
        assert compute_density_level(0.00) == DensityLevel.EMPTY
        assert compute_density_level(0.19) == DensityLevel.EMPTY

    def test_green_level(self):
        """20–50% → green."""
        assert compute_density_level(0.20) == DensityLevel.GREEN
        assert compute_density_level(0.35) == DensityLevel.GREEN
        assert compute_density_level(0.499) == DensityLevel.GREEN

    def test_amber_level(self):
        """50–75% → amber."""
        assert compute_density_level(0.50) == DensityLevel.AMBER
        assert compute_density_level(0.65) == DensityLevel.AMBER
        assert compute_density_level(0.749) == DensityLevel.AMBER

    def test_red_level(self):
        """75–90% → red."""
        assert compute_density_level(0.75) == DensityLevel.RED
        assert compute_density_level(0.80) == DensityLevel.RED
        assert compute_density_level(0.899) == DensityLevel.RED

    def test_critical_level(self):
        """≥ 90% → critical."""
        assert compute_density_level(0.90) == DensityLevel.CRITICAL
        assert compute_density_level(0.95) == DensityLevel.CRITICAL
        assert compute_density_level(1.00) == DensityLevel.CRITICAL

    def test_boundary_50_is_amber(self):
        """Exactly 50% is the green→amber boundary."""
        assert compute_density_level(0.50) == DensityLevel.AMBER

    def test_boundary_75_is_red(self):
        assert compute_density_level(0.75) == DensityLevel.RED

    def test_boundary_90_is_critical(self):
        assert compute_density_level(0.90) == DensityLevel.CRITICAL


# ---------------------------------------------------------------------------
# thermostat_redirect
# ---------------------------------------------------------------------------

def _make_zone(zone_id: str, name: str, density_pct: float, adjacent: list[str]):
    """Helper: build a Zone-like object for thermostat tests."""
    from app.models.schemas import Zone

    level = compute_density_level(density_pct)
    return Zone(
        id=zone_id,
        name=name,
        capacity=1000,
        current_count=int(density_pct * 1000),
        density_level=level,
        density_pct=density_pct,
        last_updated=datetime.now(timezone.utc),
        adjacent_zones=adjacent,
        amenities=[],
    )


class TestThermostatRedirect:
    def test_no_redirect_when_destination_is_green(self):
        """Thermostat should not redirect if destination is not crowded."""
        zones = [
            _make_zone("gate-a", "Gate A", 0.40, ["entrance-north"]),
            _make_zone("entrance-north", "North Entrance", 0.40, ["gate-a"]),
        ]
        alt, msg = thermostat_redirect(zones, "gate-a")
        assert alt is None
        assert msg is None

    def test_redirect_when_destination_is_critical(self):
        """Thermostat should suggest adjacent zone when destination is critical."""
        zones = [
            _make_zone("stage-area", "Stage Area", 0.95, ["main-hall"]),
            _make_zone("main-hall", "Main Hall", 0.40, ["stage-area", "east-wing"]),
            _make_zone("east-wing", "East Wing", 0.30, ["main-hall"]),
        ]
        alt, msg = thermostat_redirect(zones, "stage-area")
        assert alt is not None
        assert isinstance(msg, str)
        assert len(msg) > 0

    def test_redirect_when_destination_is_red(self):
        """Red (not just critical) zones should also trigger thermostat."""
        zones = [
            _make_zone("stage-area", "Stage Area", 0.80, ["main-hall"]),
            _make_zone("main-hall", "Main Hall", 0.30, ["stage-area"]),
        ]
        alt, msg = thermostat_redirect(zones, "stage-area")
        assert alt is not None

    def test_no_redirect_when_adjacent_not_meaningfully_better(self):
        """If adjacent zone is almost as crowded, don't redirect."""
        zones = [
            _make_zone("stage-area", "Stage Area", 0.92, ["main-hall"]),
            _make_zone("main-hall", "Main Hall", 0.88, ["stage-area"]),
        ]
        alt, msg = thermostat_redirect(zones, "stage-area")
        assert alt is None  # less than 15% difference

    def test_no_redirect_for_unknown_zone(self):
        """Unknown destination → graceful no-op."""
        zones = [_make_zone("gate-a", "Gate A", 0.95, [])]
        alt, msg = thermostat_redirect(zones, "nonexistent-zone")
        assert alt is None
        assert msg is None

    def test_no_redirect_when_no_adjacent_zones(self):
        """Critical zone with no adjacents → cannot redirect."""
        zones = [_make_zone("stage-area", "Stage Area", 0.95, [])]
        alt, msg = thermostat_redirect(zones, "stage-area")
        assert alt is None

    def test_redirect_chooses_least_dense_adjacent(self):
        """When multiple adjacents exist, pick the quietest one."""
        zones = [
            _make_zone("stage-area", "Stage Area", 0.95, ["east-wing", "west-wing"]),
            _make_zone("east-wing", "East Wing", 0.65, ["stage-area"]),
            _make_zone("west-wing", "West Wing", 0.30, ["stage-area"]),
        ]
        alt, _ = thermostat_redirect(zones, "stage-area")
        assert alt is not None
        assert alt.id == "west-wing"  # lower density chosen
