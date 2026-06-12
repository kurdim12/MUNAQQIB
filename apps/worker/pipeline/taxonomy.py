"""Load and index taxonomy.yaml for the matcher (CLAUDE.md §8)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

from .normalize import norm_ar

_TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "taxonomy.yaml"


@lru_cache
def load_taxonomy(path: str | None = None) -> dict:
    p = Path(path) if path else _TAXONOMY_PATH
    with p.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


@lru_cache
def field_lexicon(field: str) -> tuple[str, ...]:
    """Normalized keyword lexicon for a contractor field or supply-category slug.

    Looks the term up in both contractor_fields and supply_categories so the
    same call works for either sector. Returns the field name itself plus its
    lexicon, all norm_ar-normalized. Unknown fields fall back to the field word."""
    tax = load_taxonomy()
    entry = tax.get("contractor_fields", {}).get(field)
    if entry is None:
        for cat in tax.get("supply_categories", {}).values():
            if cat.get("slug") == field or cat.get("label_ar") == field:
                entry = cat
                break
    words = [field]
    if entry:
        words += entry.get("lexicon", [])
        if entry.get("label_ar"):
            words.append(entry["label_ar"])
    return tuple(sorted({norm_ar(w) for w in words if w}))
