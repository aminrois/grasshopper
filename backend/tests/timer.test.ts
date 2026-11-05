import { describe, it, expect } from 'vitest';
import { formatTime, parseDurationToSeconds, calculateElapsedMs } from '../src/services/timerService.js';

describe('Timer Service Tests', () => {
  it('formats milliseconds to MM:SS.cc format accurately', () => {
    expect(formatTime(0)).toBe('00:00.00');
    expect(formatTime(12400)).toBe('00:12.40');
    expect(formatTime(10800)).toBe('00:10.80');
    expect(formatTime(84360)).toBe('01:24.36');
    expect(formatTime(120000)).toBe('02:00.00');
  });

  it('parses duration strings accurately', () => {
    expect(parseDurationToSeconds('02:00.00')).toBe(120);
    expect(parseDurationToSeconds('01:30')).toBe(90);
    expect(parseDurationToSeconds('60')).toBe(60);
  });

  it('calculates elapsed time and detects timeouts', () => {
    // READY status
    const ready = calculateElapsedMs({
      status: 'READY',
      timer_start_time: null,
      accumulated_active_ms: 0,
      pause_start_time: null,
      max_duration_seconds: 120
    });
    expect(ready.elapsedMs).toBe(0);
    expect(ready.isTimedOut).toBe(false);

    // PAUSED with 45 seconds accumulated
    const paused = calculateElapsedMs({
      status: 'PAUSED',
      timer_start_time: null,
      accumulated_active_ms: 45000,
      pause_start_time: Date.now() - 10000,
      max_duration_seconds: 120
    });
    expect(paused.elapsedMs).toBe(45000);
    expect(paused.isTimedOut).toBe(false);

    // RUNNING timed out
    const timeout = calculateElapsedMs({
      status: 'RUNNING',
      timer_start_time: Date.now() - 125000,
      accumulated_active_ms: 0,
      pause_start_time: null,
      max_duration_seconds: 120
    });
    expect(timeout.elapsedMs).toBe(120000);
    expect(timeout.isTimedOut).toBe(true);
  });
});

