-- Migration 007: FOI-MeetAI — Meeting Intelligence tables
-- Run this in Supabase SQL Editor AFTER migrations 001–006.

-- Meeting sessions (one row per recorded meeting)
CREATE TABLE meet_meetings (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Meeting',
  project_name TEXT,
  platform TEXT, -- google_meet | zoom | ms_teams | unknown
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'processing', 'done', 'error')),
  spreadsheet_url TEXT,
  mom_json JSONB,          -- final verified MOM document (spec Section 7)
  provider_log JSONB,      -- router attempt log for the debug panel
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meet_meetings ENABLE ROW LEVEL SECURITY;
-- Open-workspace concept (consistent with migration 005). Tighten to
-- tenant-scoped policies before production use with confidential data.
CREATE POLICY "Open workspace can manage meetings" ON meet_meetings
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX meet_meetings_started_idx ON meet_meetings (started_at DESC);

-- Raw transcript segments — the permanent source-of-truth every MOM line
-- must be traceable back to (spec Section 8.7).
CREATE TABLE meet_transcript_segments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meet_meetings(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  speaker_label TEXT,      -- diarization label e.g. "Speaker A"
  speaker_name TEXT,       -- resolved name from roster / DOM indicator
  role TEXT,               -- client | pmc | contractor | architect | vendor | focuson | unknown
  text TEXT NOT NULL,
  stt_provider TEXT,       -- which STT provider produced this segment
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meet_transcript_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open workspace can manage transcript segments" ON meet_transcript_segments
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX meet_segments_meeting_idx ON meet_transcript_segments (meeting_id, start_ms);

-- Provider health / cooldown status (settings dashboard health table)
CREATE TABLE meet_provider_health (
  provider_id TEXT NOT NULL,
  task TEXT NOT NULL,      -- stt | llm_extract | llm_verify | vision
  status TEXT NOT NULL DEFAULT 'not_configured',
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  cooldown_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider_id, task)
);

ALTER TABLE meet_provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open workspace can read provider health" ON meet_provider_health
  FOR ALL USING (true) WITH CHECK (true);

-- Encrypted API-key vault. Keys are AES-256-GCM encrypted by the server
-- (KEY_VAULT_SECRET) before insert; plaintext never touches the database.
CREATE TABLE meet_api_key_vault (
  provider_id TEXT PRIMARY KEY,
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meet_api_key_vault ENABLE ROW LEVEL SECURITY;
-- Vault writes/reads happen through the service role only; block anon access.
CREATE POLICY "Service role only" ON meet_api_key_vault
  FOR ALL USING (false) WITH CHECK (false);

-- Helper: updated_at trigger (reuses pattern from earlier migrations if a
-- function already exists; creates it idempotently otherwise).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meet_meetings_updated ON meet_meetings;
CREATE TRIGGER meet_meetings_updated
  BEFORE UPDATE ON meet_meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
