import React, { useState, useEffect } from 'react';
import { MatchTeam } from '../types';
import { Users, School, X, Check } from 'lucide-react';

interface EditTeamModalProps {
  isOpen: boolean;
  team: MatchTeam | null;
  onSave: (teamId: string, newName: string, newSchool: string) => Promise<void>;
  onClose: () => void;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  team,
  onSave,
  onClose
}) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.team_name);
      setSchool(team.school_name || '');
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      await onSave(team.id, name.trim(), school.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c162b] border border-[#213b6d] w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: team.color }}
            >
              {team.slot}
            </div>
            <h3 className="text-base font-bold text-white">Ubah Info Tim</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Tim */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
              <Users className="w-3.5 h-3.5" />
              Nama Tim — Slot {team.slot}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#081122] border border-[#223d70] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none"
              placeholder="Contoh: Tim Merah"
              autoFocus
            />
          </div>

          {/* Nama Sekolah */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
              <School className="w-3.5 h-3.5" />
              Nama Sekolah / Instansi
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full bg-[#081122] border border-[#223d70] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              placeholder="Contoh: SMP Negeri 1 Gresik"
            />
            <p className="text-[11px] text-slate-500 mt-1">Opsional. Ditampilkan di bawah nama tim pada layar publik.</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#122244] hover:bg-[#1a3160] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-700/30"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
