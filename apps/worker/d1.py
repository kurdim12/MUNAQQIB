"""Low-level Cloudflare D1 client (REST API).

The worker runs on Railway (Python), so it talks to D1 over HTTP rather than a
Workers binding:

    POST https://api.cloudflare.com/client/v4/accounts/{acct}/d1/database/{db}/query
    Authorization: Bearer {CLOUDFLARE_API_TOKEN}
    { "sql": "...", "params": [...] }

Everything funnels through `execute()` / `_execute()` so the repository layer in
`db.py` stays pure SQL-building and the tests can monkeypatch a single seam. If
D1 is not configured, calls raise `D1NotConfigured`; callers in `db.py` catch
this and degrade to no-ops so the offline pipeline/tests keep working.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

_API_BASE = "https://api.cloudflare.com/client/v4"


class D1NotConfigured(RuntimeError):
    pass


class D1Error(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(
        settings.cloudflare_account_id
        and settings.cloudflare_api_token
        and settings.d1_database_id
    )


def _execute(sql: str, params: list[Any] | None = None) -> list[dict]:
    """Run one SQL statement against D1 and return its result rows.

    Single seam for the HTTP call — tests monkeypatch this. D1 binds params
    positionally with `?` placeholders; values must be primitives (str/int/
    float/None), so callers JSON-encode arrays/objects before binding.
    """
    if not is_configured():
        raise D1NotConfigured("Cloudflare D1 is not configured (see .env.example)")
    url = (
        f"{_API_BASE}/accounts/{settings.cloudflare_account_id}"
        f"/d1/database/{settings.d1_database_id}/query"
    )
    resp = httpx.post(
        url,
        headers={"Authorization": f"Bearer {settings.cloudflare_api_token}"},
        json={"sql": sql, "params": params or []},
        timeout=30,
    )
    resp.raise_for_status()
    body = resp.json()
    if not body.get("success", False):
        raise D1Error(f"D1 query failed: {body.get('errors')}")
    # The query endpoint returns a list of result objects (one per statement).
    results = body.get("result", [])
    if results and isinstance(results, list):
        return results[0].get("results", []) or []
    return []


def execute(sql: str, params: list[Any] | None = None) -> list[dict]:
    """Public wrapper with logging; returns [] on a not-configured environment."""
    try:
        return _execute(sql, params)
    except D1NotConfigured:
        logger.debug("D1 not configured; skipping query: %s", sql.split("\n", 1)[0])
        return []
    except httpx.HTTPError as exc:
        raise D1Error(str(exc)) from exc
