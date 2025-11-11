'use client';

import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  calculateSLATimer,
  formatRemainingTime,
  getSLAColorClass,
  getSLAProgressColor,
  type SLAEntityType,
} from '@/lib/hooks/useSLA';

interface SLATimerProps {
  startTime: string | Date;
  targetHours: number;
  warningThreshold?: number;
  entityType?: SLAEntityType;
  showProgressBar?: boolean;
  compact?: boolean;
}

export default function SLATimer({
  startTime,
  targetHours,
  warningThreshold = 75,
  entityType = 'CASE',
  showProgressBar = false,
  compact = false,
}: SLATimerProps) {
  const slaData = calculateSLATimer(startTime, targetHours, warningThreshold);
  const colors = getSLAColorClass(slaData.status);
  const formattedTime = formatRemainingTime(slaData.hours_remaining, slaData.minutes_remaining);

  if (compact) {
    // Compact badge version for case/task cards
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 ${colors.bg} ${colors.text} text-xs font-medium rounded-md border ${colors.border}`}
        title={`SLA: ${slaData.percentage_elapsed.toFixed(0)}% elapsed`}
      >
        {slaData.is_breached && <AlertTriangle className="w-3 h-3" />}
        {slaData.is_at_risk && !slaData.is_breached && <Clock className="w-3 h-3" />}
        {!slaData.is_breached && !slaData.is_at_risk && <CheckCircle2 className="w-3 h-3" />}
        <span>{formattedTime}</span>
      </span>
    );
  }

  // Full version with optional progress bar
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${colors.bg} ${colors.text} text-sm font-medium rounded-lg border ${colors.border}`}>
            {slaData.is_breached && <AlertTriangle className="w-4 h-4" />}
            {slaData.is_at_risk && !slaData.is_breached && <Clock className="w-4 h-4" />}
            {!slaData.is_breached && !slaData.is_at_risk && <CheckCircle2 className="w-4 h-4" />}
            <span className="font-semibold">{formattedTime}</span>
          </span>
        </div>
        <span className="text-xs text-neutral-600">
          {slaData.percentage_elapsed.toFixed(0)}% of SLA elapsed
        </span>
      </div>

      {showProgressBar && (
        <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getSLAProgressColor(
              slaData.percentage_elapsed,
              warningThreshold
            )}`}
            style={{ width: `${Math.min(slaData.percentage_elapsed, 100)}%` }}
          />
        </div>
      )}

      {slaData.is_breached && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-900">SLA Breached</p>
            <p className="text-xs text-red-700 mt-0.5">
              This {entityType.toLowerCase()} has exceeded its {targetHours}h SLA target.
            </p>
          </div>
        </div>
      )}

      {slaData.is_at_risk && !slaData.is_breached && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-900">At Risk</p>
            <p className="text-xs text-amber-700 mt-0.5">
              SLA threshold reached. Action required to avoid breach.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
