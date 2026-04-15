"""Queues router — GET /queues/live"""
from fastapi import APIRouter
from app.models.schemas import QueueLive
from app.services.queue_pred import get_live_queues

router = APIRouter(prefix="/queues", tags=["queues"])


@router.get("/live", response_model=QueueLive, summary="Live queue lengths and predicted wait times")
async def queues_live():
    """
    Returns current queue states with AI-predicted wait times.
    Data is Redis-cached (20s TTL). Predictions use a blended
    throughput + historical EMA model with peak-hour correction.
    """
    return await get_live_queues()
