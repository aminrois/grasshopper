import { getDatabase } from '../db/database.js';
import { formatTime } from './timerService.js';

export interface LeaderboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  school_name: string;
  slot: string;
  color: string;
  match_id: string;
  match_number: string;
  match_name: string;
  round: string;
  is_finished: boolean;
  finish_time_ms: number | null;
  formatted_finish_time: string | null;
  furthest_checkpoint: number;
  furthest_checkpoint_time_ms: number | null;
  formatted_furthest_time: string | null;
  status: string;
  rank_basis: string;
  checkpoints: {
    checkpoint_number: number;
    elapsed_time_ms: number;
    formatted_time: string;
  }[];
  cp1_time: string | null;
  cp2_time: string | null;
  cp3_time: string | null;
  cp4_time: string | null;
  gap_ms: number | null;
  formatted_gap: string | null;
  qualification_status: string;
}

export const TOURNAMENT_ROUNDS = [
  'Babak 32 Besar',
  'Babak 16 Besar',
  'Babak 8 Besar',
  'Semifinal',
  'Perebutan Juara 3 & 4',
  'Final'
] as const;

export async function getLeaderboard(roundFilter?: string): Promise<{
  round: string;
  total_teams: number;
  entries: LeaderboardEntry[];
  summary: {
    finished_count: number;
    dnf_count: number;
    leader_time: string | null;
  };
}> {
  const db = getDatabase();

  let sql = `
    SELECT 
      mt.id as team_id,
      mt.match_id,
      mt.slot,
      mt.team_name,
      mt.school_name,
      mt.color,
      mt.is_finished,
      mt.finish_time_ms,
      mt.furthest_checkpoint,
      mt.furthest_checkpoint_time_ms,
      mt.status as team_status,
      m.match_number,
      m.name as match_name,
      m.round,
      m.status as match_status
    FROM match_teams mt
    JOIN matches m ON mt.match_id = m.id
  `;

  const params: any[] = [];
  if (roundFilter && roundFilter !== 'ALL') {
    sql += ` WHERE m.round = $1 `;
    params.push(roundFilter);
  }

  const rows = await db.query<any>(sql, params);

  // Fetch all checkpoints for these matches
  const matchIds = Array.from(new Set(rows.map(r => r.match_id)));
  let cpRows: any[] = [];
  if (matchIds.length > 0) {
    const placeholders = matchIds.map((_, i) => `$${i + 1}`).join(',');
    cpRows = await db.query<any>(
      `SELECT * FROM checkpoint_records WHERE match_id IN (${placeholders}) ORDER BY checkpoint_number ASC`,
      matchIds
    );
  }

  const cpMap = new Map<string, any[]>();
  for (const cp of cpRows) {
    const key = `${cp.match_id}_${cp.team_id}`;
    if (!cpMap.has(key)) {
      cpMap.set(key, []);
    }
    cpMap.get(key)!.push(cp);
  }

  // Map to candidate objects
  const candidates = rows.map((r) => {
    const key = `${r.match_id}_${r.team_id}`;
    const rawCps = cpMap.get(key) || [];

    const checkpoints = rawCps.map(c => ({
      checkpoint_number: c.checkpoint_number,
      elapsed_time_ms: c.elapsed_time_ms,
      formatted_time: formatTime(c.elapsed_time_ms)
    }));

    const cp1 = checkpoints.find(c => c.checkpoint_number === 1)?.formatted_time || null;
    const cp2 = checkpoints.find(c => c.checkpoint_number === 2)?.formatted_time || null;
    const cp3 = checkpoints.find(c => c.checkpoint_number === 3)?.formatted_time || null;
    const cp4 = checkpoints.find(c => c.checkpoint_number === 4)?.formatted_time || null;

    const isFinished = Boolean(r.is_finished);
    const finishTimeMs = r.finish_time_ms !== null ? Number(r.finish_time_ms) : null;
    const furthestCp = Number(r.furthest_checkpoint || 0);
    const furthestTimeMs = r.furthest_checkpoint_time_ms !== null ? Number(r.furthest_checkpoint_time_ms) : null;

    let rankBasis = 'Belum Finish';
    if (isFinished) {
      rankBasis = 'Finish';
    } else if (furthestCp > 0) {
      rankBasis = `CP ${furthestCp}`;
    }

    return {
      team_id: r.team_id,
      team_name: r.team_name,
      school_name: r.school_name || '',
      slot: r.slot,
      color: r.color,
      match_id: r.match_id,
      match_number: r.match_number,
      match_name: r.match_name,
      round: r.round,
      is_finished: isFinished,
      finish_time_ms: finishTimeMs,
      formatted_finish_time: finishTimeMs !== null ? formatTime(finishTimeMs) : null,
      furthest_checkpoint: furthestCp,
      furthest_checkpoint_time_ms: furthestTimeMs,
      formatted_furthest_time: furthestTimeMs !== null ? formatTime(furthestTimeMs) : null,
      status: r.team_status,
      rank_basis: rankBasis,
      checkpoints,
      cp1_time: cp1,
      cp2_time: cp2,
      cp3_time: cp3,
      cp4_time: cp4
    };
  });

  // Sort candidates strictly:
  // 1. Finish teams first, ordered by finish_time_ms ASC
  // 2. Non-finish teams with furthest_checkpoint > 0, ordered by furthest_checkpoint DESC, then furthest_checkpoint_time_ms ASC
  // 3. Teams with furthest_checkpoint === 0, ordered by match_number, slot
  candidates.sort((a, b) => {
    // Both finished
    if (a.is_finished && b.is_finished) {
      return (a.finish_time_ms || 0) - (b.finish_time_ms || 0);
    }
    // Only A finished
    if (a.is_finished && !b.is_finished) return -1;
    // Only B finished
    if (!a.is_finished && b.is_finished) return 1;

    // Neither finished: furthest checkpoint DESC
    if (a.furthest_checkpoint !== b.furthest_checkpoint) {
      return b.furthest_checkpoint - a.furthest_checkpoint;
    }

    // Same furthest checkpoint: fastest time ASC
    if (a.furthest_checkpoint > 0) {
      return (a.furthest_checkpoint_time_ms || 0) - (b.furthest_checkpoint_time_ms || 0);
    }

    return a.match_number.localeCompare(b.match_number) || a.slot.localeCompare(b.slot);
  });

  // Assign ranks, gaps, and qualification status
  const leaderFinishTime = candidates.length > 0 && candidates[0].is_finished ? candidates[0].finish_time_ms : null;

  const entries: LeaderboardEntry[] = candidates.map((c, index) => {
    const rank = index + 1;

    let gap_ms: number | null = null;
    let formatted_gap: string | null = null;

    if (c.is_finished && leaderFinishTime !== null) {
      gap_ms = (c.finish_time_ms || 0) - leaderFinishTime;
      if (gap_ms === 0) {
        formatted_gap = 'LEADER';
      } else {
        formatted_gap = `+${formatTime(gap_ms)}`;
      }
    } else {
      formatted_gap = '—';
    }

    // Determine qualification status based on roundFilter or overall
    const currentRound = roundFilter || 'ALL';
    let qual = '-';

    if (currentRound === 'Babak 32 Besar' || currentRound === 'Penyisihan') {
      qual = rank <= 16 ? 'Lolos ke 16 Besar' : 'Gugur';
    } else if (currentRound === 'Babak 16 Besar') {
      qual = rank <= 8 ? 'Lolos ke 8 Besar' : 'Gugur';
    } else if (currentRound === 'Babak 8 Besar' || currentRound === 'Perempat Final') {
      qual = rank <= 4 ? 'Lolos ke Semifinal' : 'Gugur';
    } else if (currentRound === 'Semifinal' || currentRound === 'Babak Semifinal') {
      qual = rank <= 2 ? 'Lolos ke Final' : rank <= 4 ? 'Lolos Perebutan Juara 3' : 'Gugur';
    } else if (currentRound === 'Final' || currentRound === 'Perebutan Juara 3 & 4') {
      if (rank === 1) qual = 'Juara 1 🥇';
      else if (rank === 2) qual = 'Juara 2 🥈';
      else if (rank === 3) qual = 'Juara 3 🥉';
      else if (rank === 4) qual = 'Juara 4 🎖️';
      else qual = 'Gugur';
    } else {
      // General tournament standings
      if (rank === 1) qual = 'Juara 1 🥇';
      else if (rank === 2) qual = 'Juara 2 🥈';
      else if (rank === 3) qual = 'Juara 3 🥉';
      else if (rank === 4) qual = 'Juara 4 🎖️';
      else if (rank <= 8) qual = 'Top 8';
      else if (rank <= 16) qual = 'Top 16';
      else qual = `Peringkat #${rank}`;
    }

    return {
      rank,
      ...c,
      gap_ms,
      formatted_gap,
      qualification_status: qual
    };
  });

  const finishedCount = entries.filter(e => e.is_finished).length;

  return {
    round: roundFilter || 'ALL',
    total_teams: entries.length,
    entries,
    summary: {
      finished_count: finishedCount,
      dnf_count: entries.length - finishedCount,
      leader_time: leaderFinishTime !== null ? formatTime(leaderFinishTime) : null
    }
  };
}

