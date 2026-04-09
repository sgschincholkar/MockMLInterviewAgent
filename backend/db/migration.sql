-- MockML Interview Agent — Supabase Schema
-- Run this in your Supabase SQL editor at:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql

-- 1. Interview Sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_name TEXT,
    phase INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',  -- active | completed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Resume Sections
CREATE TABLE IF NOT EXISTS resume_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,  -- summary | education | experience | projects | skills | achievements
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Conversation Turns
CREATE TABLE IF NOT EXISTS conversation_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL,
    role TEXT NOT NULL,  -- interviewer | candidate
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL,
    score FLOAT,
    max_score FLOAT,
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast session lookups
CREATE INDEX IF NOT EXISTS idx_resume_sections_session ON resume_sections(session_id);
CREATE INDEX IF NOT EXISTS idx_turns_session ON conversation_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_session ON evaluations(session_id);

-- Allow anon key full access (MVP — no auth required)
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON interview_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON resume_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON conversation_turns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON evaluations FOR ALL USING (true) WITH CHECK (true);
