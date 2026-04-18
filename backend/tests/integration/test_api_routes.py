"""
Integration tests for FlowSync Arena API routes.

Uses httpx.AsyncClient against the real FastAPI app with mocked Firestore
and Redis (handled by conftest.py fixtures).

Covers:
- GET /health
- GET /zones/status
- POST /routes/recommend
- GET /queues/live
- GET /alerts
- POST /alerts
- GET /admin/analytics
- GET /admin/tasks
- GET /admin/control-room
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "status" in data
    assert data["status"] == "operational"


# ---------------------------------------------------------------------------
# Zones
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_zone_status(client: AsyncClient, mock_firestore_zones):
    response = await client.get("/zones/status")
    assert response.status_code == 200

    data = response.json()
    assert "zones" in data
    assert "avg_density" in data
    assert "calm_mode_active" in data
    assert "timestamp" in data
    assert isinstance(data["zones"], list)
    assert len(data["zones"]) > 0


@pytest.mark.asyncio
async def test_zone_status_density_pct_in_range(client: AsyncClient, mock_firestore_zones):
    response = await client.get("/zones/status")
    for zone in response.json()["zones"]:
        assert 0.0 <= zone["density_pct"] <= 1.0


@pytest.mark.asyncio
async def test_zone_status_has_density_level(client: AsyncClient, mock_firestore_zones):
    response = await client.get("/zones/status")
    valid_levels = {"empty", "green", "amber", "red", "critical"}
    for zone in response.json()["zones"]:
        assert zone["density_level"] in valid_levels


@pytest.mark.asyncio
async def test_get_single_zone(client: AsyncClient, mock_firestore_zones):
    with patch(
        "app.services.firestore.get_zone",
        new_callable=AsyncMock,
        return_value={
            "id": "entrance-north",
            "name": "North Entrance",
            "capacity": 800,
            "current_count": 620,
            "amenities": ["exit", "info"],
            "adjacent_zones": ["main-hall"],
            "last_updated": None,
        },
    ):
        response = await client.get("/zones/entrance-north")
    assert response.status_code == 200
    assert response.json()["id"] == "entrance-north"


@pytest.mark.asyncio
async def test_get_nonexistent_zone_returns_404(client: AsyncClient):
    with patch(
        "app.services.firestore.get_zone",
        new_callable=AsyncMock,
        return_value=None,
    ):
        response = await client.get("/zones/nonexistent-zone-xyz")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_route_recommendation_valid(client: AsyncClient, mock_firestore_zones):
    response = await client.post(
        "/routes/recommend",
        json={"from_zone": "entrance-north", "to_zone": "east-wing"},
    )
    assert response.status_code == 200

    data = response.json()
    assert "steps" in data
    assert "total_time_min" in data
    assert "confidence" in data
    assert "confidence_label" in data
    assert 0.0 <= data["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_route_recommendation_unknown_zones(client: AsyncClient, mock_firestore_zones):
    """Unknown zone IDs should return a graceful response, not a 500."""
    response = await client.post(
        "/routes/recommend",
        json={"from_zone": "fantasy-land", "to_zone": "nowhere-city"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["steps"] == []
    assert data["confidence"] == 0.0


@pytest.mark.asyncio
async def test_route_recommendation_missing_fields(client: AsyncClient):
    """Missing required fields should return 422 Unprocessable Entity."""
    response = await client.post("/routes/recommend", json={})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Queues
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_live_queues(client: AsyncClient, mock_firestore_queues):
    response = await client.get("/queues/live")
    assert response.status_code == 200

    data = response.json()
    assert "queues" in data
    assert "timestamp" in data
    assert isinstance(data["queues"], list)


@pytest.mark.asyncio
async def test_queue_has_predicted_wait(client: AsyncClient, mock_firestore_queues):
    response = await client.get("/queues/live")
    for queue in response.json()["queues"]:
        assert "predicted_wait_min" in queue
        assert queue["predicted_wait_min"] >= 0


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_active_alerts(client: AsyncClient, mock_firestore_alerts):
    response = await client.get("/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_alert_success(client: AsyncClient):
    with patch(
        "app.services.firestore.create_alert",
        new_callable=AsyncMock,
        return_value="new-alert-id",
    ):
        response = await client.post(
            "/alerts",
            json={
                "severity": "warning",
                "title": "Test alert from integration test",
                "message": "This is a test message generated by the test suite.",
                "zone_id": "gate-a",
            },
        )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == "new-alert-id"


@pytest.mark.asyncio
async def test_create_alert_title_too_long(client: AsyncClient):
    """Title exceeding 120 chars should be rejected with 422."""
    response = await client.post(
        "/alerts",
        json={
            "severity": "info",
            "title": "X" * 121,
            "message": "Short message",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_alert_invalid_severity(client: AsyncClient):
    response = await client.post(
        "/alerts",
        json={"severity": "EXTREME", "title": "Bad", "message": "Bad alert"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_resolve_alert(client: AsyncClient):
    with patch(
        "app.services.firestore.resolve_alert",
        new_callable=AsyncMock,
    ):
        response = await client.post("/alerts/alert-001/resolve")
    assert response.status_code == 200
    assert response.json()["id"] == "alert-001"


# ---------------------------------------------------------------------------
# Admin analytics
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_analytics_structure(
    client: AsyncClient, mock_firestore_zones, mock_firestore_queues, mock_firestore_alerts
):
    response = await client.get("/admin/analytics")
    assert response.status_code == 200

    data = response.json()
    assert "kpis" in data
    assert "gate_performance" in data
    assert "density_trend" in data
    assert "alert_trend" in data
    assert "zone_heatmap" in data

    assert isinstance(data["kpis"], list)
    assert len(data["kpis"]) > 0


@pytest.mark.asyncio
async def test_admin_analytics_kpi_fields(
    client: AsyncClient, mock_firestore_zones, mock_firestore_queues, mock_firestore_alerts
):
    response = await client.get("/admin/analytics")
    for kpi in response.json()["kpis"]:
        assert "label" in kpi
        assert "value" in kpi


# ---------------------------------------------------------------------------
# Admin tasks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_tasks(client: AsyncClient):
    with patch(
        "app.services.firestore.get_staff_tasks",
        new_callable=AsyncMock,
        return_value=[],
    ):
        response = await client.get("/admin/tasks")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    with patch(
        "app.services.firestore.create_staff_task",
        new_callable=AsyncMock,
        return_value="task-xyz",
    ):
        response = await client.post(
            "/admin/tasks",
            json={
                "priority": "high",
                "title": "Check Gate B scanner",
                "description": "Scanner showing errors on lane 2.",
                "zone_id": "gate-b",
            },
        )
    assert response.status_code == 201
    assert response.json()["id"] == "task-xyz"


# ---------------------------------------------------------------------------
# Control room
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_control_room_data(client: AsyncClient, mock_firestore_zones):
    response = await client.get("/admin/control-room")
    assert response.status_code == 200

    data = response.json()
    assert "risk_matrix" in data
    assert "staff_deployments" in data
    assert "comm_logs" in data
    assert "overall_risk" in data

    valid_risk_levels = {"safe", "elevated", "high", "critical"}
    assert data["overall_risk"] in valid_risk_levels
