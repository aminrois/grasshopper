import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase } from '../src/db/database.js';
import * as matchService from '../src/services/matchService.js';
import { formatTime } from '../src/services/timerService.js';

describe('End-to-End Match Workflow Integration', () => {
  let matchId: string;
  const testMatchNumber = `GH-TEST-${Date.now()}`;

  beforeAll(async () => {
    // Initialize database in-memory or test path
    process.env.SQLITE_DB_PATH = `./data/test_grasshopper_${Date.now()}.db`;
    await initDatabase();
  });

  afterAll(async () => {
    const db = getDatabase();
    await db.close();
  });

  it('creates a new match with 4 teams initialized', async () => {
    const match = await matchService.createMatch({
      match_number: testMatchNumber,
      name: 'Pertandingan Uji Integrasi',
      round: 'Penyisihan',
      max_duration_seconds: 120
    });

    expect(match.match_number).toBe(testMatchNumber);
    expect(match.status).toBe('READY');
    expect(match.teams?.length).toBe(4);
    expect(match.teams?.[0].team_name).toBe('Tim Merah');
    expect(match.teams?.[1].team_name).toBe('Tim Biru');
    expect(match.teams?.[2].team_name).toBe('Tim Hijau');
    expect(match.teams?.[3].team_name).toBe('Tim Kuning');

    matchId = match.id;
  });

  it('updates team names and match parameters directly in Arena Kontrol', async () => {
    const match = await matchService.getMatchById(matchId);
    const teamA = match!.teams!.find(t => t.slot === 'A')!;

    const updated = await matchService.updateTeamName(matchId, teamA.id, 'RoboRed Elite');
    expect(updated.teams?.find(t => t.slot === 'A')?.team_name).toBe('RoboRed Elite');

    const updatedInfo = await matchService.updateMatchInfo(matchId, {
      name: 'Penyisihan Sesi 1 Elite',
      round: 'Semifinal',
      max_duration_seconds: 90
    });
    expect(updatedInfo.name).toBe('Penyisihan Sesi 1 Elite');
    expect(updatedInfo.round).toBe('Semifinal');
    expect(updatedInfo.max_duration_seconds).toBe(90);
  });

  it('starts the match and sets status to RUNNING', async () => {
    const started = await matchService.startMatch(matchId);
    expect(started.status).toBe('RUNNING');
    expect(started.timer_start_time).toBeGreaterThan(0);
  });

  it('rejects out-of-order checkpoint recording (CP 2 before CP 1)', async () => {
    const match = await matchService.getMatchById(matchId);
    const teamA = match!.teams!.find(t => t.slot === 'A')!;

    await expect(
      matchService.recordCheckpoint(matchId, teamA.id, 2)
    ).rejects.toThrow(/Urutan checkpoint tidak valid/);
  });

  it('records CP 1, then CP 2 in correct sequence', async () => {
    const match = await matchService.getMatchById(matchId);
    const teamA = match!.teams!.find(t => t.slot === 'A')!;

    const res1 = await matchService.recordCheckpoint(matchId, teamA.id, 1);
    expect(res1.checkpoint.checkpoint_number).toBe(1);
    expect(res1.match.teams?.find(t => t.slot === 'A')?.furthest_checkpoint).toBe(1);

    const res2 = await matchService.recordCheckpoint(matchId, teamA.id, 2);
    expect(res2.checkpoint.checkpoint_number).toBe(2);
    expect(res2.match.teams?.find(t => t.slot === 'A')?.furthest_checkpoint).toBe(2);
  });

  it('rejects duplicate checkpoint recording', async () => {
    const match = await matchService.getMatchById(matchId);
    const teamA = match!.teams!.find(t => t.slot === 'A')!;

    await expect(
      matchService.recordCheckpoint(matchId, teamA.id, 2)
    ).rejects.toThrow(/sudah pernah dicatat|tidak valid/);
  });

  it('pauses and resumes the timer correctly without calendar drift', async () => {
    const paused = await matchService.pauseMatch(matchId);
    expect(paused.status).toBe('PAUSED');
    expect(paused.accumulated_active_ms).toBeGreaterThanOrEqual(0);

    // Recording checkpoint while paused should fail
    const teamA = paused.teams!.find(t => t.slot === 'A')!;
    await expect(
      matchService.recordCheckpoint(matchId, teamA.id, 3)
    ).rejects.toThrow(/PAUSED/);

    const resumed = await matchService.resumeMatch(matchId);
    expect(resumed.status).toBe('RUNNING');
  });

  it('completes CP 3 and FINISH for team A, marking it as FINISH', async () => {
    const match = await matchService.getMatchById(matchId);
    const teamA = match!.teams!.find(t => t.slot === 'A')!;

    await matchService.recordCheckpoint(matchId, teamA.id, 3);
    const resFinish = await matchService.recordCheckpoint(matchId, teamA.id, 4);

    const updatedTeamA = resFinish.match.teams?.find(t => t.slot === 'A')!;
    expect(updatedTeamA.is_finished).toBe(true);
    expect(updatedTeamA.status).toBe('Finish');
    expect(updatedTeamA.finish_time_ms).toBeGreaterThan(0);
  });

  it('cancels the last checkpoint and reverts team status and rankings', async () => {
    const match = await matchService.getMatchById(matchId);
    const teamA = match!.teams!.find(t => t.slot === 'A')!;

    // Cancel Team A's Finish (CP 4)
    const afterCancel = await matchService.cancelLastCheckpoint(matchId, teamA.id);
    const revertedTeamA = afterCancel.teams?.find(t => t.slot === 'A')!;

    expect(revertedTeamA.is_finished).toBe(false);
    expect(revertedTeamA.furthest_checkpoint).toBe(3);
    expect(revertedTeamA.finish_time_ms).toBeNull();
    expect(revertedTeamA.status).toBe('Berlangsung');

    // Re-record Finish for subsequent tests
    const reFinish = await matchService.recordCheckpoint(matchId, teamA.id, 4);
    expect(reFinish.match.teams?.find(t => t.slot === 'A')!.is_finished).toBe(true);
  });

  it('ends match, marks unfinished teams as Tidak Finish, and ranks Finish above non-Finish', async () => {
    const ended = await matchService.endMatch(matchId, 'Selesai');
    expect(ended.status).toBe('COMPLETED');

    const teamA = ended.teams?.find(t => t.slot === 'A')!;
    const teamB = ended.teams?.find(t => t.slot === 'B')!;

    expect(teamA.status).toBe('Finish');
    expect(teamB.status).toBe('Tidak Finish');
    expect(teamA.rank).toBe(1); // Team A finished, so ranked 1!
  });

  it('verifies match and locks results', async () => {
    const verified = await matchService.verifyMatch(matchId, 'Juri Ketua');
    expect(verified.status).toBe('VERIFIED');
    expect(verified.verified_at).not.toBeNull();
  });
});
