"""
ML Questions retriever.
Parses questions.md, detects candidate expertise from résumé via LLM,
then finds the most relevant questions using OpenAI embeddings + cosine similarity.
Falls back to LLM-generated questions if similarity score is below threshold.
"""
import re
import json
import numpy as np
from openai import OpenAI
from backend.config import OPENAI_API_KEY, OPENAI_MODEL

client = OpenAI(api_key=OPENAI_API_KEY)

QUESTIONS_PATH = "backend/ml_questions/questions.md"
EMBED_MODEL = "text-embedding-3-small"
SIMILARITY_THRESHOLD = 0.35
MIN_QUESTIONS = 5


def _parse_questions(path: str = QUESTIONS_PATH) -> list[dict]:
    """Parse questions.md into a list of {id, question, answer} dicts."""
    with open(path, "r") as f:
        content = f.read()

    questions = []
    # Match numbered question headers: #### N) Question text
    pattern = re.compile(
        r"#{2,4}\s+(\d+)\)\s+(.+?)(?=\n#{2,4}\s+\d+\)|\Z)", re.DOTALL
    )
    for match in pattern.finditer(content):
        q_id = int(match.group(1))
        block = match.group(2).strip()
        # First line is the question, rest is the answer
        lines = block.split("\n")
        question_line = re.sub(r"\[\[src\].*?\]", "", lines[0]).strip()
        answer = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""
        questions.append({"id": q_id, "question": question_line, "answer": answer})

    return questions


def _embed(texts: list[str]) -> np.ndarray:
    response = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return np.array([item.embedding for item in response.data])


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between vector a and matrix b."""
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-10)
    return b_norm @ a_norm


def detect_expertise(resume: dict) -> str:
    """Ask LLM to detect candidate's primary ML domain from resume."""
    skills = resume.get("skills", "")
    projects = json.dumps(resume.get("projects", []))
    experience = json.dumps(resume.get("experience", []))

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {
                "role": "user",
                "content": (
                    "Based on the following resume information, identify the candidate's primary "
                    "ML expertise domain(s). Return a short comma-separated list of domains from: "
                    "NLP, Computer Vision, Reinforcement Learning, Classical ML, Deep Learning, "
                    "MLOps, Recommendation Systems, Time Series, Generative AI, General ML.\n\n"
                    f"Skills: {skills}\nProjects: {projects}\nExperience: {experience}\n\n"
                    "Return ONLY the comma-separated domain list, nothing else."
                ),
            }
        ],
    )
    return response.output_text.strip()


def get_relevant_questions(resume: dict, n: int = 6) -> list[dict]:
    """
    Return top-N relevant questions for the candidate.
    Falls back to LLM-generated questions if similarity is too low.
    """
    all_questions = _parse_questions()
    expertise = detect_expertise(resume)

    # Build query from expertise + key resume signals
    skills = resume.get("skills", "")
    query = f"Interview questions for ML engineer with expertise in: {expertise}. Skills: {skills}"

    # Embed query and all questions
    q_texts = [q["question"] for q in all_questions]
    embeddings = _embed(q_texts)
    query_emb = _embed([query])[0]

    scores = _cosine_similarity(query_emb, embeddings)
    top_indices = np.argsort(scores)[::-1][:n]
    top_questions = [all_questions[i] for i in top_indices]
    top_scores = [float(scores[i]) for i in top_indices]

    # Check if results are relevant enough
    good_questions = [
        q for q, s in zip(top_questions, top_scores) if s >= SIMILARITY_THRESHOLD
    ]

    if len(good_questions) >= MIN_QUESTIONS:
        return good_questions[:n]

    # Fallback: supplement with LLM-generated questions
    num_to_generate = MIN_QUESTIONS - len(good_questions)
    generated = _generate_questions(expertise, skills, num_to_generate)
    return good_questions + generated


def _generate_questions(expertise: str, skills: str, n: int) -> list[dict]:
    """Generate n factual ML questions tailored to the candidate's expertise."""
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {
                "role": "user",
                "content": (
                    f"Generate {n} factual technical interview questions for a Machine Learning Engineer "
                    f"with expertise in {expertise} and skills: {skills}.\n"
                    "Each question should test deep conceptual and mathematical knowledge.\n"
                    "Return ONLY a JSON array in this format:\n"
                    '[{"question": "...", "answer": "..."}, ...]\n'
                    "No markdown, no extra text."
                ),
            }
        ],
    )
    raw = response.output_text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    items = json.loads(raw.strip())
    return [{"id": f"gen_{i}", "question": item["question"], "answer": item["answer"]} for i, item in enumerate(items)]
