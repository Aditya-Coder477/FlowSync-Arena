"""Zones router — GET /zones/status, GET /zones/{zone_id}"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import ZoneStatus, Zone
from app.services.crowd import get_zone_status, get_zone_by_id

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("/status", response_model=ZoneStatus, summary="All zone statuses with density")
async def zones_status():
    """
    Returns real-time density for all venue zones.
    Data is served from Redis cache (30s TTL), falling back to Firestore.
    Also indicates whether Calm Mode is currently active.
    """
    return await get_zone_status()


@router.get("/{zone_id}", response_model=Zone, summary="Single zone detail")
async def zone_detail(zone_id: str):
    zone = await get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")
    return zone
