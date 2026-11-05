import { getDatabase } from './database.js';
import { createMatch, getMatchById, setActiveMatchId } from '../services/matchService.js';
import crypto from 'node:crypto';

export async function seedInitialData(): Promise<void> {
  const db = getDatabase();

  // Check if match_teams already has data
  const existingTeams = await db.query<{ count: number }>(`SELECT COUNT(*) as count FROM match_teams`);
  if (existingTeams.length > 0 && existingTeams[0].count >= 12) {
    console.log('[Seed] Database already contains match teams. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding demonstration matches and teams...');
  // Clean incomplete matches if any existed before full seed
  if (existingTeams[0].count === 0) {
    await db.execute(`DELETE FROM checkpoint_records`);
    await db.execute(`DELETE FROM match_teams`);
    await db.execute(`DELETE FROM match_events`);
    await db.execute(`DELETE FROM audit_logs`);
    await db.execute(`DELETE FROM matches`);
  }

  // Set system settings
  await db.execute(
    `INSERT INTO system_settings (key, value, updated_at) VALUES 
     ('competition_name', 'Robotik Grasshopper Competition', $1),
     ('organizer_name', 'Maskumambang Fest 4', $1),
     ('default_duration_seconds', '120', $1)
     ON CONFLICT(key) DO NOTHING`,
    [new Date().toISOString()]
  );

  // 1. Seed Historical Completed Match GH-010
  const match10 = await createMatch({
    match_number: 'GH-010',
    name: 'Pertandingan GH-010',
    round: 'Penyisihan',
    max_duration_seconds: 120,
    teams: [
      { slot: 'A', name: 'Tim Merah' },
      { slot: 'B', name: 'Tim Biru' },
      { slot: 'C', name: 'Tim Hijau' },
      { slot: 'D', name: 'Tim Kuning' }
    ]
  });

  // 2. Seed Historical Match GH-011 (Matches image 2 reference scores)
  const match11 = await createMatch({
    match_number: 'GH-011',
    name: 'Pertandingan GH-011',
    round: 'Penyisihan',
    max_duration_seconds: 120,
    teams: [
      { slot: 'A', name: 'Tim Merah' },
      { slot: 'B', name: 'Tim Biru' },
      { slot: 'C', name: 'Tim Hijau' },
      { slot: 'D', name: 'Tim Kuning' }
    ]
  });

  const fullMatch11 = await getMatchById(match11.id);
  if (fullMatch11 && fullMatch11.teams) {
    const teamMerah = fullMatch11.teams.find(t => t.slot === 'A')!;
    const teamBiru = fullMatch11.teams.find(t => t.slot === 'B')!;
    const teamHijau = fullMatch11.teams.find(t => t.slot === 'C')!;
    const teamKuning = fullMatch11.teams.find(t => t.slot === 'D')!;

    // Times matching Image 2
    // Tim Biru: CP1: 10800ms, CP2: 23600ms, CP3: 36900ms, Finish: 49700ms
    const timesBiru = [10800, 23600, 36900, 49700];
    for (let i = 0; i < timesBiru.length; i++) {
      await db.execute(
        `INSERT INTO checkpoint_records (id, match_id, team_id, checkpoint_number, elapsed_time_ms, recorded_at, recorded_by, is_corrected)
         VALUES ($1, $2, $3, $4, $5, $6, 'Juri Operator', 0)`,
        [crypto.randomUUID(), match11.id, teamBiru.id, i + 1, timesBiru[i], new Date().toISOString()]
      );
    }
    await db.execute(
      `UPDATE match_teams SET furthest_checkpoint = 4, furthest_checkpoint_time_ms = 49700, is_finished = 1, finish_time_ms = 49700, status = 'Finish' WHERE id = $1`,
      [teamBiru.id]
    );

    // Tim Merah: CP1: 12400ms, CP2: 25100ms, CP3: 38500ms, Finish: 52300ms
    const timesMerah = [12400, 25100, 38500, 52300];
    for (let i = 0; i < timesMerah.length; i++) {
      await db.execute(
        `INSERT INTO checkpoint_records (id, match_id, team_id, checkpoint_number, elapsed_time_ms, recorded_at, recorded_by, is_corrected)
         VALUES ($1, $2, $3, $4, $5, $6, 'Juri Operator', 0)`,
        [crypto.randomUUID(), match11.id, teamMerah.id, i + 1, timesMerah[i], new Date().toISOString()]
      );
    }
    await db.execute(
      `UPDATE match_teams SET furthest_checkpoint = 4, furthest_checkpoint_time_ms = 52300, is_finished = 1, finish_time_ms = 52300, status = 'Finish' WHERE id = $1`,
      [teamMerah.id]
    );

    // Tim Hijau: CP1: 13200ms, CP2: 24500ms, CP3: 35800ms
    const timesHijau = [13200, 24500, 35800];
    for (let i = 0; i < timesHijau.length; i++) {
      await db.execute(
        `INSERT INTO checkpoint_records (id, match_id, team_id, checkpoint_number, elapsed_time_ms, recorded_at, recorded_by, is_corrected)
         VALUES ($1, $2, $3, $4, $5, $6, 'Juri Operator', 0)`,
        [crypto.randomUUID(), match11.id, teamHijau.id, i + 1, timesHijau[i], new Date().toISOString()]
      );
    }
    await db.execute(
      `UPDATE match_teams SET furthest_checkpoint = 3, furthest_checkpoint_time_ms = 35800, is_finished = 0, status = 'Tidak Finish' WHERE id = $1`,
      [teamHijau.id]
    );

    // Tim Kuning: CP1: 11500ms, CP2: 26200ms
    const timesKuning = [11500, 26200];
    for (let i = 0; i < timesKuning.length; i++) {
      await db.execute(
        `INSERT INTO checkpoint_records (id, match_id, team_id, checkpoint_number, elapsed_time_ms, recorded_at, recorded_by, is_corrected)
         VALUES ($1, $2, $3, $4, $5, $6, 'Juri Operator', 0)`,
        [crypto.randomUUID(), match11.id, teamKuning.id, i + 1, timesKuning[i], new Date().toISOString()]
      );
    }
    await db.execute(
      `UPDATE match_teams SET furthest_checkpoint = 2, furthest_checkpoint_time_ms = 26200, is_finished = 0, status = 'Tidak Finish' WHERE id = $1`,
      [teamKuning.id]
    );

    // Mark GH-011 as COMPLETED / VERIFIED
    await db.execute(
      `UPDATE matches SET status = 'VERIFIED', accumulated_active_ms = 84360, completed_at = $1, verified_at = $1 WHERE id = $2`,
      [new Date().toISOString(), match11.id]
    );
  }

  // 3. Seed Active Match GH-012 (Matches image 1 reference - Ready to start!)
  const match12 = await createMatch({
    match_number: 'GH-012',
    name: 'Pertandingan GH-012',
    round: 'Penyisihan',
    max_duration_seconds: 120,
    teams: [
      { slot: 'A', name: 'Tim Merah' },
      { slot: 'B', name: 'Tim Biru' },
      { slot: 'C', name: 'Tim Hijau' },
      { slot: 'D', name: 'Tim Kuning' }
    ]
  });

  // Set active match to GH-012
  await setActiveMatchId(match12.id);

  console.log('[Seed] Demonstration matches seeded successfully: GH-010, GH-011, GH-012.');
}

