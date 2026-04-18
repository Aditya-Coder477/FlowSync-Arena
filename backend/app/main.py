"""FastAPI application entrypoint."""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.services.firestore import init_firestore, seed_initial_data
from app.services.redis_client import init_redis, close_redis
from app.services.cloud_logging import setup_cloud_logging
from app.routers import zones, routes, queues, alerts, admin, digital_twin, emergency

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Initialize Cloud Logging first so all subsequent logs go to GCP in production
    setup_cloud_logging()

    logger.info("Starting FlowSync Arena API...")

    try:
        init_firestore()
        logger.info("Firestore initialised.")
    except Exception as e:
        logger.error(f"Firestore init failed — check that Firestore database exists in project: {e}")

    await init_redis()

    try:
        await seed_initial_data()
    except Exception as e:
        logger.warning(
            f"Firestore seeding skipped — database may not exist yet or credentials missing: {e}"
        )

    logger.info("FlowSync Arena API startup complete.")
    yield
    logger.info("Shutting down...")
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "FlowSync Arena — Real-time crowd management API. "
        "Provides zone density, smart routing, queue prediction, alerts, and analytics."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — explicit methods and headers (not wildcards) for production safety
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Routers
app.include_router(zones.router)
app.include_router(routes.router)
app.include_router(queues.router)
app.include_router(alerts.router)
app.include_router(admin.router)
app.include_router(digital_twin.router)
app.include_router(emergency.router)

@app.get("/", tags=["health"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["health"])
async def health():
    return JSONResponse({"status": "ok"})


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. We're looking into it."},
    )
