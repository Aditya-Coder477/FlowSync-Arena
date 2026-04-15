"""Alerts router — GET /alerts, POST /alerts, POST /alerts/{id}/resolve"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from app.models.schemas import Alert, AlertCreate, AlertSeverity
from app.services import firestore as fs
from app.services import redis_client as rc

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _raw_to_alert(raw: dict) -> Alert:
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


@router.get("", response_model=list[Alert], summary="Active alerts")
async def list_alerts():
    """
    Returns all unresolved alerts, newest first.
    Served from Redis cache (5-minute TTL).
    """
    cached = await rc.get_active_alerts_cached()
    if cached:
        return [Alert(**a) for a in cached]

    raw = await fs.get_active_alerts()
    alerts = [_raw_to_alert(r) for r in raw]
    await rc.set_active_alerts([a.model_dump(mode="json") for a in alerts])
    return alerts


@router.post("", response_model=dict, status_code=201, summary="Create a new alert")
async def create_alert(body: AlertCreate):
    """Create an alert and invalidate the alerts cache."""
    data = body.model_dump()
    alert_id = await fs.create_alert(data)
    await rc.invalidate_alerts()
    return {"id": alert_id, "message": "Alert created."}


@router.post("/{alert_id}/resolve", response_model=dict, summary="Resolve an alert")
async def resolve_alert(alert_id: str):
    """Mark an alert as resolved and clear cache."""
    await fs.resolve_alert(alert_id)
    await rc.invalidate_alerts()
    return {"id": alert_id, "message": "Alert resolved."}
