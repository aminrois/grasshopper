import { Match, AuditLog, SystemSettings } from '../types';

const API_BASE = '/api';

export async function fetchActiveMatch(): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/active`);
  if (!res.ok) throw new Error('Gagal memuat pertandingan aktif');
  return res.json();
}

export async function fetchAllMatches(): Promise<Match[]> {
  const res = await fetch(`${API_BASE}/matches`);
  if (!res.ok) throw new Error('Gagal memuat daftar pertandingan');
  return res.json();
}

export async function fetchMatchById(id: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}`);
  if (!res.ok) throw new Error('Gagal memuat detail pertandingan');
  return res.json();
}

export async function createNewMatch(data: {
  match_number?: string;
  name?: string;
  round?: string;
  max_duration_seconds?: number;
}): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal membuat pertandingan baru');
  }
  return res.json();
}

export async function updateMatchDetails(
  id: string,
  updates: { name?: string; round?: string; max_duration_seconds?: number }
): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal memperbarui informasi pertandingan');
  }
  return res.json();
}

export async function updateTeamNameApi(
  matchId: string,
  teamId: string,
  name: string,
  school_name?: string
): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/teams/${teamId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ...(school_name !== undefined ? { school_name } : {}) })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal memperbarui nama tim');
  }
  return res.json();
}

// Timer API Calls
export async function startTimerApi(id: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}/start`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal memulai timer');
  }
  return res.json();
}

export async function pauseTimerApi(id: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}/pause`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal menjeda timer');
  }
  return res.json();
}

export async function resumeTimerApi(id: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}/resume`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal melanjutkan timer');
  }
  return res.json();
}

export async function endTimerApi(id: string, reason?: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal mengakhiri pertandingan');
  }
  return res.json();
}

export async function resetTimerApi(id: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${id}/reset`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal mereset timer');
  }
  return res.json();
}

// Checkpoint Recording API
export async function recordCheckpointApi(
  matchId: string,
  teamId: string,
  checkpointNumber: number
): Promise<{ match: Match; checkpoint: any }> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/checkpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id: teamId, checkpoint_number: checkpointNumber })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal mencatat checkpoint');
  }
  return res.json();
}

export async function nextMatchApi(currentMatchId: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${currentMatchId}/next`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal beralih ke pertandingan berikutnya');
  }
  return res.json();
}

export async function setActiveMatchApi(matchId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/set-active`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal mengaktifkan pertandingan');
  }
}

export async function verifyMatchApi(matchId: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/verify`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal mengesahkan hasil pertandingan');
  }
  return res.json();
}

export async function fetchAuditLogs(matchId: string): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/audit-logs`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPublicMatch(): Promise<Match> {
  const res = await fetch(`${API_BASE}/public/current-match`);
  if (!res.ok) throw new Error('Gagal memuat papan skor publik');
  return res.json();
}

// Trial Run (Percobaan Arena)
export async function fetchTrialStatus(): Promise<{ isActive: boolean; durationSeconds: number; remainingMs: number }> {
  const res = await fetch(`${API_BASE}/matches/trial/status`);
  if (!res.ok) return { isActive: false, durationSeconds: 30, remainingMs: 30000 };
  return res.json();
}

export async function startTrialApi(durationSeconds: number = 30): Promise<any> {
  const res = await fetch(`${API_BASE}/matches/trial/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration_seconds: durationSeconds })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Gagal memulai percobaan arena');
  }
  return res.json();
}

export async function stopTrialApi(): Promise<any> {
  const res = await fetch(`${API_BASE}/matches/trial/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Gagal menghentikan percobaan arena');
  return res.json();
}

