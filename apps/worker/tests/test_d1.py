"""D1 REST client tests — mock httpx so no network is touched."""
import httpx
import pytest

import d1


class _Resp:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("err", request=None, response=None)


def _configure(monkeypatch):
    monkeypatch.setattr(d1, "is_configured", lambda: True)
    monkeypatch.setattr(d1.settings, "cloudflare_account_id", "acct", raising=False)
    monkeypatch.setattr(d1.settings, "cloudflare_api_token", "tok", raising=False)
    monkeypatch.setattr(d1.settings, "d1_database_id", "dbid", raising=False)


def test_execute_unwraps_result_rows(monkeypatch):
    _configure(monkeypatch)
    payload = {"success": True, "result": [{"results": [{"id": "1"}, {"id": "2"}]}]}
    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        return _Resp(payload)

    monkeypatch.setattr(httpx, "post", fake_post)
    rows = d1.execute("SELECT * FROM t WHERE id=?", ["1"])
    assert rows == [{"id": "1"}, {"id": "2"}]
    assert captured["json"] == {"sql": "SELECT * FROM t WHERE id=?", "params": ["1"]}
    assert "/d1/database/dbid/query" in captured["url"]


def test_execute_raises_on_api_error(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(
        httpx, "post", lambda *a, **k: _Resp({"success": False, "errors": ["bad"]})
    )
    with pytest.raises(d1.D1Error):
        d1.execute("SELECT 1")


def test_execute_noop_when_unconfigured(monkeypatch):
    monkeypatch.setattr(d1, "is_configured", lambda: False)
    assert d1.execute("SELECT 1") == []
