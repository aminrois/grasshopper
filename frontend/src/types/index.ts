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

export interface CheckpointRecord {
  id: string;
  match_id: string;
  team_id: string;
  checkpoint_number: number;
  elapsed_time_ms: number;
  formatted_time: string;
  recorded_at: string;
  recorded_by: string;
  is_corrected: boolean;
  correction_reason: string | null;
}

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
  is_tied?: boolean;
  rank_basis?: string;
  checkpoints?: CheckpointRecord[];
}

export interface FastestCheckpoint {
  team_id: string;
  slot: string;
  team_name: string;
  elapsed_time_ms: number;
}

export interface Match {
  id: string;
  match_number: string;
  name: string;
  round: string;
  status: MatchStatus;
  max_duration_seconds: number;
  timer_start_time: number | null;
  accumulated_active_ms: number;
  pause_start_time: number | null;
  total_pause_ms: number;
  current_elapsed_ms: number;
  formatted_timer: string;
  completed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  teams?: MatchTeam[];
  fastest_checkpoints?: Record<number, FastestCheckpoint>;
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
}

