"""
FastAPI backend for the MockML Interview Agent.

Endpoints:
  POST /session/start         — Upload PDF, parse, store, return session_id
  POST /session/{id}/respond  — Send audio or text, get next interviewer message + TTS audio
  GET  /session/{id}/report   — Get final performance report
"""
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.pdf_parser import parse_pdf
from backend.resume_store import create_session, store_resume_sections
from backend.orchestrator import process_turn
from backend.voice import transcribe, speak
from backend.report_generator import generate_report

app = FastAPI(title="MockML Interview Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── POST /session/start ──────────────────────────────────────────────────────

@app.post("/session/start")
async def start_session(file: UploadFile = File(...)):
    """
    Upload a résumé PDF. Parses it via OpenAI, stores sections in Supabase.
    Returns the session_id and the first interviewer message + TTS audio.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()

    # Parse PDF via OpenAI (no third-party PDF libs)
    parsed = parse_pdf(pdf_bytes)

    # Create session and store resume
    session_id = create_session(parsed.get("name", "Candidate"))
    store_resume_sections(session_id, parsed)

    # Get Phase 1 opener
    result = process_turn(session_id, candidate_message=None)

    # Generate TTS for opener
    audio_bytes = speak(result["message"])
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "session_id": session_id,
        "candidate_name": parsed.get("name", "Candidate"),
        "message": result["message"],
        "audio_b64": audio_b64,
        "phase": result["phase"],
        "done": result["done"],
    }


# ─── POST /session/{id}/respond ───────────────────────────────────────────────

@app.post("/session/{session_id}/respond")
async def respond(
    session_id: str,
    audio: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
):
    """
    Submit a candidate response (audio file OR text).
    Returns the next interviewer message and TTS audio.
    """
    if audio is not None:
        audio_bytes = await audio.read()
        candidate_text = transcribe(audio_bytes, filename=audio.filename or "audio.webm")
    elif text:
        candidate_text = text
    else:
        raise HTTPException(status_code=400, detail="Provide either audio or text.")

    result = process_turn(session_id, candidate_message=candidate_text)

    # Generate TTS
    audio_bytes = speak(result["message"])
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "candidate_text": candidate_text,
        "message": result["message"],
        "audio_b64": audio_b64,
        "phase": result["phase"],
        "done": result["done"],
    }


# ─── GET /session/{id}/report ─────────────────────────────────────────────────

@app.get("/session/{session_id}/report")
async def get_report(session_id: str):
    """Generate and return the full performance report."""
    report = generate_report(session_id)
    return report


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}
