"""
All 5 interview phase handlers.
Each handler receives the session state and candidate's latest message,
and returns the next interviewer message plus any state updates.
"""
import json
from openai import OpenAI
from backend.config import OPENAI_API_KEY, OPENAI_MODEL
from backend.empathy_engine import should_encourage, empathy_prefix

client = OpenAI(api_key=OPENAI_API_KEY)

# ─── Shared interviewer persona ──────────────────────────────────────────────

PERSONA = (
    "You are a senior Machine Learning Engineer conducting a technical interview. "
    "Your tone is professional and measured — never use words like 'fantastic', 'great job', "
    "'excellent', 'amazing', 'wonderful', or any effusive praise. "
    "When the candidate gives a correct answer, simply acknowledge it briefly and move on. "
    "Ask one question at a time. Be concise."
)

# ─── Helper ──────────────────────────────────────────────────────────────────

def _chat(system: str, messages: list[dict]) -> str:
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[{"role": "system", "content": system}] + messages,
    )
    return response.output_text.strip()


# ─── Phase 1: Background Introduction ────────────────────────────────────────

def phase1_opener(resume: dict) -> str:
    name = resume.get("name", "the candidate")
    summary = resume.get("summary", "")
    education = resume.get("education", "")
    return (
        f"Good to meet you. Could you please tell me a bit about yourself and "
        f"walk me through your background?"
    )


def phase1_respond(resume: dict, history: list[dict]) -> dict:
    """Phase 1 runs for 1 exchange then transitions."""
    # After the candidate's first response, we're done with phase 1
    candidate_turns = [t for t in history if t["role"] == "candidate"]
    if len(candidate_turns) >= 1:
        return {
            "message": "Understood. Let us move into the technical portion of the interview.",
            "advance_phase": True,
        }
    return {"message": phase1_opener(resume), "advance_phase": False}


# ─── Phase 2 & 3: Russian Doll Project Deep-Dive ─────────────────────────────

RUSSIAN_DOLL_SYSTEM = (
    PERSONA
    + "\n\nYou are conducting a Socratic deep-dive on a specific project from the candidate's résumé. "
    "Follow the Russian Doll approach: start surface-level, then keep drilling deeper — "
    "from what → how → why → implementation details → mathematical foundations → trade-offs. "
    "After each candidate answer, decide:\n"
    "- If the answer is sufficient: go one level deeper with a more specific follow-up.\n"
    "- If the candidate is stuck (says 'I don't know' or gives a vague answer twice in a row): "
    "move to a different aspect of the same project.\n"
    "- After exhausting the project OR after 8 exchanges: respond with exactly: [PHASE_COMPLETE]\n"
    "Only ask ONE question per turn. Never praise. Questions must be relevant to ML Engineer roles."
)


def _build_project_context(project: dict) -> str:
    return (
        f"Project name: {project.get('name', 'Unknown')}\n"
        f"Description: {project.get('description', '')}"
    )


def _get_drill_project(resume: dict, phase: int) -> dict:
    """Pick project 1 for phase 2, project 2 for phase 3."""
    projects = resume.get("projects", [])
    experience = resume.get("experience", [])

    # Flatten: projects first, then experience items
    all_items = projects + [
        {"name": f"{e.get('title')} @ {e.get('company')}", "description": e.get("description", "")}
        for e in experience
    ]

    idx = phase - 2  # phase 2 → idx 0, phase 3 → idx 1
    if idx < len(all_items):
        return all_items[idx]
    return {"name": "your most significant project", "description": ""}


def phase_project_respond(resume: dict, history: list[dict], phase: int) -> dict:
    """Handle Russian Doll drill-down for phase 2 or 3."""
    project = _get_drill_project(resume, phase)
    project_ctx = _build_project_context(project)

    # Build conversation so far
    messages = []
    for turn in history:
        role = "user" if turn["role"] == "candidate" else "assistant"
        messages.append({"role": role, "content": turn["message"]})

    # Opener if no history yet
    if not messages:
        opener = (
            f"I see you worked on {project.get('name', 'a project')}. "
            f"Could you walk me through what you built and what problem it solved?"
        )
        return {"message": opener, "advance_phase": False, "drill_depth": 0}

    # Count candidate turns to decide if we've drilled enough
    candidate_turns = [t for t in history if t["role"] == "candidate"]
    drill_depth = len(candidate_turns)

    # Check empathy
    empathy = empathy_prefix(candidate_turns[-1]["message"]) if candidate_turns else ""

    system = (
        RUSSIAN_DOLL_SYSTEM
        + f"\n\nProject context:\n{project_ctx}"
        + f"\nCurrent drill depth: {drill_depth}"
    )

    response_text = _chat(system, messages)

    if "[PHASE_COMPLETE]" in response_text:
        bridge = "Let us move on." if phase == 2 else "That concludes the project review."
        return {"message": bridge, "advance_phase": True, "drill_depth": drill_depth}

    final_message = empathy + response_text if empathy else response_text
    return {"message": final_message, "advance_phase": False, "drill_depth": drill_depth}


