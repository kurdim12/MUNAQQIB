"""Email transport via Resend (CLAUDE.md §10, §3).

Deliverability is a feature: authenticate the sending domain in Resend (SPF +
DKIM + DMARC) before the first real send. Always include the plain-text fallback.
"""
from __future__ import annotations

import logging

import httpx

from config import settings

from .base import DeliveryResult

logger = logging.getLogger(__name__)

_RESEND_ENDPOINT = "https://api.resend.com/emails"


class EmailTransport:
    name = "email"

    def __init__(self, api_key: str | None = None, from_addr: str | None = None):
        self.api_key = api_key or settings.resend_api_key
        self.from_addr = from_addr or settings.email_from
        self.from_name = settings.email_from_name

    def send(self, address: str, subject: str, html: str, text: str) -> DeliveryResult:
        if not self.api_key:
            logger.warning("RESEND_API_KEY missing; email to %s not sent.", address)
            return DeliveryResult(ok=False, transport=self.name, error="no_api_key")
        payload = {
            "from": f"{self.from_name} <{self.from_addr}>",
            "to": [address],
            "subject": subject,
            "html": html,
            "text": text,
        }
        try:
            resp = httpx.post(
                _RESEND_ENDPOINT,
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=30,
            )
            resp.raise_for_status()
            return DeliveryResult(
                ok=True, transport=self.name, provider_id=resp.json().get("id")
            )
        except httpx.HTTPError as exc:
            logger.error("Resend send failed: %s", exc)
            return DeliveryResult(ok=False, transport=self.name, error=str(exc))
