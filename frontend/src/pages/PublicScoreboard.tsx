import React, { useState, useEffect } from 'react';
import { Match, MatchTeam, CheckpointRecord } from '../types';
import { fetchPublicMatch, fetchTrialStatus } from '../services/api';
import { getSocket } from '../services/socket';
import { useTimer, formatTime } from '../hooks/useTimer';
import {
  Clock,
  Flag,
  Maximize2,
  Minimize2,
  WifiOff,
  Flame,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicScoreboardProps {
  onBackToOperator?: () => void;
}

export const PublicScoreboard: React.FC<PublicScoreboardProps> = ({ onBackToOperator }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Trial Run state
  const [trialActive, setTrialActive] = useState(false);
  const [trialRemainingMs, setTrialRemainingMs] = useState(30000);
  const [trialDurationSec, setTrialDurationSec] = useState(30);
  const [trialFinishedNotice, setTrialFinishedNotice] = useState(false);

  const { formattedTime } = useTimer(match);

  // Load initial match & trial state
  useEffect(() => {
    fetchPublicMatch()
      .then(data => setMatch(data))
      .catch(console.error)
      .finally(() => setLoading(false));

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
    });

    // Trial Run socket events
    socket.on('trial:started', (data: { durationSeconds: number; remainingMs: number }) => {
      setTrialActive(true);
      setTrialFinishedNotice(false);
      setTrialDurationSec(data.durationSeconds);
      setTrialRemainingMs(data.remainingMs);
    });

    socket.on('trial:tick', (data: { remainingMs: number; durationSeconds: number }) => {
      setTrialActive(true);
      setTrialRemainingMs(data.remainingMs);
      setTrialDurationSec(data.durationSeconds);
    });

    socket.on('trial:finished', () => {
      setTrialRemainingMs(0);
      setTrialFinishedNotice(true);
      setTimeout(() => {
        setTrialActive(false);
        setTrialFinishedNotice(false);
      }, 3500);
    });

    socket.on('trial:stopped', () => {
      setTrialActive(false);
      setTrialFinishedNotice(false);
    });

    return () => {
      socket.off('match:updated');
      socket.off('trial:started');
      socket.off('trial:tick');
      socket.off('trial:finished');
      socket.off('trial:stopped');
    };
  }, [match?.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
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

      {/* TOP HEADER - Sesuai gambar referensi user */}
      <header className="relative z-10 flex items-center justify-between mb-4 shrink-0">
        {/* Left: Logo Maskumambang Fest 4 */}
        <div className="flex items-center gap-4">
          <img
            src="/assets/mafest.png"
            alt="Maskumambang Fest 4"
            className="h-16 md:h-20 max-w-[240px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          />
        </div>

        {/* Center: BIGGER TIMER GENERAL in Tech Container */}
        <div className="flex items-center gap-5 bg-[#081226]/95 border-2 border-[#1c3f7c] px-9 py-3.5 rounded-2xl shadow-[0_0_35px_rgba(0,112,243,0.3)] backdrop-blur-md">
          <div className="w-13 h-13 rounded-2xl bg-[#0e2147] border border-[#234d94] flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.25em] text-slate-400 uppercase font-mono">
              TIMER GENERAL
            </div>
            <div className="text-6xl md:text-7xl lg:text-7xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Right: Logo Pondok Pesantren Maskumambang & Fullscreen control */}
        <div className="flex items-center gap-5">
          <img
            src="/assets/maskum.webp"
            alt="Pondok Pesantren Maskumambang"
            className="h-16 md:h-18 max-w-[260px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-[#0f2142] border border-[#1e3b6e] text-slate-300 hover:text-white hover:bg-[#162f5e] transition-colors"
              title="Toggle Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Disconnection Warning Bar */}
      {!isConnected && (
        <div className="relative z-10 mb-3 bg-rose-950/90 border border-rose-600/60 text-rose-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Koneksi ke server terputus. Mencoba menghubungkan kembali...</span>
          </div>
          <span className="font-mono text-[11px]">RECONNECTING</span>
        </div>
      )}

      {/* MAIN MAXIMIZED CONTENT: TABLE (75%) + RANKING PANEL (25%) */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch min-h-0">
        {/* SCOREBOARD TABLE (Col Span 3) - MAXIMIZED SPACING & FONT */}
        <div className="lg:col-span-3 bg-[#081122]/95 border border-[#182f5b] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between backdrop-blur-md">
          <div className="flex-1 flex flex-col justify-between overflow-x-auto">
            <table className="w-full h-full text-left border-collapse flex-1">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-[#182f5b] font-black uppercase tracking-wider font-mono bg-[#09152b]">
                  <th className="py-4 px-6 text-slate-400 text-xl w-[24%]">TIM</th>
                  <th className="py-4 px-3 text-center text-slate-300 w-[19%]">
                    <div className="text-2xl font-black">CP 1</div>
                    <div className="text-sm text-slate-400 font-normal tracking-normal normal-case">Checkpoint 1</div>
                  </th>
                  <th className="py-4 px-3 text-center text-slate-300 w-[19%]">
                    <div className="text-2xl font-black">CP 2</div>
                    <div className="text-sm text-slate-400 font-normal tracking-normal normal-case">Checkpoint 2</div>
                  </th>
                  <th className="py-4 px-3 text-center text-slate-300 w-[19%]">
                    <div className="text-2xl font-black">CP 3</div>
                    <div className="text-sm text-slate-400 font-normal tracking-normal normal-case">Checkpoint 3</div>
                  </th>
                  {/* Highlighted Finish Column */}
                  <th className="py-4 px-4 text-center bg-[#073629] text-emerald-300 border-l border-[#0d5942] w-[19%]">
                    <div className="text-2xl font-black text-emerald-300">CP 4</div>
                    <div className="text-sm text-emerald-400 font-extrabold tracking-normal uppercase">Finish</div>
                  </th>
                </tr>
              </thead>

              {/* Table Body - 4 Teams with Maximum Height and Text Sizes */}
              <tbody className="divide-y divide-[#132444] flex-1">
                {sortedBySlot.map((team) => {
                  const style = getTeamSlotStyle(team.slot);
                  const cp1 = getCpRecord(team, 1);
                  const cp2 = getCpRecord(team, 2);
                  const cp3 = getCpRecord(team, 3);
                  const cp4 = getCpRecord(team, 4);

                  const isCp1Fastest = isFastestInCp(1, team.id);
                  const isCp2Fastest = isFastestInCp(2, team.id);
                  const isCp3Fastest = isFastestInCp(3, team.id);
                  const isCp4Fastest = isFastestInCp(4, team.id);

                  return (
                    <tr key={team.id} className="hover:bg-[#0e1d38]/60 transition-colors h-[21%]">
                      {/* Team Name with Colored Badge - BIGGER */}
                      <td className="py-4 px-6 align-middle">
                        <div className={`inline-flex items-center gap-3.5 px-5 py-3 rounded-2xl ${style.badge} text-white shadow-lg`}>
                          <div className={`w-9 h-9 rounded-full ${style.circle} flex items-center justify-center font-black text-base shadow-inner shrink-0`}>
                            {team.slot}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-base md:text-lg lg:text-xl uppercase tracking-wider leading-tight">
                              {team.team_name}
                            </span>
                            {team.school_name && (
                              <span className="text-[11px] md:text-xs font-medium text-white/70 leading-tight truncate max-w-[180px]">
                                {team.school_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CP 1 - BIGGER FONT, NO CROWN */}
                      <td className="py-4 px-3 text-center align-middle font-mono">
                        {cp1 ? (
                          <div className={`text-2xl md:text-3xl font-black ${isCp1Fastest ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-100'}`}>
                            {cp1.formatted_time}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold text-2xl">—</span>
                        )}
                      </td>

                      {/* CP 2 - BIGGER FONT, NO CROWN */}
                      <td className="py-4 px-3 text-center align-middle font-mono">
                        {cp2 ? (
                          <div className={`text-2xl md:text-3xl font-black ${isCp2Fastest ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-100'}`}>
                            {cp2.formatted_time}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold text-2xl">—</span>
                        )}
                      </td>

                      {/* CP 3 - BIGGER FONT, NO CROWN */}
                      <td className="py-4 px-3 text-center align-middle font-mono">
                        {cp3 ? (
                          <div className={`text-2xl md:text-3xl font-black ${isCp3Fastest ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-100'}`}>
                            {cp3.formatted_time}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold text-2xl">—</span>
                        )}
                      </td>

                      {/* CP 4 / Finish - BIGGER FONT, NO CROWN */}
                      <td className="py-4 px-3 text-center align-middle font-mono bg-[#052b21]/40 border-l border-[#0d5942]/60">
                        {cp4 ? (
                          <div className="inline-flex items-center justify-center gap-2.5 text-2xl md:text-3xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                            <Flag className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>{cp4.formatted_time}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold text-2xl">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Match Info Bar */}
          <div className="p-3.5 bg-[#060d1b] border-t border-[#182f5b] flex items-center justify-between text-xs text-slate-400 font-medium shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-white font-extrabold text-sm">{match?.name}</span>
              <span>•</span>
              <span className="font-semibold">Babak {match?.round}</span>
              <span>•</span>
              <span className="font-semibold">Durasi: {Math.floor((match?.max_duration_seconds || 120) / 60)}m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-emerald-400 font-mono text-xs font-black">LIVE SYNC</span>
            </div>
          </div>
        </div>

        {/* RANKING PANEL (Col Span 1) - LARGER CARDS & NO CROWN ICON */}
        <div className="bg-[#081122]/95 border border-[#182f5b] rounded-2xl p-5 shadow-2xl flex flex-col justify-between backdrop-blur-md">
          <div className="flex-1 flex flex-col">
            <div className="text-sm font-black tracking-widest text-slate-300 uppercase font-mono mb-4 pb-3 border-b border-[#182f5b] flex items-center justify-between">
              <span>{isFinalRanking ? 'PERINGKAT AKHIR' : 'PERINGKAT SEMENTARA'}</span>
            </div>

            {/* Ranked Cards Stack - COMPACT SPACING */}
            <div className="space-y-2 flex-1 flex flex-col">
              {rankedTeams.map((team, idx) => {
                const rankNum = team.rank || idx + 1;
                const badgeStyle = getRankBadgeStyle(rankNum);
                const finishRecord = getCpRecord(team, 4);
                const furthestRecord = team.furthest_checkpoint > 0
                  ? getCpRecord(team, team.furthest_checkpoint)
                  : undefined;

                return (
                  <div
                    key={team.id}
                    className="bg-[#060d1c] border border-[#182f5b] hover:border-[#274c91] p-3 rounded-2xl flex items-center justify-between transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rank Number Circle */}
                      <div className={`w-10 h-10 rounded-full ${badgeStyle} flex items-center justify-center text-base shadow-md`}>
                        {rankNum}
                      </div>

                      {/* Team Name & Time */}
                      <div>
                        <div className="text-sm md:text-base font-black uppercase text-white tracking-wide">
                          {team.team_name}
                        </div>
                        {team.school_name && (
                          <div className="text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[110px]">
                            {team.school_name}
                          </div>
                        )}
                        <div className="text-sm md:text-base font-mono font-black mt-0.5">
                          {finishRecord ? (
                            <span className="text-emerald-400">{finishRecord.formatted_time}</span>
                          ) : furthestRecord ? (
                            <span className="text-cyan-400">{furthestRecord.formatted_time}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Text on Rank Card */}
                    <div className="text-right">
                      {team.is_finished ? (
                        <span className="text-xs md:text-sm font-bold text-emerald-400">
                          (Finish)
                        </span>
                      ) : team.furthest_checkpoint > 0 ? (
                        <span className="text-xs md:text-sm font-semibold text-slate-400">
                          (CP {team.furthest_checkpoint})
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          (Belum Finish)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ranking Rule Note */}
          <div className="mt-3 pt-3 border-t border-[#182f5b] text-[11px] text-slate-400 text-center font-medium">
            Peringkat dihitung otomatis: Finish &gt; Checkpoint Terjauh &gt; Waktu Tercepat
          </div>
        </div>
      </main>

      {/* POP-UP MODAL OVERLAY: PERCOBAAN ARENA (TRIAL RUN) */}
      {trialActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#0a1836] to-[#050e21] border-2 border-cyan-400/70 w-full max-w-xl rounded-3xl p-8 shadow-[0_0_80px_rgba(0,180,255,0.4)] flex flex-col items-center text-center">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-black uppercase tracking-widest mb-4 animate-pulse">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>PERCOBAAN ARENA ROBOTIK</span>
            </div>

            {/* Giant Countdown Timer */}
            <div className="bg-[#050c1c] border-2 border-cyan-500/60 rounded-3xl px-10 py-6 my-2 shadow-inner w-full max-w-md">
              <div className="text-7xl md:text-8xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_35px_rgba(34,211,238,0.5)]">
                {formatTime(trialRemainingMs)}
              </div>
              <div className="text-xs font-bold text-cyan-400 mt-2 tracking-wider uppercase font-mono">
                Sisa Waktu Percobaan
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mt-6">
              <div className="w-full bg-[#0a1630] rounded-full h-3 overflow-hidden border border-[#162d5d]">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                  style={{ width: `${trialPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Finish Notice if zero */}
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
