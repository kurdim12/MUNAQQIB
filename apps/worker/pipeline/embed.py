"""Embedding provider — `paraphrase-multilingual-MiniLM-L12-v2`, 384-dim (CLAUDE.md §3).

Loaded lazily and offline. If `sentence-transformers` (or the model files) are
unavailable, `embed()` returns None and the matcher renormalizes its weights to
keyword + field only (see DECISIONS.md). This keeps CI and first-run light while
preserving the locked scoring design for production.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBED_DIM = 384

_model = None  # lazy singleton
_load_failed = False


def _get_model():
    global _model, _load_failed
    if _model is not None or _load_failed:
        return _model
    try:
        from sentence_transformers import SentenceTransformer  # heavy import

        _model = SentenceTransformer(_MODEL_NAME)
        logger.info("Loaded embedding model %s", _MODEL_NAME)
    except Exception as exc:  # noqa: BLE001 — degrade, never crash the pipeline
        _load_failed = True
        logger.warning(
            "Embedding model unavailable (%s); matcher will run keyword-only.", exc
        )
    return _model


def embed(text: str) -> list[float] | None:
    """Return a 384-dim embedding, or None if embeddings are unavailable."""
    if not text or not text.strip():
        return None
    model = _get_model()
    if model is None:
        return None
    vec = model.encode(text, normalize_embeddings=True)
    return [float(x) for x in vec]


def cosine(a: list[float] | None, b: list[float] | None) -> float | None:
    """Cosine similarity in [-1, 1], or None if either vector is missing."""
    if not a or not b or len(a) != len(b):
        return None
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return None
    return dot / (na * nb)
