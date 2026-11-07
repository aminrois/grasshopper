import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase } from '../src/db/database.js';
import * as matchService from '../src/services/matchService.js';

describe('System Factory Reset with PIN 1234', () => {
  beforeAll(async () => {
    process.env.SQLITE_DB_PATH = `./data/test_reset_${Date.now()}.db`;
    await initDatabase();
  });

  afterAll(async () => {
    const db = getDatabase();
    await db.close();
  });

  it('rejects incorrect PIN', async () => {
    await expect(matchService.resetAllTournamentData('0000')).rejects.toThrow('PIN Konfirmasi Salah');
    await expect(matchService.resetAllTournamentData('9999')).rejects.toThrow('PIN Konfirmasi Salah');
  });

  it('accepts correct PIN 1234 and resets all tournament data to fresh GH-001', async () => {
    // 1. Create a match and record checkpoints
    const match = await matchService.createMatch({
      match_number: 'GH-OLD-99',
      name: 'Old Match',
      round: 'Babak 32 Besar'
    });
    await matchService.startMatch(match.id);
    const teamA = match.teams![0];
    await matchService.recordCheckpoint(match.id, teamA.id, 1);

    // 2. Perform reset with PIN 1234
    const freshMatch = await matchService.resetAllTournamentData('1234', 'Admin Juri');

    // 3. Verify clean state
    expect(freshMatch.match_number).toBe('GH-001');
    expect(freshMatch.status).toBe('READY');
    expect(freshMatch.round).toBe('Babak 32 Besar');
    expect(freshMatch.teams?.length).toBe(4);
    expect(freshMatch.teams?.every(t => t.furthest_checkpoint === 0)).toBe(true);

    // 4. Verify old match is gone
    const oldMatches = await matchService.getAllMatches();
    expect(oldMatches.length).toBe(1);
    expect(oldMatches[0].match_number).toBe('GH-001');
  });
});

