# MockML Interview Agent — MVP Tasks

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## MVP (End-to-End, ~10 Tasks)

- [ ] **T-01** **Project setup** — folder structure, `requirements.txt`, `.env`, `.gitignore`, `backend/config.py`

- [ ] **T-02** **Supabase schema** — create 4 tables in `MockMLInterviewAgent`: `resume_sections`, `interview_sessions`, `conversation_turns`, `evaluations`

- [ ] **T-03** **PDF parser** — `backend/pdf_parser.py`: send PDF bytes to OpenAI Responses API with structured extraction prompt; parse name, summary, education, experience, projects, skills into sections; write to Supabase via `resume_store.py`

- [ ] **T-04** **ML Questions bank** — download `andrewekhalel/MLQuestions` content into `backend/ml_questions/questions.md`; implement `retriever.py` with cosine similarity to fetch top-5 questions matched to candidate expertise; LLM fallback if no match

- [ ] **T-05** **Interview orchestrator** — `backend/interview_orchestrator.py`: state machine for phases 1→5; persists phase state in Supabase; calls phase handlers in sequence

- [ ] **T-06** **Phase handlers** — implement all 5 phase handlers in one pass:
  - Phase 1: intro opener from résumé
  - Phase 2 & 3: Russian Doll drill-down with `drill_depth` state, tone enforcement, no praise words
  - Phase 4: factual Q&A from retrieved questions
  - Phase 5: behavioural wrap-up, detect if candidate asks questions

- [ ] **T-07** **Evaluation engine** — `backend/evaluator.py`: score Phases 2 & 3 (Russian Doll depth matrix 0–10), Phase 4 (correctness), Phase 5 (communication/vision/team/curiosity); write to Supabase `evaluations`

- [ ] **T-08** **Voice layer** — `backend/voice.py`: Whisper STT (`transcribe(audio_bytes)`) + ElevenLabs TTS (`speak(text)`) with voice ID `UgBBYS2sOqTuMpoF3BR0`

- [ ] **T-09** **FastAPI backend** — `backend/main.py`: three endpoints:
  - `POST /session/start` — upload PDF, parse, store, return `session_id`
  - `POST /session/{id}/respond` — receive audio/text, run phase logic, return next message + TTS audio
  - `GET /session/{id}/report` — return final performance report

- [ ] **T-10** **React frontend** — `frontend/` (Vite + TypeScript): PDF upload, start button, chat transcript (interviewer / candidate), mic recorder via MediaRecorder API → Whisper, TTS audio playback, phase progress bar, final report display

---

## Notes
- Model: `gpt-5.4-mini-2026-03-17`
- ElevenLabs Voice ID: `UgBBYS2sOqTuMpoF3BR0`
- Supabase project: `MockMLInterviewAgent`
- Secrets: `secrets.md` — never commit
