"""
Viswa Sports — FastAPI Application Entry Point
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.redis import get_redis, close_redis
from app.db.session import AsyncSessionLocal, engine
from app.db.init_db import init_db
from app.services.hold_service import process_expired_holds
from app.services.slot_scheduler import run_slot_scheduler

# ─── Structured Logging ───────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()

# ─── Security Validation ──────────────────────────────────────────────────────
# Blocks unsafe defaults before the server accepts any traffic.
settings.validate_production_security()

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Viswa Sports API...")

    # Ensure uploads directory exists
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads", "turf_images")
    os.makedirs(uploads_dir, exist_ok=True)

    # Initialize Redis
    await get_redis()

    # Seed admin
    # IMPORTANT: Run `alembic upgrade head` before starting the server.
    # init_db gracefully skips if tables don't exist yet.
    async with AsyncSessionLocal() as db:
        await init_db(db)

    # Start hold expiry background task
    hold_task = asyncio.create_task(process_expired_holds())
    # Start daily slot generation scheduler
    slot_task = asyncio.create_task(run_slot_scheduler())

    yield

    # Cleanup
    hold_task.cancel()
    slot_task.cancel()
    for t in (hold_task, slot_task):
        try:
            await t
        except asyncio.CancelledError:
            pass
    await close_redis()
    await engine.dispose()
    logger.info("Viswa Sports API shutdown complete")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Viswa Sports API",
    description="Production-grade turf booking platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request Logging Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    return response


# ─── Secure Headers Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ─── Routes ───────────────────────────────────────────────────────────────────
from app.routes import auth, turfs, bookings, payments, users, features, discounts, advertisements
from app.routes.admin import auth as admin_auth, turfs as admin_turfs
from app.routes.admin import pricing, features as admin_features, slots as admin_slots, analytics
from app.routes.admin import discounts as admin_discounts
from app.routes.admin import advertisements as admin_advertisements

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(turfs.router)
app.include_router(bookings.router)
app.include_router(payments.router)
app.include_router(features.router)
app.include_router(discounts.router)          # public coupon validation
app.include_router(advertisements.router)     # public active ad for popup
app.include_router(admin_auth.router)
app.include_router(admin_turfs.router)
app.include_router(pricing.router)
app.include_router(admin_features.router)
app.include_router(admin_slots.router)
app.include_router(analytics.router)
app.include_router(admin_discounts.router)
app.include_router(admin_advertisements.router)

# ─── Static file serving for uploaded images ──────────────────────────────────
_uploads_path = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(_uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_path), name="uploads")


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    from app.core.config import settings
    return {
        "status": "ok",
        "service": "Viswa Sports API",
        "razorpay_key_prefix": settings.RAZORPAY_KEY_ID[:10] if settings.RAZORPAY_KEY_ID else "MISSING",
        "razorpay_secret_len": len(settings.RAZORPAY_KEY_SECRET) if settings.RAZORPAY_KEY_SECRET else 0,
    }



# ─── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
