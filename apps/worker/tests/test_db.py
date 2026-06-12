"""Repository-layer tests (D1-backed db.py). The single seam `d1.execute` is
monkeypatched, so these run offline and assert the SQL/params we build."""
import json
from datetime import datetime, timezone

import d1
import db
from models.schemas import MatchResult, OrgProfile, Tender
from pipeline.dedupe import tender_hash


class FakeD1:
    """Records (sql, params) and returns canned rows per call."""

    def __init__(self):
        self.calls: list[tuple[str, list]] = []
        self.responder = None  # optional fn(sql, params) -> rows

    def __call__(self, sql, params=None):
        self.calls.append((sql, params or []))
        return self.responder(sql, params or []) if self.responder else []


def _install(monkeypatch) -> FakeD1:
    fake = FakeD1()
    monkeypatch.setattr(d1, "execute", fake)
    return fake


def _tender(title="إنشاء مدرسة", **kw):
    t = Tender(
        source_id="gtd",
        title=title,
        entity="وزارة الأشغال",
        url="https://gtd.gov.jo/1",
        closing_at=datetime(2026, 6, 30, tzinfo=timezone.utc),
        **kw,
    )
    t.hash = tender_hash(t)
    return t


def test_ensure_org_serializes_arrays_with_arabic(monkeypatch):
    fake = _install(monkeypatch)
    org = OrgProfile(
        name="مقاول",
        sector="contracting",
        classification_fields=["أبنية", "طرق"],
        digest_emails=["p@example.com"],
    )
    org_id = db.ensure_org(org)
    assert org_id == db.PARTNER_ORG_ID
    sql, params = fake.calls[0]
    assert "INSERT INTO orgs" in sql
    # classification_fields bound as JSON, Arabic preserved (not \uXXXX-escaped).
    assert json.loads(params[3]) == ["أبنية", "طرق"]
    assert "أبنية" in params[3]


def test_persist_tenders_upserts_and_maps_hash_to_id(monkeypatch):
    fake = _install(monkeypatch)
    fake.responder = lambda sql, p: [{"id": "tid-1", "hash": p[-1]}]  # hash is last param
    t = _tender()
    mapping = db.persist_tenders([t])
    assert mapping == {t.hash: "tid-1"}
    sql, params = fake.calls[0]
    assert "ON CONFLICT(hash) DO UPDATE" in sql
    assert "RETURNING id, hash" in sql


def test_persist_tenders_serializes_embedding(monkeypatch):
    fake = _install(monkeypatch)
    fake.responder = lambda sql, p: [{"id": "tid-1", "hash": p[-1]}]
    t = _tender()
    t.embedding = [0.1, 0.2, 0.3]
    db.persist_tenders([t])
    _, params = fake.calls[0]
    # embedding is the 2nd-to-last param (before hash); stored as JSON text.
    assert json.loads(params[-2]) == [0.1, 0.2, 0.3]


def test_persist_matches_only_writes_matched_with_known_tender(monkeypatch):
    fake = _install(monkeypatch)
    results = [
        MatchResult(tender_hash="h1", score=0.8, matched=True, reasons={"keyword": 0.8}),
        MatchResult(tender_hash="h2", score=0.2, matched=False, reasons={}),
        MatchResult(tender_hash="h3", score=0.9, matched=True, reasons={}),  # no id
    ]
    written = db.persist_matches("org1", results, {"h1": "tid-1"})
    assert written == 1
    assert len(fake.calls) == 1
    sql, params = fake.calls[0]
    assert "INSERT INTO matches" in sql
    assert params[:3] == ["org1", "tid-1", 0.8]


def test_update_source_status_ok_resets_failures(monkeypatch):
    fake = _install(monkeypatch)
    assert db.update_source_status("gtd", ok=True) == 0
    sql, _ = fake.calls[0]
    assert "consecutive_failures=0" in sql


def test_update_source_status_failure_increments(monkeypatch):
    fake = _install(monkeypatch)
    fake.responder = lambda sql, p: [{"consecutive_failures": 2}]
    assert db.update_source_status("gtd", ok=False) == 2
    sql, _ = fake.calls[0]
    assert "consecutive_failures+1" in sql


def test_sweep_closed_returns_count(monkeypatch):
    fake = _install(monkeypatch)
    fake.responder = lambda sql, p: [{"id": "a"}, {"id": "b"}]
    assert db.sweep_closed_tenders() == 2
    sql, _ = fake.calls[0]
    assert "status='closed'" in sql and "status='open'" in sql


def test_log_notification_inserts(monkeypatch):
    fake = _install(monkeypatch)
    db.log_notification("org1", "digest", "email", {"n": 3}, "sent")
    sql, params = fake.calls[0]
    assert "INSERT INTO notifications" in sql
    assert params[0] == "org1" and params[1] == "digest"
    assert json.loads(params[2]) == {"n": 3}


def test_writes_are_noops_when_d1_unconfigured(monkeypatch):
    # Real d1.execute with no config returns [] (degrades). Ensure no exception.
    monkeypatch.setattr(d1, "is_configured", lambda: False)
    assert db.update_source_status("gtd", ok=True) == 0
    assert db.sweep_closed_tenders() == 0
    assert db.persist_tenders([_tender()]) == {}