# ─── Phase 4: Factual / Technical Questions ──────────────────────────────────

FACTUAL_SYSTEM = (
    PERSONA
    + "\n\nYou are asking factual technical questions to a Machine Learning Engineer candidate. "
    "Ask the question clearly and wait for the answer. Do not give hints. "
    "After the candidate answers, respond with a single line: either 'Noted.' or briefly "
    "correct a misconception if the answer is significantly wrong. Then ask the next question. "
    "When all questions are asked, respond with exactly: [PHASE_COMPLETE]"
)


def phase4_respond(resume: dict, history: list[dict], questions: list[dict]) -> dict:
    """Cycle through retrieved factual questions."""
    candidate_turns = [t for t in history if t["role"] == "candidate"]
    q_index = len(candidate_turns)

    if q_index >= len(questions):
        return {"message": "That concludes the technical questions.", "advance_phase": True, "q_index": q_index}

    # If this is an answer turn, build system context with history and ask next
    messages = []
    for turn in history:
        role = "user" if turn["role"] == "candidate" else "assistant"
        messages.append({"role": role, "content": turn["message"]})

    remaining_qs = "\n".join(
        [f"{i+1}. {q['question']}" for i, q in enumerate(questions[q_index:])]
    )
    system = (
        FACTUAL_SYSTEM
        + f"\n\nRemaining questions to ask (in order):\n{remaining_qs}"
        + f"\nYou have asked {q_index} questions so far. Ask question {q_index + 1} now."
    )

    response_text = _chat(system, messages)

    if "[PHASE_COMPLETE]" in response_text:
        return {"message": "That concludes the technical questions.", "advance_phase": True, "q_index": q_index}

    return {"message": response_text, "advance_phase": False, "q_index": q_index}


# ─── Phase 5: Behavioural Wrap-up ────────────────────────────────────────────

BEHAVIOURAL_QUESTIONS = [
    "Where do you see yourself in five years?",
    "How do you approach collaboration within a cross-functional team?",
    "What do you consider your greatest professional strength, and what is an area you are actively working to improve?",
    "Tell me about a time you disagreed with a technical decision made by your team. How did you handle it?",
    "Do you have any questions for me?",
]

BEHAVIOURAL_SYSTEM = (
    PERSONA
    + "\n\nYou are wrapping up the interview with behavioural questions. "
    "Ask each question in turn. After the candidate answers, acknowledge briefly and continue. "
    "Pay attention to whether the candidate asks questions at the end — this matters. "
    "When all questions are done, respond with exactly: [PHASE_COMPLETE]"
)


def phase5_respond(resume: dict, history: list[dict]) -> dict:
    """Cycle through behavioural questions."""
    candidate_turns = [t for t in history if t["role"] == "candidate"]
    q_index = len(candidate_turns)

    if q_index >= len(BEHAVIOURAL_QUESTIONS):
        return {
            "message": "That brings us to the end of the interview. Thank you for your time.",
            "advance_phase": True,
            "asked_questions": _candidate_asked_questions(candidate_turns),
        }

    messages = []
    for turn in history:
        role = "user" if turn["role"] == "candidate" else "assistant"
        messages.append({"role": role, "content": turn["message"]})

    remaining = "\n".join(BEHAVIOURAL_QUESTIONS[q_index:])
    system = (
        BEHAVIOURAL_SYSTEM
        + f"\n\nRemaining questions:\n{remaining}"
        + f"\nAsk question {q_index + 1} now."
    )

    response_text = _chat(system, messages)

    if "[PHASE_COMPLETE]" in response_text:
        return {
            "message": "That brings us to the end of the interview. Thank you for your time.",
            "advance_phase": True,
            "asked_questions": _candidate_asked_questions(candidate_turns),
        }

    return {
        "message": response_text,
        "advance_phase": False,
        "asked_questions": False,
    }


def _candidate_asked_questions(candidate_turns: list[dict]) -> bool:
    """Detect if the candidate asked any questions at the end."""
    if not candidate_turns:
        return False
    last = candidate_turns[-1].get("message", "").strip()
    return "?" in last or any(
        kw in last.lower()
        for kw in ["what is", "how does", "could you tell", "i was wondering", "can you explain"]
    )
