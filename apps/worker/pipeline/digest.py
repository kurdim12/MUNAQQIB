"""Daily Arabic digest builder (CLAUDE.md §10.1).

Renders an RTL HTML email + a plain-text fallback from a list of matched tenders.
Pure: takes data in, returns rendered strings. No DB, no sending (that's notify).

Layout:
  ترويسة (date + matched-fields line)
  ⏰ red block: عطاءات تغلق خلال ٧٢ ساعة  (only if any)
  جدول العطاءات الجديدة: العنوان · الجهة · الإغلاق (+N يوم) · ثمن النسخة · زر التفاصيل
  تذييل: لوحة · تعديل التصنيفات · إلغاء الاشتراك (إلزامي)

RTL rules: titles dir="auto"; dates/prices dir="ltr"; one email per org per day.
"""
from __future__ import annotations

from dataclasses import dataclass

from models.schemas import OrgProfile, Tender

from util.timez import days_left, fmt_date_ar, now_amman

CLOSING_SOON_HOURS = 72


@dataclass
class DigestItem:
    tender: Tender
    score: float


@dataclass
class RenderedDigest:
    subject: str
    html: str
    text: str
    n: int


def _detail_url(base_url: str, tender: Tender) -> str:
    # Phase 0: link to the official source page (we are not a republisher, §14).
    # Phase 1 swaps this for the dashboard detail page once tenders have ids.
    return tender.url


def _closing_cell(t: Tender) -> str:
    if not t.closing_at:
        return "—"
    d = days_left(t.closing_at)
    when = fmt_date_ar(t.closing_at)
    suffix = f" (+{d} يوم)" if d >= 0 else " (مغلق)"
    return f'<span dir="ltr">{when}</span>{suffix}'


def build_digest(
    items: list[DigestItem],
    org: OrgProfile,
    base_url: str,
    brand: str = "منقّب",
) -> RenderedDigest:
    items = sorted(items, key=lambda i: i.score, reverse=True)
    today = fmt_date_ar(now_amman())
    n = len(items)
    fields = "، ".join(org.classification_fields + org.supply_categories) or "تصنيفكم"

    closing_soon = [
        it for it in items
        if it.tender.closing_at and 0 <= days_left(it.tender.closing_at) <= 3
    ]

    subject = f"🏗️ {brand} | {n} عطاءات تناسب تصنيفكم — {today}"

    # ---- HTML ----
    rows = []
    for it in items:
        t = it.tender
        price = (
            f'<span dir="ltr">{t.doc_price_jod:g} د.أ</span>'
            if t.doc_price_jod is not None
            else "—"
        )
        rows.append(
            f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee" dir="auto"><strong>{t.title}</strong></td>
          <td style="padding:10px;border-bottom:1px solid #eee" dir="auto">{t.entity or "—"}</td>
          <td style="padding:10px;border-bottom:1px solid #eee">{_closing_cell(t)}</td>
          <td style="padding:10px;border-bottom:1px solid #eee">{price}</td>
          <td style="padding:10px;border-bottom:1px solid #eee">
            <a href="{_detail_url(base_url, t)}" style="background:#0f766e;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none">التفاصيل</a>
          </td>
        </tr>"""
        )

    soon_block = ""
    if closing_soon:
        soon_rows = "".join(
            f'<li dir="auto">{it.tender.title} — '
            f'<span dir="ltr">{_closing_cell(it.tender)}</span></li>'
            for it in closing_soon
        )
        soon_block = f"""
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0">
        <strong style="color:#b91c1c">⏰ عطاءات تغلق خلال ٧٢ ساعة</strong>
        <ul style="margin:8px 0 0;padding-inline-start:20px">{soon_rows}</ul>
      </div>"""

    html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f8fafc;font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#0f172a">
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <h1 style="margin:0 0 4px;font-size:20px">🏗️ {brand}</h1>
      <p style="margin:0;color:#475569"><span dir="ltr">{today}</span> · مطابقة لتصنيفكم: {fields}</p>
      {soon_block}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
        <thead>
          <tr style="text-align:start;color:#475569">
            <th style="padding:10px;text-align:start">العنوان</th>
            <th style="padding:10px;text-align:start">الجهة</th>
            <th style="padding:10px;text-align:start">الإغلاق</th>
            <th style="padding:10px;text-align:start">ثمن النسخة</th>
            <th style="padding:10px;text-align:start"></th>
          </tr>
        </thead>
        <tbody>{"".join(rows) or '<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748b">لا توجد عطاءات جديدة اليوم</td></tr>'}</tbody>
      </table>
      <p style="margin-top:24px;color:#64748b;font-size:12px;border-top:1px solid #eee;padding-top:12px">
        <a href="{base_url}/app" style="color:#0f766e">لوحة التحكم</a> ·
        <a href="{base_url}/app/settings" style="color:#0f766e">تعديل التصنيفات</a> ·
        <a href="{base_url}/unsubscribe" style="color:#64748b">إلغاء الاشتراك</a>
      </p>
    </div>
  </div>
</body>
</html>"""

    # ---- Plain text fallback ----
    lines = [f"{brand} | {n} عطاءات تناسب تصنيفكم — {today}", ""]
    if closing_soon:
        lines.append("⏰ تغلق خلال 72 ساعة:")
        for it in closing_soon:
            lines.append(f"  - {it.tender.title}")
        lines.append("")
    for it in items:
        t = it.tender
        close = fmt_date_ar(t.closing_at) if t.closing_at else "—"
        lines.append(f"- {t.title} | {t.entity or '—'} | الإغلاق: {close} | {t.url}")
    lines += ["", f"لوحة التحكم: {base_url}/app", "لإلغاء الاشتراك: " + f"{base_url}/unsubscribe"]
    text = "\n".join(lines)

    return RenderedDigest(subject=subject, html=html, text=text, n=n)
