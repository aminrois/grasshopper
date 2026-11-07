import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Match, MatchTeam, AuditLog } from '../types';
import * as api from '../services/api';
import { getSocket } from '../services/socket';
import { useTimer } from '../hooks/useTimer';
import { Header } from '../components/Header';
import { MatchQuickEdit } from '../components/MatchQuickEdit';
import { TimerGeneral } from '../components/TimerGeneral';
import { TrialControlBar } from '../components/TrialControlBar';
import { TeamCard } from '../components/TeamCard';
import { BottomCards } from '../components/AuditTimeline';
import { EditTeamModal } from '../components/EditTeamModal';
import { SelectMatchModal } from '../components/SelectMatchModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Keyboard, CheckCircle2, Undo2, AlertTriangle, X } from 'lucide-react';

interface OperatorPanelProps {
  onOpenPublic: () => void;
}

interface ToastInfo {
  id: number;
  text: string;
  type: 'success' | 'cancel' | 'error';
}

const SHORTCUT_MAP: Record<string, { recordKey: string; cancelKey: string; name: string; color: string }> = {
  A: { recordKey: 'Z', cancelKey: 'Q', name: 'Tim Merah', color: '#e11d48' },
  B: { recordKey: 'V', cancelKey: 'R', name: 'Tim Biru', color: '#0070f3' },
  C: { recordKey: 'M', cancelKey: 'U', name: 'Tim Hijau', color: '#059669' },
  D: { recordKey: '/', cancelKey: 'P', name: 'Tim Kuning', color: '#d97706' },
};

