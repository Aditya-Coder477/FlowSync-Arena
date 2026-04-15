"""Services for Digital Twin simulation logic."""
import uuid
import math
import random
from typing import List, Dict
from datetime import datetime

from app.models.digital_twin import (
    VenueLayout, ScenarioForm, SimulationTimelineFrame, 
    ZoneState, RecommendationDef, SimulationRunDef
)
from app.models.schemas import DensityLevel, RiskLevel

def calculate_density_level(pct: float) -> DensityLevel:
    if pct < 0.1: return DensityLevel.EMPTY
    elif pct < 0.5: return DensityLevel.GREEN
    elif pct < 0.8: return DensityLevel.AMBER
    elif pct < 0.95: return DensityLevel.RED
    else: return DensityLevel.CRITICAL

def simulate_crowd_flow(venue: VenueLayout, scenario: ScenarioForm) -> SimulationRunDef:
    """
    Simplistic but realistic simulation engine for crowd flow.
    We generate a timeline of 60 frames (e.g. 1 frame = 1 minute of simulated time)
    """
    total_frames = 60
    timeline = []
    
    # Initialize zones
    zone_states = {}
    for zone in venue.zones:
        # if route closure is in scenario, cap capacity
        capacity = zone.capacity if zone.id not in scenario.route_closures else 0
        zone_states[zone.id] = {
            "current": 0,
            "capacity": capacity,
            "type": zone.type
        }
    
    total_entered = 0
    total_expected = scenario.attendance_count
    
    entry_rate_base = (total_expected / (total_frames * 0.7)) * scenario.crowd_intensity
    if scenario.gate_delay_minutes > 0:
        entry_rate_base *= 0.5 # slower due to delay
        
    for frame in range(total_frames):
        # 1. Arrival to Gates
        gates = [z for z in venue.zones if z.type == "gate" and z.id not in scenario.route_closures]
        if gates:
            arrivals = min(int(entry_rate_base * random.uniform(0.8, 1.2)), total_expected - total_entered)
            if arrivals > 0:
                for g in gates:
                    zone_states[g.id]["current"] += int(arrivals / len(gates))
                total_entered += arrivals
                
        # 2. Flow from Gates/Corridors -> Stands/Food
        for z in venue.zones:
            if zone_states[z.id]["current"] > 0 and z.connected_zone_ids:
                # Flow to neighbors
                flow_amount = int(zone_states[z.id]["current"] * 0.3)
                if flow_amount > 0:
                    valid_neighbors = [nid for nid in z.connected_zone_ids if nid in zone_states and nid not in scenario.route_closures]
                    if valid_neighbors:
                        flow_per_n = int(flow_amount / len(valid_neighbors))
                        for n in valid_neighbors:
                            # only flow if neighbor has space
                            space = zone_states[n]["capacity"] - zone_states[n]["current"]
                            if space > 0:
                                actual_flow = min(flow_per_n, space)
                                zone_states[z.id]["current"] -= actual_flow
                                zone_states[n]["current"] += actual_flow

        # 3. Snapshot for this frame
        frame_states = []
        high_risk_count = 0
        peak_zone_density = 0
        
        for z in venue.zones:
            current = zone_states[z.id]["current"]
            capacity = zone_states[z.id]["capacity"]
            # To avoid division by zero
            pct = current / capacity if capacity > 0 else 1.0 if current > 0 else 0
            if pct > peak_zone_density:
                peak_zone_density = pct
                
            level = calculate_density_level(pct)
            risk = min(1.0, pct * 1.1)
            
            if pct > 0.85:
                high_risk_count += 1
                
            frame_states.append(ZoneState(
                zone_id=z.id,
                occupancy=current,
                density_pct=round(pct, 2),
                density_level=level,
                risk_score=round(risk, 2),
                queue_length=int(current * 0.1) if level in [DensityLevel.RED, DensityLevel.CRITICAL] else 0,
                wait_time_minutes=round(current * 0.05, 1) if level in [DensityLevel.RED, DensityLevel.CRITICAL] else 0.0
            ))
            
        overall = RiskLevel.SAFE
        if high_risk_count > 3: overall = RiskLevel.CRITICAL
        elif high_risk_count > 1: overall = RiskLevel.HIGH
        elif peak_zone_density > 0.6: overall = RiskLevel.ELEVATED
            
        alerts = []
        if overall == RiskLevel.CRITICAL:
            alerts.append("Multiple zones approaching critical density.")

        timeline.append(SimulationTimelineFrame(
            timestamp_offset=frame * 60,
            zone_states=frame_states,
            overall_risk=overall,
            alerts=alerts
        ))
        
    # Generate recommendations
    recs = []
    if scenario.gate_delay_minutes > 0:
        recs.append(RecommendationDef(
            id=str(uuid.uuid4()),
            title="Open Temporary Gates",
            description=f"Gate delay of {scenario.gate_delay_minutes}min causes severe backlog. Consider opening emergency Gate C for entry.",
            priority="high",
            created_at=datetime.utcnow()
        ))
    if scenario.crowd_intensity > 1.2:
        recs.append(RecommendationDef(
            id=str(uuid.uuid4()),
            title="Deploy Crowd Control",
            description="High arriving intensity predicted. Deploy additional staff to main concourse to encourage forward movement.",
            priority="medium",
            created_at=datetime.utcnow()
        ))
        
    run_def = SimulationRunDef(
        id=str(uuid.uuid4()),
        scenario_id=scenario.id,
        venue_id=venue.id,
        name=f"Run of {scenario.name}",
        status="completed",
        peak_density_avg=0.75, # Mock metric
        peak_risk_zone=None,
        total_duration_minutes=total_frames,
        recommendations=recs,
        timeline_frames=timeline,
        created_at=datetime.utcnow()
    )
    
    return run_def
