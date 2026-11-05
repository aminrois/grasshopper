import React, { useState } from 'react';
import { MatchTeam, Match } from '../types';
import { 
  Edit3, 
  Flag, 
  Check, 
  Compass, 
  Crown, 
  AlertCircle 
} from 'lucide-react';

interface TeamCardProps {
  team: MatchTeam;
  match: Match | null;
  onRecordCheckpoint: (teamId: string, cpNumber: number) => Promise<void>;
  onEditTeam: (team: MatchTeam) => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  match,
  onRecordCheckpoint,
  onEditTeam
}) => {
  const [loadingCp, setLoadingCp] = useState<number | null>(null);

  const isRunning = match?.status === 'RUNNING';
  const furthestCp = team.furthest_checkpoint || 0;

  // Header background color map
  const getSlotColor = (slot: string) => {
    switch (slot) {
      case 'A': return { header: 'bg-[#e11d48]', border: 'border-[#e11d48]/40', circle: 'bg-white text-[#e11d48]' };
      case 'B': return { header: 'bg-[#0070f3]', border: 'border-[#0070f3]/40', circle: 'bg-white text-[#0070f3]' };
      case 'C': return { header: 'bg-[#059669]', border: 'border-[#059669]/40', circle: 'bg-white text-[#059669]' };
      case 'D': return { header: 'bg-[#d97706]', border: 'border-[#d97706]/40', circle: 'bg-white text-[#d97706]' };
      default: return { header: 'bg-slate-700', border: 'border-slate-600', circle: 'bg-white text-slate-800' };
    }
  };

  const style = getSlotColor(team.slot);

  const handleCpClick = async (cpNumber: number) => {
    if (!isRunning || team.is_finished || loadingCp !== null) return;
    if (cpNumber !== furthestCp + 1) return;

    try {
      setLoadingCp(cpNumber);
      await onRecordCheckpoint(team.id, cpNumber);
    } finally {
      setLoadingCp(null);
    }
  };

  // Find checkpoint record for this cpNumber
  const getCpRecord = (num: number) => {
    return team.checkpoints?.find(c => c.checkpoint_number === num && !c.is_corrected);
  };

  return (
    <div className={`bg-[#0a1224] border ${style.border} rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow`}>
      {/* Team Header */}
      <div className={`${style.header} px-4 py-3 flex items-center justify-between text-white shadow-sm`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full ${style.circle} flex items-center justify-center font-black text-sm shadow-inner`}>
            {team.slot}
          </div>
          <span className="font-extrabold text-sm uppercase tracking-wider truncate max-w-[150px]">
            {team.team_name}
          </span>
        </div>
        <button
          onClick={() => onEditTeam(team)}
          disabled={isRunning}
          title="Ubah nama tim"
          className="text-white/80 hover:text-white p-1 rounded transition-colors disabled:opacity-40"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {/* Checkpoints Row */}
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((cpNum) => {
            const isFinish = cpNum === 4;
            const label = isFinish ? 'FINISH' : `CP ${cpNum}`;
            const record = getCpRecord(cpNum);
            const isRecorded = Boolean(record);
            const isNext = isRunning && !team.is_finished && cpNum === furthestCp + 1;
            const isLoading = loadingCp === cpNum;

            let btnClass = 'bg-[#0f1d38] border border-[#1b2f54] text-slate-400 opacity-60';
            if (isRecorded) {
              btnClass = 'bg-[#082a1d] border border-emerald-500/60 text-emerald-400 shadow-sm shadow-emerald-950';
            } else if (isNext) {
              btnClass = 'bg-[#18366e] border border-blue-400 text-white animate-pulse hover:bg-[#20458a] cursor-pointer shadow-md shadow-blue-900/50';
            }

            return (
              <button
                key={cpNum}
                disabled={!isNext || isLoading}
                onClick={() => handleCpClick(cpNum)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${btnClass}`}
              >
                <span className="text-[10px] font-bold tracking-wider font-mono uppercase">
                  {label}
                </span>
                <span className="text-xs font-mono font-bold mt-1 tracking-tight">
                  {isLoading ? (
                    '...'
                  ) : isRecorded ? (
                    record?.formatted_time
                  ) : (
                    '—'
                  )}
                </span>
                <span className="text-[9px] mt-0.5 opacity-70">
                  {isRecorded ? (isFinish ? 'Finish' : 'OK') : 'Belum'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Middle Status / Summary Box */}
        <div className="mt-3 bg-[#081020] border border-[#142340] rounded-xl p-3 flex flex-col items-center justify-center min-h-[75px] text-center">
          {team.is_finished ? (
            <div className="flex flex-col items-center text-emerald-400">
              <div className="flex items-center gap-1.5 font-extrabold text-sm tracking-wide">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>BERHASIL FINISH</span>
              </div>
              <div className="text-lg font-black font-mono mt-0.5 text-white">
                {team.checkpoints?.find(c => c.checkpoint_number === 4)?.formatted_time || '—'}
              </div>
            </div>
          ) : furthestCp > 0 ? (
            <div className="flex flex-col items-center text-cyan-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Checkpoint Terakhir: CP {furthestCp}
              </span>
              <span className="text-base font-black font-mono text-cyan-300 mt-0.5">
                {team.checkpoints?.find(c => c.checkpoint_number === furthestCp)?.formatted_time || '—'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <Compass className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-400">
                Belum ada waktu yang tercatat
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="px-4 py-2.5 bg-[#080f1e] border-t border-[#142340] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Flag className="w-3.5 h-3.5" />
          <span>Status</span>
        </div>
        <div>
          {team.is_finished ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/40">
              Finish
            </span>
          ) : match?.status === 'COMPLETED' || match?.status === 'TIMEOUT' ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-600/40">
              Tidak Finish
            </span>
          ) : isRunning ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-950 text-blue-400 border border-blue-600/40">
              Berlangsung
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#101b33] text-slate-300 border border-[#1b2c4e]">
              Belum Mulai
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

