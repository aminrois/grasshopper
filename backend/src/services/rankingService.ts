import { MatchTeam, CheckpointRecord } from '../types/index.js';

export interface RankedTeamResult extends MatchTeam {
  rank: number;
  is_tied?: boolean;
  tie_reason?: string;
  rank_basis: string; // e.g. "Finish 00:49.70", "CP 3 pada 00:35.80", "Belum Ada Catatan"
}

export interface CheckpointFastest {
  team_id: string;
  slot: string;
  team_name: string;
  elapsed_time_ms: number;
}

export function computeRankings(teams: MatchTeam[]): RankedTeamResult[] {
  // Clone to avoid mutating original
  const sorted = [...teams].sort((a, b) => {
    // 1. Prioritas Pertama: Finish vs Tidak Finish
    if (a.is_finished && !b.is_finished) return -1;
    if (!a.is_finished && b.is_finished) return 1;

    // Jika keduanya Finish: waktu Finish paling singkat mendapat peringkat tertinggi
    if (a.is_finished && b.is_finished) {
      const timeA = a.finish_time_ms ?? Infinity;
      const timeB = b.finish_time_ms ?? Infinity;
      return timeA - timeB;
    }

    // 2. Prioritas Kedua: Checkpoint Terjauh (CP 3 > CP 2 > CP 1 > 0)
    const cpA = a.furthest_checkpoint || 0;
    const cpB = b.furthest_checkpoint || 0;
    if (cpA !== cpB) {
      return cpB - cpA; // Yang lebih tinggi lebih baik
    }

    // 3. Prioritas Ketiga: Waktu Pencapaian Checkpoint Terjauh
    // Jika belum ada checkpoint sama sekali (cpA == 0 && cpB == 0)
    if (cpA === 0 && cpB === 0) {
      return a.slot.localeCompare(b.slot); // default by slot
    }

    const cpTimeA = a.furthest_checkpoint_time_ms ?? Infinity;
    const cpTimeB = b.furthest_checkpoint_time_ms ?? Infinity;
    return cpTimeA - cpTimeB;
  });

  // Assign ranks with tie handling
  const results: RankedTeamResult[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let isTied = false;
    let rankToAssign = currentRank;

    // Check tie with previous team
    if (i > 0) {
      const prev = sorted[i - 1];
      const sameFinish = current.is_finished === prev.is_finished;
      const sameFurthestCP = (current.furthest_checkpoint || 0) === (prev.furthest_checkpoint || 0);

      let sameTime = false;
      if (current.is_finished) {
        sameTime = current.finish_time_ms === prev.finish_time_ms;
      } else if ((current.furthest_checkpoint || 0) > 0) {
        sameTime = current.furthest_checkpoint_time_ms === prev.furthest_checkpoint_time_ms;
      }

      if (sameFinish && sameFurthestCP && sameTime) {
        isTied = true;
        rankToAssign = results[i - 1].rank;
        results[i - 1].is_tied = true;
      } else {
        rankToAssign = i + 1;
      }
    } else {
      rankToAssign = 1;
    }

    currentRank = rankToAssign;

    let rankBasis = '-';
    if (current.is_finished && current.finish_time_ms !== null) {
      rankBasis = `Finish`;
    } else if (current.furthest_checkpoint > 0 && current.furthest_checkpoint_time_ms !== null) {
      rankBasis = `CP ${current.furthest_checkpoint}`;
    } else {
      rankBasis = `Belum Finish`;
    }

    results.push({
      ...current,
      rank: rankToAssign,
      is_tied: isTied,
      rank_basis: rankBasis
    });
  }

  return results;
}

export function computeFastestPerCheckpoint(
  checkpoints: CheckpointRecord[],
  teams: MatchTeam[]
): Record<number, CheckpointFastest> {
  const fastest: Record<number, CheckpointFastest> = {};
  const teamMap = new Map(teams.map(t => [t.id, t]));

  for (let cp = 1; cp <= 4; cp++) {
    const cpRecords = checkpoints.filter(c => c.checkpoint_number === cp && !c.is_corrected);
    if (cpRecords.length === 0) continue;

    // Sort by elapsed_time_ms ascending
    cpRecords.sort((a, b) => a.elapsed_time_ms - b.elapsed_time_ms);
    const best = cpRecords[0];
    const team = teamMap.get(best.team_id);

    if (team) {
      fastest[cp] = {
        team_id: team.id,
        slot: team.slot,
        team_name: team.team_name,
        elapsed_time_ms: best.elapsed_time_ms
      };
    }
  }

  return fastest;
}

