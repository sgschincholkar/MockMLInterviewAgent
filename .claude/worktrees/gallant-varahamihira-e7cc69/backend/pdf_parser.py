"""
PDF parser using OpenAI Responses API.
No PyMuPDF or third-party PDF libraries — the raw PDF bytes are sent
directly to the model which extracts structured resume sections.
"""
import base64
import json
from openai import OpenAI
from backend.config import OPENAI_API_KEY, OPENAI_MODEL
from backend.token_tracker import track_llm

client = OpenAI(api_key=OPENAI_API_KEY)

EXTRACTION_PROMPT = """You are a resume parser. You will receive the raw content of a PDF resume.
Extract the following sections as a JSON object. If a section is not present, use an empty string or empty list.

Return ONLY valid JSON in this exact schema:
{
  "name": "Full candidate name",
  "summary": "Brief professional summary or objective",
  "education": "Education background as a single formatted string",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Duration",
      "description": "What they did — full bullet points as a single string"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Full description of the project, technologies, outcomes"
    }
  ],
  "skills": "Comma-separated list of all technical skills",
  "achievements": "Certifications, awards, publications as a single string"
}

Important:
- The first item in "experience" or "projects" (whichever has more ML relevance) is the primary drill-down project.
- Preserve all technical detail — do NOT summarise aggressively.
"""


def parse_pdf(pdf_bytes: bytes, session_id: str | None = None) -> dict:
    """Send raw PDF bytes to OpenAI and extract structured resume sections."""
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_file",
                        "filename": "resume.pdf",
                        "file_data": f"data:application/pdf;base64,{pdf_b64}",
                    },
                    {
                        "type": "input_text",
                        "text": EXTRACTION_PROMPT,
                    },
                ],
            }
        ],
    )

    track_llm(session_id, "pdf_parse", OPENAI_MODEL,
              getattr(response.usage, "input_tokens", 0),
              getattr(response.usage, "output_tokens", 0))
    raw = response.output_text.strip()
    # Strip markdown code fences if model wraps in ```json ... ```
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
