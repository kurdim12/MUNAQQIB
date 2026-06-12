"""Transport-agnostic delivery (CLAUDE.md §10.4).

Every transport exposes `send(...) -> DeliveryResult`. Sends are logged to the
`notifications` table by the caller (notify.py). whatsapp.py is a stub interface
only — built only on the §3 demand trigger (≥30% of paying orgs request it).
"""
from .base import DeliveryResult, Transport

__all__ = ["DeliveryResult", "Transport"]
