# MockML Interview Agent — Project Roadmap

**Status: V1 Shipped — 2026-04-15** | [GitHub](https://github.com/sgschincholkar/MockMLInterviewAgent)

## Vision
An industrial-grade, fully AI-powered mock interview agent for Machine Learning Engineer candidates. It ingests a résumé PDF, conducts a structured 5-phase interview via voice and text, evaluates the candidate, and produces a detailed performance report.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Streamlit)                │
│   PDF Upload | Voice Recording | Chat Transcript UI      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ PDF Parser   │  │ Interview    │  │  Evaluator    │  │
│  │ (OpenAI API) │  │ Orchestrator │  │  Engine       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │           │
│  ┌──────▼──────────────────▼───────────────────▼──────┐  │
│  │               Supabase (PostgreSQL)                  │  │
│  │  resume_sections | interview_sessions | evaluations  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ OpenAI LLM   │  │ Whisper STT  │  │ ElevenLabs    │  │
│  │ gpt-5.4-mini  │  │ (OpenAI)     │  │ TTS           │  │
│  │  / gpt-5.4)  │  └──────────────┘  │ Voice ID:     │  │
│  └──────────────┘                    │ UgBBYS2sOq... │  │
│                                      └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18 (Vite + TypeScript) |
| Backend | FastAPI (Python) |
| LLM | OpenAI (`gpt-5.4-mini-2026-03-17`) |
| Speech-to-Text | OpenAI Whisper (`whisper-1`) |
| Text-to-Speech | OpenAI TTS (`tts-1`, `onyx`) primary — ElevenLabs (`UgBBYS2sOqTuMpoF3BR0`) fallback |
| PDF Parsing | OpenAI Responses API (vision/document) |
| Database | Supabase (project: MockMLInterviewAgent) |
| ML Questions Bank | andrewekhalel/MLQuestions (GitHub) |
| Similarity Search | Cosine similarity on TF-IDF / embeddings (in-memory) |

---

## Interview Phases

### Phase 1 — Background Introduction
- Trigger: "Tell me about yourself"
- Source: Summary / Education / Experience sections from résumé
- Goal: Warm-up, no pressure scoring
- **Evaluation**: Not scored (contextual only)

### Phase 2 — Project Deep Dive #1 (Russian Doll / Socratic)
- Target: First project in Experience or Projects section
- Method: Keep drilling deeper until the candidate cannot answer
- Depth levels: Surface → Conceptual → Implementation → Mathematical/Theoretical
- Follow-up triggers: "what", "how", "why", "what's the trade-off"
- Tone: Professional, never effusive ("fantastic", "great job" are banned)
- **Evaluation**: Russian Doll Depth Score (0–10)

### Phase 3 — Project Deep Dive #2 (Russian Doll / Socratic)
- Target: Second project (research / side project / notable achievement)
- Same methodology as Phase 2
- **Evaluation**: Russian Doll Depth Score (0–10)

### Phase 4 — Factual / Technical Questions
- Source: MLQuestions GitHub repo (downloaded locally)
- Candidate expertise detected from résumé → similarity search → top 5+ relevant questions
- Fallback: LLM-generated questions if no match found
- Min 5 questions guaranteed
- **Evaluation**: Correctness score (N correct / Total asked)

### Phase 5 — Behavioural Wrap-up
- Fixed question bank: vision, teamwork, strengths/weaknesses
- Ends with: "Do you have any questions for me?"
- **Evaluation**: Communication, structure, vision, team-player score (0–10); penalty if no questions asked

---

## Evaluation Rubrics

### Phase 2 & 3 — Russian Doll Depth Matrix

| Score | Depth Reached |
|---|---|
| 9–10 | Answers mathematical/theoretical level (e.g., cosine sim formula, HNSW internals) |
| 7–8 | Handles implementation details + trade-offs |
| 5–6 | Understands conceptual layer, struggles with internals |
| 3–4 | Only surface-level understanding |
| 1–2 | Vague, cannot explain the project meaningfully |
| 0 | No response / total blank |

Additional factors: clarity of explanation, use of precise terminology, ability to correct misconceptions.

### Phase 4 — Technical Accuracy

| Score | Description |
|---|---|
| Full marks per question | Correct + well-explained |
| Partial marks | Partially correct or missing key details |
| 0 | Wrong or "I don't know" |

### Phase 5 — Behavioural Score

