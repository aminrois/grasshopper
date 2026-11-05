import { useState, useEffect, useRef } from 'react';
import { Match } from '../types';
import { getSocket } from '../services/socket';

export function formatTime(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '00:00.00';
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export function useTimer(match: Match | null) {
  const [elapsedMs, setElapsedMs] = useState<number>(match?.current_elapsed_ms || 0);
  const matchRef = useRef<Match | null>(match);
  matchRef.current = match;

  useEffect(() => {
    if (!match) return;
    setElapsedMs(match.current_elapsed_ms || 0);

    // If not running, keep static
    if (match.status !== 'RUNNING' || !match.timer_start_time) {
      return;
    }

    const maxMs = match.max_duration_seconds * 1000;

    // Smooth client tick every 25ms for smooth display
    const interval = setInterval(() => {
      const current = matchRef.current;
      if (!current || current.status !== 'RUNNING' || !current.timer_start_time) {
        return;
      }
      const now = Date.now();
      const currentElapsed = current.accumulated_active_ms + (now - current.timer_start_time);
      if (currentElapsed >= maxMs) {
        setElapsedMs(maxMs);
      } else {
        setElapsedMs(currentElapsed);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [match?.id, match?.status, match?.timer_start_time, match?.accumulated_active_ms, match?.max_duration_seconds]);

  // Listen to socket sync tick to eliminate any micro drift
  useEffect(() => {
    const socket = getSocket();
    const handleTick = (data: { match_id: string; elapsed_ms: number }) => {
      if (matchRef.current && matchRef.current.id === data.match_id) {
        setElapsedMs(data.elapsed_ms);
      }
    };

    socket.on('timer:tick', handleTick);
    return () => {
      socket.off('timer:tick', handleTick);
    };
  }, []);

  return {
    elapsedMs,
    formattedTime: formatTime(elapsedMs)
  };
}

