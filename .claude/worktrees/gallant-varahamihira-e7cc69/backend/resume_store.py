"""
Persist and retrieve parsed resume sections from Supabase.
"""
import json
import uuid
from backend.db.client import get_client


def create_session(candidate_name: str) -> str:
    """Create a new interview session and return its UUID."""
    db = get_client()
    result = (
        db.table("interview_sessions")
        .insert({"candidate_name": candidate_name, "phase": 1, "status": "active"})
        .execute()
    )
    return result.data[0]["id"]


def store_resume_sections(session_id: str, parsed: dict) -> None:
    """Write all parsed resume sections into Supabase."""
    db = get_client()
    rows = []

    simple_fields = ["summary", "education", "skills", "achievements"]
    for field in simple_fields:
        value = parsed.get(field, "")
        if value:
            rows.append(
                {"session_id": session_id, "section_name": field, "content": value}
            )

    # Experience and projects stored as JSON strings
    for field in ["experience", "projects"]:
        items = parsed.get(field, [])
        if items:
            rows.append(
                {
                    "session_id": session_id,
                    "section_name": field,
                    "content": json.dumps(items),
                }
            )

    if rows:
        db.table("resume_sections").insert(rows).execute()


def get_resume(session_id: str) -> dict:
    """Load all resume sections for a session into a dict."""
    db = get_client()
    rows = (
        db.table("resume_sections")
        .select("section_name, content")
        .eq("session_id", session_id)
        .execute()
        .data
    )
    result = {}
    for row in rows:
        name = row["section_name"]
        content = row["content"]
        if name in ("experience", "projects"):
            result[name] = json.loads(content)
        else:
            result[name] = content
    return result


def update_phase(session_id: str, phase: int) -> None:
    db = get_client()
    db.table("interview_sessions").update({"phase": phase}).eq(
        "id", session_id
    ).execute()


def complete_session(session_id: str) -> None:
    db = get_client()
    db.table("interview_sessions").update({"status": "completed"}).eq(
        "id", session_id
    ).execute()


def store_turn(session_id: str, phase: int, role: str, message: str) -> None:
    db = get_client()
    db.table("conversation_turns").insert(
        {"session_id": session_id, "phase": phase, "role": role, "message": message}
    ).execute()


def get_turns(session_id: str, phase: int | None = None) -> list[dict]:
    db = get_client()
    query = (
        db.table("conversation_turns")
        .select("phase, role, message, created_at")
        .eq("session_id", session_id)
        .order("created_at")
    )
    if phase is not None:
        query = query.eq("phase", phase)
    return query.execute().data
