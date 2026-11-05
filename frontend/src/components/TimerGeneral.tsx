import React from 'react';
import { Match } from '../types';
import { 
  Play, 
  Pause, 
  FastForward, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface TimerGeneralProps {
  match: Match | null;
  formattedTime: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onReset: () => void;
  onVerify: () => void;
}

export const TimerGeneral: React.FC<TimerGeneralProps> = ({
  match,
  formattedTime,
  onStart,
  onPause,
  onResume,
  onEnd,
  onReset,
  onVerify
}) => {
  const status = match?.status || 'READY';

  const canStart = status === 'READY' || status === 'DRAFT';
  const canPause = status === 'RUNNING';
  const canResume = status === 'PAUSED';
  const canEnd = status === 'RUNNING' || status === 'PAUSED';
  const canReset = status !== 'VERIFIED';
  const canVerify = status === 'COMPLETED' || status === 'TIMEOUT';

  return (
    <div className="bg-[#0a1428] border border-[#1a2c50] p-4 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Left: Huge Timer Display */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#0e1d3d] border-2 border-[#1f3b73] flex items-center justify-center text-cyan-400 shadow-inner">
          <Clock className="w-9 h-9" />
        </div>
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase font-mono">
            TIMER GENERAL
          </div>
          <div className="text-5xl md:text-6xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {formattedTime}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Waktu aktif pertandingan
          </div>
        </div>
      </div>

      {/* Right: 4 Primary Control Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* START (Green) */}
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all duration-150 ${
            canStart
              ? 'bg-[#00c853] hover:bg-[#00e676] text-black shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer'
              : 'bg-[#0c241b] text-[#2e5e48] border border-[#143d2c] cursor-not-allowed opacity-50'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>START</span>
        </button>

        {/* JEDA (Orange) */}
        <button
          onClick={onPause}
          disabled={!canPause}
          className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all duration-150 ${
            canPause
              ? 'bg-[#e65100] hover:bg-[#f57c00] text-white shadow-lg shadow-orange-600/25 active:scale-95 cursor-pointer'
              : 'bg-[#29170e] text-[#69402e] border border-[#442312] cursor-not-allowed opacity-50'
          }`}
        >
          <Pause className="w-5 h-5 fill-current" />
          <span>JEDA</span>
        </button>

        {/* LANJUTKAN (Blue) */}
        <button
          onClick={onResume}
          disabled={!canResume}
          className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all duration-150 ${
            canResume
              ? 'bg-[#1565c0] hover:bg-[#1e88e5] text-white shadow-lg shadow-blue-600/25 active:scale-95 cursor-pointer'
              : 'bg-[#0f1d33] text-[#334b6e] border border-[#1b2f4f] cursor-not-allowed opacity-50'
          }`}
        >
          <FastForward className="w-5 h-5 fill-current" />
          <span>LANJUTKAN</span>
        </button>

        {/* AKHIRI (Red) */}
        <button
          onClick={onEnd}
          disabled={!canEnd}
          className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all duration-150 ${
            canEnd
              ? 'bg-[#d50000] hover:bg-[#ff1744] text-white shadow-lg shadow-rose-600/25 active:scale-95 cursor-pointer'
              : 'bg-[#2a1015] text-[#642f38] border border-[#461922] cursor-not-allowed opacity-50'
          }`}
        >
          <Square className="w-5 h-5 fill-current" />
          <span>AKHIRI</span>
        </button>

        {/* Supplementary Controls: Sahkan / Reset */}
        {canVerify && (
          <button
            onClick={onVerify}
            className="flex items-center gap-2 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-700/30 transition-all cursor-pointer"
            title="Sahkan dan kunci hasil pertandingan ini secara resmi"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sahkan Hasil</span>
          </button>
        )}

        {canReset && status !== 'RUNNING' && status !== 'READY' && (
          <button
            onClick={onReset}
            className="p-3.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-[#162138] border border-[#1d2d4c] transition-colors"
            title="Reset timer dan checkpoint ke awal"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

