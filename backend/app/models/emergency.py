from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.schemas import RiskLevel

class EmergencyIncidentType(str, Enum):
    FIRE = "fire"
    MEDICAL = "medical"
    SECURITY = "security"
    WEATHER = "weather"
    INFRASTRUCTURE = "infrastructure"
    CROWD_PANIC = "crowd_panic"
    LOCKDOWN = "lockdown"

class EmergencyScenario(BaseModel):
    id: str
    venue_id: str
    scenario_name: str
    incident_type: EmergencyIncidentType
    severity: int = Field(ge=1, le=10) # 1-10 scale
    affected_zones: List[str]
    blocked_routes: List[str] = [] # List of zone IDs that are blocked
    crowd_density_multiplier: float = 1.0
    event_phase: str
    staff_response_level: int = Field(ge=1, le=5) # 1-5 scale
    created_at: datetime

class ZoneRiskState(BaseModel):
    zone_id: str
    zone_name: str
    risk_level: RiskLevel
    risk_score: float = Field(ge=0.0, le=1.0)
    density_pct: float
    is_evacuating: bool
    is_blocked: bool
    clearance_time_est_min: float = 0.0

class ExitPressure(BaseModel):
    exit_id: str
    exit_name: str
    load_pct: float
    queue_length: int

class EmergencyTimelineFrame(BaseModel):
    timestamp_offset_sec: int
    zone_risk_states: List[ZoneRiskState]
    exit_pressure_states: List[ExitPressure]
    evacuation_progress: float = Field(ge=0.0, le=1.0) # 0 to 1
    total_clearance_est_min: float
    critical_alerts: List[str] = []

class EmergencyRecommendation(BaseModel):
    id: str
    simulation_id: str
    priority: str # "high", "medium", "low"
    title: str
    description: str
    expected_impact: str
    created_at: datetime

class EmergencySimulationRun(BaseModel):
    id: str
    scenario_id: str
    status: str # "running", "completed", "failed"
    peak_risk_zone: Optional[str] = None
    peak_risk_score: float = 0.0
    total_clearance_time_min: float = 0.0
    recommendations: List[EmergencyRecommendation] = []
    created_at: datetime
    # timeline is often stored separately if large, but for simulation frames we can include or reference
    timeline: Optional[List[EmergencyTimelineFrame]] = None
