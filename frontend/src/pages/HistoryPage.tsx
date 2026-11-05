import React, { useState, useEffect } from 'react';
import { Match, MatchTeam } from '../types';
import * as api from '../services/api';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Calendar, 
  Trophy, 
  Crown, 
  CheckCircle, 
  X,
  FileSpreadsheet
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roundFilter, setRoundFilter] = useState('ALL');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await api.fetchAllMatches();
      setMatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    // Search by match number or name or team names
    const matchSearch =
      m.match_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.teams?.some(t => t.team_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchRound = roundFilter === 'ALL' || m.round === roundFilter;

    return matchSearch && matchStatus && matchRound;
  });

  const getWinnerSummary = (match: Match) => {
    if (!match.teams || match.teams.length === 0) return '—';
    const ranked = [...match.teams].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    const winner = ranked[0];
    if (winner && winner.is_finished) {
      const timeStr = winner.checkpoints?.find(c => c.checkpoint_number === 4)?.formatted_time;
      return `${winner.team_name} (${timeStr || 'Finish'})`;
    }
    return 'Belum Selesai';
  };

  const exportToCSV = () => {
    const headers = ['Nomor Pertandingan', 'Nama Pertandingan', 'Babak', 'Status', 'Durasi', 'Tim A', 'Tim B', 'Tim C', 'Tim D', 'Pemenang', 'Waktu Dibuat'];
    const rows = filteredMatches.map(m => {
      const teams = m.teams || [];
      const teamA = teams.find(t => t.slot === 'A')?.team_name || '-';
      const teamB = teams.find(t => t.slot === 'B')?.team_name || '-';
      const teamC = teams.find(t => t.slot === 'C')?.team_name || '-';
      const teamD = teams.find(t => t.slot === 'D')?.team_name || '-';
      return [
        m.match_number,
        `"${m.name}"`,
        m.round,
        m.status,
        `${m.max_duration_seconds}s`,
        `"${teamA}"`,
        `"${teamB}"`,
        `"${teamC}"`,
        `"${teamD}"`,
        `"${getWinnerSummary(m)}"`,
        m.created_at
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `riwayat_pertandingan_grasshopper_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printTable = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070e1e] p-6 text-white">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Riwayat Pertandingan</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Arsip seluruh pertandingan, catatan checkpoint, peringkat, dan hasil pengesahan resmi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0e1d38] border border-[#213b6d] hover:bg-[#162f59] text-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={printTable}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0e1d38] border border-[#213b6d] hover:bg-[#162f59] text-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Cetak Hasil</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#0a1326] border border-[#182f5b] p-4 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 shadow-md">
        {/* Search Input */}
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nomor pertandingan, nama sesi, atau nama tim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070e1c] border border-[#1b3363] focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none"
          />
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#070e1c] border border-[#1b3363] rounded-xl px-3.5 py-2.5 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="READY">Siap Dimulai (READY)</option>
            <option value="RUNNING">Berlangsung (RUNNING)</option>
            <option value="COMPLETED">Selesai (COMPLETED)</option>
            <option value="VERIFIED">Disahkan (VERIFIED)</option>
            <option value="TIMEOUT">Waktu Habis (TIMEOUT)</option>
          </select>
        </div>

        {/* Filter Round */}
        <div>
          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value)}
            className="w-full bg-[#070e1c] border border-[#1b3363] rounded-xl px-3.5 py-2.5 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Babak</option>
            <option value="Penyisihan">Penyisihan</option>
            <option value="Perempat Final">Perempat Final</option>
            <option value="Semifinal">Semifinal</option>
            <option value="Final">Final</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#0a1326] border border-[#182f5b] rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#182f5b] bg-[#0c1830] text-slate-400 font-extrabold uppercase tracking-wider font-mono">
                <th className="py-3.5 px-4">Nomor</th>
                <th className="py-3.5 px-4">Nama Pertandingan</th>
                <th className="py-3.5 px-4">Babak</th>
                <th className="py-3.5 px-4">4 Tim</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Ringkasan Hasil</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#132444]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-mono">
                    Memuat riwayat pertandingan...
                  </td>
                </tr>
              ) : filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Tidak ada pertandingan yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredMatches.map((m) => {
                  const teams = m.teams || [];
                  return (
                    <tr key={m.id} className="hover:bg-[#0e1d38] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        {m.match_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {m.round}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {teams.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0e1c38] text-slate-200 border border-[#1d3560]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }}></span>
                              <span>{t.team_name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'VERIFIED'
                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                            : m.status === 'COMPLETED'
                            ? 'bg-purple-950 text-purple-400 border border-purple-800'
                            : m.status === 'RUNNING'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {getWinnerSummary(m)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedMatch(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#142850] hover:bg-[#1b356d] text-blue-300 font-bold text-[11px] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-[#080f1e] border-t border-[#182f5b] text-xs text-slate-400 flex items-center justify-between">
          <span>Menampilkan {filteredMatches.length} dari {matches.length} pertandingan</span>
          <span className="font-mono text-[11px]">Database: PERSISTENT</span>
        </div>
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0c162b] border border-[#213b6d] w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#1a2c50]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-extrabold text-blue-400 bg-[#0e1d3d] px-2.5 py-1 rounded-lg border border-[#1e3b75]">
                  {selectedMatch.match_number}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedMatch.name}</h3>
                  <div className="text-xs text-slate-400">
                    Babak {selectedMatch.round} • Status: {selectedMatch.status}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Catatan Checkpoint & Hasil Akhir
              </div>

              <div className="space-y-2">
                {selectedMatch.teams?.map((team) => {
                  const cp1 = team.checkpoints?.find(c => c.checkpoint_number === 1);
                  const cp2 = team.checkpoints?.find(c => c.checkpoint_number === 2);
                  const cp3 = team.checkpoints?.find(c => c.checkpoint_number === 3);
                  const cp4 = team.checkpoints?.find(c => c.checkpoint_number === 4);

                  return (
                    <div
                      key={team.id}
                      className="bg-[#081122] border border-[#16274a] p-3 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 w-1/3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.slot}
                        </div>
                        <span className="font-bold text-xs text-white">{team.team_name}</span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs w-1/2 justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block">CP 1</span>
                          <span className="text-slate-300">{cp1 ? cp1.formatted_time : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">CP 2</span>
                          <span className="text-slate-300">{cp2 ? cp2.formatted_time : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">CP 3</span>
                          <span className="text-slate-300">{cp3 ? cp3.formatted_time : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-500 block">FINISH</span>
                          <span className="font-bold text-emerald-400">{cp4 ? cp4.formatted_time : '—'}</span>
                        </div>
                      </div>

                      <div className="w-1/6 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#11203d] text-slate-300 border border-[#1d3560]">
                          Rank {team.rank || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1a2c50] flex justify-end">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#122244] text-slate-300 hover:bg-[#1a3160]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

