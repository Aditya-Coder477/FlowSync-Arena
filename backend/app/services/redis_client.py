"""Redis service — async client for caching and real-time state.

Redis is OPTIONAL. When REDIS_HOST is not configured (or Redis is unreachable),
all cache operations silently no-op and the app reads directly from Firestore.
This allows the app to run on Cloud Run without any managed Redis instance.
"""
from __future__ import annotations
import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis: Optional[aioredis.Redis] = None


async def init_redis() -> None:
    """Connect to Redis only if REDIS_HOST is configured."""
    global _redis

    if not settings.redis_enabled:
        logger.info("Redis not configured (REDIS_HOST is empty). Running without cache.")
        return

    try:
        host = settings.REDIS_HOST
        port = settings.REDIS_PORT
        password = settings.REDIS_PASSWORD or None

        connection_kwargs: dict[str, Any] = {
            "host": host,
            "port": port,
            "password": password,
            "db": settings.REDIS_DB,
            "decode_responses": True,
            "socket_connect_timeout": 5,
        }

        # TLS support for Google Cloud Memorystore
        if settings.REDIS_TLS:
            connection_kwargs["ssl"] = True
            connection_kwargs["ssl_cert_reqs"] = None  # Memorystore uses managed certs

        _redis = aioredis.Redis(**connection_kwargs)
        await _redis.ping()
        logger.info(f"Redis connected at {host}:{port} (TLS={settings.REDIS_TLS})")
    except Exception as e:
        logger.warning(f"Redis unavailable ({e}). Real-time caching will be skipped.")
        _redis = None


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


def get_redis() -> Optional[aioredis.Redis]:
    return _redis


# ── Generic helpers ────────────────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int) -> None:
    if not _redis:
        return
    try:
        await _redis.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.debug(f"Redis set failed for {key}: {e}")


async def cache_get(key: str) -> Optional[Any]:
    if not _redis:
        return None
    try:
        raw = await _redis.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        logger.debug(f"Redis get failed for {key}: {e}")
        return None


async def cache_delete(key: str) -> None:
    if not _redis:
        return
    try:
        await _redis.delete(key)
    except Exception as e:
        logger.debug(f"Redis delete failed for {key}: {e}")


# ── Domain-specific cache keys ─────────────────────────────────────────────

ZONE_DENSITY_KEY = "zones:density"
ALERT_LIST_KEY = "alerts:active"
QUEUE_STATE_KEY = "queues:live"
CALM_MODE_KEY = "system:calm_mode"


async def set_zone_densities(densities: dict) -> None:
    await cache_set(ZONE_DENSITY_KEY, densities, settings.ZONE_DENSITY_TTL)


async def get_zone_densities() -> Optional[dict]:
    return await cache_get(ZONE_DENSITY_KEY)


async def set_active_alerts(alerts: list) -> None:
    await cache_set(ALERT_LIST_KEY, alerts, settings.ALERT_TTL)


async def get_active_alerts_cached() -> Optional[list]:
    return await cache_get(ALERT_LIST_KEY)


async def invalidate_alerts() -> None:
    await cache_delete(ALERT_LIST_KEY)


async def set_queue_states(queues: list) -> None:
    await cache_set(QUEUE_STATE_KEY, queues, settings.QUEUE_STATE_TTL)


async def get_queue_states() -> Optional[list]:
    return await cache_get(QUEUE_STATE_KEY)


async def set_calm_mode(active: bool) -> None:
    await cache_set(CALM_MODE_KEY, {"active": active}, ttl=60)


async def get_calm_mode() -> bool:
    result = await cache_get(CALM_MODE_KEY)
    return result.get("active", False) if result else False


# ── Session ────────────────────────────────────────────────────────────────

async def set_session(user_id: str, data: dict) -> None:
    await cache_set(f"session:{user_id}", data, settings.SESSION_TTL)


async def get_session(user_id: str) -> Optional[dict]:
    return await cache_get(f"session:{user_id}")


async def delete_session(user_id: str) -> None:
    await cache_delete(f"session:{user_id}")
