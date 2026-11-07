import React, { useState, useEffect } from 'react';
import { Match, MatchTeam, CheckpointRecord, LeaderboardResponse } from '../types';
import { fetchPublicMatch, fetchTrialStatus, fetchLeaderboardApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useTimer, formatTime } from '../hooks/useTimer';
import {
  Clock,
  Flag,
  Maximize2,
  Minimize2,
  WifiOff,
  Flame,
  CheckCircle2,
  Trophy,
  Crown,
  Medal,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicScoreboardProps {
  onBackToOperator?: () => void;
}

const PUBLIC_ROUND_TABS = [
  { id: 'ALL', label: 'Semua Babak' },
  { id: 'Babak 32 Besar', label: 'Babak 32 Besar' },
  { id: 'Babak 16 Besar', label: 'Babak 16 Besar' },
  { id: 'Babak 8 Besar', label: 'Babak 8 Besar' },
  { id: 'Semifinal', label: 'Semifinal' },
  { id: 'Final', label: 'Final & Juara 3-4' }
];

export const PublicScoreboard: React.FC<PublicScoreboardProps> = ({ onBackToOperator }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // View mode switcher: 'scoreboard' vs 'standings'
  const [viewMode, setViewMode] = useState<'scoreboard' | 'standings'>('scoreboard');
  const [standingsRound, setStandingsRound] = useState('ALL');
  const [standingsData, setStandingsData] = useState<LeaderboardResponse | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Trial Run state
  const [trialActive, setTrialActive] = useState(false);
  const [trialRemainingMs, setTrialRemainingMs] = useState(30000);
  const [trialDurationSec, setTrialDurationSec] = useState(30);
  const [trialFinishedNotice, setTrialFinishedNotice] = useState(false);

  const { formattedTime } = useTimer(match);

  const loadStandings = async (round: string) => {
    try {
      setLoadingStandings(true);
      const res = await fetchLeaderboardApi(round);
      setStandingsData(res);
    } catch (err) {
      console.error('Error loading standings on public display:', err);
    } finally {
      setLoadingStandings(false);
    }
  };

  // Load initial match & trial state
  useEffect(() => {
    // Check URL query or hash for ?view=standings or #standings
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'standings' || window.location.hash === '#standings') {
      setViewMode('standings');
    }

    fetchPublicMatch()
      .then(data => setMatch(data))
      .catch(console.error)
      .finally(() => setLoading(false));

    loadStandings(standingsRound);

    fetchTrialStatus()
      .then(status => {
        if (status.isActive) {
          setTrialActive(true);
          setTrialDurationSec(status.durationSeconds);
          setTrialRemainingMs(status.remainingMs);
        }
      })
      .catch(() => { });

    const socket = getSocket();
    socket.emit('join:public');

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('match:updated', (updated: Match) => {
      if (match) {
        const prevFinishedCount = match.teams?.filter(t => t.is_finished).length || 0;
        const newFinishedCount = updated.teams?.filter(t => t.is_finished).length || 0;
        if (newFinishedCount > prevFinishedCount) {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
      setMatch(updated);
      // Also refresh standings if active
      fetchLeaderboardApi(standingsRound).then(setStandingsData).catch(() => {});
    });

    // Trial Run socket events
    socket.on('trial:started', (data: { durationSeconds: number; remainingMs: number }) => {
      setTrialActive(true);
      setTrialFinishedNotice(false);
      setTrialDurationSec(data.durationSeconds);
      setTrialRemainingMs(data.remainingMs);
    });

    socket.on('trial:tick', (data: { remainingMs: number }) => {
      setTrialRemainingMs(data.remainingMs);
    });

    socket.on('trial:stopped', () => {
      setTrialActive(false);
      setTrialFinishedNotice(false);
    });

    socket.on('trial:finished', () => {
      setTrialRemainingMs(0);
      setTrialFinishedNotice(true);
      setTimeout(() => {
        setTrialActive(false);
        setTrialFinishedNotice(false);
      }, 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('match:updated');
      socket.off('trial:started');
      socket.off('trial:tick');
      socket.off('trial:stopped');
      socket.off('trial:finished');
    };
  }, [standingsRound]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  const getCpRecord = (team: MatchTeam, cpNum: number): CheckpointRecord | undefined => {
    return team.checkpoints?.find(c => c.checkpoint_number === cpNum && !c.is_corrected);
  };

  const isFastestInCp = (cpNum: number, teamId: string): boolean => {
    if (!match?.fastest_checkpoints) return false;
    const fastest = match.fastest_checkpoints[cpNum];
    return fastest?.team_id === teamId;
  };

  const getTeamSlotStyle = (slot: string) => {
    switch (slot) {
      case 'A': return { badge: 'bg-[#e11d48]', circle: 'bg-white text-[#e11d48]' };
      case 'B': return { badge: 'bg-[#0070f3]', circle: 'bg-white text-[#0070f3]' };
      case 'C': return { badge: 'bg-[#059669]', circle: 'bg-white text-[#059669]' };
      case 'D': return { badge: 'bg-[#f5a623]', circle: 'bg-white text-[#f5a623]' };
      default: return { badge: 'bg-slate-700', circle: 'bg-white text-slate-900' };
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-[#f5a623] text-black font-black';
      case 2: return 'bg-[#94a3b8] text-black font-black';
      case 3: return 'bg-[#d97706] text-black font-black';
      default: return 'bg-[#1e293b] text-slate-300 font-bold';
    }
  };

  const getPublicQualBadge = (qual: string) => {
    if (qual.includes('Juara 1')) {
      return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-md animate-pulse">{qual}</span>;
    }
    if (qual.includes('Juara 2')) {
      return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-300 text-slate-950 shadow-md">{qual}</span>;
    }
    if (qual.includes('Juara 3')) {
      return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-700 text-white shadow-md">{qual}</span>;
    }
    if (qual.includes('Juara 4')) {
      return <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-700 text-white shadow-md">{qual}</span>;
    }
    if (qual.includes('Lolos')) {
      return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-sm">{qual}</span>;
    }
    if (qual === 'Gugur') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/70 text-rose-400 border border-rose-800/40">{qual}</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 text-slate-400 border border-slate-700">{qual}</span>;
  };

  const isFinalRanking = match?.status === 'COMPLETED' || match?.status === 'TIMEOUT' || match?.status === 'VERIFIED';
  const sortedBySlot = [...(match?.teams || [])].sort((a, b) => a.slot.localeCompare(b.slot));
  const rankedTeams = [...(match?.teams || [])].sort((a, b) => (a.rank || 99) - (b.rank || 99));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060c18] flex flex-col items-center justify-center text-white">
        <div className="flex items-center gap-6 mb-6">
          <img src="/assets/mafest.png" alt="Maskumambang Fest 4" className="h-16 object-contain" />
          <img src="/assets/maskum.webp" alt="Pondok Pesantren Maskumambang" className="h-16 object-contain" />
        </div>
        <div className="text-base text-cyan-400 font-mono animate-pulse">
          Menghubungkan ke Papan Skor Digital...
        </div>
      </div>
    );
  }

  // Calculate percentage of remaining trial time
  const trialTotalMs = trialDurationSec * 1000;
  const trialPercent = Math.max(0, Math.min(100, (trialRemainingMs / trialTotalMs) * 100));

  return (
    <div className="min-h-screen h-screen bg-[#050a15] text-white flex flex-col justify-between p-4 md:p-6 lg:p-7 select-none overflow-hidden font-display relative">
      {/* Background Futuristic Accent Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[140px] pointer-events-none"></div>

      {/* TOP HEADER */}
      <header className="relative z-10 flex items-center justify-between mb-3 shrink-0">
        {/* Left: Logo Maskumambang Fest 4 */}
        <div className="flex items-center gap-4">
          <img
            src="/assets/mafest.png"
            alt="Maskumambang Fest 4"
            className="h-14 md:h-16 max-w-[200px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          />
        </div>

        {/* Center: Live Timer OR Tournament Header */}
        {viewMode === 'scoreboard' ? (
          <div className="flex items-center gap-5 bg-[#081226]/95 border-2 border-[#1c3f7c] px-8 py-2.5 rounded-2xl shadow-[0_0_35px_rgba(0,112,243,0.3)] backdrop-blur-md">
            <div className="w-11 h-11 rounded-2xl bg-[#0e2147] border border-[#234d94] flex items-center justify-center text-cyan-400 shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase font-mono">
                TIMER GENERAL
              </div>
              <div className="text-5xl md:text-6xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
                {formattedTime}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-[#081226]/95 border-2 border-amber-500/50 px-8 py-2.5 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.25)] backdrop-blur-md">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-[0.25em] text-amber-300 uppercase font-mono">
                KLASEMEN RESMI TURNAMEN
              </div>
              <div className="text-2xl md:text-3xl font-black font-mono tracking-wide text-white">
                PERINGKAT WAKTU TERCEPAT
              </div>
            </div>
          </div>
        )}

        {/* Right: Switcher, Logo & Fullscreen control */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher Pill */}
          <div className="flex items-center gap-1 bg-[#09152b] border border-[#1b315b] p-1 rounded-2xl shadow-inner">
            <button
              onClick={() => setViewMode('scoreboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'scoreboard'
                  ? 'bg-[#1658e3] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-300" />
              <span>SCOREBOARD</span>
            </button>
            <button
              onClick={() => {
                setViewMode('standings');
                loadStandings(standingsRound);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'standings'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>KLASEMEN</span>
            </button>
          </div>

          <img
            src="/assets/maskum.webp"
            alt="Pondok Pesantren Maskumambang"
            className="h-14 md:h-16 max-w-[200px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] hidden sm:block"
          />

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#0f2142] border border-[#1e3b6e] text-slate-300 hover:text-white hover:bg-[#162f5e] transition-colors"
            title="Toggle Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Disconnection Warning Bar */}
      {!isConnected && (
        <div className="relative z-10 mb-2 bg-rose-950/90 border border-rose-600/60 text-rose-300 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Koneksi ke server terputus. Mencoba menghubungkan kembali...</span>
          </div>
          <span className="font-mono text-[11px]">RECONNECTING</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 1: LIVE SCOREBOARD MATCH ARENA                 */}
      {/* ======================================================== */}
      {viewMode === 'scoreboard' && (
        <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch min-h-0">
          {/* SCOREBOARD TABLE (Col Span 3) */}
          <div className="lg:col-span-3 bg-[#081122]/95 border border-[#182f5b] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between backdrop-blur-md">
            <div className="flex-1 flex flex-col justify-between overflow-x-auto">
              <table className="w-full h-full text-left border-collapse flex-1">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-[#182f5b] font-black uppercase tracking-wider font-mono bg-[#09152b]">
                    <th className="py-3 px-5 text-slate-400 text-lg w-[24%]">TIM</th>
                    <th className="py-3 px-3 text-center text-slate-300 w-[19%]">
                      <div className="text-xl font-black">CP 1</div>
                      <div className="text-xs text-slate-400 font-normal">Checkpoint 1</div>
                    </th>
                    <th className="py-3 px-3 text-center text-slate-300 w-[19%]">
                      <div className="text-xl font-black">CP 2</div>
                      <div className="text-xs text-slate-400 font-normal">Checkpoint 2</div>
                    </th>
                    <th className="py-3 px-3 text-center text-slate-300 w-[19%]">
                      <div className="text-xl font-black">CP 3</div>
                      <div className="text-xs text-slate-400 font-normal">Checkpoint 3</div>
                    </th>
                    <th className="py-3 px-4 text-center bg-[#073629] text-emerald-300 border-l border-[#0d5942] w-[19%]">
                      <div className="text-xl font-black text-emerald-300">CP 4</div>
                      <div className="text-xs text-emerald-400 font-extrabold uppercase">Finish</div>
                    </th>
                  </tr>
                </thead>

                {/* 4 Team Rows */}
                <tbody className="divide-y divide-[#13274d]">
                  {sortedBySlot.map((team) => {
                    const style = getTeamSlotStyle(team.slot);
                    return (
                      <tr key={team.id} className="hover:bg-[#0c1a36]/60 transition-colors h-[21%]">
                        <td className="py-2.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${style.circle} flex items-center justify-center font-black text-sm shrink-0 shadow-md`}>
                              {team.slot}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-lg md:text-xl text-white tracking-wide truncate max-w-[210px]">
                                {team.team_name}
                              </span>
                              {team.school_name && (
                                <span className="text-xs text-slate-400 truncate max-w-[210px]">
                                  {team.school_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {[1, 2, 3, 4].map((cpNum) => {
                          const record = getCpRecord(team, cpNum);
                          const isRecorded = Boolean(record);
                          const isFastest = isFastestInCp(cpNum, team.id);
                          const isFinishCol = cpNum === 4;

                          return (
                            <td
                              key={cpNum}
                              className={`py-2 px-3 text-center align-middle ${
                                isFinishCol ? 'bg-[#06241c]/40 border-l border-[#0f4033]' : ''
                              }`}
                            >
                              {isRecorded ? (
                                <div className="flex flex-col items-center justify-center">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`font-black font-mono tracking-tight text-xl md:text-2xl ${
                                        isFastest ? 'text-[#38ef7d]' : isFinishCol ? 'text-emerald-300' : 'text-white'
                                      }`}
                                    >
                                      {record?.formatted_time}
                                    </span>
                                    {isFastest && (
                                      <span title="Tercepat di Checkpoint Ini" className="text-amber-400 text-lg">
                                        👑
                                      </span>
                                    )}
                                  </div>
                                  {isFinishCol && (
                                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mt-0.5">
                                      🏁 FINISH
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xl font-mono select-none">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Match Info Ribbon */}
            <div className="bg-[#060e1d] px-5 py-2 border-t border-[#182f5b] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono">{match?.match_number}</span>
                <span>•</span>
                <span>{match?.name}</span>
                <span>•</span>
                <span className="text-amber-300 font-bold">{match?.round}</span>
              </div>
              <div className="font-mono text-cyan-400">
                Maksimal: {match?.max_duration_seconds}s
              </div>
            </div>
          </div>

          {/* DYNAMIC RANKING PANEL (Col Span 1) */}
          <div className="bg-[#081122]/95 border border-[#182f5b] rounded-2xl p-4 shadow-2xl flex flex-col justify-between backdrop-blur-md">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[#182f5b] pb-2.5">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black tracking-wider uppercase text-white font-mono">
                    {isFinalRanking ? 'HASIL AKHIR' : 'KLASEMEN SEMENTARA'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  SESI {match?.match_number}
                </span>
              </div>

              {/* 4 Ranked Teams Cards */}
              <div className="space-y-2.5">
                {rankedTeams.map((team, index) => {
                  const rank = index + 1;
                  const rankBadgeClass = getRankBadgeStyle(rank);
                  const isFinished = team.is_finished;
                  const finishTime = team.checkpoints?.find(c => c.checkpoint_number === 4)?.formatted_time;

                  return (
                    <div
                      key={team.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        rank === 1
                          ? 'bg-[#181608] border-amber-500/50 shadow-md'
                          : 'bg-[#0a1428] border-[#182b4f]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg ${rankBadgeClass} flex items-center justify-center font-mono text-xs shadow-inner`}>
                          #{rank}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs md:text-sm text-white truncate max-w-[120px]">
                            {team.team_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Slot {team.slot}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isFinished ? (
                          <div className="font-black font-mono text-emerald-400 text-xs md:text-sm">
                            {finishTime}
                          </div>
                        ) : team.furthest_checkpoint > 0 ? (
                          <div className="font-bold font-mono text-cyan-400 text-xs">
                            CP {team.furthest_checkpoint}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Belum Finish
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#182f5b] text-[10px] text-slate-400 text-center font-medium">
              Finish &gt; Checkpoint Terjauh &gt; Waktu Tercepat
            </div>
          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 2: TOURNAMENT FULLSCREEN STANDINGS VIEW         */}
      {/* ======================================================== */}
      {viewMode === 'standings' && (
        <main className="relative z-10 flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Round Selector Bar */}
          <div className="flex items-center justify-between gap-3 bg-[#081122]/95 border border-[#182f5b] px-4 py-2.5 rounded-2xl shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {PUBLIC_ROUND_TABS.map((tab) => {
                const isActive = standingsRound === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStandingsRound(tab.id);
                      loadStandings(tab.id);
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md'
                        : 'bg-[#0a162e] border border-[#1b315b] text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-slate-400 shrink-0">
              Total: <span className="text-white font-bold">{standingsData?.entries.length || 0}</span> Tim
            </div>
          </div>

          {/* Standings Fullscreen Table Container */}
          <div className="flex-1 bg-[#081122]/95 border border-[#182f5b] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between backdrop-blur-md">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#09152b] border-b border-[#182f5b] font-black uppercase tracking-wider text-slate-400 text-xs">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Nama Tim & Sekolah</th>
                    <th className="py-3 px-4">Sesi & Babak</th>
                    <th className="py-3 px-3 text-center font-mono">CP 1</th>
                    <th className="py-3 px-3 text-center font-mono">CP 2</th>
                    <th className="py-3 px-3 text-center font-mono">CP 3</th>
                    <th className="py-3 px-3 text-center font-mono text-emerald-400">FINISH</th>
                    <th className="py-3 px-4 text-center font-mono">Waktu Terbaik</th>
                    <th className="py-3 px-4 text-center font-mono">Selisih</th>
                    <th className="py-3 px-4 text-center">Kualifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13274d]">
                  {loadingStandings && !standingsData?.entries.length ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-mono text-xs">Memuat klasemen resmi...</span>
                        </div>
                      </td>
                    </tr>
                  ) : standingsData?.entries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400">
                        Belum ada catatan waktu pada babak ini.
                      </td>
                    </tr>
                  ) : (
                    standingsData?.entries.map((team) => {
                      const isTop3 = team.rank <= 3;
                      return (
                        <tr
                          key={team.team_id}
                          className={`hover:bg-[#0c1a36]/70 transition-colors ${
                            isTop3 ? 'bg-[#0f1d38]/50 font-semibold' : ''
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-2.5 px-4 text-center">
                            {team.rank === 1 ? (
                              <div className="flex items-center justify-center gap-1 font-black text-amber-300">
                                <Crown className="w-5 h-5 text-amber-400" />
                                <span className="font-mono">#1</span>
                              </div>
                            ) : team.rank === 2 ? (
                              <div className="flex items-center justify-center gap-1 font-black text-slate-200">
                                <Medal className="w-5 h-5 text-slate-300" />
                                <span className="font-mono">#2</span>
                              </div>
                            ) : team.rank === 3 ? (
                              <div className="flex items-center justify-center gap-1 font-black text-amber-600">
                                <Medal className="w-5 h-5 text-amber-600" />
                                <span className="font-mono">#3</span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-400">#{team.rank}</span>
                            )}
                          </td>

                          {/* Team Name */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: team.color }}
                              />
                              <div className="flex flex-col">
                                <span className="font-black text-white text-base">
                                  {team.team_name}
                                </span>
                                {team.school_name && (
                                  <span className="text-xs text-slate-400">
                                    {team.school_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Sesi & Babak */}
                          <td className="py-2.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-cyan-400">
                                {team.match_number}
                              </span>
                              <span className="text-xs text-slate-400">
                                {team.round}
                              </span>
                            </div>
                          </td>

                          {/* CP columns */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {team.cp1_time || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {team.cp2_time || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {team.cp3_time || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                            {team.cp4_time || '—'}
                          </td>

                          {/* Final Time */}
                          <td className="py-2.5 px-4 text-center font-mono font-black text-base text-white">
                            {team.formatted_finish_time || team.formatted_furthest_time || '—'}
                          </td>

                          {/* Gap */}
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-300">
                            {team.formatted_gap}
                          </td>

                          {/* Qualification Badge */}
                          <td className="py-2.5 px-4 text-center">
                            {getPublicQualBadge(team.qualification_status)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#060e1d] px-6 py-2.5 border-t border-[#182f5b] flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Papan Klasemen Resmi • Grasshopper Robotic Competition</span>
              <span className="font-mono text-emerald-400">Status Terverifikasi</span>
            </div>
          </div>
        </main>
      )}

      {/* POP-UP MODAL OVERLAY: PERCOBAAN ARENA (TRIAL RUN) */}
      {trialActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#0a1836] to-[#050e21] border-2 border-cyan-400/70 w-full max-w-xl rounded-3xl p-8 shadow-[0_0_80px_rgba(0,180,255,0.4)] flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-black uppercase tracking-widest mb-4 animate-pulse">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>PERCOBAAN ARENA ROBOTIK</span>
            </div>

            <div className="bg-[#050c1c] border-2 border-cyan-500/60 rounded-3xl px-10 py-6 my-2 shadow-inner w-full max-w-md">
              <div className="text-7xl md:text-8xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_35px_rgba(34,211,238,0.5)]">
                {formatTime(trialRemainingMs)}
              </div>
              <div className="text-xs font-bold text-cyan-400 mt-2 tracking-wider uppercase font-mono">
                Sisa Waktu Percobaan
              </div>
            </div>

            <div className="w-full max-w-md mt-6">
              <div className="w-full bg-[#0a1630] rounded-full h-3 overflow-hidden border border-[#162d5d]">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                  style={{ width: `${trialPercent}%` }}
                ></div>
              </div>
            </div>

            {trialFinishedNotice && (
              <div className="mt-6 flex items-center gap-2 text-emerald-400 text-lg font-black animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
                <span>WAKTU PERCOBAAN SELESAI!</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
