"""WhatsApp transport — STUB INTERFACE ONLY (CLAUDE.md §3, §17).

DEFERRED. Do not implement until ≥ 30% of paying orgs request it, then ship as a
Pro/Intelligence perk. This stub exists so notify.py stays transport-agnostic.
"""
from __future__ import annotations

from .base import DeliveryResult


class WhatsAppTransport:
    name = "whatsapp"

    def send(self, address: str, subject: str, html: str, text: str) -> DeliveryResult:
        raise NotImplementedError(
            "WhatsApp delivery is deferred (CLAUDE.md §17); build on the demand trigger."
        )
