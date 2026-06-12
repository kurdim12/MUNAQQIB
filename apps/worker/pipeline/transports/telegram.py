"""Telegram transport (CLAUDE.md §10.2) — short-form only.

Used for T-3/T-1 deadline alerts, high-match pings (score ≥ 0.8), and the founder
ops-alert channel. `text` carries the message; `subject`/`html` are ignored.
"""
from __future__ import annotations

import logging

import httpx

from config import settings

from .base import DeliveryResult

logger = logging.getLogger(__name__)


class TelegramTransport:
    name = "telegram"

    def __init__(self, bot_token: str | None = None):
        self.bot_token = bot_token or settings.telegram_bot_token

    def send(self, address: str, subject: str, html: str, text: str) -> DeliveryResult:
        """`address` is the chat_id. Sends `text` (falls back to `subject`)."""
        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN missing; message to %s not sent.", address)
            return DeliveryResult(ok=False, transport=self.name, error="no_token")
        body = text or subject
        try:
            resp = httpx.post(
                f"https://api.telegram.org/bot{self.bot_token}/sendMessage",
                json={
                    "chat_id": address,
                    "text": body,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": False,
                },
                timeout=20,
            )
            resp.raise_for_status()
            mid = resp.json().get("result", {}).get("message_id")
            return DeliveryResult(ok=True, transport=self.name, provider_id=str(mid))
        except httpx.HTTPError as exc:
            logger.error("Telegram send failed: %s", exc)
            return DeliveryResult(ok=False, transport=self.name, error=str(exc))


def ops_alert(text: str) -> DeliveryResult:
    """Founder ops alert to ALERT_TELEGRAM_CHAT_ID (scraper failures, run summary)."""
    chat_id = settings.alert_telegram_chat_id
    if not chat_id:
        logger.warning("ALERT_TELEGRAM_CHAT_ID missing; ops alert dropped: %s", text)
        return DeliveryResult(ok=False, transport="telegram", error="no_alert_chat")
    return TelegramTransport().send(chat_id, "", "", text)
