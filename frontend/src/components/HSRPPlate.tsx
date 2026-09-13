import React, { useState, useCallback } from 'react';
import { Copy, Check, Shield } from 'lucide-react';
import { parsePlateParts } from '../utils/formatters';

export interface HSRPPlateProps {
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

const SIZE_STYLES = {
  sm: {
    container: 'h-7 px-1.5 py-0.5 text-xs gap-1.5 rounded',
    strip: 'w-5 text-[7px]',
    chakra: 'w-2.5 h-2.5',
    indText: 'text-[7px]',
    text: 'text-xs tracking-wider',
    icon: 'w-3 h-3',
    hologram: 'w-2.5 h-2.5',
  },
  md: {
    container: 'h-9 px-2 py-0.5 text-sm gap-2 rounded-md',
    strip: 'w-6 text-[8px]',
    chakra: 'w-3.5 h-3.5',
    indText: 'text-[8px]',
    text: 'text-sm tracking-widest',
    icon: 'w-3.5 h-3.5',
    hologram: 'w-3 h-3',
  },
  lg: {
    container: 'h-11 px-2.5 py-1 text-base gap-2.5 rounded-md',
    strip: 'w-7 text-[9px]',
    chakra: 'w-4 h-4',
    indText: 'text-[9px]',
    text: 'text-base tracking-widest',
    icon: 'w-4 h-4',
    hologram: 'w-3.5 h-3.5',
  },
  xl: {
    container: 'h-14 px-3 py-1 text-xl gap-3 rounded-lg',
    strip: 'w-9 text-[10px]',
    chakra: 'w-5 h-5',
    indText: 'text-[11px]',
    text: 'text-xl tracking-widest',
    icon: 'w-5 h-5',
    hologram: 'w-4 h-4',
  },
};

/**
 * 24-Spoke Navy Blue Ashoka Chakra SVG
 */
const AshokaChakra: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="#ffffff" />
    <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
    {Array.from({ length: 24 }).map((_, i) => (
      <line
        key={i}
        x1="12"
        y1="12"
        x2={12 + 10 * Math.cos((i * Math.PI) / 12)}
        y2={12 + 10 * Math.sin((i * Math.PI) / 12)}
        stroke="#ffffff"
        strokeWidth="0.6"
      />
    ))}
  </svg>
);

export const HSRPPlate: React.FC<HSRPPlateProps> = ({
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
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
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
        console.warn('Clipboard copy failed:', err);
      }

      if (onClick) {
        onClick(normalizedPlate);
      }
    },
    [normalizedPlate, onClick]
  );

  const getSurfaceClass = () => {
    switch (variant) {
      case 'hsrp-yellow':
        return 'hsrp-plate-surface-yellow';
      case 'tactical':
        return 'bg-[#070b14] border border-cyan-500/50 text-slate-100 shadow-md shadow-cyan-950/40';
      case 'hsrp':
      default:
        return 'hsrp-plate-surface';
    }
  };

  const isDark = variant === 'tactical';

  return (
    <div
      onClick={interactive ? handleCopy : undefined}
      title={interactive ? `Click to inspect or copy "${normalizedPlate}"` : normalizedPlate}
      className={`group relative inline-flex items-center font-plate select-none transition-all duration-150 ${getSurfaceClass()} ${
        interactive
          ? 'cursor-pointer hover:border-cyan-400 hover:shadow-cyan-900/50 hover:shadow-lg active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none'
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
      aria-label={`Indian HSRP License Plate: ${normalizedPlate}`}
    >
      {/* 1. 20mm Blue International Identifier Strip */}
      {showHsrpStrip && (
        <div
          className={`hsrp-ind-strip shrink-0 -my-1 -ml-2 self-stretch rounded-l-[4px] px-1 py-0.5 flex flex-col items-center justify-center ${sizeStyle.strip}`}
          title="India HSRP Standard Identifier Strip with Ashoka Chakra"
        >
          <AshokaChakra className={`${sizeStyle.chakra} shrink-0 block`} />
          <span className={`font-sans font-black tracking-tight scale-90 ${sizeStyle.indText}`}>
            IND
          </span>
        </div>
      )}

      {/* 2. Hot-Stamped Chromium Hologram Seal */}
      {showHologram && (
        <div
          className={`hsrp-chromium-hologram shrink-0 flex items-center justify-center border border-slate-400/60 rounded-[2px] ${sizeStyle.hologram}`}
          title="Chromium Hologram Security Seal (MoRTH Rule 50)"
        >
          <Shield className="w-2 h-2 text-slate-900/70" />
        </div>
      )}

      {/* 3. Stamped Embossed Character Text */}
      <div className={`flex items-baseline font-black whitespace-nowrap ${sizeStyle.text}`}>
        {/* State Code: GJ */}
        <span
          className={`mr-1 font-black ${
            isDark ? 'text-cyan-400' : 'text-blue-900'
          }`}
        >
          {parts.state || 'GJ'}
        </span>

        {/* District RTO Code: 01 */}
        {parts.rto && (
          <span
            className={`mr-1 font-extrabold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            {parts.rto}
          </span>
        )}

        {/* Series Letters: ER */}
        {parts.series && (
          <span
            className={`mr-1 font-extrabold ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
          >
            {parts.series}
          </span>
        )}

        {/* 4 Unique Digits: 8842 */}
        <span
          className={`${
            isDark
              ? 'text-white'
              : 'hsrp-embossed-text'
          }`}
        >
          {parts.number || parts.raw}
        </span>
      </div>

      {/* 4. Copy Status Feedback / Icon */}
      {interactive && showCopyIcon && (
        <div
          className={`ml-auto pl-1 transition-colors ${
            isDark
              ? 'text-slate-400 group-hover:text-cyan-300'
              : 'text-slate-600 group-hover:text-blue-800'
          }`}
        >
          {copied ? (
            <span className="inline-flex items-center text-emerald-700 gap-0.5 text-[9px] font-sans font-bold bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-400">
              <Check className={sizeStyle.icon} />
              {size !== 'sm' && <span>COPIED</span>}
            </span>
          ) : (
            <Copy className={`${sizeStyle.icon} opacity-50 group-hover:opacity-100`} />
          )}
        </div>
      )}
    </div>
  );
};

export default HSRPPlate;
