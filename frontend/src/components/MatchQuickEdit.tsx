import React, { useState } from 'react';
import { Match, MatchTeam } from '../types';
import { FileEdit, Clock, Trophy, Users, Edit3, Check, X } from 'lucide-react';

interface MatchQuickEditProps {
  match: Match | null;
  onUpdateMatch: (updates: { name?: string; round?: string; max_duration_seconds?: number }) => Promise<void>;
  onOpenTeamEdit: (team: MatchTeam) => void;
}

export const MatchQuickEdit: React.FC<MatchQuickEditProps> = ({
  match,
  onUpdateMatch,
  onOpenTeamEdit
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(match?.name || '');

  const [editingDuration, setEditingDuration] = useState(false);
  const [durationValue, setDurationValue] = useState('02:00.00');

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    await onUpdateMatch({ name: nameValue.trim() });
    setEditingName(false);
  };

  const handleSaveDuration = async () => {
    // Parse duration MM:SS or MM:SS.cc
    let totalSec = 120;
    if (durationValue.includes(':')) {
      const parts = durationValue.split(':');
      const min = parseInt(parts[0], 10) || 0;
      const sec = parseFloat(parts[1]) || 0;
      totalSec = Math.max(1, Math.round(min * 60 + sec));
    } else {
      totalSec = Math.max(1, parseInt(durationValue, 10) || 120);
    }
    await onUpdateMatch({ max_duration_seconds: totalSec });
    setEditingDuration(false);
  };

  const handleRoundChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await onUpdateMatch({ round: e.target.value });
  };

  const formatSecToDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.00`;
  };

  const isLocked = match?.status === 'RUNNING';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0a1428] border border-[#1a2c50] p-3 rounded-2xl shadow-md">
      {/* 1. Nama Pertandingan */}
      <div className="bg-[#0e1b36] border border-[#1b315b] p-3 rounded-xl flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
          <FileEdit className="w-3.5 h-3.5 text-blue-400" />
          <span>Nama Pertandingan</span>
        </div>
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="bg-[#091224] border border-blue-500 text-white text-xs px-2 py-1.5 rounded w-full outline-none"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setNameValue(match?.name || '');
                setEditingName(false);
              }}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#081122] border border-[#16274a] px-3 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-white truncate max-w-[170px]">
              {match?.name || 'Pertandingan GH-012'}
            </span>
            <button
              disabled={isLocked}
              onClick={() => {
                setNameValue(match?.name || '');
                setEditingName(true);
              }}
              className="text-slate-400 hover:text-blue-400 disabled:opacity-40 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Durasi Maksimal */}
      <div className="bg-[#0e1b36] border border-[#1b315b] p-3 rounded-xl flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Durasi Maksimal</span>
        </div>
        {editingDuration ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              placeholder="02:00.00"
              className="bg-[#091224] border border-blue-500 text-white text-xs px-2 py-1.5 rounded w-full outline-none font-mono"
              autoFocus
            />
            <button
              onClick={handleSaveDuration}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditingDuration(false)}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#081122] border border-[#16274a] px-3 py-1.5 rounded-lg">
            <span className="text-xs font-mono font-bold text-white">
              {formatSecToDisplay(match?.max_duration_seconds || 120)}
            </span>
            <button
              disabled={isLocked}
              onClick={() => {
                setDurationValue(formatSecToDisplay(match?.max_duration_seconds || 120));
                setEditingDuration(true);
              }}
              className="text-slate-400 hover:text-cyan-400 disabled:opacity-40 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Babak */}
      <div className="bg-[#0e1b36] border border-[#1b315b] p-3 rounded-xl flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Babak</span>
        </div>
        <select
          value={match?.round || 'Penyisihan'}
          disabled={isLocked}
          onChange={handleRoundChange}
          className="bg-[#081122] border border-[#16274a] text-xs font-bold text-white px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-blue-500"
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

      {/* 4. Tim (Red, Blue, Green, Yellow) */}
      <div className="bg-[#0e1b36] border border-[#1b315b] p-3 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Tim</span>
          </div>
        </div>
        <div className="flex items-center justify-between bg-[#081122] border border-[#16274a] px-2.5 py-1.5 rounded-lg gap-1.5">
          {match?.teams && match.teams.length > 0 ? (
            match.teams.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTeamEdit(t)}
                title={`Ubah nama ${t.team_name}`}
                className="flex items-center gap-1 hover:bg-[#162544] px-1.5 py-0.5 rounded transition-colors group"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: t.color }}
                ></span>
                <span className="text-[11px] font-medium text-slate-200 group-hover:text-blue-300 truncate max-w-[55px]">
                  {t.team_name}
                </span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-500">Memuat tim...</span>
          )}
        </div>
      </div>
    </div>
  );
};

