# CLAUDE.md — MockML Interview Agent

Project-specific instructions for Claude Code. These override global defaults.

---

## Project Overview

AI-powered mock interview system for ML Engineer candidates.
- **V1**: Shipped 2026-04-15. Fully functional, running locally, pushed to GitHub.
- **Repo**: https://github.com/sgschincholkar/MockMLInterviewAgent
- **Stack**: FastAPI (Python 3.13) + React/Vite (TypeScript) + Supabase + OpenAI + ElevenLabs

---

## Running the App

```bash
# Start both servers (from project root)
./start.sh

# Or individually:
PYTHONPATH="$PWD" python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
cd frontend && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Health check: http://localhost:8000/health

**CRITICAL:** Always use `python -m uvicorn`, never bare `uvicorn`. The bare binary resolves to system Python 3.12 which doesn't have the packages. Miniconda Python 3.13 is the active environment.

---

## Environment & Secrets

- All secrets live in `.env` (gitignored) and `secrets.md` (gitignored). **Never commit either file.**
- Keys: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `OPENAI_MODEL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- OpenAI model: `gpt-5.4-mini-2026-03-17`
- ElevenLabs voice ID: `UgBBYS2sOqTuMpoF3BR0` (requires paid plan — free tier blocked on library voices)

---

## Architecture

```
frontend/          React + Vite + TypeScript (port 3000)
backend/
  main.py          FastAPI — 3 endpoints: /session/start, /session/{id}/respond, /session/{id}/report
  config.py        Loads all env vars
  pdf_parser.py    OpenAI Responses API PDF extraction (NO third-party PDF libs)
  resume_store.py  Supabase reads/writes for all resume data
  orchestrator.py  Phase state machine 1→5, persisted in Supabase
  phases.py        All 5 phase handlers (intro, Russian doll x2, factual, behavioural)
  evaluator.py     LLM-as-judge scoring per phase
  report_generator.py  Final report with scores + narrative + recommendation
  empathy_engine.py    Anxiety signal detection
  voice.py         Whisper STT + ElevenLabs TTS primary + OpenAI TTS fallback
  token_tracker.py Per-call token/cost tracking → Supabase token_usage table
  db/
    client.py      Supabase singleton client
    migration.sql  Schema + RLS allow_all policies (run in Supabase SQL editor)
  ml_questions/
    questions.md   78 ML + NLP questions from andrewekhalel/MLQuestions
    retriever.py   OpenAI embeddings + cosine similarity retrieval
```

---

## Supabase

- Project: `MockMLInterviewAgent`
- Tables: `interview_sessions`, `resume_sections`, `conversation_turns`, `evaluations`, `token_usage`
- **RLS**: All tables have `allow_all` policies. Without these, all writes fail with `42501`.
- If adding a new table, always include `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "allow_all"` in the migration.

---

## Voice Layer

TTS fallback chain (in order):
1. **ElevenLabs** (`eleven_turbo_v2_5`, voice `UgBBYS2sOqTuMpoF3BR0`) — primary, requires paid plan
2. **OpenAI TTS** (`tts-1`, `onyx` voice) — fallback
3. **Empty bytes** — graceful text-mode degradation, frontend skips audio silently

Frontend shows `🔊 Voice` badge when audio is present, `Text mode` when not.

---

## LLM Calls

All LLM calls use the **OpenAI Responses API** (`client.responses.create`):
- Access response text via `.output_text` — NOT `.choices[0].message.content`
- Model: `gpt-5.4-mini-2026-03-17` (set via `OPENAI_MODEL` env var)

---

## Interviewer Persona (enforced in system prompts)

- Tone: professional, measured, never effusive
- Banned words: "fantastic", "great job", "excellent", "amazing", "wonderful"
- Correct answers: acknowledge with "Noted." and move on — no praise
- One question at a time — never compound questions
- Russian Doll: keep drilling until candidate cannot answer, then pivot to another aspect

---

## Task Tracking

- `tasks/todo.md` — sprint tasks with V1 complete and V2 backlog
- `tasks/lessons.md` — key lessons learned, must be updated after any correction

---

## Key Lessons (summary — full detail in tasks/lessons.md)

1. Use `python -m uvicorn` not `uvicorn` (Python env mismatch)
2. Always add RLS `allow_all` policies in migration SQL (Supabase blocks writes by default)
3. ElevenLabs free tier blocks library voices — paid plan required; OpenAI TTS is the fallback
4. Never use interactive CLI scaffolding (`create-vite`) in scripts — write files directly
5. OpenAI Responses API returns `.output_text`, not `.choices[0].message.content`
6. Whisper STT has no usage object — estimate cost from output transcript char count
7. Never commit `.env`, `secrets.md`, or `.mcp.json` (contains DB password)

---

## Token Tracking

`backend/token_tracker.py` writes one row per API call to the `token_usage` Supabase table.
- `track_llm(session_id, operation, model, input_tokens, output_tokens)`
- `track_embedding(session_id, model, input_tokens)`
- `track_stt(session_id, char_count)` — char count of Whisper transcript (no native usage object)
- `track_tts(session_id, char_count, provider)` — provider: `"elevenlabs"` or `"openai"`
- `get_usage_summary(session_id)` — aggregates all rows, used by report endpoint

Cost constants (approximate): LLM $0.15/1M input + $0.60/1M output; embeddings $0.02/1M;
STT $0.006/650 chars; OpenAI TTS $15/1M chars; ElevenLabs $0.30/1K chars.

Report endpoint returns `token_usage` key; ReportView renders "API Usage & Cost" table.

---

## V2 Backlog

See `tasks/todo.md` for full list. Key items:
- PDF report export
- Session history + candidate dashboard
- Production deploy (Render + Vercel)
