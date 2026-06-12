"""Central configuration, loaded from environment (CLAUDE.md §15).

Secrets only via env vars. Nothing here is committed with a real value; see
`.env.example` for the template. Settings are intentionally tolerant of missing
values so pure-logic modules and the test suite import cleanly without a full
environment — IO modules check for the specific secret they need at call time.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Database: Cloudflare D1 (DECISIONS.md 2026-06-12) ---
    cloudflare_account_id: str = ""
    cloudflare_api_token: str = ""
    d1_database_id: str = ""

    # --- Cloudflare R2 (snapshots + uploaded كراسات) ---
    r2_bucket: str = "munaqqib-snapshots"
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_endpoint: str = ""

    # --- Supabase (legacy / optional; not the primary datastore) ---
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "snapshots"

    # --- LLM ---
    anthropic_api_key: str = ""
    openrouter_api_key: str = ""
    llm_pass1_model: str = "deepseek/deepseek-chat"
    llm_pass2_model: str = "claude-sonnet-4-6"
    llm_fallback_model: str = "deepseek/deepseek-chat"

    # --- Email (Resend) ---
    resend_api_key: str = ""
    # Resend's shared sender works with no domain verification (test mode delivers
    # only to your Resend account email). Override with EMAIL_FROM=digest@yourdomain
    # once that domain is verified in Resend, to send to anyone.
    email_from: str = "onboarding@resend.dev"
    email_from_name: str = "منقّب"
    public_base_url: str = "https://app.yourdomain"

    # --- Telegram ---
    telegram_bot_token: str = ""
    alert_telegram_chat_id: str = ""

    # --- Phase 0 ---
    partner_profile_path: str = "partner_profile.yaml"

    # --- Scraper politeness (CLAUDE.md §7, §14) ---
    scraper_user_agent: str = "MunaqqibBot/0.1 (+abdalrhmankurdi12@gmail.com)"
    scraper_rate_limit_rps: float = 1.0

    # Reader-proxy fallback for sources that bot-wall non-Jordanian datacenter
    # IPs (e.g. GTD serves a 54-byte empty shell to our honest UA). The proxy
    # fetches server-side and returns the page; we request HTML, not markdown.
    # Set to "" to disable the fallback. Public reader — no secret.
    scraper_reader_proxy: str = "https://r.jina.ai/"

    # --- Misc ---
    tz: str = "Asia/Amman"
    log_level: str = "INFO"

    # Daily cap on LLM fallback extraction calls, per source (CLAUDE.md §7).
    llm_fallback_daily_cap: int = Field(default=20)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
