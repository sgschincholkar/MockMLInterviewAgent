"""
Evaluation engine — scores each interview phase and writes results to Supabase.
"""
import json
from openai import OpenAI
from backend.config import OPENAI_API_KEY, OPENAI_MODEL
from backend.db.client import get_client
from backend.token_tracker import track_llm

client = OpenAI(api_key=OPENAI_API_KEY)


def _chat(prompt: str, session_id: str | None = None) -> str:
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[{"role": "user", "content": prompt}],
    )
    track_llm(session_id, "llm_chat", OPENAI_MODEL,
              getattr(response.usage, "input_tokens", 0),
              getattr(response.usage, "output_tokens", 0))
    return response.output_text.strip()


def _store_score(session_id: str, phase: int, score: float, max_score: float, rationale: str) -> None:
    db = get_client()
    db.table("evaluations").insert(
        {
            "session_id": session_id,
            "phase": phase,
            "score": score,
            "max_score": max_score,
            "rationale": rationale,
        }
    ).execute()


# ─── Phase 2 & 3: Russian Doll Depth Score (0–10) ────────────────────────────

DEPTH_RUBRIC = """
Evaluate the candidate's performance in a Socratic deep-dive interview on one of their projects.
Use this rubric:
- 9-10: Answered mathematical/theoretical level (formulas, internal algorithms, proofs)
- 7-8: Handled implementation details and trade-offs confidently
- 5-6: Understood conceptual layer; struggled with internals
- 3-4: Only surface-level understanding
- 1-2: Vague answers; could not explain the project meaningfully
- 0: Did not respond / total blank

Additional factors: clarity, precise terminology, ability to self-correct.

Return JSON only: {"score": <0-10>, "rationale": "<2-3 sentence explanation>"}
"""


def evaluate_phase_project(session_id: str, phase: int, turns: list[dict]) -> dict:
    conversation = "\n".join(
        [f"{t['role'].upper()}: {t['message']}" for t in turns]
    )
    prompt = (
        f"{DEPTH_RUBRIC}\n\nInterview transcript (Phase {phase}):\n{conversation}"
    )
    raw = _chat(prompt, session_id)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    _store_score(session_id, phase, result["score"], 10.0, result["rationale"])
    return result


# ─── Phase 4: Technical Correctness ──────────────────────────────────────────

CORRECTNESS_RUBRIC = """
You are grading a candidate's answers to factual ML interview questions.
For each question+answer pair below, assign:
- 1.0 = correct and well-explained
- 0.5 = partially correct or missing key details
- 0.0 = wrong or "I don't know"

Return JSON only:
{"scores": [<float>, ...], "rationale": "<brief overall summary>"}
"""


def evaluate_phase4(session_id: str, turns: list[dict], questions: list[dict]) -> dict:
    # Pair questions with candidate answers from history
    candidate_answers = [t["message"] for t in turns if t["role"] == "candidate"]
    pairs = []
    for i, q in enumerate(questions):
        answer = candidate_answers[i] if i < len(candidate_answers) else "(no answer)"
        pairs.append(f"Q{i+1}: {q['question']}\nExpected: {q.get('answer','')}\nCandidate: {answer}")

    prompt = CORRECTNESS_RUBRIC + "\n\n" + "\n\n".join(pairs)
    raw = _chat(prompt, session_id)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())

    total = sum(result["scores"])
    max_score = float(len(questions))
    _store_score(session_id, 4, total, max_score, result["rationale"])
    return {"score": total, "max_score": max_score, "rationale": result["rationale"], "per_question": result["scores"]}


# ─── Phase 5: Behavioural Score ───────────────────────────────────────────────

BEHAVIOURAL_RUBRIC = """
Evaluate the candidate's performance in the behavioural portion of an ML Engineer interview.
Score each dimension 0-10:
1. Communication clarity and structure
2. Visionary thinking (clear sense of direction, ambition, impact)
3. Team-player indicators (collaboration, conflict resolution, empathy)
4. Curiosity (did the candidate ask thoughtful questions at the end?)

Deduct 3 points from the "curiosity" dimension if the candidate did NOT ask any questions.

Return JSON only:
{
  "communication": <0-10>,
  "vision": <0-10>,
  "teamwork": <0-10>,
  "curiosity": <0-10>,
  "overall": <average of the four>,
  "rationale": "<2-3 sentence summary>"
}
"""


def evaluate_phase5(session_id: str, turns: list[dict], candidate_asked_questions: bool) -> dict:
    conversation = "\n".join([f"{t['role'].upper()}: {t['message']}" for t in turns])
    asked_note = (
        "The candidate DID ask questions at the end."
        if candidate_asked_questions
        else "The candidate did NOT ask any questions at the end — apply the -3 curiosity penalty."
    )
    prompt = f"{BEHAVIOURAL_RUBRIC}\n\n{asked_note}\n\nTranscript:\n{conversation}"
    raw = _chat(prompt, session_id)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    _store_score(session_id, 5, result["overall"], 10.0, result["rationale"])
    return result


# ─── Load all scores ──────────────────────────────────────────────────────────

def load_scores(session_id: str) -> list[dict]:
    db = get_client()
    return (
        db.table("evaluations")
        .select("*")
        .eq("session_id", session_id)
        .order("phase")
        .execute()
        .data
    )
