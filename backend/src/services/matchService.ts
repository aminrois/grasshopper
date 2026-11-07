import { getDatabase } from '../db/database.js';
import { Match, MatchTeam, CheckpointRecord, MatchStatus, TeamSlot } from '../types/index.js';
import { calculateElapsedMs, formatTime, parseDurationToSeconds } from './timerService.js';
import { computeRankings, computeFastestPerCheckpoint } from './rankingService.js';
import { logAudit } from './auditService.js';
import crypto from 'node:crypto';

const DEFAULT_TEAM_CONFIGS = [
  { slot: 'A' as TeamSlot, name: 'Tim Merah', color: '#e11d48' },
  { slot: 'B' as TeamSlot, name: 'Tim Biru', color: '#0284c7' },
  { slot: 'C' as TeamSlot, name: 'Tim Hijau', color: '#059669' },
  { slot: 'D' as TeamSlot, name: 'Tim Kuning', color: '#d97706' },
];

export async function getActiveMatchId(): Promise<string | null> {
  const db = getDatabase();
  const rows = await db.query<{ value: string }>(
    `SELECT value FROM system_settings WHERE key = 'active_match_id'`
  );
  if (rows.length > 0) return rows[0].value;

  // Fallback to latest non-cancelled match
  const matches = await db.query<{ id: string }>(
    `SELECT id FROM matches ORDER BY created_at DESC LIMIT 1`
  );
  return matches.length > 0 ? matches[0].id : null;
}

export async function setActiveMatchId(matchId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO system_settings (key, value, updated_at) 
     VALUES ('active_match_id', $1, $2)
     ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = $2`,
    [matchId, now]
  );
}

export async function generateNextMatchNumber(): Promise<string> {
  const db = getDatabase();
  const rows = await db.query<{ match_number: string }>(
    `SELECT match_number FROM matches ORDER BY created_at DESC`
  );

  let highestNum = 0;
  for (const row of rows) {
    const match = row.match_number.match(/^GH-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestNum) highestNum = num;
    }
  }

  const nextNum = highestNum + 1;
  return `GH-${String(nextNum).padStart(3, '0')}`;
}

export async function createMatch(data: {
  match_number?: string;
  name?: string;
  round?: string;
  max_duration_seconds?: number;
  teams?: { slot: TeamSlot; name: string }[];
}): Promise<Match> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const match_number = data.match_number || (await generateNextMatchNumber());
  const name = data.name || `Pertandingan ${match_number}`;
  const round = data.round || 'Penyisihan';
  const max_duration_seconds = data.max_duration_seconds ?? 120; // 2 minutes default
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO matches (
      id, match_number, name, round, status, max_duration_seconds,
      accumulated_active_ms, total_pause_ms, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'READY', $5, 0, 0, $6, $7)`,
    [id, match_number, name, round, max_duration_seconds, now, now]
  );

  // Insert 4 teams
  for (const config of DEFAULT_TEAM_CONFIGS) {
    const customTeam = data.teams?.find(t => t.slot === config.slot);
    const teamName = customTeam ? customTeam.name : config.name;
    const teamId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO match_teams (
        id, match_id, slot, team_name, school_name, color, is_finished, 
        furthest_checkpoint, status, rank
      ) VALUES ($1, $2, $3, $4, '', $5, 0, 0, 'Belum Mulai', null)`,
      [teamId, id, config.slot, teamName, config.color]
    );
  }

  await logAudit(id, 'CREATE_MATCH', `Pertandingan ${match_number} dibuat (${round}, durasi: ${max_duration_seconds}s)`);
  await setActiveMatchId(id);

  return (await getMatchById(id))!;
}

export async function getMatchById(id: string): Promise<Match | null> {
  const db = getDatabase();
  const matches = await db.query<any>(`SELECT * FROM matches WHERE id = $1`, [id]);
  if (matches.length === 0) return null;

  const matchData = matches[0];

  // Fetch teams
  let teamsData = await db.query<any>(
    `SELECT * FROM match_teams WHERE match_id = $1 ORDER BY slot ASC`,
    [id]
  );

  // Self-heal: ensure all 4 team slots always exist
  if (teamsData.length < 4) {
    for (const config of DEFAULT_TEAM_CONFIGS) {
      if (!teamsData.some((t: any) => t.slot === config.slot)) {
        const teamId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO match_teams (
            id, match_id, slot, team_name, school_name, color, is_finished, 
            furthest_checkpoint, status, rank
          ) VALUES ($1, $2, $3, $4, '', $5, 0, 0, 'Belum Mulai', null)`,
          [teamId, id, config.slot, config.name, config.color]
        );
      }
    }
    teamsData = await db.query<any>(
      `SELECT * FROM match_teams WHERE match_id = $1 ORDER BY slot ASC`,
      [id]
    );
  }

  // Fetch checkpoints
  const checkpoints = await db.query<any>(
    `SELECT * FROM checkpoint_records WHERE match_id = $1 ORDER BY elapsed_time_ms ASC`,
    [id]
  );

  const checkpointMap = new Map<string, CheckpointRecord[]>();
  for (const cp of checkpoints) {
    if (!checkpointMap.has(cp.team_id)) {
      checkpointMap.set(cp.team_id, []);
    }
    checkpointMap.get(cp.team_id)!.push({
      ...cp,
      is_corrected: Boolean(cp.is_corrected),
      formatted_time: formatTime(cp.elapsed_time_ms)
    });
  }

  // Calculate elapsed ms and timeout check
  const { elapsedMs, isTimedOut } = calculateElapsedMs(matchData);

  // If match was RUNNING and now exceeded max duration, auto end it!
  if (matchData.status === 'RUNNING' && isTimedOut) {
    return await endMatch(id, 'Waktu maksimal tercapai (Timeout)');
  }

  const teams: MatchTeam[] = teamsData.map(t => ({
    ...t,
    is_finished: Boolean(t.is_finished),
    checkpoints: checkpointMap.get(t.id) || []
  }));

  // Compute rankings
  const rankedTeams = computeRankings(teams);
  const fastestCheckpoints = computeFastestPerCheckpoint(
    checkpoints.map(c => ({
      ...c,
      is_corrected: Boolean(c.is_corrected),
      formatted_time: formatTime(c.elapsed_time_ms)
    })),
    rankedTeams
  );

  return {
    ...matchData,
    accumulated_active_ms: Number(matchData.accumulated_active_ms),
    total_pause_ms: Number(matchData.total_pause_ms),
    timer_start_time: matchData.timer_start_time ? Number(matchData.timer_start_time) : null,
    pause_start_time: matchData.pause_start_time ? Number(matchData.pause_start_time) : null,
    current_elapsed_ms: elapsedMs,
    formatted_timer: formatTime(elapsedMs),
    teams: rankedTeams,
    fastest_checkpoints: fastestCheckpoints
  };
}

