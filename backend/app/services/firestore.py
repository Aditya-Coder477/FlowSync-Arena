"""Firestore service — everything lives here. No credentials hardcoded."""
from __future__ import annotations
import os
import logging
from datetime import datetime, timezone
from typing import Optional, Any
import firebase_admin
from firebase_admin import credentials, firestore
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_db: Optional[firestore.AsyncClient] = None


def init_firestore() -> None:
    """Initialize Firebase Admin SDK. Uses ADC in Cloud Run, key file locally."""
    global _db
    if firebase_admin._apps:
        _db = firestore.AsyncClient(project=settings.GOOGLE_CLOUD_PROJECT)
        return

    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.exists(creds_path):
        cred = credentials.Certificate(creds_path)
        firebase_admin.initialize_app(cred, {"projectId": settings.GOOGLE_CLOUD_PROJECT})
        logger.info("Firebase initialized with service account key.")
    else:
        # Application Default Credentials (works in Cloud Run automatically)
        firebase_admin.initialize_app(options={"projectId": settings.GOOGLE_CLOUD_PROJECT})
        logger.info("Firebase initialized with Application Default Credentials.")

    _db = firestore.AsyncClient(project=settings.GOOGLE_CLOUD_PROJECT)


def get_db() -> firestore.AsyncClient:
    if _db is None:
        raise RuntimeError("Firestore not initialized. Call init_firestore() first.")
    return _db


# ── Collection helpers ────────────────────────────────────────────────────

ZONES = "zones"
QUEUES = "queues"
ALERTS = "alerts"
EVENTS = "events"
USERS = "users"
STAFF_TASKS = "staff_tasks"
MOVEMENT_LOGS = "movement_logs"
COMM_LOGS = "comm_logs"
STAFF_DEPLOYMENTS = "staff_deployments"


async def get_all_zones() -> list[dict]:
    db = get_db()
    docs = db.collection(ZONES).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def get_zone(zone_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.collection(ZONES).document(zone_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


async def update_zone_count(zone_id: str, count: int) -> None:
    db = get_db()
    await db.collection(ZONES).document(zone_id).update({
        "current_count": count,
        "last_updated": datetime.now(timezone.utc),
    })


async def get_all_queues() -> list[dict]:
    db = get_db()
    docs = db.collection(QUEUES).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def get_active_alerts() -> list[dict]:
    db = get_db()
    query = db.collection(ALERTS).where("resolved", "==", False).order_by(
        "created_at", direction=firestore.Query.DESCENDING
    ).limit(50)
    docs = query.stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def create_alert(data: dict) -> str:
    db = get_db()
    ref = db.collection(ALERTS).document()
    await ref.set({**data, "id": ref.id, "created_at": datetime.now(timezone.utc), "resolved": False})
    return ref.id


async def resolve_alert(alert_id: str) -> None:
    db = get_db()
    await db.collection(ALERTS).document(alert_id).update({
        "resolved": True,
        "resolved_at": datetime.now(timezone.utc),
    })


async def get_staff_tasks(status: Optional[str] = None) -> list[dict]:
    db = get_db()
    query = db.collection(STAFF_TASKS)
    if status:
        query = query.where("status", "==", status)
    query = query.order_by("created_at", direction=firestore.Query.DESCENDING).limit(100)
    docs = query.stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def create_staff_task(data: dict) -> str:
    db = get_db()
    ref = db.collection(STAFF_TASKS).document()
    await ref.set({
        **data,
        "id": ref.id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })
    return ref.id


async def update_task_status(task_id: str, status: str) -> None:
    db = get_db()
    await db.collection(STAFF_TASKS).document(task_id).update({
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    })


async def get_movement_logs(limit: int = 200) -> list[dict]:
    db = get_db()
    docs = db.collection(MOVEMENT_LOGS).order_by(
        "timestamp", direction=firestore.Query.DESCENDING
    ).limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def log_movement(zone_from: str, zone_to: str, count: int = 1) -> None:
    db = get_db()
    ref = db.collection(MOVEMENT_LOGS).document()
    await ref.set({
        "zone_from": zone_from,
        "zone_to": zone_to,
        "count": count,
        "timestamp": datetime.now(timezone.utc),
    })


async def get_staff_deployments() -> list[dict]:
    db = get_db()
    docs = db.collection(STAFF_DEPLOYMENTS).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def get_comm_logs(limit: int = 30) -> list[dict]:
    db = get_db()
    docs = db.collection(COMM_LOGS).order_by(
        "timestamp", direction=firestore.Query.DESCENDING
    ).limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} async for doc in docs]


