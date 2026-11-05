import { broadcastTrialEvent } from '../sockets/socketHandler.js';
import { logAudit } from './auditService.js';
import { getActiveMatchId } from './matchService.js';

interface TrialState {
  isActive: boolean;
  durationSeconds: number;
  startTime: number | null;
  elapsedMs: number;
}

let currentTrial: TrialState = {
  isActive: false,
  durationSeconds: 30,
  startTime: null,
  elapsedMs: 0
};

let trialInterval: NodeJS.Timeout | null = null;

export function getTrialStatus() {
  if (!currentTrial.isActive || !currentTrial.startTime) {
    return {
      isActive: false,
      durationSeconds: currentTrial.durationSeconds,
      remainingMs: currentTrial.durationSeconds * 1000,
      elapsedMs: 0
    };
  }

  const now = Date.now();
  const elapsed = now - currentTrial.startTime;
  const totalMs = currentTrial.durationSeconds * 1000;
  const remainingMs = Math.max(0, totalMs - elapsed);

  return {
    isActive: remainingMs > 0,
    durationSeconds: currentTrial.durationSeconds,
    remainingMs,
    elapsedMs: elapsed
  };
}

export async function startTrial(durationSeconds: number = 30) {
  const safeDuration = Math.max(5, durationSeconds);
  const now = Date.now();

  currentTrial = {
    isActive: true,
    durationSeconds: safeDuration,
    startTime: now,
    elapsedMs: 0
  };

  const activeMatchId = await getActiveMatchId();
  await logAudit(
    activeMatchId,
    'START_TRIAL',
    `Percobaan arena dimulai dengan durasi ${safeDuration} detik`,
    'Juri Operator'
  );

  broadcastTrialEvent('trial:started', {
    durationSeconds: safeDuration,
    startTime: now,
    remainingMs: safeDuration * 1000
  });

  if (trialInterval) clearInterval(trialInterval);

  trialInterval = setInterval(async () => {
    if (!currentTrial.isActive || !currentTrial.startTime) {
      if (trialInterval) clearInterval(trialInterval);
      return;
    }

    const currentNow = Date.now();
    const elapsed = currentNow - currentTrial.startTime;
    const totalMs = currentTrial.durationSeconds * 1000;
    const remainingMs = Math.max(0, totalMs - elapsed);

    if (remainingMs <= 0) {
      currentTrial.isActive = false;
      if (trialInterval) clearInterval(trialInterval);
      broadcastTrialEvent('trial:finished', {
        durationSeconds: currentTrial.durationSeconds,
        remainingMs: 0
      });
    } else {
      broadcastTrialEvent('trial:tick', {
        remainingMs,
        durationSeconds: currentTrial.durationSeconds
      });
    }
  }, 100);

  return getTrialStatus();
}

export async function stopTrial() {
  if (trialInterval) clearInterval(trialInterval);
  const wasActive = currentTrial.isActive;
  currentTrial.isActive = false;
  currentTrial.startTime = null;

  if (wasActive) {
    const activeMatchId = await getActiveMatchId();
    await logAudit(
      activeMatchId,
      'STOP_TRIAL',
      'Percobaan arena dihentikan',
      'Juri Operator'
    );
  }

  broadcastTrialEvent('trial:stopped', {
    isActive: false,
    durationSeconds: currentTrial.durationSeconds
  });

  return getTrialStatus();
}

