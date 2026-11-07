import React, { useState } from 'react';
import { Match } from '../types';
import { ListOrdered, Plus, X, Check, ChevronRight } from 'lucide-react';

interface SelectMatchModalProps {
  isOpen: boolean;
  matches: Match[];
  currentMatchId: string;
  onSelectMatch: (match: Match) => void;
  onCreateMatch: (data: { match_number?: string; name?: string; round?: string; max_duration_seconds?: number }) => Promise<void>;
  onClose: () => void;
}

export const SelectMatchModal: React.FC<SelectMatchModalProps> = ({
  isOpen,
  matches,
  currentMatchId,
  onSelectMatch,
  onCreateMatch,
  onClose
}) => {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [matchNumber, setMatchNumber] = useState('');
  const [name, setName] = useState('');
  const [round, setRound] = useState('Penyisihan');
  const [durationMinutes, setDurationMinutes] = useState('2');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const durSec = Math.max(1, parseInt(durationMinutes, 10) * 60 || 120);
      await onCreateMatch({
        match_number: matchNumber.trim() || undefined,
        name: name.trim() || undefined,
        round,
        max_duration_seconds: durSec
      });
      onClose();
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-semibold">Siap Dimulai</span>;
      case 'RUNNING':
        return <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-full font-semibold">Berlangsung</span>;
      case 'PAUSED':
        return <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full font-semibold">Dijeda</span>;
      case 'COMPLETED':
      case 'TIMEOUT':
        return <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800/40 px-2 py-0.5 rounded-full font-semibold">Selesai</span>;
      case 'VERIFIED':
        return <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800/40 px-2 py-0.5 rounded-full font-semibold">Disahkan</span>;
      default:
        return <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c162b] border border-[#213b6d] w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#18294a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Kelola Pertandingan</h3>
              <p className="text-xs text-slate-400">Pilih sesi aktif atau buat pertandingan baru</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 my-4 bg-[#081122] p-1 rounded-xl border border-[#16274a]">
          <button
            onClick={() => setTab('list')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'list'
                ? 'bg-[#18366e] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Pertandingan ({matches.length})
          </button>
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'create'
                ? 'bg-[#18366e] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pertandingan Baru</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {tab === 'list' ? (
            <div className="space-y-2">
              {matches.map((m) => {
                const isSelected = m.id === currentMatchId;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectMatch(m);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#122852] border-blue-500 shadow-md shadow-blue-900/30'
                        : 'bg-[#081122] border-[#16274a] hover:bg-[#0e1c38] hover:border-[#223d70]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-extrabold text-blue-400 bg-[#0c1e3d] px-2.5 py-1 rounded-lg border border-[#1b3b73]">
                        {m.match_number}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white leading-snug">{m.name}</div>
                        <div className="text-xs text-slate-400">
                          {m.round} • Durasi: {Math.floor(m.max_duration_seconds / 60)}m
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(m.status)}
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nomor Pertandingan (Opsional - dibuat otomatis jika kosong)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GH-013"
                  value={matchNumber}
                  onChange={(e) => setMatchNumber(e.target.value)}
                  className="w-full bg-[#081122] border border-[#223d70] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nama Pertandingan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pertandingan GH-013"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#081122] border border-[#223d70] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Babak
                  </label>
                  <select
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    className="w-full bg-[#081122] border border-[#223d70] rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none cursor-pointer"
                  >
                    <option value="Babak 32 Besar">Babak 32 Besar</option>
                    <option value="Babak 16 Besar">Babak 16 Besar</option>
                    <option value="Babak 8 Besar">Babak 8 Besar</option>
                    <option value="Semifinal">Semifinal</option>
                    <option value="Perebutan Juara 3 & 4">Perebutan Juara 3 & 4</option>
                    <option value="Final">Final</option>
                    <option value="Penyisihan">Penyisihan</option>
                    <option value="Perempat Final">Perempat Final</option>
                    <option value="Babak Khusus">Babak Khusus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full bg-[#081122] border border-[#223d70] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-[#122244]"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-700/30"
                >
                  <Check className="w-4 h-4" />
                  <span>{creating ? 'Membuat...' : 'Buat Pertandingan'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

