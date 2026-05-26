# CLAUDE.md — MockML Interview Agent

Project-specific instructions for Claude Code. These override global defaults.

---

## Project Overview

AI-powered mock interview system for ML Engineer candidates.
- **V1**: Shipped 2026-04-15. Fully functional, running locally, pushed to GitHub.
- **V1.1**: Shipped 2026-05-26. Production deploy + landing page + auth + analytics.
- **Repo**: https://github.com/sgschincholkar/MockMLInterviewAgent
- **Stack**: FastAPI (Python 3.13) + React/Vite (TypeScript) + Supabase + OpenAI + ElevenLabs + PostHog

---

## Live URLs

| Service | URL |
|---|---|
| Frontend (prod) | https://mockml-interview-agent.vercel.app |
| Backend (prod) | https://mockmlinterviewagent-production.up.railway.app |
| Health check | https://mockmlinterviewagent-production.up.railway.app/health |

---

## Running the App Locally

```bash
# Start both servers (from project root)
./start.sh

# Or individually:
PYTHONPATH="$PWD" python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
cd frontend && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

**CRITICAL:** Always use `python -m uvicorn`, never bare `uvicorn`. The bare binary resolves to system Python 3.12 which doesn't have the packages. Miniconda Python 3.13 is the active environment.

---

## Environment & Secrets

### Backend (.env — gitignored, never commit)
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini-2026-03-17
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=UgBBYS2sOqTuMpoF3BR0
SUPABASE_URL=https://jcbgllwakmiosojixfwp.supabase.co
SUPABASE_ANON_KEY=eyJ...
FRONTEND_ORIGIN=https://mockml-interview-agent.vercel.app
```

### Frontend (Vercel environment variables — set in dashboard)
```
VITE_API_URL=https://mockmlinterviewagent-production.up.railway.app
VITE_SUPABASE_URL=https://jcbgllwakmiosojixfwp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_PUBLIC_POSTHOG_TOKEN=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**CRITICAL:** When creating a new Vercel project connected to GitHub, add ALL five frontend env vars upfront. Missing any one of them causes a silent black screen crash.

---

## Architecture

```
frontend/
  src/
    App.tsx              Screen router — "landing" | "upload" | "interview" | "report"
    supabaseClient.ts    Supabase singleton (auth)
    api.ts               Backend API client (VITE_API_URL)
    components/
      LandingPage.tsx    Marketing landing page (hero, phases, Russian Doll demo, report preview)
      AuthModal.tsx      Magic link email auth modal
      Upload.tsx         PDF upload screen
      Interview.tsx      Chat UI + voice recorder
      ReportView.tsx     Final report with scores + token usage

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

## Screen Flow

```
"landing" → (magic link login) → "upload" → "interview" → "report"
```

- Default screen is `"landing"` (not `"upload"`)
- On mount, `supabase.auth.getSession()` checks if already logged in → skips landing if so
- `onAuthStateChange` listener handles magic link redirect automatically

---

## Auth (Supabase Magic Link)

- Provider: Email OTP (magic link) — no password
- Supabase project: `MockMLInterviewAgent` (jcbgllwakmiosojixfwp)
- Site URL: `https://mockml-interview-agent.vercel.app`
- Redirect URL: `https://mockml-interview-agent.vercel.app`
- Email confirmations: **disabled** (magic link click = verification)
- Custom SMTP: Resend (`smtp.resend.com`, port 465, user `resend`)
- Sender name: `MockML Interview Agent`
- Email template: Magic Link — subject "Sign in to MockML Interview Agent"

---

## Analytics (PostHog)

Events tracked across the full funnel:

| Event | Trigger |
|---|---|
| `sign_in_requested` | CTA clicked (source: `nav` or `hero_cta`) |
| `magic_link_sent` | Email sent successfully |
| `magic_link_error` | Email send failed |
| `resume_selected` | PDF dropped/selected |
| `interview_started` | Session created after upload |
| `interview_start_error` | Upload/parse failed |
| `answer_submitted` | Candidate submits text or voice answer |
| `interview_phase_advanced` | Phase number increments |
| `interview_completed` | All 5 phases done |
| `report_viewed` | Report screen loads (includes recommendation + score) |
| `user_signed_out` | Sign out clicked |

---

## Deployment

### Backend — Railway
- Platform: Railway (Hobby plan, $5/mo)
- Start command: `PYTHONPATH=/app python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}`
- Config: `railway.json`
- Health check path: `/health`
- Auto-deploys from GitHub `main` branch

### Frontend — Vercel
- Platform: Vercel (Free tier)
- Project: `mockml-interview-agent` (GitHub connected)
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Config: `vercel.json`
- Auto-deploys from GitHub `main` branch

**CRITICAL deployment checklist — before pushing any frontend change:**
1. All 5 `VITE_*` env vars set in Vercel dashboard
2. `FRONTEND_ORIGIN` in Railway matches the Vercel URL
3. Supabase Site URL + Redirect URL match the Vercel URL

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

## Token Tracking

`backend/token_tracker.py` writes one row per API call to the `token_usage` Supabase table.
- `track_llm(session_id, operation, model, input_tokens, output_tokens)`
- `track_embedding(session_id, model, input_tokens)`
- `track_stt(session_id, char_count)` — char count of Whisper transcript (no native usage object)
- `track_tts(session_id, char_count, provider)` — provider: `"elevenlabs"` or `"openai"`
- `get_usage_summary(session_id)` — aggregates all rows, used by report endpoint

Cost constants (approximate): LLM $0.15/1M input + $0.60/1M output; embeddings $0.02/1M;
STT $0.006/650 chars; OpenAI TTS $15/1M chars; ElevenLabs $0.30/1K chars.

---

## Key Lessons (summary — full detail in tasks/lessons.md)

1. Use `python -m uvicorn` not `uvicorn` (Python env mismatch)
2. Always add RLS `allow_all` policies in migration SQL (Supabase blocks writes by default)
3. ElevenLabs free tier blocks library voices — paid plan required; OpenAI TTS is the fallback
4. Never use interactive CLI scaffolding (`create-vite`) in scripts — write files directly
5. OpenAI Responses API returns `.output_text`, not `.choices[0].message.content`
6. Whisper STT has no usage object — estimate cost from output transcript char count
7. Never commit `.env`, `secrets.md`, or `.mcp.json` (contains DB password)
8. Never commit `.claude/worktrees/` or PDF files — add both to `.gitignore` upfront
9. Vercel deploys from root by default — set Root Directory to `frontend` in Build & Deployment settings
10. When connecting a GitHub repo to Vercel, set ALL env vars upfront — missing any causes silent black screen
11. Supabase free tier rate limits to 3 emails/hour — use custom SMTP (Resend) for production
12. Disable "Confirm email" in Supabase Auth → magic link click should be the only verification step
13. `rootDirectory` is not a valid `vercel.json` field — set it in the Vercel dashboard instead
14. Duplicate FastAPI route definitions cause startup errors — health endpoint must appear only once
15. TypeScript needs `"types": ["vite/client"]` in tsconfig to recognise `import.meta.env`
16. Always update Supabase Site URL + Redirect URL + Railway FRONTEND_ORIGIN together when the Vercel URL changes

---

## V2 Backlog

- PDF report export
- Session history + candidate dashboard
- Evals: PDF parsing accuracy, question relevance, scoring consistency
- Multi-role support (Data Scientist, Research Scientist, MLOps)
- Hint system for stuck candidates
- Admin view — transcript + evaluation breakdown
