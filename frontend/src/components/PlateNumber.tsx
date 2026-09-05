import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { parsePlateParts } from '../utils/formatters';

export interface PlateNumberProps {
  plate: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  showCopyIcon?: boolean;
  showHsrpStrip?: boolean;
  className?: string;
  onClick?: (plate: string) => void;
}

const SIZE_VARIANTS = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1.5 rounded',
    strip: 'text-[9px] px-1 py-0.5',
    text: 'text-xs tracking-wider',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2.5 py-1 text-sm gap-2 rounded-md',
    strip: 'text-[10px] px-1.5 py-0.5',
    text: 'text-sm tracking-wider',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2.5 rounded-md',
    strip: 'text-xs px-2 py-0.5',
    text: 'text-base tracking-widest',
    icon: 'w-4 h-4',
  },
  xl: {
    container: 'px-4 py-2 text-xl gap-3 rounded-lg',
    strip: 'text-xs px-2.5 py-1',
    text: 'text-xl tracking-widest',
    icon: 'w-5 h-5',
  },
};

export const PlateNumber: React.FC<PlateNumberProps> = ({
  plate,
  size = 'md',
  interactive = true,
  showCopyIcon = true,
  showHsrpStrip = true,
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

  return (
    <div
      onClick={interactive ? handleCopy : undefined}
      title={interactive ? `Click to copy "${normalizedPlate}"` : normalizedPlate}
      className={`group relative inline-flex items-center font-mono border border-slate-700 bg-slate-950/90 text-slate-100 shadow-sm shadow-black/60 select-none transition-all duration-150 ${
        interactive
          ? 'cursor-pointer hover:border-cyan-500/70 hover:shadow-cyan-950/30 hover:shadow-md active:scale-95'
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
          className={`flex flex-col items-center justify-center bg-blue-700 text-white font-bold leading-none shrink-0 rounded-xs border-r border-blue-900 ${sizeStyle.strip}`}
          title="India HSRP Standard Plate"
        >
          <span className="text-[7px] tracking-tighter opacity-80 leading-none">●</span>
          <span className="tracking-tighter font-black text-[9px] scale-90">IND</span>
        </div>
      )}

      {/* Structured Plate Number with Visual Syntax Highlighting */}
      <div className={`flex items-baseline font-bold ${sizeStyle.text}`}>
        {/* State Code in Vibrant Cyan */}
        <span className="text-cyan-400 font-black mr-1">{parts.state || 'GJ'}</span>

        {/* District/RTO Code */}
        {parts.rto && <span className="text-slate-300 mr-1">{parts.rto}</span>}

        {/* Series Letters */}
        {parts.series && <span className="text-slate-200 mr-1.5">{parts.series}</span>}

        {/* Vehicle Registration Digits in Crisp High-Contrast Pure White */}
        <span className="text-white font-extrabold tracking-widest">{parts.number || parts.raw}</span>
      </div>

      {/* Copy Status Feedback / Icon */}
      {interactive && showCopyIcon && (
        <div className="ml-auto pl-1 text-slate-400 transition-colors group-hover:text-cyan-300">
          {copied ? (
            <span className="inline-flex items-center text-emerald-400 gap-1 text-[10px] font-sans font-semibold">
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
