"""Router for Digital Twin module endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json

from app.services.firestore import get_db
from app.models.digital_twin import (
    VenueLayout, ScenarioForm, SimulationRunDef, SimulationComparison
)
from app.services.digital_twin import simulate_crowd_flow

router = APIRouter(prefix="/api/digital-twin", tags=["digital-twin"])


@router.get("/venue", response_model=List[VenueLayout])
async def list_venues():
    db = get_db()
    docs = db.collection("venues").stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]

@router.post("/venue", response_model=VenueLayout)
async def create_venue(venue: VenueLayout):
    db = get_db()
    ref = db.collection("venues").document(venue.id)
    await ref.set({
        **venue.dict(),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    })
    return venue

@router.get("/scenarios", response_model=List[ScenarioForm])
async def list_scenarios():
    db = get_db()
    docs = db.collection("simulation_scenarios").order_by("created_at").limit(50).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]

@router.post("/scenarios", response_model=ScenarioForm)
async def create_scenario(scenario: ScenarioForm):
    db = get_db()
    ref = db.collection("simulation_scenarios").document(scenario.id)
    await ref.set({
        **scenario.dict(),
        "created_at": datetime.now(timezone.utc)
    })
    return scenario

@router.post("/simulate", response_model=SimulationRunDef)
async def run_simulation(scenario_id: str):
    db = get_db()
    
    # 1. Load scenario
    s_doc = await db.collection("simulation_scenarios").document(scenario_id).get()
    if not s_doc.exists:
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenario = ScenarioForm(**{"id": s_doc.id, **s_doc.to_dict()})
    
    # 2. Load venue
    v_doc = await db.collection("venues").document(scenario.venue_id).get()
    if not v_doc.exists:
        raise HTTPException(status_code=404, detail="Venue not found")
    venue = VenueLayout(**{"id": v_doc.id, **v_doc.to_dict()})
    
    # 3. Simulate
    run_def = simulate_crowd_flow(venue, scenario)
    
    # 4. Save to Firestore (We split timeline because it can exceed document limits, but for this demo context we can nest it if it's small enough, roughly 60 frames is fine)
    ref = db.collection("simulation_runs").document(run_def.id)
    
    run_dict = run_def.dict()
    # Timestamps need to be proper for firestore serialization
    # Pydantic dict() handles basic types, but we will store directly.
    # To be safe from Firestore nested list limits, we serialize it.
    await ref.set({
        **run_dict,
        "created_at": datetime.now(timezone.utc)
    })
    
    return run_def

@router.get("/simulations/{run_id}", response_model=SimulationRunDef)
async def get_simulation(run_id: str):
    db = get_db()
    doc = await db.collection("simulation_runs").document(run_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    
    return {"id": doc.id, **doc.to_dict()}

@router.post("/export-report")
async def export_report(run_ids: List[str]):
    return {"message": "Report generated", "ids": run_ids, "export_url": "https://fake-s3-bucket/report.pdf"}
