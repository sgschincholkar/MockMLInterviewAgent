# MockML Interview Agent

![Status](https://img.shields.io/badge/V1-Shipped-brightgreen) ![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React-blue) ![LLM](https://img.shields.io/badge/LLM-GPT--5.4--mini-orange) ![Voice](https://img.shields.io/badge/Voice-OpenAI%20TTS-purple)

An industrial-grade, fully AI-powered mock interview system for Machine Learning Engineer candidates. Upload your résumé, go through a structured 5-phase technical interview conducted by an AI interviewer, and receive a detailed performance report with scores and hiring recommendation.

---

## The Problem

Getting a Machine Learning Engineer role at a top company is exceptionally hard. Candidates are expected to demonstrate deep project knowledge, mathematical intuition, system design ability, and strong communication — all under pressure.

The gap: **there is no realistic way to practice this end-to-end**. Mock interviews with humans are expensive, rare, and hard to schedule. Existing AI tools ask surface-level questions and don't drill down the way a real interviewer would.

Most candidates walk into interviews underprepared for the depth and style of questioning they will face.

---

## Target Users

- **ML / AI students** preparing for their first industry role
- **Junior ML engineers** interviewing at top-tier companies (FAANG, AI labs, startups)
- **Career switchers** transitioning into ML from software engineering or research
- **Bootcamp graduates** who need structured technical interview practice
- **University placement cells** looking to prepare students at scale

---

## What It Does

MockML Interview Agent simulates a complete ML Engineer interview in 5 phases:

| Phase | Type | Description |
|---|---|---|
| 1 | Background | "Tell me about yourself" — warm-up based on résumé |
| 2 | Project Deep-Dive #1 | Russian Doll / Socratic drill-down on your most significant project |
| 3 | Project Deep-Dive #2 | Same deep-dive on your second project or research work |
| 4 | Technical Q&A | Factual ML questions matched to your expertise via embeddings |
| 5 | Behavioural | Vision, teamwork, communication, and "do you have questions?" |

At the end, it generates a **Performance Report** with per-phase scores, written feedback, and a hiring recommendation: **Strong Hire / Hire / No Hire**.

---

## The Russian Doll Approach (Phases 2 & 3)

This is the core differentiator. Most interviewers — and all real senior ML engineers — don't just ask "what did you build?" They keep drilling until you either demonstrate deep mastery or hit a wall.

The agent follows this exact pattern:

```
"What did you build?" 
  → "How does it work?"
    → "What is RAG exactly?"
      → "What chunking strategies did you use? What are the trade-offs?"
        → "How does vector indexing work? HNSW vs IVF Flat?"
          → "What is cosine similarity? Give me the formula."
            → "Why did you choose RAG over fine-tuning?"
              → [candidate cannot answer → move to different aspect]
```

The agent tracks **drill depth** per project and evaluates how deep the candidate's understanding truly goes.

---

## Evaluation Rubrics

### Phase 2 & 3 — Russian Doll Depth Score (0–10)

| Score | Depth Reached |
|---|---|
| 9–10 | Mathematical / theoretical level (formulas, proofs, algorithm internals) |
| 7–8 | Implementation details and trade-offs |
| 5–6 | Conceptual understanding, struggles with internals |
| 3–4 | Surface-level only |
| 1–2 | Vague, cannot explain the project meaningfully |
| 0 | No response |

### Phase 4 — Technical Accuracy

Each factual question scored: 1.0 (correct) / 0.5 (partial) / 0.0 (wrong). Score = correct / total.

### Phase 5 — Behavioural (0–10)

| Dimension | Weight |
|---|---|
| Communication clarity and structure | 30% |
| Visionary thinking | 25% |
| Team-player indicators | 25% |
| Asks follow-up questions at end | 20% |

**−3 points** if the candidate does not ask any questions at the end.

### Overall Score

`Phase 2 + Phase 3 + Phase 4 (normalised) + Phase 5 = max 40`

| Score | Recommendation |
|---|---|
| 32–40 | Strong Hire |
| 24–31 | Hire |
| < 24 | No Hire |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (Vite + TS)              │
│   PDF Upload | Chat UI | Mic Recorder | Report View      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (proxied)
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                         │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ PDF Parser  │  │  Interview   │  │   Evaluator    │  │
│  │ (OpenAI)    │  │ Orchestrator │  │   Engine       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │            │
│  ┌──────▼────────────────▼───────────────────▼────────┐  │
│  │                  Supabase (PostgreSQL)               │  │
│  │  interview_sessions | resume_sections |              │  │
│  │  conversation_turns | evaluations                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  OpenAI LLM │  │ Whisper STT  │  │  OpenAI TTS    │  │
│  │ gpt-5.4-mini│  │  (OpenAI)    │  │  (onyx voice)  │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## How It Works — Step by Step

### 1. Resume Upload & Parsing
- User uploads a PDF résumé via the React UI
- The raw PDF bytes are sent directly to the OpenAI Responses API
- A structured prompt extracts: name, summary, education, experience (with descriptions), projects, skills, achievements
- All sections are stored in Supabase keyed by `session_id`
- No third-party PDF libraries used — parsing is entirely LLM-powered

### 2. ML Questions Retrieval
- Candidate's expertise domain (NLP, CV, Generative AI, etc.) is detected from résumé by the LLM
- The [andrewekhalel/MLQuestions](https://github.com/andrewekhalel/MLQuestions) question bank (78 questions across ML + NLP) is embedded using `text-embedding-3-small`
- Cosine similarity selects the top-6 most relevant questions for the candidate's background
- If similarity is below threshold, the LLM generates domain-specific questions as fallback
- Minimum 5 questions guaranteed

### 3. Interview Phases
- The orchestrator maintains a phase state machine (1 → 5) persisted in Supabase
- Each candidate response is transcribed via Whisper (if audio) and routed to the active phase handler
- The phase handler calls the LLM with a tailored system prompt and conversation history
- The LLM's response is returned as text and spoken aloud via OpenAI TTS (`onyx` voice)

### 4. Russian Doll Engine
- Tracks `drill_depth` as an integer across the conversation
- After each candidate answer, the LLM decides: go deeper / accept and pivot / flag as stuck
- Praise words ("fantastic", "great job", "excellent") are explicitly banned in the system prompt
- Correct answers are acknowledged minimally ("Noted.") before the next question
- After 8 exchanges or project exhaustion, phase advances automatically

### 5. Empathy Engine
- Monitors the last 3 candidate turns for anxiety signals: "I don't know", short answers (< 15 words), filler words
- If 2+ signals detected: adds a softening prefix ("Take your time.") to the next question
- Does not lower the rigor — only adjusts tone

### 6. Evaluation & Report
- After all 5 phases, the evaluator runs LLM-as-judge scoring on each phase
- All scores are written to the Supabase `evaluations` table
- The report generator pulls all turns + scores, generates a 3-paragraph narrative, and returns the final report
- Report includes: per-phase scores, overall score out of 40, written feedback, and hiring recommendation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Backend | FastAPI, Python 3.13 |
| LLM | OpenAI `gpt-5.4-mini-2026-03-17` |
| PDF Parsing | OpenAI Responses API (vision/document) |
| Speech-to-Text | OpenAI Whisper (`whisper-1`) |
| Text-to-Speech | OpenAI TTS (`tts-1`, `onyx` voice) — ElevenLabs as fallback |
| Embeddings | OpenAI `text-embedding-3-small` |
| Similarity Search | Cosine similarity (NumPy + scikit-learn) |
| Database | Supabase (PostgreSQL) |
| ML Question Bank | andrewekhalel/MLQuestions (78 questions) |

---

## Database Schema

### `interview_sessions`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| candidate_name | TEXT | Extracted from résumé |
| phase | INTEGER | Current phase (1–5) |
| status | TEXT | `active` / `completed` |
| created_at | TIMESTAMPTZ | |

### `resume_sections`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → interview_sessions |
| section_name | TEXT | `summary`, `education`, `experience`, `projects`, `skills`, `achievements` |
| content | TEXT | Parsed text (JSON for lists) |

### `conversation_turns`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → interview_sessions |
| phase | INTEGER | Phase number |
| role | TEXT | `interviewer` / `candidate` |
| message | TEXT | Turn content |

### `evaluations`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → interview_sessions |
| phase | INTEGER | Phase number |
| score | FLOAT | Achieved score |
| max_score | FLOAT | Maximum possible |
| rationale | TEXT | LLM-generated explanation |

---

## Project Structure

```
MockAgenticEngineering/
├── backend/
│   ├── main.py                    # FastAPI app — 3 endpoints
│   ├── config.py                  # Env var loader
│   ├── pdf_parser.py              # OpenAI-powered PDF extraction
│   ├── resume_store.py            # Supabase read/write helpers
│   ├── orchestrator.py            # Phase state machine
│   ├── phases.py                  # All 5 phase handlers
│   ├── evaluator.py               # LLM-as-judge scoring
│   ├── report_generator.py        # Final report builder
│   ├── empathy_engine.py          # Anxiety detection
│   ├── voice.py                   # Whisper STT + OpenAI TTS (ElevenLabs fallback)
│   ├── db/
│   │   ├── client.py              # Supabase client singleton
│   │   └── migration.sql          # Schema + RLS policies
│   └── ml_questions/
│       ├── questions.md           # 78 ML + NLP questions
│       └── retriever.py           # Embeddings + cosine similarity
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Screen router
│   │   ├── api.ts                 # Backend API client
│   │   ├── components/
│   │   │   ├── Upload.tsx         # PDF upload screen
│   │   │   ├── Interview.tsx      # Chat UI + voice
│   │   │   └── ReportView.tsx     # Final report display
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   └── package.json
├── tasks/
│   ├── todo.md                    # Sprint tasks
│   └── lessons.md                 # Lessons learned
├── requirements.txt
├── start.sh                       # One-command startup
└── .gitignore                     # Excludes .env and secrets.md
```

---

## Setup & Running

### Prerequisites
- Python 3.13+ (with miniconda or venv)
- Node.js 18+
- A Supabase project
- OpenAI API key
- ElevenLabs API key (optional — falls back to text mode)

### 1. Clone the repo
```bash
git clone https://github.com/sgschincholkar/MockMLInterviewAgent
cd MockMLInterviewAgent
```

### 2. Configure environment variables
Create a `.env` file in the root:
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=UgBBYS2sOqTuMpoF3BR0
OPENAI_MODEL=gpt-5.4-mini-2026-03-17
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### 3. Set up Supabase
Run the contents of `backend/db/migration.sql` in your Supabase SQL Editor. This creates all 4 tables and configures Row Level Security policies.

### 4. Start the app
```bash
./start.sh
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

---

## API Reference

### `POST /session/start`
Upload a résumé PDF to create a new session.

**Request:** `multipart/form-data` with `file` (PDF)

**Response:**
```json
{
  "session_id": "uuid",
  "candidate_name": "John Doe",
  "message": "Good to meet you. Could you tell me about yourself?",
  "audio_b64": "base64-encoded-mp3-or-empty",
  "phase": 1,
  "done": false
}
```

### `POST /session/{id}/respond`
Submit a candidate response (audio or text).

**Request:** `multipart/form-data` with either `audio` (webm blob) or `text` (string)

**Response:**
```json
{
  "candidate_text": "transcribed or submitted text",
  "message": "next interviewer question",
  "audio_b64": "base64-encoded-mp3-or-empty",
  "phase": 2,
  "done": false
}
```

### `GET /session/{id}/report`
Generate and fetch the final performance report.

**Response:**
```json
{
  "candidate_name": "John Doe",
  "date": "2026-04-09",
  "scores": {
    "phase1": "N/A",
    "phase2": "8/10",
    "phase3": "6/10",
    "phase4": "5/6 correct (8.3/10 normalised)",
    "phase5": "7/10"
  },
  "overall": "29.3/40",
  "recommendation": "Hire",
  "narrative": "...",
  "phase_rationale": { ... }
}
```

---

## Interviewer Tone & Design Principles

- **No praise.** Words like "fantastic", "great job", "excellent", "amazing" are banned at the system prompt level. Correct answers are acknowledged with "Noted." and the interview moves on.
- **One question at a time.** The agent never asks compound questions.
- **Depth over breadth.** The goal of phases 2 & 3 is to find the ceiling of the candidate's knowledge, not cover all topics.
- **Empathy without softness.** The agent detects anxiety and adjusts tone — but never lowers the technical bar.
- **Voice-first.** Every interviewer turn is spoken aloud. Candidate can respond via microphone or text.

---

## Voice Mode

The interviewer speaks using **OpenAI TTS** (`tts-1`, `onyx` voice) — a deep, professional tone that works on all OpenAI plans with no additional setup. Candidate speech is transcribed by **OpenAI Whisper** (`whisper-1`).

**Fallback chain:**
1. OpenAI TTS (`onyx`) — primary, always attempted first
2. ElevenLabs (`UgBBYS2sOqTuMpoF3BR0`) — used if OpenAI TTS fails and a paid ElevenLabs plan is available
3. Text mode — if both fail, the interview continues silently. A "Text mode" badge appears in the UI header and all functionality works identically without audio.

> To enable the ElevenLabs voice, upgrade to a paid ElevenLabs plan and set `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` in `.env`.

---

## V2 Roadmap

| Item | Description |
|---|---|
| ElevenLabs voice | Upgrade plan to unlock library voice `UgBBYS2sOqTuMpoF3BR0` |
| PDF report export | Downloadable PDF performance report at end of interview |
| Session history | List past interviews, review or resume old sessions |
| Candidate dashboard | Track scores across multiple sessions with trend charts |
| Multi-role support | Extend beyond ML Engineer — Data Scientist, Research Scientist, MLOps |
| Hint system | Optional hint button for candidates who are completely stuck |
| Admin view | Interviewer-side transcript and evaluation breakdown |
| Production deploy | Render/Railway (backend) + Vercel (frontend) |

---

## License

MIT