export async function getAllMatches(): Promise<Match[]> {
  const db = getDatabase();
  const rows = await db.query<any>(`SELECT id FROM matches ORDER BY created_at DESC`);
  const results: Match[] = [];
  for (const row of rows) {
    const match = await getMatchById(row.id);
    if (match) results.push(match);
  }
  return results;
}

export async function updateMatchInfo(
  id: string,
  updates: {
    name?: string;
    round?: string;
    max_duration_seconds?: number;
  }
): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(id);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  const name = updates.name ?? match.name;
  const round = updates.round ?? match.round;
  const max_duration_seconds = updates.max_duration_seconds ?? match.max_duration_seconds;
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE matches SET name = $1, round = $2, max_duration_seconds = $3, updated_at = $4 WHERE id = $5`,
    [name, round, max_duration_seconds, now, id]
  );

  await logAudit(
    id,
    'UPDATE_MATCH_INFO',
    `Informasi diperbarui: nama="${name}", babak="${round}", durasi=${max_duration_seconds}s`
  );

  return (await getMatchById(id))!;
}

export async function updateTeamName(
  matchId: string,
  teamId: string,
  newName: string
): Promise<Match> {
  return updateTeamInfo(matchId, teamId, { team_name: newName });
}

export async function updateTeamInfo(
  matchId: string,
  teamId: string,
  updates: { team_name?: string; school_name?: string }
): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(matchId);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  const team = match.teams?.find(t => t.id === teamId);
  if (!team) throw new Error('Tim tidak ditemukan');

  const newName = (updates.team_name ?? team.team_name).trim();
  const newSchool = (updates.school_name ?? team.school_name ?? '').trim();

  await db.execute(
    `UPDATE match_teams SET team_name = $1, school_name = $2 WHERE id = $3 AND match_id = $4`,
    [newName, newSchool, teamId, matchId]
  );

  await db.execute(`UPDATE matches SET updated_at = $1 WHERE id = $2`, [new Date().toISOString(), matchId]);

  const changes: string[] = [];
  if (updates.team_name && updates.team_name !== team.team_name) {
    changes.push(`Nama tim: "${team.team_name}" → "${newName}"`);
  }
  if (updates.school_name !== undefined && updates.school_name !== team.school_name) {
    changes.push(`Nama sekolah: "${team.school_name || '-'}" → "${newSchool}"`);
  }
  if (changes.length > 0) {
    await logAudit(matchId, 'UPDATE_TEAM_INFO', changes.join('; '));
  }

  return (await getMatchById(matchId))!;
}

// Timer Controls
export async function startMatch(id: string): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(id);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  if (match.status !== 'READY' && match.status !== 'DRAFT') {
    throw new Error(`Pertandingan tidak dapat dimulai dari status ${match.status}`);
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();

  await db.execute(
    `UPDATE matches SET status = 'RUNNING', timer_start_time = $1, updated_at = $2 WHERE id = $3`,
    [nowMs, nowIso, id]
  );

  // Update teams status to 'Berlangsung'
  await db.execute(
    `UPDATE match_teams SET status = 'Berlangsung' WHERE match_id = $1 AND is_finished = 0`,
    [id]
  );

  await logAudit(id, 'START_MATCH', `Pertandingan ${match.match_number} dimulai`);

  return (await getMatchById(id))!;
}

export async function pauseMatch(id: string): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(id);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  if (match.status !== 'RUNNING') {
    throw new Error('Pertandingan hanya bisa dijeda saat berstatus RUNNING');
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  const runningDuration = match.timer_start_time ? nowMs - match.timer_start_time : 0;
  const newAccumulated = match.accumulated_active_ms + runningDuration;

  await db.execute(
    `UPDATE matches SET 
      status = 'PAUSED', 
      accumulated_active_ms = $1, 
      timer_start_time = NULL, 
      pause_start_time = $2, 
      updated_at = $3 
     WHERE id = $4`,
    [newAccumulated, nowMs, nowIso, id]
  );

  await logAudit(id, 'PAUSE_MATCH', `Pertandingan dijeda pada waktu ${formatTime(newAccumulated)}`);

  return (await getMatchById(id))!;
}

export async function resumeMatch(id: string): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(id);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  if (match.status !== 'PAUSED') {
    throw new Error('Pertandingan hanya bisa dilanjutkan saat berstatus PAUSED');
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  const pausedDuration = match.pause_start_time ? nowMs - match.pause_start_time : 0;
  const newTotalPause = match.total_pause_ms + pausedDuration;

  await db.execute(
    `UPDATE matches SET 
      status = 'RUNNING', 
      timer_start_time = $1, 
      pause_start_time = NULL, 
      total_pause_ms = $2, 
      updated_at = $3 
     WHERE id = $4`,
    [nowMs, newTotalPause, nowIso, id]
  );

  await logAudit(id, 'RESUME_MATCH', `Pertandingan dilanjutkan setelah jeda ${Math.round(pausedDuration / 1000)} detik`);

  return (await getMatchById(id))!;
}

export async function endMatch(id: string, reason: string = 'Pertandingan diakhiri'): Promise<Match> {
  const db = getDatabase();
  const rows = await db.query<any>(`SELECT * FROM matches WHERE id = $1`, [id]);
  if (rows.length === 0) throw new Error('Pertandingan tidak ditemukan');
  const match = rows[0];

  const { elapsedMs } = calculateElapsedMs(match);
  const nowIso = new Date().toISOString();

  // If already verified or cancelled, do not mutate
  if (match.status === 'VERIFIED') {
    return (await getMatchById(id))!;
  }

  await db.execute(
    `UPDATE matches SET 
      status = 'COMPLETED', 
      accumulated_active_ms = $1, 
      timer_start_time = NULL, 
      pause_start_time = NULL, 
      completed_at = $2, 
      updated_at = $2 
     WHERE id = $3`,
    [elapsedMs, nowIso, id]
  );

  // Mark all teams that did not finish as 'Tidak Finish'
  await db.execute(
    `UPDATE match_teams SET status = 'Tidak Finish' WHERE match_id = $1 AND is_finished = 0`,
    [id]
  );

  await logAudit(id, 'END_MATCH', `${reason} pada waktu ${formatTime(elapsedMs)}`);

  return (await getMatchById(id))!;
}

export async function resetMatch(id: string): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(id);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  if (match.status === 'VERIFIED') {
    throw new Error('Pertandingan yang sudah disahkan (VERIFIED) tidak dapat di-reset');
  }

  const nowIso = new Date().toISOString();

  // Clear checkpoints
  await db.execute(`DELETE FROM checkpoint_records WHERE match_id = $1`, [id]);

  // Reset teams
  await db.execute(
    `UPDATE match_teams SET 
      is_finished = 0, 
      finish_time_ms = NULL, 
      furthest_checkpoint = 0, 
      furthest_checkpoint_time_ms = NULL, 
      status = 'Belum Mulai', 
      rank = NULL 
     WHERE match_id = $1`,
    [id]
  );

  // Reset match
  await db.execute(
    `UPDATE matches SET 
      status = 'READY', 
      accumulated_active_ms = 0, 
      timer_start_time = NULL, 
      pause_start_time = NULL, 
      total_pause_ms = 0, 
      completed_at = NULL, 
      verified_at = NULL, 
      updated_at = $1 
     WHERE id = $2`,
    [nowIso, id]
  );

  await logAudit(id, 'RESET_MATCH', `Pertandingan ${match.match_number} di-reset kembali ke status Siap Dimulai`);

  return (await getMatchById(id))!;
}

// Checkpoint Recording
export async function recordCheckpoint(
  matchId: string,
  teamId: string,
  checkpointNumber: number,
  recordedBy: string = 'Juri Operator'
): Promise<{ match: Match; checkpoint: CheckpointRecord }> {
  const db = getDatabase();
  const match = await getMatchById(matchId);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  if (match.status !== 'RUNNING') {
    throw new Error(`Tidak dapat mencatat checkpoint saat pertandingan berstatus ${match.status}`);
  }

  const team = match.teams?.find(t => t.id === teamId);
  if (!team) throw new Error('Tim tidak ditemukan dalam pertandingan');

  if (team.is_finished) {
    throw new Error(`Tim ${team.team_name} sudah berstatus Finish`);
  }

  // Validate strict sequencing: CP1 -> CP2 -> CP3 -> FINISH (CP4)
  const currentFurthest = team.furthest_checkpoint || 0;
  if (checkpointNumber !== currentFurthest + 1) {
    throw new Error(
      `Urutan checkpoint tidak valid! Checkpoint berikutnya harus CP ${currentFurthest + 1}, bukan CP ${checkpointNumber}`
    );
  }

  // Calculate current active elapsed ms from server state
  const { elapsedMs } = calculateElapsedMs(match);

  // Check unique record constraint
  const existing = await db.query(
    `SELECT id FROM checkpoint_records WHERE match_id = $1 AND team_id = $2 AND checkpoint_number = $3`,
    [matchId, teamId, checkpointNumber]
  );
  if (existing.length > 0) {
    throw new Error(`Checkpoint ${checkpointNumber} untuk tim ${team.team_name} sudah pernah dicatat`);
  }

  const cpId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db.execute(
    `INSERT INTO checkpoint_records (
      id, match_id, team_id, checkpoint_number, elapsed_time_ms, recorded_at, recorded_by, is_corrected
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
    [cpId, matchId, teamId, checkpointNumber, elapsedMs, nowIso, recordedBy]
  );

  // Update team status
  const isFinish = checkpointNumber === 4;
  const newStatus = isFinish ? 'Finish' : 'Berlangsung';

  await db.execute(
    `UPDATE match_teams SET 
      furthest_checkpoint = $1, 
      furthest_checkpoint_time_ms = $2, 
      is_finished = $3, 
      finish_time_ms = $4, 
      status = $5 
     WHERE id = $6`,
    [
      checkpointNumber,
      elapsedMs,
      isFinish ? 1 : 0,
      isFinish ? elapsedMs : null,
      newStatus,
      teamId
    ]
  );

  const formattedTime = formatTime(elapsedMs);
  const cpName = isFinish ? 'FINISH' : `CP ${checkpointNumber}`;

  await logAudit(
    matchId,
    'RECORD_CHECKPOINT',
    `${team.team_name} mencapai ${cpName} pada waktu ${formattedTime}`,
    recordedBy
  );

  const updatedMatch = (await getMatchById(matchId))!;

  // Check if ALL 4 teams have finished! If so, we can auto-complete the match
  const allFinished = updatedMatch.teams?.every(t => t.is_finished);
  if (allFinished) {
    await endMatch(matchId, 'Semua tim telah mencapai garis Finish');
  }

  const finalMatch = (await getMatchById(matchId))!;
  const cpRecord: CheckpointRecord = {
    id: cpId,
    match_id: matchId,
    team_id: teamId,
    checkpoint_number: checkpointNumber,
    elapsed_time_ms: elapsedMs,
    formatted_time: formattedTime,
    recorded_at: nowIso,
    recorded_by: recordedBy,
    is_corrected: false,
    correction_reason: null
  };

  return { match: finalMatch, checkpoint: cpRecord };
}

