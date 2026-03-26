"""
Gunicorn configuration for Viswa Sports FastAPI backend.
Used in production (EC2). Workers = UvicornWorker for ASGI support.

EC2 t3.micro: 2 vCPUs → 2 workers (conservative; keeps RAM within 1 GB limit)
Adjust WEB_CONCURRENCY env var to scale on larger instances.
"""
import os
import multiprocessing

# ─── Worker count ─────────────────────────────────────────────────────────────
# Override via WEB_CONCURRENCY env var. Default: 2 workers for t3.micro.
workers = int(os.environ.get("WEB_CONCURRENCY", 2))

# ─── Worker class ─────────────────────────────────────────────────────────────
worker_class = "uvicorn.workers.UvicornWorker"

# ─── Binding ──────────────────────────────────────────────────────────────────
bind = "0.0.0.0:8000"

# ─── Timeouts ─────────────────────────────────────────────────────────────────
timeout = 120          # Kill worker after 120s (long Razorpay/Twilio calls)
graceful_timeout = 30  # Grace period on SIGTERM

# ─── Keep-alive ───────────────────────────────────────────────────────────────
keepalive = 5          # Nginx upstream keep-alive

# ─── Logging ──────────────────────────────────────────────────────────────────
accesslog = "-"        # stdout
errorlog  = "-"        # stderr
loglevel  = "info"

# ─── Process naming ───────────────────────────────────────────────────────────
proc_name = "viswa-sports-api"
