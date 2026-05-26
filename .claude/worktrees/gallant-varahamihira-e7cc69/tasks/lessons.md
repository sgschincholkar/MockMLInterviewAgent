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
**Fix:** Initially switched to OpenAI TTS as primary. After user upgraded to paid ElevenLabs plan, swapped back: ElevenLabs is now primary, OpenAI TTS is fallback.
**Rule:** When using ElevenLabs library/community voice IDs, a paid plan is required. Current TTS chain: ElevenLabs → OpenAI TTS → empty bytes.

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

---

## L-06 — Whisper STT returns no usage object; estimate from transcript length
**What happened:** Unlike LLM and embedding calls, `client.audio.transcriptions.create()` returns only the transcript string — no token count, no duration, no cost metadata.
**Fix:** Estimate STT cost from output transcript char count using ~650 chars/min at 130 WPM × 5 chars/word.
**Rule:** For STT tracking, use `track_stt(session_id, len(transcript))`. Never try to access `.usage` on a Whisper transcription response.

---

## L-07 — MCP server config belongs in `.mcp.json`, not `settings.json`
**What happened:** Attempted to add `mcpServers` key to `~/.claude/settings.json` — schema validation rejected it.
**Fix:** Create `.mcp.json` in the project root for project-scoped MCP servers. Use `~/.claude/.mcp.json` for global MCP servers.
**Rule:** MCP server config never goes in `settings.json`. `.mcp.json` in project root = project-scoped. Add to `.gitignore` if it contains credentials.
