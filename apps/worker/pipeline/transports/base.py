"""Transport interface shared by email / telegram / whatsapp."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class DeliveryResult:
    ok: bool
    transport: str
    provider_id: str | None = None  # provider's message id, when available
    error: str | None = None


class Transport(Protocol):
    name: str

    def send(self, address: str, subject: str, html: str, text: str) -> DeliveryResult:
        """Deliver a rendered message. `address` is an email, chat_id, or msisdn
        depending on the transport. Short-form transports ignore `subject`/`html`."""
        ...
