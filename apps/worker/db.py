"""Supabase access for the worker (service role) + Storage helper.

Lazy singleton so pure modules and tests import without a configured environment.
The service role bypasses RLS — it must never reach the browser (CLAUDE.md §14).
"""
from __future__ import annotations

import logging
from functools import lru_cache

from config import settings

logger = logging.getLogger(__name__)


@lru_cache
def get_client():
    """Return a service-role Supabase client, or None if not configured."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase not configured; DB operations are no-ops.")
        return None
    from supabase import create_client  # imported lazily

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def upload_snapshot(path: str, html: bytes) -> str | None:
    """Save a raw HTML snapshot to Storage; return its storage path or None."""
    client = get_client()
    if client is None:
        return None
    bucket = settings.supabase_storage_bucket
    try:
        client.storage.from_(bucket).upload(
            path, html, {"content-type": "text/html", "upsert": "true"}
        )
        return f"{bucket}/{path}"
    except Exception as exc:  # noqa: BLE001
        logger.error("Snapshot upload failed for %s: %s", path, exc)
        return None


def log_notification(
    org_id: str | None, kind: str, transport: str, payload: dict, delivery_status: str
) -> None:
    client = get_client()
    if client is None:
        return
    from datetime import datetime, timezone

    try:
        client.table("notifications").insert(
            {
                "org_id": org_id,
                "kind": kind,
                "transport": transport,
                "payload": payload,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "delivery_status": delivery_status,
            }
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to log notification: %s", exc)
