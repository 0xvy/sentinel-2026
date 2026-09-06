import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import type { ThreatLevel } from '../types';

export interface ThreatBadgeProps {
  level: ThreatLevel | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL' | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}

const LEVEL_STYLES: Record<
  string,
  {
    container: string;
    pulseDot: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultLabel: string;
  }
> = {
  CRITICAL: {
    container: 'bg-red-950/70 text-red-300 border-red-500/80 shadow-sm shadow-red-950/80',
    pulseDot: 'bg-red-400',
    icon: ShieldAlert,
    defaultLabel: 'CRITICAL',
  },
  HIGH: {
    container: 'bg-amber-950/70 text-amber-300 border-amber-500/80 shadow-sm shadow-amber-950/80',
    pulseDot: 'bg-amber-400',
    icon: AlertTriangle,
    defaultLabel: 'HIGH',
  },
  MEDIUM: {
    container: 'bg-yellow-950/70 text-yellow-300 border-yellow-500/80 shadow-sm shadow-yellow-950/80',
    pulseDot: 'bg-yellow-400',
    icon: AlertCircle,
    defaultLabel: 'MEDIUM',
  },
  LOW: {
    container: 'bg-blue-950/70 text-blue-300 border-blue-500/80 shadow-sm shadow-blue-950/80',
    pulseDot: 'bg-blue-400',
    icon: Info,
    defaultLabel: 'LOW',
  },
  NORMAL: {
    container: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/80 shadow-sm shadow-emerald-950/80',
    pulseDot: 'bg-emerald-400',
    icon: ShieldCheck,
    defaultLabel: 'NORMAL',
  },
};

const SIZE_STYLES = {
  sm: {
    container: 'text-[10px] px-1.5 py-0.5 gap-1 tracking-wider',
    icon: 'w-3 h-3',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'text-xs px-2.5 py-1 gap-1.5 tracking-wider',
    icon: 'w-3.5 h-3.5',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'text-sm px-3.5 py-1.5 gap-2 tracking-widest',
    icon: 'w-4 h-4',
    dot: 'w-2.5 h-2.5',
  },
};

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({
  level,
  size = 'md',
  showPulse = true,
  showIcon = true,
  className = '',
  customLabel,
}) => {
  const normalizedLevel = (level || 'NORMAL').toUpperCase();
  const config = LEVEL_STYLES[normalizedLevel] || LEVEL_STYLES.NORMAL;
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.md;
  const IconComponent = config.icon;
  const shouldPulse = showPulse && (normalizedLevel === 'CRITICAL' || normalizedLevel === 'HIGH');

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase rounded-md border backdrop-blur-xs transition-colors duration-150 ${config.container} ${sizeConfig.container} ${className}`}
      role="status"
      aria-label={`Threat Level: ${normalizedLevel}`}
    >
      {shouldPulse && (
        <span className="relative flex items-center justify-center">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pulseDot}`}
          />
          <span className={`relative inline-flex rounded-full ${sizeConfig.dot} ${config.pulseDot}`} />
        </span>
      )}

      {showIcon && <IconComponent className={`shrink-0 ${sizeConfig.icon}`} />}

      <span>{customLabel || config.defaultLabel}</span>
    </span>
  );
};

export default ThreatBadge;