// Cancel / Revert Last Checkpoint
export async function cancelLastCheckpoint(
  matchId: string,
  teamId: string,
  performedBy: string = 'Juri Operator'
): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(matchId);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  if (match.status === 'VERIFIED') {
    throw new Error('Pertandingan sudah disahkan dan catatan waktu tidak dapat dibatalkan');
  }

  const team = match.teams?.find(t => t.id === teamId);
  if (!team) throw new Error('Tim tidak ditemukan dalam pertandingan');

  const furthestCp = team.furthest_checkpoint || 0;
  if (furthestCp === 0) {
    throw new Error(`Tim ${team.team_name} belum memiliki catatan checkpoint untuk dibatalkan`);
  }

  // Delete the furthest checkpoint record
  await db.execute(
    `DELETE FROM checkpoint_records 
     WHERE match_id = $1 AND team_id = $2 AND checkpoint_number = $3`,
    [matchId, teamId, furthestCp]
  );

  // Determine new state
  const newFurthest = furthestCp - 1;
  let newFurthestTime: number | null = null;
  let newStatus = 'Belum Mulai';

  if (newFurthest > 0) {
    const prevCpRows = await db.query<{ elapsed_time_ms: number }>(
      `SELECT elapsed_time_ms FROM checkpoint_records 
       WHERE match_id = $1 AND team_id = $2 AND checkpoint_number = $3`,
      [matchId, teamId, newFurthest]
    );
    if (prevCpRows.length > 0) {
      newFurthestTime = prevCpRows[0].elapsed_time_ms;
      newStatus = 'Berlangsung';
    }
  }

  await db.execute(
    `UPDATE match_teams SET 
      furthest_checkpoint = $1, 
      furthest_checkpoint_time_ms = $2, 
      is_finished = 0, 
      finish_time_ms = NULL, 
      status = $3 
     WHERE id = $4`,
    [newFurthest, newFurthestTime, newStatus, teamId]
  );

  // If match was auto-completed (e.g. because all 4 had finished), roll back match status to PAUSED
  if (match.status === 'COMPLETED' && !match.verified_at) {
    const nowIso = new Date().toISOString();
    await db.execute(
      `UPDATE matches SET 
        status = 'PAUSED', 
        pause_start_time = $1, 
        completed_at = NULL, 
        updated_at = $2 
       WHERE id = $3`,
      [Date.now(), nowIso, matchId]
    );

    // Restore non-finished teams status to 'Berlangsung' if they had reached CP > 0
    await db.execute(
      `UPDATE match_teams SET status = CASE WHEN furthest_checkpoint > 0 THEN 'Berlangsung' ELSE 'Belum Mulai' END 
       WHERE match_id = $1 AND is_finished = 0`,
      [matchId]
    );
  }

  const cpLabel = furthestCp === 4 ? 'FINISH' : `CP ${furthestCp}`;
  await logAudit(
    matchId,
    'CANCEL_CHECKPOINT',
    `Pembatalan ${cpLabel} untuk ${team.team_name}`,
    performedBy
  );

  return (await getMatchById(matchId))!;
}