| Dimension | Weight |
|---|---|
| Communication clarity & structure | 30% |
| Visionary thinking (5-year plan, impact) | 25% |
| Team-player indicators | 25% |
| Asks follow-up questions at end | 20% (−3 pts if none asked) |

---

## Empathy Engine

- Detect anxiety signals: very short answers, "I don't know" repeated, excessive filler words
- Response: offer encouragement, optionally downshift to a gentler question
- Do NOT lower the rigor — just adjust tone and pacing
- Example: "That's fine, take your time. Let me rephrase that."

---

## Final Report Structure

```
==================================================
  MOCK ML INTERVIEW — PERFORMANCE REPORT
==================================================
Candidate: [Name from résumé]
Date: [Date]
Role: Machine Learning Engineer

PHASE SCORES
-------------------------------------------------
Phase 1 (Background):         N/A
Phase 2 (Project Deep Dive):  X / 10
Phase 3 (Project Deep Dive):  X / 10
Phase 4 (Technical Q&A):      X / Y correct
Phase 5 (Behavioural):        X / 10

OVERALL INTERVIEW READINESS SCORE: XX / 40

DETAILED FEEDBACK
-------------------------------------------------
[Per-phase narrative, strengths, gaps]

RECOMMENDATION
-------------------------------------------------
[ ] Strong Hire  [ ] Hire  [ ] No Hire
==================================================
```

---

## Supabase Schema

### `resume_sections`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| session_id | uuid | Links to interview session |
| section_name | text | e.g., "summary", "experience", "projects" |
| content | text | Parsed text content |
| created_at | timestamp | |

### `interview_sessions`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| candidate_name | text | |
| phase | int | Current phase (1–5) |
| status | text | active / completed |
| created_at | timestamp | |

### `conversation_turns`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| session_id | uuid | |
| phase | int | |
| role | text | interviewer / candidate |
| message | text | |
| timestamp | timestamp | |

### `evaluations`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| session_id | uuid | |
| phase | int | |
| score | float | |
| max_score | float | |
| rationale | text | LLM-generated explanation |
| created_at | timestamp | |

---

## Project File Structure

```
MockAgenticEngineering/
├── PROJECT_ROADMAP.md          ← this file
├── tasks/
│   ├── todo.md                 ← sprint tasks
│   └── lessons.md              ← corrections & learnings
├── backend/
│   ├── main.py                 ← FastAPI app entry point
│   ├── config.py               ← env vars / secrets loader
│   ├── pdf_parser.py           ← OpenAI-powered PDF parsing
│   ├── resume_store.py         ← Supabase read/write for sections
│   ├── interview_orchestrator.py ← Phase state machine
│   ├── phase1_intro.py         ← Background phase handler
│   ├── phase2_project.py       ← Russian Doll drill-down (project 1)
│   ├── phase3_project.py       ← Russian Doll drill-down (project 2)
│   ├── phase4_technical.py     ← ML factual Q&A handler
│   ├── phase5_behavioural.py   ← Behavioural wrap-up handler
│   ├── evaluator.py            ← Per-phase scoring engine
│   ├── empathy_engine.py       ← Anxiety detection + response softening
│   ├── voice.py                ← Whisper STT + ElevenLabs TTS
│   ├── ml_questions/
│   │   ├── questions.md        ← Downloaded from andrewekhalel/MLQuestions
│   │   └── retriever.py        ← Similarity search over questions
│   └── report_generator.py     ← Final PDF/markdown report
├── frontend/
│   └── app.py                  ← Streamlit UI
├── .env                        ← API keys (gitignored)
├── .gitignore
└── requirements.txt
```

---

## Task List (Sprint)

See [tasks/todo.md](tasks/todo.md) for the full checklist.

---

## Key Design Decisions

1. **PDF parsing via OpenAI API only** — no PyMuPDF or pdfplumber; send PDF bytes to OpenAI file API with a structured extraction prompt
2. **Russian Doll depth tracking** — maintained as a JSON state object per phase; LLM decides whether to go deeper or accept answer
3. **Tone enforcement** — system prompt explicitly bans praise words; interviewer acknowledges correct answers with silence / move-on
4. **ML Questions retrieval** — TF-IDF cosine similarity against question bank, keyed to résumé expertise tags detected by LLM
5. **Voice-first** — every interviewer turn is spoken via ElevenLabs; candidate audio is transcribed by Whisper before LLM processing
