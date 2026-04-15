"""Routes router — POST /routes/recommend"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import RouteRequest, RouteRecommendation
from app.services.routing import recommend_route

router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("/recommend", response_model=RouteRecommendation, summary="Recommend least-congested route")
async def route_recommend(request: RouteRequest):
    """
    Given a start and destination zone, returns the least-congested route.
    Includes step-by-step instructions, estimated time, Route Confidence score,
    and optional Crowd Thermostat redirection note.
    """
    if not request.from_zone or not request.to_zone:
        raise HTTPException(status_code=422, detail="Both from_zone and to_zone are required.")

    if request.from_zone == request.to_zone:
        raise HTTPException(status_code=422, detail="Start and destination zones must be different.")

    result = await recommend_route(request.from_zone, request.to_zone)
    return result
