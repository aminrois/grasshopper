import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Sliders, 
  Palette, 
  Users, 
  Check, 
  Save, 
  AlertTriangle, 
  Trash2, 
  KeyRound, 
  X, 
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { GrasshopperLogo } from '../components/GrasshopperLogo';
import * as api from '../services/api';

export const SettingsPage: React.FC = () => {
  const [competitionName, setCompetitionName] = useState('Robotik Grasshopper Competition');
  const [organizerName, setOrganizerName] = useState('Maskumambang Fest 4');
  const [defaultDuration, setDefaultDuration] = useState('120');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Load existing settings
  useEffect(() => {
    api.fetchSystemSettingsApi()
      .then((info) => {
        if (info.competition_name) setCompetitionName(info.competition_name);
        if (info.organizer_name) setOrganizerName(info.organizer_name);
        if (info.default_duration_seconds) setDefaultDuration(String(info.default_duration_seconds));
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.saveSystemSettingsApi({
        competition_name: competitionName.trim(),
        organizer_name: organizerName.trim(),
        default_duration_seconds: parseInt(defaultDuration || '120', 10)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setPinInput('');
    setPinError('');
    setResetSuccess(false);
    setShowResetModal(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput !== '1234') {
      setPinError('PIN Konfirmasi Salah! Silakan masukkan PIN: 1234');
      return;
    }

    try {
      setIsResetting(true);
      setPinError('');
      await api.resetAllSystemApi(pinInput);
      setResetSuccess(true);
      setTimeout(() => {
        setShowResetModal(false);
        // Navigate to Arena Kontrol to start fresh
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setPinError(err.message || 'Gagal mereset sistem');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070e1e] p-6 text-white max-w-4xl relative">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-400" />
          <span>Pengaturan Sistem</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Konfigurasi default kompetisi, branding, durasi pertandingan, dan kontrol reset turnamen
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Kompetisi */}
        <div className="bg-[#0a1326] border border-[#182f5b] p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#142340] pb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Identitas & Penyelenggara</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nama Kompetisi
              </label>
              <input
                type="text"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                className="w-full bg-[#070e1c] border border-[#1b3363] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nama Penyelenggara / Event
              </label>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full bg-[#070e1c] border border-[#1b3363] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Durasi Standar Pertandingan (Detik)
              </label>
              <input
                type="number"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                className="w-full bg-[#070e1c] border border-[#1b3363] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {Math.floor(parseInt(defaultDuration || '120', 10) / 60)} Menit {parseInt(defaultDuration || '120', 10) % 60} Detik
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Logo Sistem
              </label>
              <div className="flex items-center gap-3 p-2 bg-[#070e1c] border border-[#1b3363] rounded-xl">
                <GrasshopperLogo size={32} showText={false} />
                <span className="text-xs text-slate-300 font-semibold">
                  Robotic Grasshopper SVG Official Vector
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Konfigurasi Warna Tim */}
        <div className="bg-[#0a1326] border border-[#182f5b] p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#142340] pb-3">
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Warna & Slot Tim Resmi</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[#070e1c] border border-[#1b3363] rounded-xl flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#e11d48] border border-white/20"></span>
              <div>
                <div className="text-xs font-bold text-white">Slot A</div>
                <div className="text-[10px] text-slate-400">Tim Merah</div>
              </div>
            </div>

            <div className="p-3 bg-[#070e1c] border border-[#1b3363] rounded-xl flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#0070f3] border border-white/20"></span>
              <div>
                <div className="text-xs font-bold text-white">Slot B</div>
                <div className="text-[10px] text-slate-400">Tim Biru</div>
              </div>
            </div>

            <div className="p-3 bg-[#070e1c] border border-[#1b3363] rounded-xl flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#059669] border border-white/20"></span>
              <div>
                <div className="text-xs font-bold text-white">Slot C</div>
                <div className="text-[10px] text-slate-400">Tim Hijau</div>
              </div>
            </div>

            <div className="p-3 bg-[#070e1c] border border-[#1b3363] rounded-xl flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#d97706] border border-white/20"></span>
              <div>
                <div className="text-xs font-bold text-white">Slot D</div>
                <div className="text-[10px] text-slate-400">Tim Kuning</div>
              </div>
            </div>
          </div>
        </div>

        {/* Akun & Otoritas */}
        <div className="bg-[#0a1326] border border-[#182f5b] p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#142340] pb-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Akun & Peran Juri</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#070e1c] border border-[#1b3363] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#122244] border border-[#1e3868] flex items-center justify-center text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Juri Operator (Aktif)</div>
                <div className="text-[10px] text-slate-400">Hak Akses: Pengendali Arena Kontrol, Pencatatan & Pembatalan Checkpoint</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              TERVERIFIKASI
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Pengaturan berhasil disimpan!</span>
            </span>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-700/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* ======================================================= */}
      {/* ZONA BAHAYA / FACTORY RESET (RESET SEMUA UNTUK MULAI BARU) */}
      {/* ======================================================= */}
      <div className="mt-10 pt-6 border-t border-[#1c2e54]">
        <div className="bg-[#19090e] border-2 border-rose-600/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/80 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-300 uppercase tracking-wide">
                  Zona Bahaya: Reset Semua Data (Mulai Baru)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan fitur ini untuk membersihkan seluruh data lomba sebelumnya dan memulai turnamen dari awal.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenResetModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 shadow-lg shadow-rose-900/50 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Semua (Mulai Baru)</span>
            </button>
          </div>

          <div className="bg-[#0f0408] border border-rose-900/40 rounded-xl p-3 text-xs text-slate-300 space-y-1 font-mono">
            <div className="text-rose-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Tindakan ini akan menghapus permanen:</span>
            </div>
            <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5 pl-1">
              <li>Seluruh sesi pertandingan lama dan log audit</li>
              <li>Semua catatan waktu checkpoint dan rekap klasemen</li>
              <li>Menginisialisasi sesi baru: <span className="text-white font-bold">GH-001 (Babak 32 Besar - READY)</span></li>
              <li>Memerlukan konfirmasi <span className="text-amber-400 font-bold">PIN: 1234</span> demi keamanan data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* MODAL KONFIRMASI PIN (PIN 1234)                         */}
      {/* ======================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e0712] border-2 border-rose-600/80 w-full max-w-md rounded-3xl p-6 shadow-[0_0_60px_rgba(225,29,72,0.35)] relative">
            <button
              onClick={() => setShowResetModal(false)}
              disabled={isResetting}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-950 text-rose-400 border border-rose-700/60 flex items-center justify-center mb-4 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>

              <h2 className="text-lg font-black text-white uppercase tracking-wide">
                Konfirmasi Reset Seluruh Sistem
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                PERINGATAN: Seluruh pertandingan dan waktu checkpoint akan dihapus bersih. Sistem akan memulai sesi awal turnamen baru.
              </p>
            </div>

            <form onSubmit={handleConfirmReset} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 text-center">
                  Masukkan PIN Konfirmasi (1234)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    autoFocus
                    disabled={isResetting || resetSuccess}
                    className="w-full bg-[#070308] border-2 border-rose-500/60 focus:border-rose-400 rounded-2xl px-4 py-3 text-center text-2xl font-mono font-black text-white tracking-[0.4em] outline-none shadow-inner"
                  />
                </div>
                {pinError && (
                  <p className="text-xs text-rose-400 font-bold text-center mt-2 animate-shake">
                    {pinError}
                  </p>
                )}
                {resetSuccess && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold mt-2">
                    <Check className="w-4 h-4" />
                    <span>Sistem berhasil direset! Mengalihkan...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-300 bg-[#170a14] hover:bg-[#251020] border border-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !pinInput || resetSuccess}
                  className="flex-1 py-3 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Mereset Data...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Reset</span>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 text-center font-mono pt-1">
                PIN Pengaman: 1234
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
