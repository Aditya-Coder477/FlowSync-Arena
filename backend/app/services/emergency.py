import uuid
import random
import math
from datetime import datetime, timezone
from typing import List, Dict, Any

from app.models.emergency import (
    EmergencyScenario, EmergencySimulationRun, EmergencyTimelineFrame,
    ZoneRiskState, ExitPressure, EmergencyRecommendation, EmergencyIncidentType
)
from app.models.digital_twin import VenueLayout
from app.models.schemas import RiskLevel

def get_risk_level(score: float) -> RiskLevel:
    if score < 0.3: return RiskLevel.SAFE
    if score < 0.6: return RiskLevel.ELEVATED
    if score < 0.85: return RiskLevel.HIGH
    return RiskLevel.CRITICAL

async def run_emergency_simulation(venue: VenueLayout, scenario: EmergencyScenario) -> EmergencySimulationRun:
    """
    Simulates an emergency evacuation and hazard propagation.
    Generates a timeline of frames.
    """
    total_frames = 45 # roughly 45 minutes of simulation
    timeline: List[EmergencyTimelineFrame] = []
    
    # Initialize states
    zone_occupancy = {z.id: z.capacity * 0.7 for z in venue.zones} # Start with 70% full
    # Adjust for certain zones if they are "affected"
    for z_id in scenario.affected_zones:
        zone_occupancy[z_id] = zone_occupancy[z_id] * 1.2 # dense at start of incident
        
    exits = [z for z in venue.zones if "exit" in z.amenities or z.type == "gate"]
    
    peak_risk_score = 0.0
    peak_risk_zone = None
    evacuated_count = 0
    total_beginning = sum(zone_occupancy.values())
    
    for frame_idx in range(total_frames):
        current_time_sec = frame_idx * 60
        frame_zone_states: List[ZoneRiskState] = []
        frame_exit_pressures: List[ExitPressure] = []
        
        # 1. Evacuation Logic
        # People move towards connected zones that are closer to exits
        # If a zone is an exit, people leave the venue
        
        total_moving_this_frame = 0
        
        # Calculate exit throughput
        for ex in exits:
            is_blocked = ex.id in scenario.blocked_routes
            base_throughput = 150 # people per minute per exit
            if is_blocked:
                base_throughput = 0
            
            # Pressure on this exit
            actual_flow = min(zone_occupancy[ex.id], base_throughput)
            zone_occupancy[ex.id] -= actual_flow
            evacuated_count += actual_flow
            
            frame_exit_pressures.append(ExitPressure(
                exit_id=ex.id,
                exit_name=ex.name,
                load_pct=min(1.0, actual_flow / base_throughput) if base_throughput > 0 else 1.0,
                queue_length=int(zone_occupancy[ex.id] * 0.2) if is_blocked else 0
            ))

        # Move people between zones towards exits
        # Simplistic: look at adjacent zones and move towards those with more exit neighbors
        for z in venue.zones:
            if z.id in exits or zone_occupancy[z.id] <= 0:
                continue
                
            is_blocked = z.id in scenario.blocked_routes
            move_multiplier = 1.0
            if is_blocked: move_multiplier = 0.1 # Very slow if blocked
            
            # Flow towards adjacent zones that lead to exits
            # We move roughly 15% of people per minute under emergency
            flow_out = int(zone_occupancy[z.id] * 0.15 * move_multiplier)
            if flow_out > 0:
                valid_neighbors = [nid for nid in z.connected_zone_ids if nid not in scenario.blocked_routes]
                if valid_neighbors:
                    flow_per_n = flow_out / len(valid_neighbors)
                    for n_id in valid_neighbors:
                        zone_occupancy[z.id] -= flow_per_n
                        zone_occupancy[n_id] += flow_per_n
                else:
                    # No way out! Pressure rises
                    pass

        # 2. Risk Calculation for each zone
        for z in venue.zones:
            density = zone_occupancy[z.id] / z.capacity if z.capacity > 0 else 1.0
            
            # Base risk is density
            risk_score = min(1.0, density)
            
            # Add risk if it's an affected zone or blocked
            if z.id in scenario.affected_zones:
                risk_score = min(1.0, risk_score + 0.3)
            if z.id in scenario.blocked_routes:
                risk_score = min(1.0, risk_score + 0.5)
            
            # Incident type impact (e.g. fire spreads)
            if scenario.incident_type == EmergencyIncidentType.FIRE and z.id in scenario.affected_zones:
                # fire grows over time
                risk_score = min(1.0, risk_score + (frame_idx * 0.02))

            level = get_risk_level(risk_score)
            if risk_score > peak_risk_score:
                peak_risk_score = risk_score
                peak_risk_zone = z.name

            frame_zone_states.append(ZoneRiskState(
                zone_id=z.id,
                zone_name=z.name,
                risk_level=level,
                risk_score=risk_score,
                density_pct=density,
                is_evacuating=True,
                is_blocked=z.id in scenario.blocked_routes,
                clearance_time_est_min=max(0, (total_frames - frame_idx) * random.uniform(0.8, 1.2))
            ))

        progress = evacuated_count / total_beginning if total_beginning > 0 else 1.0
        
        timeline.append(EmergencyTimelineFrame(
            timestamp_offset_sec=current_time_sec,
            zone_risk_states=frame_zone_states,
            exit_pressure_states=frame_exit_pressures,
            evacuation_progress=min(1.0, progress),
            total_clearance_est_min=max(0, (total_frames - frame_idx)),
            critical_alerts=["Corridor B capacity reached"] if frame_idx == 10 else []
        ))
        
        if progress >= 1.0:
            break

    # 3. Recommendations
    recs = []
    if scenario.severity >= 7:
        recs.append(EmergencyRecommendation(
            id=str(uuid.uuid4()),
            simulation_id="temp",
            priority="high",
            title="Immediate Perimeter Clearance",
            description="Highly severe incident. Clear all vehicle lanes within 500m of the North Entrance.",
            expected_impact="Reduces ingress interference by 40%",
            created_at=datetime.now(timezone.utc)
        ))
    
    if scenario.blocked_routes:
        recs.append(EmergencyRecommendation(
            id=str(uuid.uuid4()),
            simulation_id="temp",
            priority="medium",
            title="Dynamic Rerouting via Sector 4",
            description="Main corridor blocked. Activate secondary LED signage to pull crowd towards Sector 4.",
            expected_impact="Prevents crush at the blockage point",
            created_at=datetime.now(timezone.utc)
        ))

    run = EmergencySimulationRun(
        id=str(uuid.uuid4()),
        scenario_id=scenario.id,
        status="completed",
        peak_risk_zone=peak_risk_zone,
        peak_risk_score=peak_risk_score,
        total_clearance_time_min=len(timeline),
        recommendations=recs,
        timeline=timeline,
        created_at=datetime.now(timezone.utc)
    )
    
    return run
