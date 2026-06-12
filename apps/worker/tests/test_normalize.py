"""Golden tests for norm_ar() and source-row parsing (CLAUDE.md §16)."""
from datetime import date

import pytest

from pipeline.normalize import (
    norm_ar,
    parse_date,
    parse_datetime_utc,
    parse_money_jod,
    to_ascii_digits,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        # alef variants → ا
        ("أبنية", "ابنيه"),
        ("إنشاء", "انشاء"),
        ("آبار", "ابار"),
        # teh-marbuta → ه
        ("مناقصة", "مناقصه"),
        # alef-maqsura → ي
        ("مستشفى", "مستشفي"),
        # tashkeel stripped
        ("مَدْرَسَة", "مدرسه"),
        # tatweel stripped
        ("صـــيانة", "صيانه"),
        # Arabic-Indic digits → ASCII
        ("عطاء رقم ١٢٣", "عطاء رقم 123"),
        # whitespace collapsed + trimmed
        ("  بناء   مبنى  ", "بناء مبني"),
        # latin lowercased
        ("Tender ABC", "tender abc"),
        # empty / None safe
        ("", ""),
    ],
)
def test_norm_ar(raw, expected):
    assert norm_ar(raw) == expected


def test_norm_ar_none():
    assert norm_ar(None) == ""


def test_norm_ar_idempotent():
    once = norm_ar("إنشاء مَدرسة رقم ٤٥")
    assert norm_ar(once) == once


def test_alef_forms_collapse_equal():
    assert norm_ar("إنشاء") == norm_ar("انشاء") == norm_ar("أنشاء")


def test_to_ascii_digits_eastern():
    assert to_ascii_digits("۱۲۳٤٥") == "12345"


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("2026/06/12", date(2026, 6, 12)),
        ("12/06/2026", date(2026, 6, 12)),
        ("١٢/٠٦/٢٠٢٦", date(2026, 6, 12)),
        ("12-06-2026", date(2026, 6, 12)),
        ("غير محدد", None),
        (None, None),
    ],
)
def test_parse_date(raw, expected):
    assert parse_date(raw) == expected


def test_parse_datetime_utc_is_utc():
    dt = parse_datetime_utc("2026/06/12")
    assert dt is not None and dt.tzinfo is not None
    assert dt.utcoffset().total_seconds() == 0


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("50 دينار", 50.0),
        ("١٢٫٥", 12.5),  # Arabic-Indic digits + Arabic decimal separator ٫
        ("1,250 JOD", 1250.0),
        ("مجاناً", None),
        (None, None),
    ],
)
def test_parse_money_jod(raw, expected):
    assert parse_money_jod(raw) == expected