async def seed_initial_data() -> None:
    """Seed Firestore with realistic demo data if collections are empty."""
    db = get_db()

    # Check if zones already seeded
    zones_ref = db.collection(ZONES)
    existing = await zones_ref.limit(1).get()
    if existing:
        logger.info("Firestore already seeded, skipping.")
        return

    logger.info("Seeding Firestore with initial data...")

    zones = [
        {"id": "entrance-north", "name": "North Entrance", "capacity": 800, "current_count": 620,
         "amenities": ["exit", "info"], "adjacent_zones": ["main-hall", "gate-a"],
         "coordinates": {"x": 40, "y": 5, "width": 20, "height": 12}},
        {"id": "main-hall", "name": "Main Hall", "capacity": 3000, "current_count": 1800,
         "amenities": ["food", "restroom", "info"], "adjacent_zones": ["entrance-north", "stage-area", "east-wing", "west-wing"],
         "coordinates": {"x": 25, "y": 25, "width": 50, "height": 35}},
        {"id": "stage-area", "name": "Stage Area", "capacity": 5000, "current_count": 4200,
         "amenities": [], "adjacent_zones": ["main-hall"],
         "coordinates": {"x": 30, "y": 65, "width": 40, "height": 25}},
        {"id": "east-wing", "name": "East Wing", "capacity": 1200, "current_count": 480,
         "amenities": ["restroom", "food"], "adjacent_zones": ["main-hall", "gate-b"],
         "coordinates": {"x": 80, "y": 25, "width": 18, "height": 35}},
        {"id": "west-wing", "name": "West Wing", "capacity": 1200, "current_count": 290,
         "amenities": ["restroom", "exit"], "adjacent_zones": ["main-hall", "gate-c"],
         "coordinates": {"x": 2, "y": 25, "width": 18, "height": 35}},
        {"id": "gate-a", "name": "Gate A", "capacity": 500, "current_count": 390,
         "amenities": ["exit"], "adjacent_zones": ["entrance-north"],
         "coordinates": {"x": 35, "y": 0, "width": 10, "height": 5}},
        {"id": "gate-b", "name": "Gate B", "capacity": 400, "current_count": 120,
         "amenities": ["exit"], "adjacent_zones": ["east-wing"],
         "coordinates": {"x": 90, "y": 35, "width": 8, "height": 10}},
        {"id": "gate-c", "name": "Gate C", "capacity": 400, "current_count": 85,
         "amenities": ["exit"], "adjacent_zones": ["west-wing"],
         "coordinates": {"x": 0, "y": 35, "width": 8, "height": 10}},
    ]

    now = datetime.now(timezone.utc)
    batch = db.batch()
    for zone in zones:
        ref = db.collection(ZONES).document(zone["id"])
        batch.set(ref, {**zone, "last_updated": now})
    await batch.commit()

    queues = [
        {"zone_id": "gate-a", "zone_name": "Gate A", "name": "Main Entry Queue", "length": 47, "avg_wait_min": 8.5, "is_virtual": False, "status": "open"},
        {"zone_id": "gate-b", "zone_name": "Gate B", "name": "East Gate Queue", "length": 12, "avg_wait_min": 2.1, "is_virtual": False, "status": "open"},
        {"zone_id": "main-hall", "zone_name": "Main Hall", "name": "Food Stall A Queue", "length": 23, "avg_wait_min": 5.0, "is_virtual": True, "status": "open"},
        {"zone_id": "stage-area", "zone_name": "Stage Area", "name": "Premium Access", "length": 8, "avg_wait_min": 1.5, "is_virtual": True, "status": "open"},
    ]

    batch2 = db.batch()
    for q in queues:
        ref = db.collection(QUEUES).document()
        batch2.set(ref, {**q, "id": ref.id, "last_updated": now})
    await batch2.commit()

    tasks = [
        {"priority": "urgent", "title": "Clear bottleneck at North Entrance corridor", "zone_id": "entrance-north", "zone_name": "North Entrance", "description": "Crowd building up near pillar 4. Open the secondary lane."},
        {"priority": "high", "title": "Restock food stall — West Wing", "zone_id": "west-wing", "zone_name": "West Wing", "description": "Team B reported queue forming. Supplies in storage bay 2."},
        {"priority": "medium", "title": "Gate B: verify ticketing scanner", "zone_id": "gate-b", "zone_name": "Gate B", "description": "Scanner 2 showing intermittent errors."},
        {"priority": "low", "title": "Routine zone sweep — East Wing", "zone_id": "east-wing", "zone_name": "East Wing", "description": "Standard 30-min sweep. Log any maintenance issues."},
    ]

    batch3 = db.batch()
    for t in tasks:
        ref = db.collection(STAFF_TASKS).document()
        batch3.set(ref, {**t, "id": ref.id, "status": "pending", "created_at": now})
    await batch3.commit()

    logger.info("Firestore seeding complete.")
