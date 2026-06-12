"""Hybrid LLM client (CLAUDE.md §3) — provider/model per task, behind one façade.

Slots:
  - pass1 / fallback / awards  → OpenRouter cheap models (DeepSeek/Qwen-class),
    pinned providers with a no-training / ZDR data policy. Real client documents
    never touch free-tier endpoints.
  - pass2 / eligibility        → Anthropic direct (claude-sonnet-4-6). NEVER
    downgrade this slot.

Every call path must document a worst-case cost-per-unit in a comment where it is
invoked (analyzer budget < 1.0 JOD/doc). This module only routes; cost accounting
lives at the call site.

No model enters any slot without passing the 30-document golden eval set.
"""
from __future__ import annotations

import logging

from config import settings

logger = logging.getLogger(__name__)

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"


def _openrouter_chat(model: str, system: str, user: str, max_tokens: int = 2048) -> str:
    """Cheap-model slot via the OpenAI-compatible OpenRouter endpoint."""
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY not configured")
    from openai import OpenAI  # lazy import

    client = OpenAI(api_key=settings.openrouter_api_key, base_url=_OPENROUTER_BASE)
    resp = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        # Enforce no-training / ZDR provider routing where supported.
        extra_body={"provider": {"data_collection": "deny"}},
    )
    return resp.choices[0].message.content or ""


def _anthropic_chat(model: str, system: str, user: str, max_tokens: int = 4096) -> str:
    """Anthropic-direct slot (analyzer pass-2 / eligibility — never downgrade)."""
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    from anthropic import Anthropic  # lazy import

    client = Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(block.text for block in resp.content if block.type == "text")


def complete(slot: str, system: str, user: str, max_tokens: int = 2048) -> str:
    """Route to the configured model for a task slot.

    slot ∈ {'pass1','fallback','awards'} → OpenRouter cheap model
    slot ∈ {'pass2','eligibility'}       → Anthropic direct (claude-sonnet-4-6)
    """
    if slot in ("pass2", "eligibility"):
        return _anthropic_chat(settings.llm_pass2_model, system, user, max_tokens)
    model = {
        "pass1": settings.llm_pass1_model,
        "fallback": settings.llm_fallback_model,
        "awards": settings.llm_fallback_model,
    }.get(slot, settings.llm_fallback_model)
    return _openrouter_chat(model, system, user, max_tokens)
