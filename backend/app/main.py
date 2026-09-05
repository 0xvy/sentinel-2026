import os
import time
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from db.database import init_db
from db.seed import seed_database
from app.routers import health, cameras, vehicles, alerts, export

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sentinel.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown procedures."""
    logger.info("Starting Sentinel 2026 Gujarat Police Platform...")
    
    # 1. Initialize SQLite tables and indices
    await init_db(settings.DB_PATH)
    logger.info("Database schema initialized at %s", settings.DB_PATH)

    # 2. Seed mock records for all 6 tables
    await seed_database(settings.DB_PATH)
    logger.info("Database seeded with statewide Gujarat intelligence records")

    # 3. Log server startup in forensic audit trail
    alerts.append_audit_log("SYSTEM_STARTUP", {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "db_path": settings.DB_PATH,
    })

    yield

    # Shutdown
    alerts.append_audit_log("SYSTEM_SHUTDOWN", {"status": "graceful"})
    logger.info("Sentinel 2026 platform shut down successfully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Statewide Gujarat Police CCTV Intelligence & ANPR Trajectory Reconstruction Platform",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend and edge agent connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def forensic_audit_middleware(request: Request, call_next):
    """
    Forensic audit trail middleware (NFSU requirement).
    Logs every inbound API request with method, path, client, and response latency.
    """
    start_time = time.perf_counter()
    client_ip = request.client.host if request.client else "unknown"
    
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    
    # Do not spam audit logs with internal health checks
    if request.url.path not in ("/health", "/docs", "/openapi.json"):
        alerts.append_audit_log("HTTP_REQUEST", {
            "method": request.method,
            "path": request.url.path,
            "client_ip": client_ip,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        })

    return response


# Include API Routers
app.include_router(health.router)
app.include_router(cameras.router)
app.include_router(vehicles.router)
app.include_router(alerts.router)
app.include_router(export.router)


@app.get("/", tags=["Root"])
async def root():
    """Root platform index."""
    return {
        "platform": settings.PROJECT_NAME,
        "status": "active",
        "jurisdiction": "Gujarat Police, CID Crime & State Command Center",
        "api_docs": "/docs",
        "core_endpoint": "/api/vehicles/{plate_number}/trajectory",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
