"""
Token usage tracker — records every OpenAI / ElevenLabs API call to the
token_usage Supabase table and exposes a summary for the report endpoint.

Cost constants are approximate estimates:
  LLM (gpt-5.4-mini): $0.15 / 1M input tokens, $0.60 / 1M output tokens
  Embeddings (text-embedding-3-small): $0.02 / 1M tokens
  STT (whisper-1): $0.006 / min — estimated from output char count (~650 chars/min)
  TTS (OpenAI tts-1): $15.00 / 1M characters
  TTS (ElevenLabs): $0.30 / 1K characters (standard plan estimate)
"""
from __future__ import annotations

from backend.db.client import get_client

# ── Cost constants ────────────────────────────────────────────────────────────
_LLM_INPUT_PER_TOKEN   = 0.15 / 1_000_000
_LLM_OUTPUT_PER_TOKEN  = 0.60 / 1_000_000
_EMBED_PER_TOKEN       = 0.02 / 1_000_000
_STT_PER_CHAR          = 0.006 / 650          # ~650 chars/min at 130 WPM × 5 chars/word
_TTS_OPENAI_PER_CHAR   = 15.0 / 1_000_000
_TTS_ELEVENLABS_PER_CHAR = 0.30 / 1_000


def _write(session_id: str | None, row: dict) -> None:
    """Write one row to token_usage. Silently skips if no session_id."""
    if not session_id:
        return
    try:
        db = get_client()
        db.table("token_usage").insert({"session_id": session_id, **row}).execute()
    except Exception as e:
        # Never crash the interview over a tracking failure
        print(f"[token_tracker] write failed: {e}")


def track_llm(
    session_id: str | None,
    operation: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Record an LLM (responses.create) call."""
    cost = input_tokens * _LLM_INPUT_PER_TOKEN + output_tokens * _LLM_OUTPUT_PER_TOKEN
    _write(session_id, {
        "operation": operation,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": round(cost, 6),
    })


def track_embedding(
    session_id: str | None,
    model: str,
    input_tokens: int,
) -> None:
    """Record an embeddings.create call."""
    cost = input_tokens * _EMBED_PER_TOKEN
    _write(session_id, {
        "operation": "embedding",
        "model": model,
        "input_tokens": input_tokens,
        "cost_usd": round(cost, 6),
    })


def track_stt(session_id: str | None, char_count: int) -> None:
    """Record a Whisper transcription (estimated from transcript length)."""
    cost = char_count * _STT_PER_CHAR
    _write(session_id, {
        "operation": "stt",
        "model": "whisper-1",
        "char_count": char_count,
        "cost_usd": round(cost, 6),
    })


def track_tts(session_id: str | None, char_count: int, provider: str) -> None:
    """
    Record a TTS call.
    provider: "openai" or "elevenlabs"
    """
    if provider == "elevenlabs":
        cost = char_count * _TTS_ELEVENLABS_PER_CHAR
        model = "eleven_turbo_v2_5"
    else:
        cost = char_count * _TTS_OPENAI_PER_CHAR
        model = "tts-1"
    _write(session_id, {
        "operation": "tts",
        "model": model,
        "char_count": char_count,
        "cost_usd": round(cost, 6),
    })


def get_usage_summary(session_id: str) -> dict:
    """
    Return aggregated token usage for a session.
    Used by the report endpoint.
    """
    try:
        db = get_client()
        rows = (
            db.table("token_usage")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
            .data
        )
    except Exception as e:
        print(f"[token_tracker] summary failed: {e}")
        return {}

    if not rows:
        return {}

    total_cost = sum(r.get("cost_usd") or 0 for r in rows)

    # Aggregate by operation
    by_op: dict[str, dict] = {}
    for r in rows:
        op = r["operation"]
        if op not in by_op:
            by_op[op] = {"input_tokens": 0, "output_tokens": 0, "char_count": 0, "cost_usd": 0.0, "calls": 0}
        by_op[op]["input_tokens"]  += r.get("input_tokens") or 0
        by_op[op]["output_tokens"] += r.get("output_tokens") or 0
        by_op[op]["char_count"]    += r.get("char_count") or 0
        by_op[op]["cost_usd"]      += r.get("cost_usd") or 0
        by_op[op]["calls"]         += 1

    # Round costs
    for op in by_op:
        by_op[op]["cost_usd"] = round(by_op[op]["cost_usd"], 6)

    return {
        "total_cost_usd": round(total_cost, 6),
        "by_operation": by_op,
        "detail": rows,
    }
