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
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultLabel: string;
  }
> = {
  CRITICAL: {
    textColor: 'text-red-400',
    icon: ShieldAlert,
    defaultLabel: 'CRITICAL',
  },
  HIGH: {
    textColor: 'text-amber-400',
    icon: AlertTriangle,
    defaultLabel: 'HIGH',
  },
  MEDIUM: {
    textColor: 'text-yellow-400',
    icon: AlertCircle,
    defaultLabel: 'MEDIUM',
  },
  LOW: {
    textColor: 'text-blue-400',
    icon: Info,
    defaultLabel: 'LOW',
  },
  NORMAL: {
    textColor: 'text-emerald-400',
    icon: ShieldCheck,
    defaultLabel: 'NORMAL',
  },
};

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({
  level,
  showIcon = true,
  className = '',
  customLabel,
}) => {
  const normalizedLevel = (level || 'NORMAL').toUpperCase();
  const config = LEVEL_STYLES[normalizedLevel] || LEVEL_STYLES.NORMAL;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase ${config.textColor} ${className}`}
      role="status"
      aria-label={`Threat Level: ${normalizedLevel}`}
    >
      {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      <span>{customLabel || config.defaultLabel}</span>
    </span>
  );
};

export default ThreatBadge;
