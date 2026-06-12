"""Notifier (CLAUDE.md §6.7, §10.4) — sends the digest + deadline alerts and logs
each send to the `notifications` table. Transport-agnostic.

One email per org per day max (digest consolidation). Telegram is short-form for
T-3/T-1 deadline alerts and high-match pings (score ≥ 0.8).
"""
from __future__ import annotations

import logging

from config import settings
from db import log_notification
from models.schemas import OrgProfile, Tender
from util.timez import days_left, fmt_date_ar

from .digest import DigestItem, build_digest
from .transports.base import DeliveryResult
from .transports.email import EmailTransport
from .transports.telegram import TelegramTransport

logger = logging.getLogger(__name__)

HIGH_MATCH_PING = 0.8


def send_digest(
    org: OrgProfile, items: list[DigestItem], dry_run: bool = False
) -> list[DeliveryResult]:
    """Build and email the daily digest to every verified address on the org.

    `dry_run` renders + logs but does not hit the network — used by the CLI to
    preview the digest offline.
    """
    rendered = build_digest(items, org, settings.public_base_url)
    results: list[DeliveryResult] = []
    transport = EmailTransport()
    for address in org.digest_emails:
        if dry_run:
            logger.info("[dry-run] digest → %s: %s", address, rendered.subject)
            results.append(DeliveryResult(ok=True, transport="email", provider_id="dry-run"))
            continue
        res = transport.send(address, rendered.subject, rendered.html, rendered.text)
        log_notification(
            org.org_id,
            "digest",
            "email",
            {"subject": rendered.subject, "n": rendered.n, "to": address},
            "sent" if res.ok else f"failed:{res.error}",
        )
        results.append(res)
    return results


def _deadline_kind(d: int) -> str | None:
    return {7: "deadline_t7", 3: "deadline_t3", 1: "deadline_t1"}.get(d)


def send_deadline_alerts(
    org: OrgProfile, tenders: list[Tender], dry_run: bool = False
) -> list[DeliveryResult]:
    """T-7/T-3/T-1 reminders. T-7 by email; T-3/T-1 also ping Telegram if connected."""
    results: list[DeliveryResult] = []
    email = EmailTransport()
    tg = TelegramTransport()
    for t in tenders:
        if not t.closing_at:
            continue
        d = days_left(t.closing_at)
        kind = _deadline_kind(d)
        if kind is None:
            continue
        msg = f'⏰ عطاء "{t.title}" يغلق {fmt_date_ar(t.closing_at)} — {t.url}'
        if dry_run:
            logger.info("[dry-run] %s → %s", kind, msg)
            results.append(DeliveryResult(ok=True, transport="dry-run", provider_id="dry-run"))
            continue
        # Email for all reminder tiers.
        for address in org.digest_emails:
            res = email.send(address, msg, f"<p dir='auto'>{msg}</p>", msg)
            log_notification(org.org_id, kind, "email", {"to": address, "title": t.title},
                             "sent" if res.ok else f"failed:{res.error}")
            results.append(res)
        # Telegram for the urgent tiers, if the org connected a chat.
        if d <= 3 and org.telegram_chat_id:
            res = tg.send(org.telegram_chat_id, "", "", msg)
            log_notification(org.org_id, kind, "telegram", {"title": t.title},
                             "sent" if res.ok else f"failed:{res.error}")
            results.append(res)
    return results
