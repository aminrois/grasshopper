import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase } from '../src/db/database.js';
import * as matchService from '../src/services/matchService.js';
import * as standingsService from '../src/services/standingsService.js';

describe('Standings & Tournament Leaderboard Integration', () => {
  beforeAll(async () => {
    process.env.SQLITE_DB_PATH = `./data/test_standings_${Date.now()}.db`;
    await initDatabase();
  });

  afterAll(async () => {
    const db = getDatabase();
    await db.close();
  });

  it('correctly ranks teams across matches with finish times and checkpoints', async () => {
    // 1. Create Match 1 in Babak 32 Besar
    const m1 = await matchService.createMatch({
      match_number: 'GH-32-01',
      name: 'Penyisihan 1',
      round: 'Babak 32 Besar',
      teams: [
        { slot: 'A', name: 'Tim Merah 1' },
        { slot: 'B', name: 'Tim Biru 1' },
        { slot: 'C', name: 'Tim Hijau 1' },
        { slot: 'D', name: 'Tim Kuning 1' }
      ]
    });

    await matchService.startMatch(m1.id);

    const teamA = m1.teams!.find(t => t.slot === 'A')!;
    const teamB = m1.teams!.find(t => t.slot === 'B')!;

    // Team A finishes CP1 to CP4
    await matchService.recordCheckpoint(m1.id, teamA.id, 1);
    await matchService.recordCheckpoint(m1.id, teamA.id, 2);
    await matchService.recordCheckpoint(m1.id, teamA.id, 3);
    await matchService.recordCheckpoint(m1.id, teamA.id, 4); // Finished!

    // Team B reaches CP2
    await matchService.recordCheckpoint(m1.id, teamB.id, 1);
    await matchService.recordCheckpoint(m1.id, teamB.id, 2);

    // Fetch Leaderboard for Babak 32 Besar
    const res = await standingsService.getLeaderboard('Babak 32 Besar');
    expect(res.entries.length).toBe(4);

    // Team A must be rank 1 with finish status
    expect(res.entries[0].team_name).toBe('Tim Merah 1');
    expect(res.entries[0].is_finished).toBe(true);
    expect(res.entries[0].rank).toBe(1);
    expect(res.entries[0].qualification_status).toBe('Lolos ke 16 Besar');

    // Team B must be rank 2 with CP 2
    expect(res.entries[1].team_name).toBe('Tim Biru 1');
    expect(res.entries[1].furthest_checkpoint).toBe(2);
    expect(res.entries[1].rank).toBe(2);
  });
});
