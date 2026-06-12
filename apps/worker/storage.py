"""Cloudflare R2 object storage (snapshots + uploaded كراسات).

R2 is S3-compatible, so we use boto3 against the R2 endpoint. boto3 is imported
lazily; if R2 is unconfigured or unavailable the snapshot still lands on the local
filesystem (fixtures/) so parser repair and tests keep working (DECISIONS.md).
"""
from __future__ import annotations

import logging

from config import settings

logger = logging.getLogger(__name__)

_client = None
_load_failed = False


def is_configured() -> bool:
    return bool(
        settings.r2_endpoint
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
    )


def _get_client():
    global _client, _load_failed
    if _client is not None or _load_failed:
        return _client
    if not is_configured():
        _load_failed = True
        return None
    try:
        import boto3  # lazy, heavy-ish

        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
    except Exception as exc:  # noqa: BLE001
        _load_failed = True
        logger.warning("R2 client unavailable (%s); snapshots stay local-only.", exc)
    return _client


def upload(key: str, data: bytes, content_type: str = "text/html") -> str | None:
    """Upload bytes to R2; return the object key, or None if not stored remotely."""
    client = _get_client()
    if client is None:
        return None
    try:
        client.put_object(
            Bucket=settings.r2_bucket, Key=key, Body=data, ContentType=content_type
        )
        return key
    except Exception as exc:  # noqa: BLE001
        logger.error("R2 upload failed for %s: %s", key, exc)
        return None
