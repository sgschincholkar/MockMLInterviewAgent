# Lessons Learned

---

## L-01 — Python version mismatch with uvicorn
**What happened:** `uvicorn` binary resolved to Python 3.12 (`/Library/Frameworks/Python.framework`) but packages were installed in miniconda Python 3.13. Server crashed on startup with `ModuleNotFoundError`.
**Fix:** Always use `python -m uvicorn` instead of bare `uvicorn` in shell scripts. This ensures the active Python environment's packages are used.
**Rule:** In `start.sh`, always invoke as `python -m uvicorn ...`, never just `uvicorn`.

---

## L-02 — Supabase RLS blocks all writes by default
**What happened:** First insert to `interview_sessions` failed with `42501 row-level security policy violation`. Supabase enables RLS on all tables but adds no policies by default — meaning all writes are blocked.
**Fix:** Add `CREATE POLICY "allow_all" ON <table> FOR ALL USING (true) WITH CHECK (true)` for each table in the migration. Include this in `migration.sql` from the start.
**Rule:** Always add RLS policies to the migration SQL. Never assume Supabase tables are open by default.

---

## L-03 — ElevenLabs free tier blocks library voices via API
**What happened:** ElevenLabs returned `402 Payment Required` — free users cannot use community/library voice IDs via the API.
**Fix:** Switched primary TTS to OpenAI TTS (`tts-1`, `onyx` voice) which is covered by the existing OpenAI API key. ElevenLabs is kept as a fallback for when the plan is upgraded.
**Rule:** When using ElevenLabs library/community voice IDs, a paid plan is required. Default to OpenAI TTS for free-tier compatibility.

---

## L-04 — Vite CLI requires interactive TTY for scaffolding
**What happened:** `npm create vite@latest` cancelled silently when run non-interactively (no TTY). Could not scaffold React app automatically.
**Fix:** Manually create all Vite/React files (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`) from scratch instead of relying on the CLI scaffold.
**Rule:** Never use interactive CLI scaffolding tools (`create-vite`, `create-react-app`) inside automated scripts. Write the files directly.

---

## L-05 — OpenAI `responses.create` uses `output_text`, not `choices[0].message.content`
**What happened:** The Responses API (`client.responses.create`) returns `.output_text` directly, not the chat completions format of `.choices[0].message.content`.
**Fix:** All LLM calls use `.output_text` consistently across `pdf_parser.py`, `phases.py`, `evaluator.py`, `report_generator.py`.
**Rule:** When using `client.responses.create`, always access `.output_text`. When using `client.chat.completions.create`, use `.choices[0].message.content`. Never mix the two.
