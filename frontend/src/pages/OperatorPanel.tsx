import React, { useState, useEffect } from 'react';
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

interface OperatorPanelProps {
  onOpenPublic: () => void;
}

export const OperatorPanel: React.FC<OperatorPanelProps> = ({ onOpenPublic }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);

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
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePause = async () => {
    if (!match) return;
    try {
      const updated = await api.pauseTimerApi(match.id);
      setMatch(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResume = async () => {
    if (!match) return;
    try {
      const updated = await api.resumeTimerApi(match.id);
      setMatch(updated);
    } catch (err: any) {
      alert(err.message);
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
        } catch (err: any) {
          alert(err.message);
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
        } catch (err: any) {
          alert(err.message);
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
        } catch (err: any) {
          alert(err.message);
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
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Checkpoint Handler
  const handleRecordCheckpoint = async (teamId: string, cpNumber: number) => {
    if (!match) return;
    try {
      const res = await api.recordCheckpointApi(match.id, teamId, cpNumber);
      setMatch(res.match);
    } catch (err: any) {
      alert(err.message);
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
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveTeamName = async (teamId: string, newName: string, newSchool: string) => {
    if (!match) return;
    try {
      const updated = await api.updateTeamNameApi(match.id, teamId, newName, newSchool);
      setMatch(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelectMatch = async (m: Match) => {
    try {
      await api.setActiveMatchApi(m.id);
      setMatch(m);
      const logs = await api.fetchAuditLogs(m.id);
      setAuditLogs(logs);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateMatch = async (data: { match_number?: string; name?: string; round?: string; max_duration_seconds?: number }) => {
    try {
      const created = await api.createNewMatch(data);
      setMatch(created);
      const matches = await api.fetchAllMatches();
      setAllMatches(matches);
      const logs = await api.fetchAuditLogs(created.id);
      setAuditLogs(logs);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-mono text-sm animate-pulse">
        Memuat data Arena Kontrol...
      </div>
    );
  }

  // Sorted teams by slot (A, B, C, D)
  const sortedTeams = [...(match?.teams || [])].sort((a, b) => a.slot.localeCompare(b.slot));

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070e1e]">
      {/* Header matching Image 1 */}
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

        {/* Pencatatan Waktu per Tim Header */}
        <div className="pt-2">
          <div className="text-sm font-extrabold text-white uppercase tracking-wider mb-3">
            Pencatatan Waktu per Tim
          </div>

          {/* 4 Cards Grid (A, B, C, D) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                match={match}
                onRecordCheckpoint={handleRecordCheckpoint}
                onEditTeam={(t) => setSelectedTeamForEdit(t)}
              />
            ))}
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