// Verification & Correction
export async function verifyMatch(matchId: string, performedBy: string = 'Juri Operator'): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(matchId);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  const nowIso = new Date().toISOString();

  await db.execute(
    `UPDATE matches SET status = 'VERIFIED', verified_at = $1, updated_at = $1 WHERE id = $2`,
    [nowIso, matchId]
  );

  await logAudit(matchId, 'VERIFY_MATCH', `Hasil pertandingan ${match.match_number} disahkan`, performedBy);

  return (await getMatchById(matchId))!;
}

export async function correctCheckpoint(
  matchId: string,
  checkpointId: string,
  newElapsedMs: number,
  reason: string,
  performedBy: string = 'Admin Juri'
): Promise<Match> {
  const db = getDatabase();
  const match = await getMatchById(matchId);
  if (!match) throw new Error('Pertandingan tidak ditemukan');

  const cpRows = await db.query<any>(
    `SELECT * FROM checkpoint_records WHERE id = $1 AND match_id = $2`,
    [checkpointId, matchId]
  );
  if (cpRows.length === 0) throw new Error('Catatan checkpoint tidak ditemukan');

  const cp = cpRows[0];
  const oldTimeStr = formatTime(cp.elapsed_time_ms);
  const newTimeStr = formatTime(newElapsedMs);

  await db.execute(
    `UPDATE checkpoint_records SET 
      elapsed_time_ms = $1, 
      is_corrected = 1, 
      correction_reason = $2 
     WHERE id = $3`,
    [newElapsedMs, reason, checkpointId]
  );

  // If this was checkpoint 4 (Finish) or furthest checkpoint, update team
  if (cp.checkpoint_number === 4) {
    await db.execute(`UPDATE match_teams SET finish_time_ms = $1 WHERE id = $2`, [newElapsedMs, cp.team_id]);
  }

  // Update furthest checkpoint time if matches
  await db.execute(
    `UPDATE match_teams SET furthest_checkpoint_time_ms = $1 
     WHERE id = $2 AND furthest_checkpoint = $3`,
    [newElapsedMs, cp.team_id, cp.checkpoint_number]
  );

  await logAudit(
    matchId,
    'CORRECT_CHECKPOINT',
    `Koreksi CP ${cp.checkpoint_number} (${oldTimeStr} → ${newTimeStr}). Alasan: "${reason}"`,
    performedBy
  );

  return (await getMatchById(matchId))!;
}

