"""Queue prediction service — EMA heuristic + peak-hour adjustment."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from app.models.schemas import Queue, QueueLive
from app.services import firestore as fs
from app.services import redis_client as rc
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Average service rate (people processed per minute per queue)
SERVICE_RATE_PER_MIN = 4.5

# Peak-hour multipliers (hour → multiplier)
PEAK_MULTIPLIERS = {
    9: 1.3, 10: 1.5, 11: 1.6, 12: 1.4,
    13: 1.2, 17: 1.4, 18: 1.7, 19: 1.8, 20: 1.5, 21: 1.2,
}


def _get_peak_multiplier() -> float:
    current_hour = datetime.now(timezone.utc).hour
    return PEAK_MULTIPLIERS.get(current_hour, 1.0)


def _predict_wait(queue_length: int, avg_wait: float) -> float:
    """
    Blended prediction: weighted average of:
    - simple throughput model (length / rate)
    - historical average wait
    with peak-hour adjustment.
    """
    model_wait = queue_length / SERVICE_RATE_PER_MIN
    blended = (0.6 * model_wait) + (0.4 * avg_wait)
    peak = _get_peak_multiplier()
    predicted = round(blended * peak, 1)
    return max(0.0, predicted)


def _enrich_queue(raw: dict) -> Queue:
    length = raw.get("length", 0)
    avg_wait = raw.get("avg_wait_min", 0.0)
    predicted = _predict_wait(length, avg_wait)

    last_updated = raw.get("last_updated")
    if not isinstance(last_updated, datetime):
        last_updated = datetime.now(timezone.utc)

    return Queue(
        id=raw["id"],
        zone_id=raw.get("zone_id", ""),
        zone_name=raw.get("zone_name", ""),
        name=raw.get("name", "Queue"),
        length=length,
        avg_wait_min=avg_wait,
        predicted_wait_min=predicted,
        is_virtual=raw.get("is_virtual", False),
        status=raw.get("status", "open"),
        last_updated=last_updated,
    )


async def get_live_queues() -> QueueLive:
    """Returns live queue data with predictions. Redis-cached."""
    cached = await rc.get_queue_states()
    if cached:
        queues = [Queue(**q) for q in cached]
        return QueueLive(queues=queues, timestamp=datetime.now(timezone.utc))

    raw_queues = await fs.get_all_queues()
    queues = [_enrich_queue(q) for q in raw_queues]

    await rc.set_queue_states([q.model_dump(mode="json") for q in queues])

    return QueueLive(queues=queues, timestamp=datetime.now(timezone.utc))
