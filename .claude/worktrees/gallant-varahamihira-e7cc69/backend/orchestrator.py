"""
Interview Orchestrator — manages phase transitions and routes messages
to the appropriate phase handler.
"""
import json
from backend.resume_store import get_resume, update_phase, complete_session, store_turn, get_turns
from backend.phases import (
    phase1_respond,
    phase_project_respond,
    phase4_respond,
    phase5_respond,
)
from backend.ml_questions.retriever import get_relevant_questions
from backend.db.client import get_client


def _get_session(session_id: str) -> dict:
    db = get_client()
    rows = (
        db.table("interview_sessions")
        .select("*")
        .eq("id", session_id)
        .single()
        .execute()
        .data
    )
    return rows


def _cache_questions(session_id: str, questions: list[dict]) -> None:
    """Store phase-4 questions in Supabase as a resume section for retrieval."""
    db = get_client()
    db.table("resume_sections").insert(
        {
            "session_id": session_id,
            "section_name": "phase4_questions",
            "content": json.dumps(questions),
        }
    ).execute()


def _load_questions(session_id: str) -> list[dict] | None:
    db = get_client()
    rows = (
        db.table("resume_sections")
        .select("content")
        .eq("session_id", session_id)
        .eq("section_name", "phase4_questions")
        .execute()
        .data
    )
    if rows:
        return json.loads(rows[0]["content"])
    return None


def process_turn(session_id: str, candidate_message: str | None) -> dict:
    """
    Core orchestration function.
    - Loads session state from Supabase
    - Routes to the correct phase handler
    - Stores turns
    - Advances phase when needed
    Returns: { message: str, phase: int, done: bool }
    """
    session = _get_session(session_id)
    phase = session["phase"]
    resume = get_resume(session_id)

    # Store candidate turn (if not the very first opener call)
    if candidate_message:
        store_turn(session_id, phase, "candidate", candidate_message)

    # Load conversation history for current phase
    history = get_turns(session_id, phase)

    # ── Phase 1: Intro ────────────────────────────────────────────────────────
    if phase == 1:
        result = phase1_respond(resume, history)

    # ── Phase 2: Project Deep-Dive #1 ────────────────────────────────────────
    elif phase == 2:
        result = phase_project_respond(resume, history, phase=2, session_id=session_id)

    # ── Phase 3: Project Deep-Dive #2 ────────────────────────────────────────
    elif phase == 3:
        result = phase_project_respond(resume, history, phase=3, session_id=session_id)

    # ── Phase 4: Factual / Technical Q&A ─────────────────────────────────────
    elif phase == 4:
        questions = _load_questions(session_id)
        if questions is None:
            questions = get_relevant_questions(resume, n=6, session_id=session_id)
            _cache_questions(session_id, questions)
        result = phase4_respond(resume, history, questions, session_id=session_id)

    # ── Phase 5: Behavioural ─────────────────────────────────────────────────
    elif phase == 5:
        result = phase5_respond(resume, history, session_id=session_id)

    else:
        return {"message": "The interview is complete.", "phase": phase, "done": True}

    # Store interviewer turn
    store_turn(session_id, phase, "interviewer", result["message"])

    # Handle phase transition
    if result.get("advance_phase"):
        next_phase = phase + 1
        if next_phase > 5:
            complete_session(session_id)
            return {"message": result["message"], "phase": phase, "done": True}
        update_phase(session_id, next_phase)
        # Immediately get the opener for the next phase
        return process_turn(session_id, candidate_message=None)

    return {"message": result["message"], "phase": phase, "done": False}
