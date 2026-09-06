import React, { useState, useCallback } from 'react';
import { Copy, Check, Shield } from 'lucide-react';
import { parsePlateParts } from '../utils/formatters';

export interface PlateNumberProps {
  plate: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  showCopyIcon?: boolean;
  showHsrpStrip?: boolean;
  showHologram?: boolean;
  variant?: 'hsrp' | 'hsrp-yellow' | 'tactical';
  className?: string;
  onClick?: (plate: string) => void;
}

const SIZE_VARIANTS = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1.5 rounded',
    strip: 'text-[8px] px-1 py-0.5',
    text: 'text-xs tracking-wider',
    icon: 'w-3 h-3',
    hologram: 'w-2 h-2',
  },
  md: {
    container: 'px-2.5 py-1 text-sm gap-2 rounded-md',
    strip: 'text-[9px] px-1.5 py-0.5',
    text: 'text-sm tracking-widest',
    icon: 'w-3.5 h-3.5',
    hologram: 'w-2.5 h-2.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2.5 rounded-md',
    strip: 'text-[10px] px-2 py-0.5',
    text: 'text-base tracking-widest',
    icon: 'w-4 h-4',
    hologram: 'w-3 h-3',
  },
  xl: {
    container: 'px-4 py-2 text-xl gap-3 rounded-lg',
    strip: 'text-xs px-2.5 py-1',
    text: 'text-xl tracking-widest',
    icon: 'w-5 h-5',
    hologram: 'w-3.5 h-3.5',
  },
};

export const PlateNumber: React.FC<PlateNumberProps> = ({
  plate,
  size = 'md',
  interactive = true,
  showCopyIcon = true,
  showHsrpStrip = true,
  showHologram = true,
  variant = 'hsrp',
  className = '',
  onClick,
}) => {
  const [copied, setCopied] = useState(false);
  const sizeStyle = SIZE_VARIANTS[size] || SIZE_VARIANTS.md;
  const parts = parsePlateParts(plate);
  const normalizedPlate = (plate || '').toUpperCase().trim();

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!normalizedPlate) return;

      try {
        await navigator.clipboard.writeText(normalizedPlate);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.warn('Clipboard write failed, falling back', err);
      }

      if (onClick) {
        onClick(normalizedPlate);
      }
    },
    [normalizedPlate, onClick]
  );

  // Background and border styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'hsrp-yellow':
        return 'bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 text-slate-950 border-2 border-amber-600/80 shadow-md shadow-black/50';
      case 'tactical':
        return 'bg-slate-950/90 text-slate-100 border border-slate-700 shadow-md shadow-black/60';
      case 'hsrp':
      default:
        return 'bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-950 border-2 border-slate-400/90 shadow-md shadow-black/40';
    }
  };

  const isDark = variant === 'tactical';

  return (
    <div
      onClick={interactive ? handleCopy : undefined}
      title={interactive ? `Click to copy "${normalizedPlate}"` : normalizedPlate}
      className={`group relative inline-flex items-center font-plate select-none transition-all duration-150 ${getVariantStyles()} ${
        interactive
          ? 'cursor-pointer hover:border-cyan-400 hover:shadow-cyan-900/40 hover:shadow-lg active:scale-95'
          : 'cursor-default'
      } ${sizeStyle.container} ${className}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCopy(e as unknown as React.MouseEvent);
        }
      }}
      aria-label={`License Plate: ${normalizedPlate}`}
    >
      {/* High Security Registration Plate (HSRP) Blue Country Strip */}
      {showHsrpStrip && (
        <div
          className={`flex flex-col items-center justify-center bg-[#0038a8] text-white font-sans font-black leading-none shrink-0 rounded-xs border-r border-blue-950 ${sizeStyle.strip}`}
          title="India HSRP Standard Plate with Ashoka Chakra"
        >
          <span className="text-[7px] leading-none mb-0.5 text-blue-200">☸</span>
          <span className="tracking-tighter text-[9px] font-extrabold scale-90">IND</span>
        </div>
      )}

      {/* Hologram security badge indicator */}
      {showHologram && (
        <div
          className={`shrink-0 flex items-center justify-center rounded-xs hologram-shimmer border border-slate-400/50 shadow-xs ${sizeStyle.hologram}`}
          title="Chromium Hologram Security Verification Seal"
        >
          <Shield className="w-2 h-2 text-slate-900/80" />
        </div>
      )}

      {/* Structured Plate Number with Visual Syntax Highlighting */}
      <div className={`flex items-baseline font-black ${sizeStyle.text}`}>
        {/* State Code */}
        <span
          className={`mr-1 font-black ${
            isDark ? 'text-cyan-400' : 'text-blue-900'
          }`}
        >
          {parts.state || 'GJ'}
        </span>

        {/* District/RTO Code */}
        {parts.rto && (
          <span className={`mr-1 font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            {parts.rto}
          </span>
        )}

        {/* Series Letters */}
        {parts.series && (
          <span className={`mr-1.5 font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {parts.series}
          </span>
        )}

        {/* Vehicle Registration Digits */}
        <span
          className={`font-black tracking-widest ${
            isDark ? 'text-white' : 'text-slate-950 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]'
          }`}
        >
          {parts.number || parts.raw}
        </span>
      </div>

      {/* Copy Status Feedback / Icon */}
      {interactive && showCopyIcon && (
        <div
          className={`ml-auto pl-1.5 transition-colors ${
            isDark ? 'text-slate-400 group-hover:text-cyan-300' : 'text-slate-600 group-hover:text-blue-700'
          }`}
        >
          {copied ? (
            <span className="inline-flex items-center text-emerald-600 gap-1 text-[10px] font-sans font-bold bg-emerald-100/90 px-1 py-0.5 rounded border border-emerald-400">
              <Check className={sizeStyle.icon} />
              {size !== 'sm' && <span>COPIED</span>}
            </span>
          ) : (
            <Copy className={`${sizeStyle.icon} opacity-60 group-hover:opacity-100`} />
          )}
        </div>
      )}
    </div>
  );
};

export default PlateNumber;
