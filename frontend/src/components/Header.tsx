import React from 'react';
import { Match } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  ListOrdered, 
  User, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

interface HeaderProps {
  match: Match | null;
  isConnected: boolean;
  onOpenSelectMatch: () => void;
  onNextMatch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  match,
  isConnected,
  onOpenSelectMatch,
  onNextMatch
}) => {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'READY':
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Siap Dimulai
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-500/40">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            Berlangsung
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Dijeda
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/40">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Waktu Habis
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-400 border border-purple-500/40">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Selesai
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-500/40">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            Disahkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  // Extract session number if available
  const matchNum = match?.match_number.replace(/^GH-0*/, '') || '1';

  return (
    <header className="px-6 py-4 bg-[#0a1224] border-b border-[#1a2b4c] flex items-center justify-between">
      {/* Left: Breadcrumbs & Title */}
      <div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
          <ChevronDown className="w-3.5 h-3.5" />
          <span>ARENA KONTROL</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#14264d] border border-[#23427f] flex items-center justify-center text-emerald-400">
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-sm"></div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {match?.name || 'Pertandingan GH-012'}
          </h1>
          {getStatusBadge(match?.status)}
        </div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
          <span>Babak {match?.round || 'Penyisihan'}</span>
          <span>•</span>
          <span>Sesi {matchNum}</span>
          <span>•</span>
          <span>4 Tim</span>
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-4">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#0e1b36] border border-[#1a2e58]">
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-mono text-[11px]">ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="text-rose-400 font-mono text-[11px]">OFFLINE</span>
            </>
          )}
        </div>

        {/* Pilih Pertandingan Button */}
        <button
          onClick={onOpenSelectMatch}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-200 bg-[#0e1c38] border border-[#223d70] hover:bg-[#162a52] hover:border-blue-400 transition-colors shadow-sm"
        >
          <ListOrdered className="w-4 h-4 text-slate-400" />
          <span>Pilih Pertandingan</span>
        </button>

        {/* Pertandingan Berikutnya Button */}
        <button
          onClick={onNextMatch}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#1a66ff] hover:bg-[#2e74ff] transition-all shadow-md shadow-blue-600/30 active:scale-95"
        >
          <span>Pertandingan Berikutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-[#1e345f]"></div>

        {/* User Operator Profile */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#14264d] border border-[#22407c] flex items-center justify-center text-slate-300">
            <User className="w-5 h-5 text-slate-300" />
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-white leading-tight">Juri Operator</div>
            <div className="text-[10px] text-slate-400 leading-tight">Tim Penilai</div>
          </div>
        </div>
      </div>
    </header>
  );
};

