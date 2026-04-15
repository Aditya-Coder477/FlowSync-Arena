"""Smart routing service — least-crowded path + Route Confidence Indicator."""
from __future__ import annotations
import logging
import heapq
from app.models.schemas import DensityLevel, RouteRecommendation, RouteStep, Zone
from app.services.crowd import get_zone_status, thermostat_redirect

logger = logging.getLogger(__name__)

# Density cost multipliers for Dijkstra-style path finding
DENSITY_COST: dict[DensityLevel, float] = {
    DensityLevel.EMPTY: 1.0,
    DensityLevel.GREEN: 1.5,
    DensityLevel.AMBER: 3.0,
    DensityLevel.RED: 6.0,
    DensityLevel.CRITICAL: 12.0,
}

# Walk speed estimate (minutes per zone hop — rough approximation)
BASE_WALK_MIN = 2.5


def _build_graph(zones: list[Zone]) -> dict[str, list[tuple[str, float]]]:
    """Build adjacency graph weighted by density cost."""
    zone_map = {z.id: z for z in zones}
    graph: dict[str, list[tuple[str, float]]] = {z.id: [] for z in zones}
    for zone in zones:
        cost = DENSITY_COST[zone.density_level]
        for adj_id in zone.adjacent_zones:
            if adj_id in zone_map:
                graph[zone.id].append((adj_id, cost))
    return graph


def _dijkstra(graph: dict, start: str, end: str) -> list[str]:
    """Returns shortest (least-congested) path as list of zone IDs."""
    dist = {node: float("inf") for node in graph}
    dist[start] = 0.0
    prev: dict[str, str | None] = {node: None for node in graph}
    pq = [(0.0, start)]

    while pq:
        d, node = heapq.heappop(pq)
        if node == end:
            break
        if d > dist[node]:
            continue
        for neighbor, weight in graph.get(node, []):
            new_dist = d + weight
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                prev[neighbor] = node
                heapq.heappush(pq, (new_dist, neighbor))

    # Reconstruct path
    path: list[str] = []
    current: str | None = end
    while current is not None:
        path.append(current)
        current = prev.get(current)
    path.reverse()
    return path if path[0] == start else []


def _human_instruction(zone: Zone, is_first: bool, is_last: bool) -> str:
    """Generate natural language turn-by-turn instruction for a zone."""
    if is_first:
        return f"Start at {zone.name}."
    if is_last:
        return f"You've arrived at {zone.name}."

    density_note = {
        DensityLevel.EMPTY: "it's very quiet here",
        DensityLevel.GREEN: "good flow through here",
        DensityLevel.AMBER: "a little busy, keep moving",
        DensityLevel.RED: "it's getting crowded — stick to the edges",
        DensityLevel.CRITICAL: "very dense — move carefully",
    }
    note = density_note[zone.density_level]
    return f"Continue through {zone.name} — {note}."


def _compute_confidence(path_zones: list[Zone]) -> tuple[float, str]:
    """
    Route Confidence Indicator. Higher confidence when:
    - All zones are green/empty (stable, predictable)
    - Path is short
    - No red/critical zones en route
    """
    if not path_zones:
        return 0.0, "Unknown"

    base = 1.0
    length_penalty = max(0, (len(path_zones) - 2) * 0.05)
    density_penalties = {
        DensityLevel.EMPTY: 0.0,
        DensityLevel.GREEN: 0.02,
        DensityLevel.AMBER: 0.10,
        DensityLevel.RED: 0.20,
        DensityLevel.CRITICAL: 0.35,
    }
    density_penalty = sum(density_penalties[z.density_level] for z in path_zones)
    confidence = max(0.0, min(1.0, base - length_penalty - density_penalty))

    if confidence >= 0.85:
        label = "Very reliable"
    elif confidence >= 0.65:
        label = "Likely accurate"
    elif confidence >= 0.40:
        label = "Broad estimate"
    else:
        label = "Conditions changing fast"

    return round(confidence, 2), label


async def recommend_route(from_zone_id: str, to_zone_id: str) -> RouteRecommendation:
    """
    Primary routing function. Returns recommended path with confidence score,
    estimated time, and optional Crowd Thermostat redirection note.
    """
    status = await get_zone_status()
    zones = status.zones
    zone_map = {z.id: z for z in zones}

    if from_zone_id not in zone_map or to_zone_id not in zone_map:
        # Graceful degradation
        return RouteRecommendation(
            steps=[],
            total_time_min=0,
            confidence=0.0,
            confidence_label="Route unavailable",
        )

    graph = _build_graph(zones)
    path_ids = _dijkstra(graph, from_zone_id, to_zone_id)

    if not path_ids:
        return RouteRecommendation(
            steps=[],
            total_time_min=0,
            confidence=0.0,
            confidence_label="No path found",
        )

    path_zones = [zone_map[zid] for zid in path_ids if zid in zone_map]
    confidence, confidence_label = _compute_confidence(path_zones)

    steps = [
        RouteStep(
            zone_id=z.id,
            zone_name=z.name,
            instruction=_human_instruction(z, i == 0, i == len(path_zones) - 1),
            density_level=z.density_level,
            estimated_time_min=BASE_WALK_MIN if i > 0 else 0.0,
        )
        for i, z in enumerate(path_zones)
    ]

    total_time = round(max(0, len(path_zones) - 1) * BASE_WALK_MIN, 1)

    # Crowd Thermostat check
    alt_zone, thermostat_msg = thermostat_redirect(zones, to_zone_id)

    return RouteRecommendation(
        steps=steps,
        total_time_min=total_time,
        confidence=confidence,
        confidence_label=confidence_label,
        thermostat_note=thermostat_msg,
    )
