"""
Final report generator — produces a structured performance report.
"""
import json
from datetime import datetime
from openai import OpenAI
from backend.config import OPENAI_API_KEY, OPENAI_MODEL
from backend.resume_store import get_resume, get_turns
from backend.evaluator import load_scores, evaluate_phase_project, evaluate_phase4, evaluate_phase5
from backend.db.client import get_client
from backend.ml_questions.retriever import get_relevant_questions

client = OpenAI(api_key=OPENAI_API_KEY)


def _load_session(session_id: str) -> dict:
    db = get_client()
    return (
        db.table("interview_sessions")
        .select("*")
        .eq("id", session_id)
        .single()
        .execute()
        .data
    )


def _load_phase4_questions(session_id: str) -> list[dict]:
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
    return []


def generate_report(session_id: str) -> dict:
    """
    Run evaluations (if not already done) and return the full report as a dict.
    """
    session = _load_session(session_id)
    resume = get_resume(session_id)
    existing_scores = {s["phase"]: s for s in load_scores(session_id)}

    # ── Evaluate phases not yet scored ──────────────────────────────────────
    for phase in [2, 3]:
        if phase not in existing_scores:
            turns = get_turns(session_id, phase)
            if turns:
                evaluate_phase_project(session_id, phase, turns)

    if 4 not in existing_scores:
        questions = _load_phase4_questions(session_id)
        if not questions:
            questions = get_relevant_questions(resume, n=6)
        turns = get_turns(session_id, 4)
        if turns:
            evaluate_phase4(session_id, turns, questions)

    if 5 not in existing_scores:
        turns = get_turns(session_id, 5)
        if turns:
            # Detect if candidate asked questions (last candidate turn has "?")
            candidate_turns = [t for t in turns if t["role"] == "candidate"]
            asked = "?" in (candidate_turns[-1]["message"] if candidate_turns else "")
            evaluate_phase5(session_id, turns, asked)

    # ── Reload scores ────────────────────────────────────────────────────────
    scores = {s["phase"]: s for s in load_scores(session_id)}

    p2 = scores.get(2, {})
    p3 = scores.get(3, {})
    p4 = scores.get(4, {})
    p5 = scores.get(5, {})

    # ── Overall score out of 40 ──────────────────────────────────────────────
    phase2_score = p2.get("score", 0)
    phase3_score = p3.get("score", 0)
    phase4_score = round((p4.get("score", 0) / max(p4.get("max_score", 1), 1)) * 10, 1)  # normalise to /10
    phase5_score = p5.get("score", 0)
    overall = round(phase2_score + phase3_score + phase4_score + phase5_score, 1)

    # ── Recommendation ───────────────────────────────────────────────────────
    if overall >= 32:
        recommendation = "Strong Hire"
    elif overall >= 24:
        recommendation = "Hire"
    else:
        recommendation = "No Hire"

    # ── LLM narrative ────────────────────────────────────────────────────────
    narrative_prompt = (
        "Write a 3-paragraph professional interview debrief for a Machine Learning Engineer candidate. "
        "Paragraph 1: overall impressions. "
        "Paragraph 2: key strengths with specific examples from the scores below. "
        "Paragraph 3: areas for improvement and development suggestions.\n\n"
        f"Phase 2 (Project Deep-Dive 1): {phase2_score}/10 — {p2.get('rationale','')}\n"
        f"Phase 3 (Project Deep-Dive 2): {phase3_score}/10 — {p3.get('rationale','')}\n"
        f"Phase 4 (Technical Q&A): {phase4_score}/10 — {p4.get('rationale','')}\n"
        f"Phase 5 (Behavioural): {phase5_score}/10 — {p5.get('rationale','')}\n"
        f"Overall: {overall}/40\nRecommendation: {recommendation}"
    )
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[{"role": "user", "content": narrative_prompt}],
    )
    narrative = response.output_text.strip()

    return {
        "candidate_name": session.get("candidate_name", "Candidate"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "scores": {
            "phase1": "N/A",
            "phase2": f"{phase2_score}/10",
            "phase3": f"{phase3_score}/10",
            "phase4": f"{p4.get('score', 0)}/{p4.get('max_score', 0)} correct ({phase4_score}/10 normalised)",
            "phase5": f"{phase5_score}/10",
        },
        "overall": f"{overall}/40",
        "recommendation": recommendation,
        "narrative": narrative,
        "phase_rationale": {
            "phase2": p2.get("rationale", ""),
            "phase3": p3.get("rationale", ""),
            "phase4": p4.get("rationale", ""),
            "phase5": p5.get("rationale", ""),
        },
    }
