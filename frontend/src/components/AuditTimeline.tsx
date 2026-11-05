import React from 'react';
import { Match, AuditLog } from '../types';
import { FileText, History, Sparkles } from 'lucide-react';
import { GrasshopperLogo } from './GrasshopperLogo';

interface BottomCardsProps {
  match: Match | null;
  auditLogs: AuditLog[];
}

export const BottomCards: React.FC<BottomCardsProps> = ({
  match,
  auditLogs
}) => {
  const formatTimeStr = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatSecToDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.00`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Box 1: Informasi Pertandingan */}
      <div className="bg-[#0a1224] border border-[#1a2b4c] rounded-2xl p-4 shadow-md flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Informasi Pertandingan</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-[#142340]">
            <span className="text-slate-400">Nama Pertandingan</span>
            <span className="font-bold text-white">: {match?.name || 'Pertandingan GH-012'}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#142340]">
            <span className="text-slate-400">Babak</span>
            <span className="font-bold text-white">: {match?.round || 'Penyisihan'}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#142340]">
            <span className="text-slate-400">Durasi Maksimal</span>
            <span className="font-bold text-white font-mono">
              : {formatSecToDisplay(match?.max_duration_seconds || 120)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Tim</span>
            <span className="font-bold text-white">: 4 Tim</span>
          </div>
        </div>
      </div>

      {/* Box 2: Riwayat Aktivitas Terakhir */}
      <div className="bg-[#0a1224] border border-[#1a2b4c] rounded-2xl p-4 shadow-md flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Riwayat Aktivitas Terakhir</span>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[120px] pr-1 scrollbar-thin">
          {auditLogs && auditLogs.length > 0 ? (
            auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <span className="font-mono text-[11px] font-bold text-slate-400 shrink-0">
                  {formatTimeStr(log.timestamp)}
                </span>
                <span className="text-slate-300 truncate leading-snug">
                  {log.details}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center">
              Belum ada riwayat aktivitas pada pertandingan ini
            </div>
          )}
        </div>
      </div>

      {/* Box 3: Grasshopper Banner (Semangat Berkompetisi Raih Prestasi) */}
      <div className="bg-gradient-to-br from-[#0c1b38] to-[#071329] border border-[#1c3563] rounded-2xl p-4 shadow-md flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
          <div className="text-base font-black text-white tracking-wide">
            Semangat <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Berkompetisi
            </span>
          </div>
          <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Raih Prestasi Juara</span>
          </div>
        </div>

        <div className="relative z-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <GrasshopperLogo size={68} showText={false} />
        </div>

        {/* Ambient subtle background glow */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
      </div>
    </div>
  );
};

