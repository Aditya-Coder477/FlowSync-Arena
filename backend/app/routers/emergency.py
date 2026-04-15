from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.services.firestore import get_db
from app.models.emergency import (
    EmergencyScenario, EmergencySimulationRun, EmergencyTimelineFrame
)
from app.models.digital_twin import VenueLayout
from app.services.emergency import run_emergency_simulation

router = APIRouter(prefix="/api/emergency", tags=["emergency"])

@router.get("/scenarios", response_model=List[EmergencyScenario])
async def list_emergency_scenarios():
    db = get_db()
    docs = db.collection("emergency_scenarios").order_by("created_at").limit(50).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]

@router.post("/scenarios", response_model=EmergencyScenario)
async def create_emergency_scenario(scenario: EmergencyScenario):
    db = get_db()
    ref = db.collection("emergency_scenarios").document(scenario.id)
    await ref.set({
        **scenario.dict(),
        "created_at": datetime.now(timezone.utc)
    })
    return scenario

@router.post("/simulate", response_model=EmergencySimulationRun)
async def simulate_emergency(scenario_id: str):
    db = get_db()
    
    # 1. Load scenario
    s_doc = await db.collection("emergency_scenarios").document(scenario_id).get()
    if not s_doc.exists:
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenario = EmergencyScenario(**{"id": s_doc.id, **s_doc.to_dict()})
    
    # 2. Load venue (using a default venue for now as per digital twin pattern)
    # In a real app we'd query by venue_id from scenario
    v_docs = db.collection("venues").limit(1).stream()
    venue_list = [{"id": doc.id, **doc.to_dict()} async for doc in v_docs]
    if not venue_list:
        raise HTTPException(status_code=404, detail="No venue found to simulate on")
    venue = VenueLayout(**venue_list[0])
    
    # 3. Run simulation
    run = await run_emergency_simulation(venue, scenario)
    
    # 4. Save simulation run
    run_ref = db.collection("emergency_simulations").document(run.id)
    # We strip timeline to store in a separate sub-collection if it's too big, 
    # but for simplicity we keep it as is if it's small or store it in its own doc.
    run_dict = run.dict()
    await run_ref.set({
        **run_dict,
        "created_at": datetime.now(timezone.utc)
    })
    
    return run

@router.get("/simulations/{run_id}", response_model=EmergencySimulationRun)
async def get_emergency_simulation(run_id: str):
    db = get_db()
    doc = await db.collection("emergency_simulations").document(run_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return {"id": doc.id, **doc.to_dict()}

@router.get("/simulations/{run_id}/timeline", response_model=List[EmergencyTimelineFrame])
async def get_simulation_timeline(run_id: str):
    db = get_db()
    doc = await db.collection("emergency_simulations").document(run_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Simulation not found")
    data = doc.to_dict()
    return data.get("timeline", [])
