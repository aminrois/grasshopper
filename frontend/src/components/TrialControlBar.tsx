import React, { useState, useEffect } from 'react';
import { Flame, Play, Square, Clock, Sparkles } from 'lucide-react';
import { fetchTrialStatus, startTrialApi, stopTrialApi } from '../services/api';
import { getSocket } from '../services/socket';
import { formatTime } from '../hooks/useTimer';

export const TrialControlBar: React.FC = () => {
  const [durationSec, setDurationSec] = useState<number>(30);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [remainingMs, setRemainingMs] = useState<number>(30000);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check initial trial status
    fetchTrialStatus()
      .then((status) => {
        setIsActive(status.isActive);
        setDurationSec(status.durationSeconds);
        setRemainingMs(status.remainingMs);
      })
      .catch(() => {});

    const socket = getSocket();

    socket.on('trial:started', (data: { durationSeconds: number; remainingMs: number }) => {
      setIsActive(true);
      setDurationSec(data.durationSeconds);
      setRemainingMs(data.remainingMs);
    });

    socket.on('trial:tick', (data: { remainingMs: number; durationSeconds: number }) => {
      setIsActive(true);
      setRemainingMs(data.remainingMs);
      setDurationSec(data.durationSeconds);
    });

    socket.on('trial:finished', () => {
      setIsActive(false);
      setRemainingMs(0);
    });

    socket.on('trial:stopped', () => {
      setIsActive(false);
    });

    return () => {
      socket.off('trial:started');
      socket.off('trial:tick');
      socket.off('trial:finished');
      socket.off('trial:stopped');
    };
  }, []);

  const handleStartTrial = async () => {
    try {
      setLoading(true);
      await startTrialApi(durationSec);
      setIsActive(true);
    } catch (err: any) {
      alert(err.message || 'Gagal memulai percobaan');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTrial = async () => {
    try {
      setLoading(true);
      await stopTrialApi();
      setIsActive(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menghentikan percobaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md ${
      isActive
        ? 'bg-[#081a2e] border-cyan-500/70 shadow-cyan-900/30'
        : 'bg-[#0a1326] border-[#182f5b]'
    }`}>
      {/* Left info */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isActive 
            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 animate-pulse' 
            : 'bg-[#0e2147] text-cyan-400 border border-[#1b3b73]'
        }`}>
          <Flame className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Percobaan Arena (Trial Run)
            </span>
            {isActive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-500/60 animate-pulse">
                POPUPS LIVE DI LAYAR PUBLIK
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {isActive 
              ? 'Pop-up timer countdown sedang aktif di layar penonton.' 
              : 'Menampilkan pop-up timer hitung mundur uji coba sensor di Layar Publik.'}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {isActive ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#050e1f] border border-cyan-500/60 px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xl font-black text-white">
                {formatTime(remainingMs)}
              </span>
            </div>

            <button
              onClick={handleStopTrial}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-700/30 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Hentikan Percobaan</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#060e1d] border border-[#182f5b] px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold">Durasi:</span>
              <input
                type="number"
                min="5"
                max="300"
                value={durationSec}
                onChange={(e) => setDurationSec(Math.max(5, parseInt(e.target.value, 10) || 30))}
                className="w-14 bg-[#0a152b] border border-[#203a70] rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center outline-none focus:border-cyan-400"
              />
              <span className="text-xs text-slate-400 font-mono">detik</span>
            </div>

            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-700/30 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Percobaan ({durationSec}s)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

