export type MatchStatus = 
  | 'DRAFT' 
  | 'READY' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'TIMEOUT' 
  | 'COMPLETED' 
  | 'VERIFIED' 
  | 'CANCELLED';

export type TeamSlot = 'A' | 'B' | 'C' | 'D';

export interface MatchTeam {
  id: string;
  match_id: string;
  slot: TeamSlot;
  team_name: string;
  school_name: string;
  color: string;
  is_finished: boolean;
  finish_time_ms: number | null;
  furthest_checkpoint: number;
  furthest_checkpoint_time_ms: number | null;
  status: 'Belum Mulai' | 'Berlangsung' | 'Finish' | 'Tidak Finish';
  rank: number | null;
  checkpoints?: CheckpointRecord[];
}

export interface CheckpointRecord {
  id: string;
  match_id: string;
  team_id: string;
  checkpoint_number: number; // 1, 2, 3, 4 (4 is FINISH)
  elapsed_time_ms: number;
  formatted_time: string; // MM:SS.cc
  recorded_at: string;
  recorded_by: string;
  is_corrected: boolean;
  correction_reason: string | null;
}

export interface Match {
  id: string;
  match_number: string; // e.g. GH-012
  name: string;
  round: string; // e.g. Penyisihan, Perempat Final, Semifinal, Final
  status: MatchStatus;
  max_duration_seconds: number;
  timer_start_time: number | null; // epoch ms
  accumulated_active_ms: number;
  pause_start_time: number | null;
  total_pause_ms: number;
  current_elapsed_ms: number;
  formatted_timer: string; // MM:SS.cc
  completed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  teams?: MatchTeam[];
  fastest_checkpoints?: Record<number, { team_id: string; team_name: string; elapsed_time_ms: number }>;
}

export interface AuditLog {
  id: string;
  match_id: string | null;
  action: string;
  details: string;
  performed_by: string;
  timestamp: string;
}

export interface SystemSettings {
  competition_name: string;
  organizer_name: string;
  default_duration_seconds: number;
  default_rounds: string[];
}

