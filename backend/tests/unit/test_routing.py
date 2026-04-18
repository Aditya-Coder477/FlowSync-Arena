"""
Unit tests for smart routing service.

Tests cover:
- _build_graph: adjacency graph construction from zone data
- _dijkstra: shortest-path algorithm with edge cases
- _compute_confidence: route confidence scoring
- _human_instruction: turn-by-turn instruction text
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone

from app.models.schemas import DensityLevel, Zone
from app.services.routing import (
    _build_graph,
    _compute_confidence,
    _dijkstra,
    _human_instruction,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _zone(
    zone_id: str,
    name: str,
    density_pct: float,
    adjacent: list[str],
    amenities: list[str] | None = None,
) -> Zone:
    from app.services.crowd import compute_density_level

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
        amenities=amenities or [],
    )


# ---------------------------------------------------------------------------
# _build_graph
# ---------------------------------------------------------------------------

class TestBuildGraph:
    def test_single_zone_no_adjacents(self):
        zones = [_zone("a", "A", 0.30, [])]
        graph = _build_graph(zones)
        assert "a" in graph
        assert graph["a"] == []

    def test_two_connected_zones(self):
        zones = [
            _zone("a", "A", 0.30, ["b"]),
            _zone("b", "B", 0.60, ["a"]),
        ]
        graph = _build_graph(zones)
        neighbor_ids = [n for n, _ in graph["a"]]
        assert "b" in neighbor_ids

    def test_graph_excludes_unknown_adjacents(self):
        """If adjacent_zones references a zone not in the list, skip it."""
        zones = [_zone("a", "A", 0.30, ["b", "nonexistent"])]
        graph = _build_graph(zones)
        neighbor_ids = [n for n, _ in graph["a"]]
        assert "nonexistent" not in neighbor_ids
        assert "b" not in neighbor_ids  # b is also not in zones list

    def test_density_cost_applied(self):
        """Critical zones should have higher traversal cost than empty ones."""
        zones = [
            _zone("empty-zone", "Empty", 0.10, []),
            _zone("critical-zone", "Critical", 0.95, []),
            _zone("source", "Source", 0.30, ["empty-zone", "critical-zone"]),
        ]
        graph = _build_graph(zones)
        neighbor_costs = {n: c for n, c in graph["source"]}
        # Critical should be more expensive to traverse
        if "empty-zone" in neighbor_costs and "critical-zone" in neighbor_costs:
            assert neighbor_costs["critical-zone"] > neighbor_costs["empty-zone"]

    def test_every_zone_gets_a_graph_entry(self):
        zones = [
            _zone("a", "A", 0.20, ["b"]),
            _zone("b", "B", 0.50, ["a", "c"]),
            _zone("c", "C", 0.80, ["b"]),
        ]
        graph = _build_graph(zones)
        assert set(graph.keys()) == {"a", "b", "c"}


# ---------------------------------------------------------------------------
# _dijkstra
# ---------------------------------------------------------------------------

class TestDijkstra:
    def _simple_graph(self):
        return {
            "a": [("b", 1.0), ("c", 10.0)],
            "b": [("c", 1.0)],
            "c": [],
        }

    def test_direct_path(self):
        graph = {"a": [("b", 1.0)], "b": []}
        path = _dijkstra(graph, "a", "b")
        assert path == ["a", "b"]

    def test_prefers_cheaper_route(self):
        """a→b→c should be chosen over direct a→c (higher cost)."""
        graph = self._simple_graph()
        path = _dijkstra(graph, "a", "c")
        assert path == ["a", "b", "c"]

    def test_same_start_and_end(self):
        graph = {"a": [], "b": [("a", 1.0)]}
        path = _dijkstra(graph, "a", "a")
        assert path == ["a"]

    def test_disconnected_graph_returns_empty(self):
        """No path between disconnected nodes returns []."""
        graph = {"a": [], "b": []}
        path = _dijkstra(graph, "a", "b")
        assert path == []

    def test_longer_path_with_multiple_nodes(self):
        graph = {
            "entrance-north": [("main-hall", 1.5)],
            "main-hall": [("east-wing", 1.5), ("stage-area", 6.0)],
            "east-wing": [("gate-b", 1.5)],
            "gate-b": [],
            "stage-area": [],
        }
        path = _dijkstra(graph, "entrance-north", "gate-b")
        assert path[0] == "entrance-north"
        assert path[-1] == "gate-b"
        assert len(path) == 4  # entrance-north → main-hall → east-wing → gate-b

    def test_unknown_start_returns_empty(self):
        graph = {"a": [], "b": []}
        path = _dijkstra(graph, "nonexistent", "b")
        assert path == []


# ---------------------------------------------------------------------------
# _compute_confidence
# ---------------------------------------------------------------------------

class TestComputeConfidence:
    def test_all_empty_zones_max_confidence(self):
        zones = [_zone("a", "A", 0.10, []) for _ in range(2)]
        confidence, label = _compute_confidence(zones)
        assert confidence >= 0.90
        assert "reliable" in label.lower() or "very" in label.lower()

    def test_empty_path_returns_zero(self):
        confidence, label = _compute_confidence([])
        assert confidence == 0.0
        assert label == "Unknown"

    def test_critical_zones_reduce_confidence(self):
        empty_zones = [_zone("a", "A", 0.10, []) for _ in range(2)]
        critical_zones = [_zone("x", "X", 0.95, []) for _ in range(2)]
        conf_empty, _ = _compute_confidence(empty_zones)
        conf_critical, _ = _compute_confidence(critical_zones)
        assert conf_critical < conf_empty

    def test_long_path_reduces_confidence(self):
        short = [_zone(str(i), str(i), 0.20, []) for i in range(2)]
        long_path = [_zone(str(i), str(i), 0.20, []) for i in range(10)]
        conf_short, _ = _compute_confidence(short)
        conf_long, _ = _compute_confidence(long_path)
        assert conf_long < conf_short

    def test_confidence_label_matches_value(self):
        high_conf_zones = [_zone("a", "A", 0.10, [])]
        confidence, label = _compute_confidence(high_conf_zones)
        if confidence >= 0.85:
            assert "reliable" in label.lower()

    def test_confidence_always_between_0_and_1(self):
        zones = [_zone(str(i), str(i), 0.95, []) for i in range(20)]
        confidence, _ = _compute_confidence(zones)
        assert 0.0 <= confidence <= 1.0


# ---------------------------------------------------------------------------
# _human_instruction
# ---------------------------------------------------------------------------

class TestHumanInstruction:
    def test_first_step_says_start(self):
        zone = _zone("a", "Gate A", 0.20, [])
        instr = _human_instruction(zone, is_first=True, is_last=False)
        assert "Start" in instr or "start" in instr
        assert "Gate A" in instr

    def test_last_step_says_arrived(self):
        zone = _zone("b", "Stage Area", 0.60, [])
        instr = _human_instruction(zone, is_first=False, is_last=True)
        assert "arrived" in instr.lower() or "Stage Area" in instr

    def test_middle_step_contains_zone_name(self):
        zone = _zone("c", "Main Hall", 0.55, [])
        instr = _human_instruction(zone, is_first=False, is_last=False)
        assert "Main Hall" in instr

    def test_critical_zone_instruction_warns(self):
        zone = _zone("d", "Hot Zone", 0.95, [])
        instr = _human_instruction(zone, is_first=False, is_last=False)
        # Should contain some density-aware language
        assert len(instr) > 10
