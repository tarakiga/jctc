'use client';

import { differenceInHours, differenceInMinutes, parseISO } from 'date-fns';

export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
export type SLAEntityType = 'CASE' | 'TASK';

export interface SLAPolicy {
  id: string;
  entity_type: SLAEntityType;
  name: string;
  description: string;
  target_hours: number; // SLA target in hours
  warning_threshold: number; // Percentage (e.g., 75 means warning at 75% of time elapsed)
}

export interface SLATimerData {
  entity_id: string;
  entity_type: SLAEntityType;
  start_time: string;
  target_hours: number;
  status: SLAStatus;
  hours_remaining: number;
  minutes_remaining: number;
  percentage_elapsed: number;
  is_breached: boolean;
  is_at_risk: boolean;
}

// Default SLA policies
export const SLA_POLICIES: SLAPolicy[] = [
  {
    id: '1',
    entity_type: 'CASE',
    name: 'Initial Response',
    description: 'Time to first assignment and acknowledgment',
    target_hours: 24,
    warning_threshold: 75,
  },
  {
    id: '2',
    entity_type: 'CASE',
    name: 'Investigation Completion',
    description: 'Time to complete initial investigation',
    target_hours: 720, // 30 days
    warning_threshold: 80,
  },
  {
    id: '3',
    entity_type: 'TASK',
    name: 'Task Completion',
    description: 'Time to complete assigned task',
    target_hours: 48,
    warning_threshold: 70,
  },
  {
    id: '4',
    entity_type: 'TASK',
    name: 'High Priority Task',
    description: 'Time to complete high-priority task',
    target_hours: 24,
    warning_threshold: 60,
  },
];

/**
 * Calculate SLA timer data for an entity
 */
export const calculateSLATimer = (
  startTime: string | Date,
  targetHours: number,
  warningThreshold: number = 75
): SLATimerData => {
  const now = new Date();
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  
  const hoursElapsed = differenceInHours(now, start);
  const minutesElapsed = differenceInMinutes(now, start);
  const hoursRemaining = targetHours - hoursElapsed;
  const minutesRemaining = (targetHours * 60) - minutesElapsed;
  
  const percentageElapsed = (hoursElapsed / targetHours) * 100;
  
  const isBreached = hoursElapsed >= targetHours;
  const isAtRisk = percentageElapsed >= warningThreshold && !isBreached;
  
  let status: SLAStatus = 'ON_TRACK';
  if (isBreached) {
    status = 'BREACHED';
  } else if (isAtRisk) {
    status = 'AT_RISK';
  }
  
  return {
    entity_id: '',
    entity_type: 'CASE',
    start_time: start.toISOString(),
    target_hours: targetHours,
    status,
    hours_remaining: hoursRemaining,
    minutes_remaining: minutesRemaining,
    percentage_elapsed: Math.min(percentageElapsed, 100),
    is_breached: isBreached,
    is_at_risk: isAtRisk,
  };
};

/**
 * Format remaining time as human-readable string
 */
export const formatRemainingTime = (hoursRemaining: number, minutesRemaining: number): string => {
  if (minutesRemaining <= 0) {
    const hoursOverdue = Math.abs(hoursRemaining);
    if (hoursOverdue < 24) {
      return `${hoursOverdue}h overdue`;
    }
    const daysOverdue = Math.floor(hoursOverdue / 24);
    return `${daysOverdue}d overdue`;
  }
  
  if (hoursRemaining < 1) {
    return `${minutesRemaining}m left`;
  }
  
  if (hoursRemaining < 24) {
    return `${hoursRemaining}h left`;
  }
  
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const remainingHours = hoursRemaining % 24;
  
  if (remainingHours === 0) {
    return `${daysRemaining}d left`;
  }
  
  return `${daysRemaining}d ${remainingHours}h left`;
};

/**
 * Get color class based on SLA status
 */
export const getSLAColorClass = (status: SLAStatus): {
  bg: string;
  text: string;
  border: string;
} => {
  const colors = {
    ON_TRACK: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
    },
    AT_RISK: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-300',
    },
    BREACHED: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
    },
  };
  
  return colors[status];
};

/**
 * Get progress bar color based on percentage elapsed
 */
export const getSLAProgressColor = (percentageElapsed: number, warningThreshold: number = 75): string => {
  if (percentageElapsed >= 100) {
    return 'bg-red-500';
  }
  if (percentageElapsed >= warningThreshold) {
    return 'bg-amber-500';
  }
  return 'bg-green-500';
};

/**
 * Hook to get SLA policy for an entity
 */
export const useSLAPolicy = (entityType: SLAEntityType, isPriority?: boolean) => {
  if (entityType === 'CASE') {
    return SLA_POLICIES[1]; // Investigation Completion (30 days)
  }
  
  if (entityType === 'TASK') {
    return isPriority ? SLA_POLICIES[3] : SLA_POLICIES[2]; // High Priority (24h) or Standard (48h)
  }
  
  return SLA_POLICIES[0];
};