export const OperatorPanel: React.FC<OperatorPanelProps> = ({ onOpenPublic }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  // Flash states for card feedback
  const [flashState, setFlashState] = useState<Record<string, 'record' | 'cancel' | null>>({});

  // Toast notifications
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((text: string, type: 'success' | 'cancel' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  // Modals state
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<MatchTeam | null>(null);
  const [showSelectMatchModal, setShowSelectMatchModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDanger: false,
    onConfirm: () => {}
  });

  const { formattedTime } = useTimer(match);

  // Load match and data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const active = await api.fetchActiveMatch();
      setMatch(active);

      const matches = await api.fetchAllMatches();
      setAllMatches(matches);

      if (active) {
        const logs = await api.fetchAuditLogs(active.id);
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    const socket = getSocket();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('match:updated', (updated: Match) => {
      setMatch((prev) => {
        if (!prev || prev.id === updated.id) {
          return updated;
        }
        return prev;
      });
      // Refresh audit logs
      if (updated.id) {
        api.fetchAuditLogs(updated.id).then(setAuditLogs);
      }
    });

    return () => {
      socket.off('match:updated');
    };
  }, []);

  // Timer Handlers
  const handleStart = async () => {
    if (!match) return;
    try {
      const updated = await api.startTimerApi(match.id);
      setMatch(updated);
      showToast(`Pertandingan ${match.match_number} dimulai!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePause = async () => {
    if (!match) return;
    try {
      const updated = await api.pauseTimerApi(match.id);
      setMatch(updated);
      showToast('Pertandingan dijeda', 'cancel');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResume = async () => {
    if (!match) return;
    try {
      const updated = await api.resumeTimerApi(match.id);
      setMatch(updated);
      showToast('Pertandingan dilanjutkan!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEnd = () => {
    if (!match) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Akhiri Pertandingan?',
      message: 'Apakah Anda yakin ingin mengakhiri sesi pertandingan ini? Tim yang belum mencapai garis Finish akan ditandai TIDAK FINISH.',
      isDanger: true,
      onConfirm: async () => {
        try {
          const updated = await api.endTimerApi(match.id, 'Juri mengakhiri pertandingan');
          setMatch(updated);
          showToast(`Pertandingan ${match.match_number} diakhiri`, 'cancel');
        } catch (err: any) {
          showToast(err.message, 'error');
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleReset = () => {
    if (!match) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Reset Timer & Checkpoint?',
      message: 'PERINGATAN: Semua catatan waktu checkpoint yang belum disahkan akan dihapus dan timer akan kembali ke nol.',
      isDanger: true,
      onConfirm: async () => {
        try {
          const updated = await api.resetTimerApi(match.id);
          setMatch(updated);
          showToast('Timer dan checkpoint telah direset ke nol', 'cancel');
        } catch (err: any) {
          showToast(err.message, 'error');
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleVerify = async () => {
    if (!match) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Sahkan Hasil Pertandingan?',
      message: 'Setelah disahkan, hasil pertandingan akan terkunci permanen dan status menjadi VERIFIED. Lanjutkan pengesahan?',
      isDanger: false,
      onConfirm: async () => {
        try {
          const updated = await api.verifyMatchApi(match.id);
          setMatch(updated);
          showToast(`Hasil pertandingan ${match.match_number} resmi disahkan!`, 'success');
        } catch (err: any) {
          showToast(err.message, 'error');
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Next Match Handler
  const handleNextMatch = async () => {
    if (!match) return;

    if (match.status === 'RUNNING' || match.status === 'PAUSED') {
      setConfirmConfig({
        isOpen: true,
        title: 'Pertandingan Masih Berjalan!',
        message: 'Pertandingan saat ini belum selesai. Akhiri pertandingan atau selesaikan terlebih dahulu sebelum beralih ke pertandingan berikutnya.',
        isDanger: true,
        onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    try {
      const nextM = await api.nextMatchApi(match.id);
      setMatch(nextM);
      const matches = await api.fetchAllMatches();
      setAllMatches(matches);
      const logs = await api.fetchAuditLogs(nextM.id);
      setAuditLogs(logs);
      showToast(`Beralih ke pertandingan ${nextM.match_number}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Checkpoint Record Handler
  const handleRecordCheckpoint = async (teamId: string, cpNumber: number) => {
    if (!match) return;
    const team = match.teams?.find(t => t.id === teamId);

    try {
      const res = await api.recordCheckpointApi(match.id, teamId, cpNumber);
      setMatch(res.match);

      // Trigger visual card flash
      setFlashState(prev => ({ ...prev, [teamId]: 'record' }));
      setTimeout(() => {
        setFlashState(prev => ({ ...prev, [teamId]: null }));
      }, 500);

      const cpName = cpNumber === 4 ? 'FINISH 🏁' : `CP ${cpNumber}`;
      showToast(`✓ ${team?.team_name || 'Tim'}: ${cpName} tercatat (${res.checkpoint.formatted_time})`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Checkpoint Cancel Handler
  const handleCancelCheckpoint = async (teamId: string) => {
    if (!match) return;
    const team = match.teams?.find(t => t.id === teamId);
    if (!team || !team.furthest_checkpoint) return;

    const targetCp = team.furthest_checkpoint;
    try {
      const updated = await api.cancelLastCheckpointApi(match.id, teamId);
      setMatch(updated);

      // Trigger visual card flash
      setFlashState(prev => ({ ...prev, [teamId]: 'cancel' }));
      setTimeout(() => {
        setFlashState(prev => ({ ...prev, [teamId]: null }));
      }, 500);

      const cpName = targetCp === 4 ? 'FINISH' : `CP ${targetCp}`;
      showToast(`↩ ${team.team_name}: ${cpName} dibatalkan`, 'cancel');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Quick Edit Handlers
  const handleUpdateMatchInfo = async (updates: { name?: string; round?: string; max_duration_seconds?: number }) => {
    if (!match) return;
    try {
      const updated = await api.updateMatchDetails(match.id, updates);
      setMatch(updated);
      const matches = await api.fetchAllMatches();
      setAllMatches(matches);
      showToast('Informasi pertandingan berhasil diperbarui', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveTeamName = async (teamId: string, newName: string, newSchool: string) => {
    if (!match) return;
    try {
      const updated = await api.updateTeamNameApi(match.id, teamId, newName, newSchool);
      setMatch(updated);
      showToast('Profil tim berhasil disimpan', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSelectMatch = async (m: Match) => {
    try {
      await api.setActiveMatchApi(m.id);
      setMatch(m);
      setShowSelectMatchModal(false);
      showToast(`Memuat pertandingan ${m.match_number}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateMatch = async (data: { match_number?: string; name?: string; round?: string; max_duration_seconds?: number }) => {
    try {
      const created = await api.createNewMatch(data);
      setMatch(created);
      const matches = await api.fetchAllMatches();
      setAllMatches(matches);
      setShowSelectMatchModal(false);
      showToast(`Pertandingan ${created.match_number} berhasil dibuat`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ==========================================
  // KEYBOARD SHORTCUTS LISTENER
  // Catat: Z (Merah), V (Biru), M (Hijau), / (Kuning)
  // Batal: Q (Merah), R (Biru), U (Hijau), P (Kuning)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Guard against active inputs, textareas, selects
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 2. Guard against open modals
      if (showSelectMatchModal || selectedTeamForEdit || confirmConfig.isOpen) {
        return;
      }

      // 3. Guard against key repeats (holding down the key)
      if (e.repeat) return;

      if (!match) return;

      const isRunning = match.status === 'RUNNING';
      const canCancel = match.status === 'RUNNING' || match.status === 'PAUSED';

      const key = e.key;
      const lowerKey = key.toLowerCase();

      const teamA = match.teams?.find(t => t.slot === 'A');
      const teamB = match.teams?.find(t => t.slot === 'B');
      const teamC = match.teams?.find(t => t.slot === 'C');
      const teamD = match.teams?.find(t => t.slot === 'D');

      // --- CATAT CHECKPOINT (Z, V, M, /) ---
      if (isRunning) {
        // Tim Merah: Z
        if (lowerKey === 'z' && teamA && !teamA.is_finished) {
          e.preventDefault();
          const nextCp = (teamA.furthest_checkpoint || 0) + 1;
          if (nextCp <= 4) handleRecordCheckpoint(teamA.id, nextCp);
          return;
        }
        // Tim Biru: V
        if (lowerKey === 'v' && teamB && !teamB.is_finished) {
          e.preventDefault();
          const nextCp = (teamB.furthest_checkpoint || 0) + 1;
          if (nextCp <= 4) handleRecordCheckpoint(teamB.id, nextCp);
          return;
        }
        // Tim Hijau: M
        if (lowerKey === 'm' && teamC && !teamC.is_finished) {
          e.preventDefault();
          const nextCp = (teamC.furthest_checkpoint || 0) + 1;
          if (nextCp <= 4) handleRecordCheckpoint(teamC.id, nextCp);
          return;
        }
        // Tim Kuning: / (Slash)
        if (key === '/' && teamD && !teamD.is_finished) {
          e.preventDefault();
          const nextCp = (teamD.furthest_checkpoint || 0) + 1;
          if (nextCp <= 4) handleRecordCheckpoint(teamD.id, nextCp);
          return;
        }
      }

      // --- BATAL CHECKPOINT (Q, R, U, P) ---
      if (canCancel) {
        // Batal Merah: Q
        if (lowerKey === 'q' && teamA && (teamA.furthest_checkpoint || 0) > 0) {
          e.preventDefault();
          handleCancelCheckpoint(teamA.id);
          return;
        }
        // Batal Biru: R
        if (lowerKey === 'r' && teamB && (teamB.furthest_checkpoint || 0) > 0) {
          e.preventDefault();
          handleCancelCheckpoint(teamB.id);
          return;
        }
        // Batal Hijau: U
        if (lowerKey === 'u' && teamC && (teamC.furthest_checkpoint || 0) > 0) {
          e.preventDefault();
          handleCancelCheckpoint(teamC.id);
          return;
        }
        // Batal Kuning: P
        if (lowerKey === 'p' && teamD && (teamD.furthest_checkpoint || 0) > 0) {
          e.preventDefault();
          handleCancelCheckpoint(teamD.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [match, showSelectMatchModal, selectedTeamForEdit, confirmConfig.isOpen]);

  if (loading && !match) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070e1e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-sm tracking-widest text-blue-400">MEMUAT ARENA KONTROL...</span>
        </div>
      </div>
    );
  }

  // Sorted teams by slot (A, B, C, D)
  const sortedTeams = [...(match?.teams || [])].sort((a, b) => a.slot.localeCompare(b.slot));
  const isRunning = match?.status === 'RUNNING';

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070e1e] relative">
      {/* Toast Notifications Floating Overlay */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                : toast.type === 'cancel'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                : 'bg-amber-950/90 border-amber-500/60 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'cancel' && <Undo2 className="w-4 h-4 text-rose-400 shrink-0" />}
              {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <Header
        match={match}
        isConnected={isConnected}
        onOpenSelectMatch={() => setShowSelectMatchModal(true)}
        onNextMatch={handleNextMatch}
      />

      {/* Main Container */}
      <div className="p-6 space-y-5 max-w-[1600px] mx-auto w-full">
        {/* Match Quick Edit Inline Bar */}
        <MatchQuickEdit
          match={match}
          onUpdateMatch={handleUpdateMatchInfo}
          onOpenTeamEdit={(team) => setSelectedTeamForEdit(team)}
        />

        {/* Trial Run (Percobaan Arena) Control Bar */}
        <TrialControlBar />

        {/* Timer General Controls */}
        <TimerGeneral
          match={match}
          formattedTime={formattedTime}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={handleEnd}
          onReset={handleReset}
          onVerify={handleVerify}
        />

        {/* ========================================= */}
        {/* SHORTCUT KEYBOARD OPERATOR HELPER BAR */}
        {/* ========================================= */}
        <div className="bg-[#0a1428] border border-blue-900/50 rounded-2xl p-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#142340]">
            <div className="flex items-center gap-2.5 text-sm font-extrabold text-white">
              <Keyboard className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="tracking-wide uppercase">PANDUAN SHORTCUT KEYBOARD OPERATOR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-xs font-mono font-bold text-slate-300">
                {isRunning ? (
                  <span className="text-emerald-400">SHORTCUT AKTIF (Pertandingan Berjalan)</span>
                ) : (
                  <span className="text-slate-400">Siap (Aktif saat Timer Start)</span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            {/* Merah */}
            <div className="bg-[#120814] border border-[#e11d48]/40 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#e11d48] shadow-sm"></div>
                <span className="text-xs font-bold text-white">Tim Merah</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Catat:</span>
                <kbd className="px-2 py-0.5 bg-[#e11d48]/30 border border-[#e11d48] rounded text-white font-black shadow-sm">Z</kbd>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[11px]">Batal:</span>
                <kbd className="px-2 py-0.5 bg-rose-950 border border-rose-600 rounded text-rose-200 font-black shadow-sm">Q</kbd>
              </div>
            </div>

            {/* Biru */}
            <div className="bg-[#081224] border border-[#0070f3]/40 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#0070f3] shadow-sm"></div>
                <span className="text-xs font-bold text-white">Tim Biru</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Catat:</span>
                <kbd className="px-2 py-0.5 bg-[#0070f3]/30 border border-[#0070f3] rounded text-white font-black shadow-sm">V</kbd>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[11px]">Batal:</span>
                <kbd className="px-2 py-0.5 bg-blue-950 border border-blue-600 rounded text-blue-200 font-black shadow-sm">R</kbd>
              </div>
            </div>

            {/* Hijau */}
            <div className="bg-[#081b16] border border-[#059669]/40 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#059669] shadow-sm"></div>
                <span className="text-xs font-bold text-white">Tim Hijau</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Catat:</span>
                <kbd className="px-2 py-0.5 bg-[#059669]/30 border border-[#059669] rounded text-white font-black shadow-sm">M</kbd>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[11px]">Batal:</span>
                <kbd className="px-2 py-0.5 bg-emerald-950 border border-emerald-600 rounded text-emerald-200 font-black shadow-sm">U</kbd>
              </div>
            </div>

            {/* Kuning */}
            <div className="bg-[#1b1408] border border-[#d97706]/40 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#d97706] shadow-sm"></div>
                <span className="text-xs font-bold text-white">Tim Kuning</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Catat:</span>
                <kbd className="px-2 py-0.5 bg-[#d97706]/30 border border-[#d97706] rounded text-white font-black shadow-sm">/</kbd>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[11px]">Batal:</span>
                <kbd className="px-2 py-0.5 bg-amber-950 border border-amber-600 rounded text-amber-200 font-black shadow-sm">P</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Pencatatan Waktu per Tim Header */}
        <div className="pt-1">
          <div className="text-sm font-extrabold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Pencatatan Waktu per Tim</span>
            <span className="text-xs text-slate-400 font-normal">
              Klik tombol di kartu atau gunakan keyboard sesuai panduan di atas
            </span>
          </div>

          {/* 4 Cards Grid (A, B, C, D) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedTeams.map((team) => {
              const cfg = SHORTCUT_MAP[team.slot] || { recordKey: '?', cancelKey: '?', name: team.team_name, color: '#64748b' };
              return (
                <TeamCard
                  key={team.id}
                  team={team}
                  match={match}
                  onRecordCheckpoint={handleRecordCheckpoint}
                  onCancelCheckpoint={handleCancelCheckpoint}
                  onEditTeam={(t) => setSelectedTeamForEdit(t)}
                  recordKeyHint={cfg.recordKey}
                  cancelKeyHint={cfg.cancelKey}
                  isFlashing={flashState[team.id]}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom 3 Cards: Info, Riwayat Aktivitas, Banner */}
        <div className="pt-2">
          <BottomCards match={match} auditLogs={auditLogs} />
        </div>
      </div>

      {/* Modals */}
      <EditTeamModal
        isOpen={Boolean(selectedTeamForEdit)}
        team={selectedTeamForEdit}
        onSave={handleSaveTeamName}
        onClose={() => setSelectedTeamForEdit(null)}
      />

      <SelectMatchModal
        isOpen={showSelectMatchModal}
        matches={allMatches}
        currentMatchId={match?.id || ''}
        onSelectMatch={handleSelectMatch}
        onCreateMatch={handleCreateMatch}
        onClose={() => setShowSelectMatchModal(false)}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
