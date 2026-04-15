# MockML Interview Agent — Tasks

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## V1 — MVP (SHIPPED ✅)

- [x] **T-01** Project setup — folders, requirements.txt, .env, .gitignore, config.py
- [x] **T-02** Supabase schema — 4 tables + RLS policies
- [x] **T-03** PDF parser + resume store — OpenAI Responses API + Supabase write
- [x] **T-04** ML Questions bank — 78 questions downloaded + OpenAI embeddings retriever
- [x] **T-05** Interview orchestrator — phase state machine (1→5) + Supabase persistence
- [x] **T-06** All 5 phase handlers — intro, Russian doll x2, factual Q&A, behavioural
- [x] **T-07** Evaluation engine + report generator — LLM-as-judge scoring + final report
- [x] **T-08** Voice layer — Whisper STT + OpenAI TTS (onyx), ElevenLabs fallback
- [x] **T-09** FastAPI backend — /session/start, /session/{id}/respond, /session/{id}/report
- [x] **T-10** React frontend — PDF upload, chat UI, mic recorder, TTS playback, report view

### V1 Test Results (2026-04-15)
- PDF parsing: ✅ Rajat Pal resume parsed correctly
- Session creation + Supabase writes: ✅
- Phase 1 → Phase 2 auto-transition: ✅
- Russian Doll drill-down activated: ✅
- Voice audio (OpenAI TTS onyx): ✅ `has_audio: True` on all turns
- UI renders correctly: ✅ desktop, tablet, mobile
- GitHub push (no secrets): ✅ https://github.com/sgschincholkar/MockMLInterviewAgent

---

## V2 — Backlog

- [ ] **V2-01** ElevenLabs voice — upgrade plan to unlock library voice `UgBBYS2sOqTuMpoF3BR0`
- [ ] **V2-02** Report PDF export — generate downloadable PDF report at end of interview
- [ ] **V2-03** Session history — list past interviews, resume or review old sessions
- [ ] **V2-04** Candidate dashboard — track scores over multiple sessions, trend charts
- [ ] **V2-05** Multi-role support — extend beyond ML Engineer (Data Scientist, MLE, Research Scientist)
- [ ] **V2-06** Hint system — optional hint button for candidates who are completely stuck
- [ ] **V2-07** Admin view — interviewer-side view of full transcript + evaluation breakdown
- [ ] **V2-08** Deploy to production — Render/Railway (backend) + Vercel (frontend)
