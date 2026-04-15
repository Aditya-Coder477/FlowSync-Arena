"""Crowd estimation service — density calculation, Crowd Thermostat algorithm."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from app.models.schemas import DensityLevel, Zone, ZoneStatus
from app.services import firestore as fs
from app.services import redis_client as rc
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def compute_density_level(density_pct: float) -> DensityLevel:
    """Map a density percentage to a human-readable level."""
    if density_pct < 0.20:
        return DensityLevel.EMPTY
    elif density_pct < settings.ZONE_GREEN_THRESHOLD:
        return DensityLevel.GREEN
    elif density_pct < settings.ZONE_AMBER_THRESHOLD:
        return DensityLevel.AMBER
    elif density_pct < settings.ZONE_RED_THRESHOLD:
        return DensityLevel.RED
    else:
        return DensityLevel.CRITICAL


def compute_density_pct(current_count: int, capacity: int) -> float:
    if capacity <= 0:
        return 0.0
    return min(round(current_count / capacity, 4), 1.0)


def _enrich_zone(raw: dict) -> Zone:
    """Convert raw Firestore doc to Zone model with computed fields."""
    capacity = raw.get("capacity", 1)
    count = raw.get("current_count", 0)
    pct = compute_density_pct(count, capacity)
    level = compute_density_level(pct)

    last_updated = raw.get("last_updated")
    if isinstance(last_updated, datetime):
        pass  # already a datetime
    else:
        last_updated = datetime.now(timezone.utc)

    return Zone(
        id=raw["id"],
        name=raw.get("name", raw["id"]),
        capacity=capacity,
        current_count=count,
        density_level=level,
        density_pct=pct,
        last_updated=last_updated,
        coordinates=raw.get("coordinates"),
        adjacent_zones=raw.get("adjacent_zones", []),
        amenities=raw.get("amenities", []),
    )


async def get_zone_status() -> ZoneStatus:
    """
    Returns all zone statuses. Tries Redis cache first, falls back to Firestore.
    Also evaluates whether Calm Mode should be active.
    """
    # Try Redis
    cached = await rc.get_zone_densities()
    if cached:
        zones = [Zone(**z) for z in cached["zones"]]
        avg_density = cached["avg_density"]
        calm_mode = await rc.get_calm_mode()
        return ZoneStatus(
            zones=zones,
            avg_density=avg_density,
            calm_mode_active=calm_mode,
            timestamp=datetime.now(timezone.utc),
        )

    # Fallback to Firestore
    raw_zones = await fs.get_all_zones()
    zones = [_enrich_zone(z) for z in raw_zones]

    if not zones:
        return ZoneStatus(zones=[], avg_density=0.0, calm_mode_active=False, timestamp=datetime.now(timezone.utc))

    avg_density = round(sum(z.density_pct for z in zones) / len(zones), 4)
    calm_mode = avg_density > settings.CALM_MODE_TRIGGER

    # Write to Redis cache
    await rc.set_zone_densities({
        "zones": [z.model_dump(mode="json") for z in zones],
        "avg_density": avg_density,
    })
    await rc.set_calm_mode(calm_mode)

    return ZoneStatus(
        zones=zones,
        avg_density=avg_density,
        calm_mode_active=calm_mode,
        timestamp=datetime.now(timezone.utc),
    )


async def get_zone_by_id(zone_id: str) -> Zone | None:
    """Get a single zone, enriched with computed fields."""
    raw = await fs.get_zone(zone_id)
    if not raw:
        return None
    return _enrich_zone(raw)


def thermostat_redirect(zones: list[Zone], destination_zone_id: str) -> tuple[Zone | None, str | None]:
    """
    Crowd Thermostat: if destination is at or above RED, suggest a similar
    lower-density zone the person can be redirected to.
    Returns (alternative_zone, human_message) or (None, None).
    """
    dest = next((z for z in zones if z.id == destination_zone_id), None)
    if dest is None or dest.density_level not in (DensityLevel.RED, DensityLevel.CRITICAL):
        return None, None

    # Find adjacent zone with lower density
    adjacents = [z for z in zones if z.id in dest.adjacent_zones]
    if not adjacents:
        return None, None

    best = min(adjacents, key=lambda z: z.density_pct)
    if best.density_pct < dest.density_pct - 0.15:  # Only redirect if meaningfully better
        phrases = [
            f"{dest.name} is getting packed. You might have a better time at {best.name} right now.",
            f"Heads up — {dest.name} is quite busy. {best.name} nearby has more room.",
            f"We're gently steering folks toward {best.name} since {dest.name} is near capacity.",
        ]
        import random
        return best, random.choice(phrases)

    return None, None
