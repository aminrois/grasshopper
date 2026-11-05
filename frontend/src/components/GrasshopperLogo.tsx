import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export const GrasshopperLogo: React.FC<LogoProps> = ({
  className = '',
  size = 40,
  showText = true,
  subtitle = 'COMPETITION'
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* High-tech Robotic Grasshopper SVG Icon */}
      <div 
        className="relative flex items-center justify-center shrink-0 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Cyber Grasshopper Body and Limbs */}
          {/* Head & Antennae */}
          <line x1="72" y1="36" x2="88" y2="20" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="20" r="3" fill="#34d399" />
          <line x1="75" y1="40" x2="94" y2="28" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="94" cy="28" r="2.5" fill="#10b981" />
          <polygon points="62,38 78,38 84,48 70,54 58,46" fill="#10b981" />
          <circle cx="76" cy="44" r="3" fill="#047857" />

          {/* Thorax */}
          <polygon points="46,42 62,38 68,52 50,58" fill="#059669" />

          {/* Abdomen (Tapered segmented rear) */}
          <polygon points="18,64 46,42 50,58 24,72" fill="#047857" />
          <line x1="28" y1="56" x2="33" y2="67" stroke="#10b981" strokeWidth="2" />
          <line x1="38" y1="48" x2="43" y2="61" stroke="#10b981" strokeWidth="2" />

          {/* Front Robot Legs */}
          <polyline points="66,52 74,66 84,76" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="56,54 62,68 70,78" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {/* Middle Leg */}
          <polyline points="48,56 46,70 52,80" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Big Powerful Rear Jumping Leg (Cyber Grasshopper signature) */}
          <polyline points="44,48 30,24 16,80" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points="44,48 30,24 35,26" fill="#34d399" />
          <circle cx="30" cy="24" r="4" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
        </svg>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="font-extrabold text-sm md:text-base tracking-wider text-white uppercase font-display flex items-center gap-1.5">
            <span>ROBOTIK</span>
            <span className="text-emerald-400">GRASSHOPPER</span>
          </div>
          <div className="text-[10px] tracking-[0.22em] text-slate-400 font-semibold uppercase">
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
};

