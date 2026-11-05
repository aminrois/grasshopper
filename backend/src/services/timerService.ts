export function formatTime(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '00:00.00';
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export function parseDurationToSeconds(input: string): number {
  if (!input) return 120;
  const trimmed = input.trim();
  // If formatted like MM:SS or MM:SS.cc
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.max(1, Math.round(minutes * 60 + seconds));
  }
  const numeric = parseInt(trimmed, 10);
  return isNaN(numeric) || numeric <= 0 ? 120 : numeric;
}

export function calculateElapsedMs(match: {
  status: string;
  timer_start_time: number | null;
  accumulated_active_ms: number;
  pause_start_time: number | null;
  max_duration_seconds: number;
}): { elapsedMs: number; isTimedOut: boolean } {
  const maxMs = match.max_duration_seconds * 1000;
  let elapsed = match.accumulated_active_ms;

  if (match.status === 'RUNNING' && match.timer_start_time) {
    const now = Date.now();
    const additional = now - match.timer_start_time;
    elapsed += additional;
  }

  // Check timeout
  if (elapsed >= maxMs) {
    return { elapsedMs: maxMs, isTimedOut: true };
  }

  return { elapsedMs: elapsed, isTimedOut: false };
}

