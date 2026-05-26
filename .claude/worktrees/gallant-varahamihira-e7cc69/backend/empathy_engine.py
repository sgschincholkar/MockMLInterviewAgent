"""
Empathy engine: detect anxiety signals and soften the interviewer's tone.
"""
import re

ANXIETY_PHRASES = [
    r"\bi don'?t know\b",
    r"\bi'?m not sure\b",
    r"\bi have no idea\b",
    r"\bi can'?t remember\b",
    r"\bi forget\b",
    r"\bsorry\b",
    r"\bi'?m confused\b",
]

FILLER_WORDS = ["um", "uh", "hmm", "err", "like", "you know"]


def _count_anxiety_signals(turns: list[dict]) -> int:
    """Count anxiety signals in recent candidate turns."""
    count = 0
    for turn in turns:
        if turn.get("role") != "candidate":
            continue
        text = turn.get("message", "").lower()
        for pattern in ANXIETY_PHRASES:
            if re.search(pattern, text):
                count += 1
        short_answer = len(text.split()) < 15
        if short_answer:
            count += 1
        filler_count = sum(text.count(f) for f in FILLER_WORDS)
        if filler_count >= 3:
            count += 1
    return count


def should_encourage(recent_turns: list[dict], window: int = 3) -> bool:
    """Return True if the candidate shows anxiety in the last `window` turns."""
    window_turns = [t for t in recent_turns if t.get("role") == "candidate"][-window:]
    return _count_anxiety_signals(window_turns) >= 2


def empathy_prefix(candidate_text: str) -> str:
    """Return a brief empathy opener if the candidate seems stuck."""
    text = candidate_text.lower()
    if any(re.search(p, text) for p in ANXIETY_PHRASES[:4]):
        return "Take your time. "
    return ""
