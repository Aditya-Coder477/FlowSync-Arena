"""Pydantic models for all FlowSync Arena entities."""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ── Enums ──────────────────────────────────────────────────────────────────

class DensityLevel(str, Enum):
    EMPTY = "empty"
    GREEN = "green"
    AMBER = "amber"
    RED = "red"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class UserRole(str, Enum):
    ATTENDEE = "attendee"
    STAFF = "staff"
    ADMIN = "admin"
    CONTROL = "control"


class RiskLevel(str, Enum):
    SAFE = "safe"
    ELEVATED = "elevated"
    HIGH = "high"
    CRITICAL = "critical"


# ── Zone ───────────────────────────────────────────────────────────────────

class Zone(BaseModel):
    id: str
    name: str
    capacity: int
    current_count: int
    density_level: DensityLevel
    density_pct: float = Field(ge=0.0, le=1.0)
    last_updated: datetime
    coordinates: Optional[dict] = None  # {x, y, width, height} for SVG map
    adjacent_zones: list[str] = []
    amenities: list[str] = []  # e.g. ["restroom", "food", "exit"]


class ZoneStatus(BaseModel):
    zones: list[Zone]
    avg_density: float
    calm_mode_active: bool
    timestamp: datetime


# ── Queue ──────────────────────────────────────────────────────────────────

class Queue(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    name: str
    length: int
    avg_wait_min: float
    predicted_wait_min: float
    is_virtual: bool = False
    status: str = "open"  # open | paused | closed
    last_updated: datetime


class QueueLive(BaseModel):
    queues: list[Queue]
    timestamp: datetime


# ── Route ──────────────────────────────────────────────────────────────────

class RouteRequest(BaseModel):
    from_zone: str
    to_zone: str
    user_id: Optional[str] = None


class RouteStep(BaseModel):
    zone_id: str
    zone_name: str
    instruction: str
    density_level: DensityLevel
    estimated_time_min: float


class RouteRecommendation(BaseModel):
    steps: list[RouteStep]
    total_time_min: float
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_label: str  # "Very reliable" | "Likely accurate" | "Estimate only"
    alternative: Optional[list[RouteStep]] = None
    thermostat_note: Optional[str] = None  # Crowd Thermostat message


# ── Alert ──────────────────────────────────────────────────────────────────

class Alert(BaseModel):
    id: str
    severity: AlertSeverity
    title: str
    message: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    created_at: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class AlertCreate(BaseModel):
    severity: AlertSeverity
    title: str
    message: str
    zone_id: Optional[str] = None


# ── Staff Task ──────────────────────────────────────────────────────────────

class StaffTask(BaseModel):
    id: str
    staff_id: Optional[str] = None
    priority: TaskPriority
    title: str
    description: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    status: TaskStatus
    created_at: datetime
    updated_at: Optional[datetime] = None


class StaffTaskCreate(BaseModel):
    priority: TaskPriority
    title: str
    description: Optional[str] = None
    zone_id: Optional[str] = None
    staff_id: Optional[str] = None


# ── Analytics (Admin) ───────────────────────────────────────────────────────

class KPI(BaseModel):
    label: str
    value: str
    change: Optional[str] = None  # e.g. "+3% vs last hour"
    trend: Optional[str] = None   # "up" | "down" | "stable"


class GatePerformance(BaseModel):
    gate_id: str
    gate_name: str
    throughput_per_hour: int
    avg_wait_min: float
    status: str


class TrendPoint(BaseModel):
    timestamp: str
    value: float


class AdminAnalytics(BaseModel):
    kpis: list[KPI]
    gate_performance: list[GatePerformance]
    density_trend: list[TrendPoint]
    alert_trend: list[TrendPoint]
    zone_heatmap: list[dict]  # [{zone_id, zone_name, density_pct}]
    timestamp: datetime


# ── Control Room ────────────────────────────────────────────────────────────

class RiskZone(BaseModel):
    zone_id: str
    zone_name: str
    risk_level: RiskLevel
    density_pct: float
    open_alerts: int
    staff_present: int


class StaffDeployment(BaseModel):
    staff_id: str
    name: str
    zone_id: str
    zone_name: str
    role: str
    status: str  # "on_duty" | "responding" | "break"


class CommLog(BaseModel):
    id: str
    from_name: str
    message: str
    channel: str  # "radio" | "system" | "manual"
    timestamp: datetime
    priority: str = "normal"


class ControlRoomData(BaseModel):
    risk_matrix: list[RiskZone]
    staff_deployments: list[StaffDeployment]
    comm_logs: list[CommLog]
    overall_risk: RiskLevel
    timestamp: datetime


# ── Concierge ───────────────────────────────────────────────────────────────

class Suggestion(BaseModel):
    id: str
    type: str  # "route" | "queue" | "amenity" | "alert"
    headline: str
    body: str
    action_label: Optional[str] = None
    action_data: Optional[dict] = None
    priority: int = 0  # higher = more important
