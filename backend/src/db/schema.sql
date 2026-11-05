-- Grasshopper Robotic Competition Scoreboard Schema
-- PostgreSQL DDL

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organizer VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id VARCHAR(64) PRIMARY KEY,
  match_number VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  round VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  max_duration_seconds INTEGER NOT NULL,
  timer_start_time BIGINT,
  accumulated_active_ms BIGINT NOT NULL DEFAULT 0,
  pause_start_time BIGINT,
  total_pause_ms BIGINT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_teams (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  slot VARCHAR(8) NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  color VARCHAR(32) NOT NULL,
  is_finished BOOLEAN NOT NULL DEFAULT FALSE,
  finish_time_ms BIGINT,
  furthest_checkpoint INTEGER NOT NULL DEFAULT 0,
  furthest_checkpoint_time_ms BIGINT,
  status VARCHAR(32) NOT NULL DEFAULT 'Belum Mulai',
  rank INTEGER,
  CONSTRAINT uq_match_team_slot UNIQUE(match_id, slot)
);

CREATE TABLE IF NOT EXISTS checkpoint_records (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id VARCHAR(64) NOT NULL REFERENCES match_teams(id) ON DELETE CASCADE,
  checkpoint_number INTEGER NOT NULL,
  elapsed_time_ms BIGINT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  recorded_by VARCHAR(100) NOT NULL,
  is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  correction_reason TEXT,
  CONSTRAINT uq_match_team_checkpoint UNIQUE(match_id, team_id, checkpoint_number)
);

CREATE TABLE IF NOT EXISTS match_events (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  elapsed_time_ms BIGINT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64),
  action VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_number ON matches(match_number);
CREATE INDEX IF NOT EXISTS idx_match_teams_match ON match_teams(match_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_match ON checkpoint_records(match_id);
CREATE INDEX IF NOT EXISTS idx_audit_match ON audit_logs(match_id);