// Reset Entire Tournament Data to Start Fresh (Protected by PIN 1234)
export async function resetAllTournamentData(
  pin: string,
  performedBy: string = 'Juri Operator'
): Promise<Match> {
  if (pin !== '1234') {
    throw new Error('PIN Konfirmasi Salah! Masukkan PIN 1234 untuk mereset seluruh data.');
  }

  const db = getDatabase();

  // Wipe data from all tables
  await db.execute(`DELETE FROM checkpoint_records`);
  await db.execute(`DELETE FROM match_teams`);
  await db.execute(`DELETE FROM match_events`);
  await db.execute(`DELETE FROM audit_logs`);
  await db.execute(`DELETE FROM matches`);

  // Create clean initial Match GH-001 in Babak 32 Besar (Ready)
  const initialMatch = await createMatch({
    match_number: 'GH-001',
    name: 'Pertandingan GH-001',
    round: 'Babak 32 Besar',
    max_duration_seconds: 120,
    teams: [
      { slot: 'A', name: 'Tim Merah' },
      { slot: 'B', name: 'Tim Biru' },
      { slot: 'C', name: 'Tim Hijau' },
      { slot: 'D', name: 'Tim Kuning' }
    ]
  });

  await setActiveMatchId(initialMatch.id);

  await logAudit(
    initialMatch.id,
    'FACTORY_RESET',
    'Sistem dan seluruh riwayat pertandingan telah direset untuk turnamen baru (Konfirmasi PIN 1234 berhasil)',
    performedBy
  );

  return initialMatch;
}

// Update System Settings (Branding, durations)
export async function updateSystemSettings(settings: {
  competition_name?: string;
  organizer_name?: string;
  default_duration_seconds?: number;
}): Promise<Record<string, string>> {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (settings.competition_name !== undefined) {
    await db.execute(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('competition_name', $1, $2)
       ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = $2`,
      [settings.competition_name, now]
    );
  }

  if (settings.organizer_name !== undefined) {
    await db.execute(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('organizer_name', $1, $2)
       ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = $2`,
      [settings.organizer_name, now]
    );
  }

  if (settings.default_duration_seconds !== undefined) {
    await db.execute(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('default_duration_seconds', $1, $2)
       ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = $2`,
      [String(settings.default_duration_seconds), now]
    );
  }

  const rows = await db.query<{ key: string; value: string }>(`SELECT key, value FROM system_settings`);
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}
