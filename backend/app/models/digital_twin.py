"""Pydantic models for Digital Twin Simulation entities."""
from __future__ import annotations
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.schemas import DensityLevel, RiskLevel

class ZoneType(str, Enum):
    GATE = "gate"
    STAND = "stand"
    CORRIDOR = "corridor"
    FOOD_COURT = "food_court"
    RESTROOM = "restroom"
    PARKING = "parking"
    SECURITY = "security"
    EMERGENCY_EXIT = "emergency_exit"
    HELP_DESK = "help_desk"
    CLOSED = "closed"

class VenueZoneDef(BaseModel):
    id: str
    name: str
    type: ZoneType
    capacity: int
    accessibility_level: str = "high"
    connected_zone_ids: List[str] = []
    coordinates: Optional[Dict[str, float]] = None # {x, y, width, height}
    status: str = "open"

class VenueLayout(BaseModel):
    id: str
    name: str
    location: str
    zones: List[VenueZoneDef]
    created_at: datetime
    updated_at: datetime

class ScenarioForm(BaseModel):
    id: str
    venue_id: str
    name: str
    event_phase: str # e.g. "pre-match", "halftime", "evacuation"
    attendance_count: int
    gate_delay_minutes: int
    route_closures: List[str] = [] # list of zone_ids that are closed
    staff_count: int
    crowd_intensity: float = 1.0 # Multiplier for flow rate
    created_at: datetime

class ZoneState(BaseModel):
    zone_id: str
    occupancy: int
    density_pct: float
    density_level: DensityLevel
    risk_score: float # 0 to 1
    queue_length: int = 0
    wait_time_minutes: float = 0.0

class SimulationTimelineFrame(BaseModel):
    timestamp_offset: int # seconds from start of simulation
    zone_states: List[ZoneState]
    overall_risk: RiskLevel
    alerts: List[str] = []

class RecommendationDef(BaseModel):
    id: str
    title: str
    description: str
    priority: str # "low", "medium", "high"
    zone_id: Optional[str] = None
    created_at: datetime

class SimulationRunDef(BaseModel):
    id: str
    scenario_id: str
    venue_id: str
    name: str
    status: str # "running", "completed", "failed"
    peak_density_avg: float
    peak_risk_zone: Optional[str]
    total_duration_minutes: int
    recommendations: List[RecommendationDef]
    timeline_frames: Optional[List[SimulationTimelineFrame]] = None
    created_at: datetime

class SimulationComparison(BaseModel):
    id: str
    name: str
    scenario_a_id: str
    scenario_b_id: str
    run_a_id: str
    run_b_id: str
    delta_peak_density: float
    delta_queue_max: int
    notes: List[str]
    created_at: datetime
