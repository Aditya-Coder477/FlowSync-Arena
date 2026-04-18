"""
Shared pytest fixtures for FlowSync Arena backend tests.

Strategy:
- Mock Firestore and Redis so tests run without GCP credentials.
- Provide a real FastAPI test client via httpx.AsyncClient.
- Each unit test module can import fixtures it needs directly.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ---------------------------------------------------------------------------
# App import — must happen AFTER patches are set up in integration tests,
# but is safe to import here so pytest collects fixtures.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Shared mock data (mirrors Firestore seed data)
# ---------------------------------------------------------------------------

ZONE_DOCS = [
    {
        "id": "entrance-north",
        "name": "North Entrance",
        "capacity": 800,
        "current_count": 620,
        "amenities": ["exit", "info"],
        "adjacent_zones": ["main-hall", "gate-a"],
        "coordinates": {"x": 40, "y": 5, "width": 20, "height": 12},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "main-hall",
        "name": "Main Hall",
        "capacity": 3000,
        "current_count": 1800,
        "amenities": ["food", "restroom", "info"],
        "adjacent_zones": ["entrance-north", "stage-area", "east-wing", "west-wing"],
        "coordinates": {"x": 25, "y": 25, "width": 50, "height": 35},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "stage-area",
        "name": "Stage Area",
        "capacity": 5000,
        "current_count": 4600,
        "amenities": [],
        "adjacent_zones": ["main-hall"],
        "coordinates": {"x": 30, "y": 65, "width": 40, "height": 25},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "east-wing",
        "name": "East Wing",
        "capacity": 1200,
        "current_count": 480,
        "amenities": ["restroom", "food"],
        "adjacent_zones": ["main-hall", "gate-b"],
        "coordinates": {"x": 80, "y": 25, "width": 18, "height": 35},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "west-wing",
        "name": "West Wing",
        "capacity": 1200,
        "current_count": 290,
        "amenities": ["restroom", "exit"],
        "adjacent_zones": ["main-hall", "gate-c"],
        "coordinates": {"x": 2, "y": 25, "width": 18, "height": 35},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "gate-a",
        "name": "Gate A",
        "capacity": 500,
        "current_count": 390,
        "amenities": ["exit"],
        "adjacent_zones": ["entrance-north"],
        "coordinates": {"x": 35, "y": 0, "width": 10, "height": 5},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "gate-b",
        "name": "Gate B",
        "capacity": 400,
        "current_count": 120,
        "amenities": ["exit"],
        "adjacent_zones": ["east-wing"],
        "coordinates": {"x": 90, "y": 35, "width": 8, "height": 10},
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "gate-c",
        "name": "Gate C",
        "capacity": 400,
        "current_count": 85,
        "amenities": ["exit"],
        "adjacent_zones": ["west-wing"],
        "coordinates": {"x": 0, "y": 35, "width": 8, "height": 10},
        "last_updated": datetime.now(timezone.utc),
    },
]

QUEUE_DOCS = [
    {
        "id": "q1",
        "zone_id": "gate-a",
        "zone_name": "Gate A",
        "name": "Main Entry Queue",
        "length": 47,
        "avg_wait_min": 8.5,
        "is_virtual": False,
        "status": "open",
        "last_updated": datetime.now(timezone.utc),
    },
    {
        "id": "q2",
        "zone_id": "gate-b",
        "zone_name": "Gate B",
        "name": "East Gate Queue",
        "length": 12,
        "avg_wait_min": 2.1,
        "is_virtual": False,
        "status": "open",
        "last_updated": datetime.now(timezone.utc),
    },
]

ALERT_DOCS = [
    {
        "id": "alert-001",
        "severity": "warning",
        "title": "Congestion at North Entrance",
        "message": "Zone exceeding 75% capacity.",
        "zone_id": "entrance-north",
        "zone_name": "North Entrance",
        "created_at": datetime.now(timezone.utc),
        "resolved": False,
    },
]


# ---------------------------------------------------------------------------
# Firestore mock
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_firestore_zones():
    """Patch firestore.get_all_zones to return ZONE_DOCS."""
    with patch(
        "app.services.firestore.get_all_zones", new_callable=AsyncMock
    ) as mock_fn:
        mock_fn.return_value = ZONE_DOCS
        yield mock_fn


@pytest.fixture()
def mock_firestore_queues():
    """Patch firestore.get_all_queues to return QUEUE_DOCS."""
    with patch(
        "app.services.firestore.get_all_queues", new_callable=AsyncMock
    ) as mock_fn:
        mock_fn.return_value = QUEUE_DOCS
        yield mock_fn


@pytest.fixture()
def mock_firestore_alerts():
    """Patch firestore.get_active_alerts to return ALERT_DOCS."""
    with patch(
        "app.services.firestore.get_active_alerts", new_callable=AsyncMock
    ) as mock_fn:
        mock_fn.return_value = ALERT_DOCS
        yield mock_fn


# ---------------------------------------------------------------------------
# Redis mock — always returns None (cache miss) so services fall through to
# Firestore mock, keeping tests predictable.
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_redis_disabled():
    """Disable Redis for all tests — forces Firestore path."""
    with (
        patch("app.services.redis_client.cache_get", new_callable=AsyncMock, return_value=None),
        patch("app.services.redis_client.cache_set", new_callable=AsyncMock),
        patch("app.services.redis_client.cache_delete", new_callable=AsyncMock),
        patch("app.services.redis_client.get_calm_mode", new_callable=AsyncMock, return_value=False),
        patch("app.services.redis_client.set_calm_mode", new_callable=AsyncMock),
        patch("app.services.redis_client.set_zone_densities", new_callable=AsyncMock),
        patch("app.services.redis_client.get_zone_densities", new_callable=AsyncMock, return_value=None),
        patch("app.services.redis_client.set_queue_states", new_callable=AsyncMock),
        patch("app.services.redis_client.get_queue_states", new_callable=AsyncMock, return_value=None),
        patch("app.services.redis_client.set_active_alerts", new_callable=AsyncMock),
        patch("app.services.redis_client.get_active_alerts_cached", new_callable=AsyncMock, return_value=None),
        patch("app.services.redis_client.invalidate_alerts", new_callable=AsyncMock),
    ):
        yield


# ---------------------------------------------------------------------------
# FastAPI test client (for integration tests)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture()
async def client() -> AsyncIterator[AsyncClient]:
    """
    Async test client for the FastAPI app.
    Firestore and Redis are patched before the app is imported to prevent any
    real network calls during testing.
    """
    with (
        patch("app.services.firestore.init_firestore"),
        patch("app.services.firestore.seed_initial_data", new_callable=AsyncMock),
        patch("app.services.redis_client.init_redis", new_callable=AsyncMock),
        patch("app.services.redis_client.close_redis", new_callable=AsyncMock),
    ):
        from app.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
