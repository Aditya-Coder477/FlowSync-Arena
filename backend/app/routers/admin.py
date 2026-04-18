"""Admin analytics router — GET /admin/analytics, Staff Tasks CRUD"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from app.models.schemas import (
    AdminAnalytics, KPI, GatePerformance, TrendPoint,
    StaffTask, StaffTaskCreate, TaskStatus, TaskPriority,
    ControlRoomData, RiskZone, StaffDeployment, CommLog, RiskLevel,
)
from app.services import firestore as fs
from app.services import redis_client as rc
from app.services.crowd import get_zone_status
from app.services.queue_pred import get_live_queues
from app.config import get_settings

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()

ADMIN_ANALYTICS_CACHE_KEY = "admin:analytics"


# ── Analytics ──────────────────────────────────────────────────────────────

@router.get("/analytics", response_model=AdminAnalytics, summary="Admin KPIs and analytics")
async def admin_analytics():
    """
    Returns aggregated analytics for the admin dashboard:
    crowd density KPIs, gate performance, trend charts, zone heatmap.
    Cached in Redis for ADMIN_ANALYTICS_TTL seconds (default 30s) to
    avoid redundant triple-service reads on every dashboard refresh.
    """
    # Try Redis cache first
    cached = await rc.cache_get(ADMIN_ANALYTICS_CACHE_KEY)
    if cached:
        return AdminAnalytics(**cached)

    zone_status = await get_zone_status()
    queue_status = await get_live_queues()
    alerts = await fs.get_active_alerts()

    zones = zone_status.zones
    queues = queue_status.queues
    now = datetime.now(timezone.utc)

    # KPIs
    critical_zones = [z for z in zones if z.density_pct > 0.85]
    avg_wait = round(sum(q.predicted_wait_min for q in queues) / max(len(queues), 1), 1)

    kpis = [
        KPI(label="Average Crowd Density", value=f"{round(zone_status.avg_density * 100)}%",
            change="+4% vs last hour", trend="up"),
        KPI(label="Active Alerts", value=str(len(alerts)),
            change="-2 resolved", trend="down"),
        KPI(label="Avg Queue Wait", value=f"{avg_wait} min",
            change="+1.2 min", trend="up"),
        KPI(label="Zones Near Capacity", value=str(len(critical_zones)),
            change=None, trend="stable"),
        KPI(label="Total Visitors Estimated", value="12,480",
            change="+830 this hour", trend="up"),
        KPI(label="Staff On Duty", value="47", change=None, trend="stable"),
    ]

    # Gate performance
    gate_zones = [z for z in zones if "gate" in z.id]
    gate_performance = [
        GatePerformance(
            gate_id=z.id,
            gate_name=z.name,
            throughput_per_hour=int((z.current_count / max(z.capacity, 1)) * 380),
            avg_wait_min=round(z.density_pct * 12.0, 1),
            status="normal" if z.density_pct < 0.75 else "busy",
        )
        for z in gate_zones
    ]

    # Trend data (simulate last 12 hours)
    density_trend = [
        TrendPoint(
            timestamp=(now - timedelta(hours=12 - i)).strftime("%H:%M"),
            value=round(0.35 + (i * 0.04) + (0.05 if i > 8 else 0), 2)
        )
        for i in range(13)
    ]
    alert_trend = [
        TrendPoint(
            timestamp=(now - timedelta(hours=12 - i)).strftime("%H:%M"),
            value=float(1 + (i // 3))
        )
        for i in range(13)
    ]

    # Heatmap
    zone_heatmap = [
        {"zone_id": z.id, "zone_name": z.name, "density_pct": z.density_pct}
        for z in zones
    ]

    result = AdminAnalytics(
        kpis=kpis,
        gate_performance=gate_performance,
        density_trend=density_trend,
        alert_trend=alert_trend,
        zone_heatmap=zone_heatmap,
        timestamp=now,
    )

    # Write to Redis cache
    await rc.cache_set(
        ADMIN_ANALYTICS_CACHE_KEY,
        result.model_dump(mode="json"),
        settings.ADMIN_ANALYTICS_TTL,
    )

    return result


# ── Staff Tasks ────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[StaffTask], summary="All staff tasks")
async def list_tasks(status: str | None = None):
    raw = await fs.get_staff_tasks(status=status)
    now = datetime.now(timezone.utc)
    return [
        StaffTask(
            id=r["id"],
            priority=r.get("priority", TaskPriority.MEDIUM),
            title=r.get("title", "Task"),
            description=r.get("description"),
            zone_id=r.get("zone_id"),
            zone_name=r.get("zone_name"),
            status=r.get("status", TaskStatus.PENDING),
            staff_id=r.get("staff_id"),
            created_at=r["created_at"] if isinstance(r.get("created_at"), datetime) else now,
            updated_at=r.get("updated_at"),
        )
        for r in raw
    ]


@router.post("/tasks", response_model=dict, status_code=201, summary="Create staff task")
async def create_task(body: StaffTaskCreate):
    task_id = await fs.create_staff_task(body.model_dump())
    return {"id": task_id, "message": "Task created."}


@router.patch("/tasks/{task_id}/status", response_model=dict, summary="Update task status")
async def update_task(task_id: str, status: TaskStatus):
    await fs.update_task_status(task_id, status.value)
    return {"id": task_id, "status": status.value}


# ── Control Room ────────────────────────────────────────────────────────────

@router.get("/control-room", response_model=ControlRoomData, summary="Control room view")
async def control_room():
    """Returns risk matrix, staff deployments, and communication logs."""
    zone_status = await get_zone_status()
    zones = zone_status.zones
    now = datetime.now(timezone.utc)

    risk_matrix = []
    for z in zones:
        open_alerts_count = 0  # could join with alerts in a real implementation
        if z.density_pct >= 0.90:
            risk = RiskLevel.CRITICAL
        elif z.density_pct >= 0.75:
            risk = RiskLevel.HIGH
        elif z.density_pct >= 0.55:
            risk = RiskLevel.ELEVATED
        else:
            risk = RiskLevel.SAFE
        risk_matrix.append(RiskZone(
            zone_id=z.id, zone_name=z.name,
            risk_level=risk, density_pct=z.density_pct,
            open_alerts=open_alerts_count, staff_present=max(1, int(z.density_pct * 5))
        ))

    overall_density = zone_status.avg_density
    if overall_density >= 0.85:
        overall_risk = RiskLevel.CRITICAL
    elif overall_density >= 0.70:
        overall_risk = RiskLevel.HIGH
    elif overall_density >= 0.50:
        overall_risk = RiskLevel.ELEVATED
    else:
        overall_risk = RiskLevel.SAFE

    # Static staff deployments (would come from Firestore in production)
    deployments = [
        StaffDeployment(staff_id="s001", name="Jordan M.", zone_id="entrance-north",
                        zone_name="North Entrance", role="Crowd Controller", status="on_duty"),
        StaffDeployment(staff_id="s002", name="Priya K.", zone_id="main-hall",
                        zone_name="Main Hall", role="Steward", status="on_duty"),
        StaffDeployment(staff_id="s003", name="Alex T.", zone_id="stage-area",
                        zone_name="Stage Area", role="Security", status="responding"),
        StaffDeployment(staff_id="s004", name="Sam R.", zone_id="gate-b",
                        zone_name="Gate B", role="Gate Operator", status="on_duty"),
    ]

    comm_logs = [
        CommLog(id="c1", from_name="Jordan M.", message="Crowd building near pillar 4 — requesting backup.",
                channel="radio", timestamp=now - timedelta(minutes=3), priority="high"),
        CommLog(id="c2", from_name="System", message="Zone Stage Area crossed 82% capacity threshold.",
                channel="system", timestamp=now - timedelta(minutes=7), priority="normal"),
        CommLog(id="c3", from_name="Priya K.", message="Food stall restocked, queue reducing.",
                channel="radio", timestamp=now - timedelta(minutes=15), priority="normal"),
        CommLog(id="c4", from_name="Control", message="Gate C lane 2 opened. Diverting traffic from North Entrance.",
                channel="manual", timestamp=now - timedelta(minutes=22), priority="high"),
    ]

    return ControlRoomData(
        risk_matrix=risk_matrix,
        staff_deployments=deployments,
        comm_logs=comm_logs,
        overall_risk=overall_risk,
        timestamp=now,
    )
