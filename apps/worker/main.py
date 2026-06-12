"""FastAPI worker (CLAUDE.md §3) — cron-triggered run loop, no queues in v1.

Endpoints:
    GET  /health          → liveness + which sources are enabled
    POST /run/{stage}     → scrape | digest | deadlines  (Railway cron hits these)

Railway schedule (CLAUDE.md §6.8):
    scrape    every 2h, 07:00–19:00 Amman
    digest    07:30 Amman
    deadlines 08:00 Amman
"""
from __future__ import annotations

import logging

from fastapi import BackgroundTasks, FastAPI, HTTPException

from config import settings
from pipeline.run import run_deadlines, run_digest, scrape_all

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("worker")

app = FastAPI(title="MUNAQQIB Worker", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "tz": settings.tz,
        "supabase_configured": bool(settings.supabase_url),
        "resend_configured": bool(settings.resend_api_key),
    }


@app.post("/run/{stage}")
def run_stage(stage: str, background: BackgroundTasks, dry_run: bool = False) -> dict:
    """Kick a pipeline stage. Returns immediately; work runs in the background so
    the cron trigger doesn't block on a full scrape."""
    if stage == "scrape":
        background.add_task(scrape_all)
    elif stage == "digest":
        background.add_task(run_digest, dry_run)
    elif stage == "deadlines":
        background.add_task(run_deadlines, dry_run)
    else:
        raise HTTPException(status_code=404, detail=f"unknown stage: {stage}")
    return {"accepted": True, "stage": stage, "dry_run": dry_run}
