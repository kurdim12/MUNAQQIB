"""LLM slot routing (CLAUDE.md §3) — verified without any network call."""
import llm_client as lc


def _stub_providers(monkeypatch):
    calls = []
    monkeypatch.setattr(lc, "_anthropic_chat", lambda m, s, u, mt=4096: calls.append(("anthropic", m)) or "a")
    monkeypatch.setattr(lc, "_openrouter_chat", lambda m, s, u, mt=2048: calls.append(("openrouter", m)) or "o")
    return calls


def test_pass1_always_openrouter(monkeypatch):
    calls = _stub_providers(monkeypatch)
    monkeypatch.setattr(lc.settings, "openrouter_api_key", "x", raising=False)
    lc.complete("pass1", "s", "u")
    assert calls[0][0] == "openrouter"


def test_pass2_prefers_anthropic_when_keyed(monkeypatch):
    calls = _stub_providers(monkeypatch)
    monkeypatch.setattr(lc.settings, "anthropic_api_key", "x", raising=False)
    monkeypatch.setattr(lc.settings, "openrouter_api_key", "y", raising=False)
    lc.complete("eligibility", "s", "u")
    assert calls[0][0] == "anthropic"


def test_pass2_falls_back_to_openrouter_single_key(monkeypatch):
    calls = _stub_providers(monkeypatch)
    monkeypatch.setattr(lc.settings, "anthropic_api_key", "", raising=False)
    monkeypatch.setattr(lc.settings, "openrouter_api_key", "y", raising=False)
    monkeypatch.setattr(lc.settings, "llm_pass2_model", "claude-sonnet-4-6", raising=False)
    lc.complete("pass2", "s", "u")
    assert calls[0][0] == "openrouter"
    assert calls[0][1] == "anthropic/claude-sonnet-4-6"  # bare name namespaced


def test_pass2_no_key_raises(monkeypatch):
    _stub_providers(monkeypatch)
    monkeypatch.setattr(lc.settings, "anthropic_api_key", "", raising=False)
    monkeypatch.setattr(lc.settings, "openrouter_api_key", "", raising=False)
    try:
        lc.complete("pass2", "s", "u")
        assert False, "expected RuntimeError"
    except RuntimeError:
        pass


def test_openrouter_model_id_namespacing():
    assert lc._openrouter_model_id("claude-sonnet-4-6") == "anthropic/claude-sonnet-4-6"
    assert lc._openrouter_model_id("deepseek/deepseek-chat") == "deepseek/deepseek-chat"
