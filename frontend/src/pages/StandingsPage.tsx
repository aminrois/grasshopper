import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardResponse } from '../types';
import * as api from '../services/api';
import { getSocket } from '../services/socket';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Search, 
  Download, 
  Printer, 
  RotateCcw, 
  Flag, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Sparkles
} from 'lucide-react';

const ROUND_TABS = [
  { id: 'ALL', label: 'Semua Babak' },
  { id: 'Babak 32 Besar', label: 'Babak 32 Besar' },
  { id: 'Babak 16 Besar', label: 'Babak 16 Besar' },
  { id: 'Babak 8 Besar', label: 'Babak 8 Besar' },
  { id: 'Semifinal', label: 'Semifinal' },
  { id: 'Final', label: 'Final & Juara 3-4' }
];

export const StandingsPage: React.FC = () => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyFinished, setOnlyFinished] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  const loadLeaderboard = async (round: string) => {
    try {
      setLoading(true);
      const res = await api.fetchLeaderboardApi(round);
      setData(res);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(selectedRound);

    const socket = getSocket();
    socket.on('connect', () => setIsLiveConnected(true));
    socket.on('disconnect', () => setIsLiveConnected(false));

    // Automatically re-fetch standings when any match updates in the arena
    const handleMatchUpdate = () => {
      api.fetchLeaderboardApi(selectedRound).then(setData).catch(console.error);
    };

    socket.on('match:updated', handleMatchUpdate);

    return () => {
      socket.off('match:updated', handleMatchUpdate);
    };
  }, [selectedRound]);

  // Filter entries based on search and onlyFinished toggle
  const filteredEntries = (data?.entries || []).filter((e) => {
    const matchSearch =
      e.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.match_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchFinished = onlyFinished ? e.is_finished : true;
    return matchSearch && matchFinished;
  });

  const top4 = filteredEntries.slice(0, 4);

  const exportCSV = () => {
    if (!filteredEntries.length) return;
    const headers = [
      'Peringkat',
      'Nama Tim',
      'Asal Sekolah',
      'Slot',
      'Sesi Pertandingan',
      'Babak',
      'Status',
      'CP 1',
      'CP 2',
      'CP 3',
      'FINISH',
      'Waktu Akhir',
      'Selisih (Gap)',
      'Status Kualifikasi'
    ];

    const rows = filteredEntries.map((e) => [
      e.rank,
      `"${e.team_name.replace(/"/g, '""')}"`,
      `"${(e.school_name || '').replace(/"/g, '""')}"`,
      e.slot,
      e.match_number,
      `"${e.round}"`,
      e.status,
      e.cp1_time || '—',
      e.cp2_time || '—',
      e.cp3_time || '—',
      e.cp4_time || '—',
      e.formatted_finish_time || e.formatted_furthest_time || '—',
      e.formatted_gap || '—',
      `"${e.qualification_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Klasemen_Grasshopper_${selectedRound.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1 font-black text-amber-300">
            <Crown className="w-5 h-5 text-amber-400 drop-shadow-md" />
            <span className="text-base font-mono">#1</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 font-black text-slate-200">
            <Medal className="w-5 h-5 text-slate-300 drop-shadow-md" />
            <span className="text-base font-mono">#2</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 font-black text-amber-600">
            <Medal className="w-5 h-5 text-amber-600 drop-shadow-md" />
            <span className="text-base font-mono">#3</span>
          </div>
        );
      case 4:
        return (
          <div className="flex items-center gap-1 font-bold text-cyan-400">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono">#4</span>
          </div>
        );
      default:
        return <span className="font-mono font-bold text-slate-400 text-sm">#{rank}</span>;
    }
  };

  const getQualificationBadge = (qual: string) => {
    if (qual.includes('Juara 1')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-950 text-amber-300 border border-amber-500/50 shadow-sm">{qual}</span>;
    }
    if (qual.includes('Juara 2')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-800 text-slate-200 border border-slate-500/50 shadow-sm">{qual}</span>;
    }
    if (qual.includes('Juara 3')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-950 text-amber-600 border border-amber-700/50 shadow-sm">{qual}</span>;
    }
    if (qual.includes('Juara 4')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-cyan-950 text-cyan-300 border border-cyan-600/50 shadow-sm">{qual}</span>;
    }
    if (qual.includes('Lolos')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/50 shadow-sm">{qual}</span>;
    }
    if (qual === 'Gugur') {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/60 text-rose-400 border border-rose-800/40">{qual}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-900 text-slate-400 border border-slate-700">{qual}</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070e1e] text-slate-200">
      {/* Top Header Bar */}
      <header className="bg-[#0a1224] border-b border-[#18294a] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white uppercase tracking-wider">
                Klasemen Tim Tercepat
              </h1>
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full font-mono font-bold">
                TOURNAMENT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Peringkat resmi akumulasi waktu finish dan checkpoint terjauh seluruh tim
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1b36] border border-[#1b315b] text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span className={isLiveConnected ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {isLiveConnected ? 'LIVE SYNC' : 'OFFLINE'}
            </span>
          </div>

          <button
            onClick={() => loadLeaderboard(selectedRound)}
            className="p-2 bg-[#0e1b36] hover:bg-[#15274d] border border-[#1b315b] text-slate-300 hover:text-white rounded-xl transition-all shadow-sm"
            title="Muat Ulang Data"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={!filteredEntries.length}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#102347] hover:bg-[#173266] border border-[#1e3c78] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#122b59] hover:bg-[#1a3d7d] border border-blue-600/50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-300" />
            <span>Cetak</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Round Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ROUND_TABS.map((tab) => {
            const isActive = selectedRound === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedRound(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1658e3] text-white shadow-lg shadow-blue-600/30 font-black'
                    : 'bg-[#0a1428] border border-[#172748] text-slate-400 hover:text-white hover:bg-[#11203d]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Top 4 Podium Cards */}
        {top4.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {top4.map((team, idx) => {
              const rank = idx + 1;
              let borderClass = 'border-slate-700 bg-[#0a1224]';
              let badgeBg = 'bg-slate-700 text-white';
              let title = `Peringkat #${rank}`;
              let medalIcon = <Trophy className="w-4 h-4 text-slate-400" />;

              if (rank === 1) {
                borderClass = 'border-amber-500/60 bg-gradient-to-b from-[#1c1806] to-[#0a1224] shadow-amber-500/10 shadow-xl';
                badgeBg = 'bg-amber-400 text-slate-950';
                title = 'Juara 1 (Tercepat)';
                medalIcon = <Crown className="w-5 h-5 text-amber-300 animate-bounce" />;
              } else if (rank === 2) {
                borderClass = 'border-slate-400/60 bg-gradient-to-b from-[#13161c] to-[#0a1224] shadow-slate-400/10 shadow-lg';
                badgeBg = 'bg-slate-300 text-slate-950';
                title = 'Juara 2';
                medalIcon = <Medal className="w-5 h-5 text-slate-300" />;
              } else if (rank === 3) {
                borderClass = 'border-amber-700/60 bg-gradient-to-b from-[#170e06] to-[#0a1224] shadow-amber-700/10 shadow-lg';
                badgeBg = 'bg-amber-600 text-white';
                title = 'Juara 3';
                medalIcon = <Medal className="w-5 h-5 text-amber-600" />;
              } else if (rank === 4) {
                borderClass = 'border-cyan-600/50 bg-gradient-to-b from-[#06141c] to-[#0a1224] shadow-cyan-600/10 shadow-lg';
                badgeBg = 'bg-cyan-600 text-white';
                title = 'Juara 4';
                medalIcon = <Trophy className="w-5 h-5 text-cyan-400" />;
              }

              return (
                <div
                  key={team.team_id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between transition-transform hover:-translate-y-1 ${borderClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        {medalIcon}
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                          {title}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${badgeBg}`}>
                        #{rank}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: team.color }}
                      />
                      <h3 className="font-extrabold text-base text-white truncate" title={team.team_name}>
                        {team.team_name}
                      </h3>
                    </div>

                    {team.school_name && (
                      <p className="text-xs text-slate-400 truncate mb-3">
                        {team.school_name}
                      </p>
                    )}

                    <div className="bg-[#060c18] border border-[#142340] rounded-xl p-3 text-center my-2">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                        Waktu Akhir
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-400">
                        {team.formatted_finish_time || team.formatted_furthest_time || '—'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Selisih: <span className="font-bold text-amber-300">{team.formatted_gap}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5 text-slate-400">
                    <span className="font-mono">Sesi {team.match_number}</span>
                    <span>{getQualificationBadge(team.qualification_status)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="bg-[#0a1428] border border-[#18294a] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tim, asal sekolah, atau nomor sesi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#070e1e] border border-[#1e345e] focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyFinished}
                onChange={(e) => setOnlyFinished(e.target.checked)}
                className="w-4 h-4 rounded bg-[#070e1e] border-[#1e345e] text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-semibold text-slate-300">Hanya Tim Finish</span>
            </label>

            <div className="text-slate-400 font-mono text-xs pl-2 border-l border-slate-700">
              Total: <span className="font-bold text-white">{filteredEntries.length}</span> Tim
            </div>
          </div>
        </div>

        {/* Standings Full Table */}
        <div className="bg-[#0a1224] border border-[#18294a] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0f1d38] border-b border-[#1b2f54] text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Tim & Asal Sekolah</th>
                  <th className="py-3.5 px-4">Sesi & Babak</th>
                  <th className="py-3.5 px-3 text-center font-mono">CP 1</th>
                  <th className="py-3.5 px-3 text-center font-mono">CP 2</th>
                  <th className="py-3.5 px-3 text-center font-mono">CP 3</th>
                  <th className="py-3.5 px-3 text-center font-mono">FINISH</th>
                  <th className="py-3.5 px-4 text-center font-mono">Waktu Terbaik</th>
                  <th className="py-3.5 px-4 text-center font-mono">Gap (Selisih)</th>
                  <th className="py-3.5 px-4 text-center">Kualifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#142340]">
                {loading && !filteredEntries.length ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Memuat data klasemen...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-slate-500" />
                        <span>Tidak ada data tim pada filter ini</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((team) => {
                    const isTop3 = team.rank <= 3;
                    return (
                      <tr
                        key={team.team_id}
                        className={`hover:bg-[#0f1d38]/60 transition-colors ${
                          isTop3 ? 'bg-[#0d1830]/40 font-semibold' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          {getRankBadge(team.rank)}
                        </td>

                        {/* Team Name & School */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: team.color }}
                              title={`Slot ${team.slot}`}
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-sm">
                                {team.team_name}
                              </span>
                              {team.school_name && (
                                <span className="text-[11px] text-slate-400">
                                  {team.school_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Match & Round */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-cyan-400">
                              {team.match_number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {team.round}
                            </span>
                          </div>
                        </td>

                        {/* Checkpoint Columns */}
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                          {team.cp1_time || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                          {team.cp2_time || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                          {team.cp3_time || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">
                          {team.cp4_time || '—'}
                        </td>

                        {/* Best / Final Time */}
                        <td className="py-3.5 px-4 text-center font-mono font-black text-sm text-white">
                          {team.formatted_finish_time || team.formatted_furthest_time || '—'}
                        </td>

                        {/* Gap */}
                        <td className="py-3.5 px-4 text-center font-mono text-amber-300 font-bold">
                          {team.formatted_gap}
                        </td>

                        {/* Qualification Status */}
                        <td className="py-3.5 px-4 text-center">
                          {getQualificationBadge(team.qualification_status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

