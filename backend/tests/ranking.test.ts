import { describe, it, expect } from 'vitest';
import { computeRankings, computeFastestPerCheckpoint } from '../src/services/rankingService.js';
import { MatchTeam, CheckpointRecord } from '../src/types/index.js';

describe('Ranking Engine Tests', () => {
  const baseTeams: MatchTeam[] = [
    {
      id: 'team-red',
      match_id: 'm1',
      slot: 'A',
      team_name: 'Tim Merah',
      color: '#e11d48',
      is_finished: true,
      finish_time_ms: 52300, // 00:52.30
      furthest_checkpoint: 4,
      furthest_checkpoint_time_ms: 52300,
      status: 'Finish',
      rank: null
    },
    {
      id: 'team-blue',
      match_id: 'm1',
      slot: 'B',
      team_name: 'Tim Biru',
      color: '#0284c7',
      is_finished: true,
      finish_time_ms: 49700, // 00:49.70 (faster!)
      furthest_checkpoint: 4,
      furthest_checkpoint_time_ms: 49700,
      status: 'Finish',
      rank: null
    },
    {
      id: 'team-green',
      match_id: 'm1',
      slot: 'C',
      team_name: 'Tim Hijau',
      color: '#059669',
      is_finished: false,
      finish_time_ms: null,
      furthest_checkpoint: 3,
      furthest_checkpoint_time_ms: 35800, // CP 3
      status: 'Tidak Finish',
      rank: null
    },
    {
      id: 'team-yellow',
      match_id: 'm1',
      slot: 'D',
      team_name: 'Tim Kuning',
      color: '#d97706',
      is_finished: false,
      finish_time_ms: null,
      furthest_checkpoint: 2,
      furthest_checkpoint_time_ms: 26200, // CP 2
      status: 'Tidak Finish',
      rank: null
    }
  ];

  it('correctly ranks Finish teams first by time, then furthest checkpoint (Image 2 example)', () => {
    const results = computeRankings(baseTeams);

    // Rank 1: Tim Biru (Finish 49.70s)
    expect(results[0].team_name).toBe('Tim Biru');
    expect(results[0].rank).toBe(1);
    expect(results[0].is_finished).toBe(true);

    // Rank 2: Tim Merah (Finish 52.30s)
    expect(results[1].team_name).toBe('Tim Merah');
    expect(results[1].rank).toBe(2);
    expect(results[1].is_finished).toBe(true);

    // Rank 3: Tim Hijau (CP 3 @ 35.80s)
    expect(results[2].team_name).toBe('Tim Hijau');
    expect(results[2].rank).toBe(3);
    expect(results[2].furthest_checkpoint).toBe(3);

    // Rank 4: Tim Kuning (CP 2 @ 26.20s)
    expect(results[3].team_name).toBe('Tim Kuning');
    expect(results[3].rank).toBe(4);
    expect(results[3].furthest_checkpoint).toBe(2);
  });

  it('correctly handles non-finish tie break when two teams reach the exact same CP at identical time', () => {
    const tiedTeams: MatchTeam[] = [
      {
        id: 'team-1',
        match_id: 'm1',
        slot: 'A',
        team_name: 'Tim 1',
        color: '#e11d48',
        is_finished: false,
        finish_time_ms: null,
        furthest_checkpoint: 2,
        furthest_checkpoint_time_ms: 20000,
        status: 'Tidak Finish',
        rank: null
      },
      {
        id: 'team-2',
        match_id: 'm1',
        slot: 'B',
        team_name: 'Tim 2',
        color: '#0284c7',
        is_finished: false,
        finish_time_ms: null,
        furthest_checkpoint: 2,
        furthest_checkpoint_time_ms: 20000,
        status: 'Tidak Finish',
        rank: null
      }
    ];

    const results = computeRankings(tiedTeams);
    expect(results[0].rank).toBe(1);
    expect(results[1].rank).toBe(1);
    expect(results[0].is_tied).toBe(true);
    expect(results[1].is_tied).toBe(true);
  });

  it('finds fastest time per checkpoint independently', () => {
    const cps: CheckpointRecord[] = [
      // CP 1: Tim Blue is fastest (10.8s vs 12.4s)
      { id: '1', match_id: 'm1', team_id: 'team-blue', checkpoint_number: 1, elapsed_time_ms: 10800, formatted_time: '00:10.80', recorded_at: '', recorded_by: '', is_corrected: false, correction_reason: null },
      { id: '2', match_id: 'm1', team_id: 'team-red', checkpoint_number: 1, elapsed_time_ms: 12400, formatted_time: '00:12.40', recorded_at: '', recorded_by: '', is_corrected: false, correction_reason: null },
      // CP 3: Tim Green is fastest (35.8s vs 36.9s)
      { id: '3', match_id: 'm1', team_id: 'team-green', checkpoint_number: 3, elapsed_time_ms: 35800, formatted_time: '00:35.80', recorded_at: '', recorded_by: '', is_corrected: false, correction_reason: null },
      { id: '4', match_id: 'm1', team_id: 'team-blue', checkpoint_number: 3, elapsed_time_ms: 36900, formatted_time: '00:36.90', recorded_at: '', recorded_by: '', is_corrected: false, correction_reason: null },
    ];

    const fastest = computeFastestPerCheckpoint(cps, baseTeams);
    expect(fastest[1].team_name).toBe('Tim Biru');
    expect(fastest[1].elapsed_time_ms).toBe(10800);
    expect(fastest[3].team_name).toBe('Tim Hijau');
    expect(fastest[3].elapsed_time_ms).toBe(35800);
  });
});

