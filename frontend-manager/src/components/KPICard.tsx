/**
 * KPICard — Dashboard metric card with icon, value, and optional trend
 * AGENT-FRONTEND-MANAGER
 */

import React from 'react';
import clsx from 'clsx';

// ── Types ──────────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'secondary' | 'warning' | 'error' | 'muted';
  trend?: number;       // percentage change vs yesterday (positive = up)
  isLoading?: boolean;
}

// ── Color map ──────────────────────────────────────────────────────────────────

const colorStyles: Record<KPICardProps['color'], { text: string; bg: string; border: string }> = {
  primary:   { text: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  secondary: { text: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  warning:   { text: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  error:     { text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  muted:     { text: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

// ── Component ──────────────────────────────────────────────────────────────────

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon,
  color,
  trend,
  isLoading = false,
}) => {
  const styles = colorStyles[color];

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
        role="status"
        aria-label={`Chargement — ${label}`}
      >
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={clsx(
        'bg-white rounded-lg border p-4 flex flex-col gap-2',
        styles.border,
      )}
      role="region"
      aria-label={label}
    >
      {/* Header: icon + label */}
      <div className="flex items-center gap-2">
        <span
          className={clsx('text-xl leading-none', styles.bg, 'rounded p-1')}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-sm font-medium text-gray-500 truncate">{label}</span>
      </div>

      {/* Value */}
      <div className={clsx('text-3xl font-bold leading-none', styles.text)}>
        {value}
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div
          className={clsx(
            'text-xs font-medium flex items-center gap-1',
            trendPositive && 'text-green-600',
            trendNegative && 'text-red-600',
            !trendPositive && !trendNegative && 'text-gray-400',
          )}
          aria-label={`Tendance: ${trend > 0 ? '+' : ''}${trend}% par rapport à hier`}
        >
          <span aria-hidden="true">
            {trendPositive ? '▲' : trendNegative ? '▼' : '—'}
          </span>
          <span>
            {trend > 0 ? '+' : ''}{trend}% vs hier
          </span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
