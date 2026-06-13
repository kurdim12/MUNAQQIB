"""One-off harvest: real scrape (JONEPS + GTD) → normalize → dedupe → match the
mkurdi profile, emitted as JSON for the L0/L1 rebuild. Not part of the daily
pipeline — it exists so the data refresh can be applied to D1 from a session
without the worker's secrets (the worker does the same thing on its cron).

    python -m scripts.harvest_demo > /tmp/harvest.json
"""
from __future__ import annotations

import json
import sys

from models.schemas import OrgProfile
from pipeline.dedupe import dedupe
from pipeline.match import match_all
from pipeline.normalize import normalize_tender
from pipeline.scrapers.gtd import GtdScraper
from pipeline.scrapers.joneps import JonepsScraper

# The real org profile lives in D1 (orgs.demo_org_v1); mirrored here only so this
# offline harvest scores against the exact same target the app stores.
MKURDI = OrgProfile(
    org_id="demo_org_v1",
    name="شركة مروان أحمد الكردي وشركاه ذ.م.م",
    sector="contracting",
    classification_fields=["طرق وجسور", "سدود", "أعمال مدنية", "مياه ومجاري", "مرافق"],
    classification_grade=1,
    include_keywords=[
        "طرق", "جسر", "سد", "صيانة", "تأهيل", "حفر آبار",
        "أعمال مدنية", "تعبيد", "مياه", "إنشاء", "مرافق",
    ],
    exclude_keywords=["أدوية", "قرطاسية", "ملابس", "حبر"],
)


def main() -> None:
    raw = []
    for scraper in (JonepsScraper(), GtdScraper()):
        try:
            rows = scraper.run()  # fetch → snapshot → parse (sets raw_html_path)
            print(f"[{scraper.source_id}] {len(rows)} rows", file=sys.stderr)
            raw.extend(rows)
        except Exception as exc:  # noqa: BLE001
            print(f"[{scraper.source_id}] FAILED: {exc}", file=sys.stderr)

    tenders = dedupe([normalize_tender(r) for r in raw])
    results = match_all(tenders, MKURDI)
    by_hash = {r.tender_hash: r for r in results}

    out = {
        "tenders": [
            {
                "source_id": t.source_id,
                "source_ref": t.source_ref,
                "title": t.title,
                "entity": t.entity,
                "entity_type": t.entity_type,
                "category": t.category,
                "governorate": t.governorate,
                "published_at": t.published_at.isoformat() if t.published_at else None,
                "closing_at": t.closing_at.isoformat() if t.closing_at else None,
                "doc_price_jod": t.doc_price_jod,
                "url": t.url,
                "raw_html_path": t.raw_html_path,
                "hash": t.hash,
            }
            for t in tenders
        ],
        "matches": [
            {
                "hash": t.hash,
                "score": by_hash[t.hash].score,
                "matched": by_hash[t.hash].matched,
                "reasons": by_hash[t.hash].reasons,
            }
            for t in tenders
            if t.hash in by_hash
        ],
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
