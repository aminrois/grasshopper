import React from 'react';
import { GrasshopperLogo } from './GrasshopperLogo';
import { 
  PlayCircle, 
  Calendar, 
  History, 
  Tv, 
  Settings,
  Compass
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'arena' | 'matches' | 'history' | 'settings';
  onSelectTab: (tab: 'arena' | 'matches' | 'history' | 'settings') => void;
  onOpenPublic: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenPublic
}) => {
  const navItems = [
    { id: 'arena' as const, label: 'Arena Kontrol', icon: PlayCircle },
    { id: 'matches' as const, label: 'Pertandingan', icon: Calendar },
    { id: 'history' as const, label: 'Riwayat Pertandingan', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#0a1224] border-r border-[#1a2b4c] flex flex-col justify-between shrink-0 h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#16233f]">
          <GrasshopperLogo size={38} subtitle="COMPETITION" />
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1658e3] text-white shadow-lg shadow-blue-600/30 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-[#132242]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Layar Publik (Opens in public mode or new tab) */}
          <button
            onClick={onOpenPublic}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#132242] transition-colors"
          >
            <Tv className="w-5 h-5 text-cyan-400" />
            <div className="flex items-center justify-between flex-1">
              <span>Layar Publik</span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700/40 font-mono">
                LIVE
              </span>
            </div>
          </button>

          {/* Pengaturan Sistem */}
          <button
            onClick={() => onSelectTab('settings')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
              currentTab === 'settings'
                ? 'bg-[#1658e3] text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#132242]'
            }`}
          >
            <Settings className={`w-5 h-5 ${currentTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
            <span>Pengaturan Sistem</span>
          </button>
        </nav>
      </div>

      {/* Footer Sub-branding */}
      <div className="p-4 border-t border-[#16233f] bg-[#080e1c]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#122244] border border-[#1e3868] flex items-center justify-center text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-slate-200">Maskumambang Fest 4</div>
            <div className="text-[10px] text-slate-400">Robotik Grasshopper Competition</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

