import React, { useState } from 'react';
import { Settings, Shield, Sliders, Palette, Monitor, Users, Check, Save } from 'lucide-react';
import { GrasshopperLogo } from '../components/GrasshopperLogo';

export const SettingsPage: React.FC = () => {
  const [competitionName, setCompetitionName] = useState('Robotik Grasshopper Competition');
  const [organizerName, setOrganizerName] = useState('Maskumambang Fest 4');
  const [defaultDuration, setDefaultDuration] = useState('120');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070e1e] p-6 text-white max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-400" />
          <span>Pengaturan Sistem</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Konfigurasi default kompetisi, branding, durasi pertandingan, dan profil juri operator
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
              <span className="w-5 h-5 rounded-full bg-[#f5a623] border border-white/20"></span>
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
                <div className="text-[10px] text-slate-400">Hak Akses: Pengendali Arena Kontrol & Pencatatan Checkpoint</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              TERVERIFIKASI
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Pengaturan berhasil disimpan!</span>
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-700/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};

