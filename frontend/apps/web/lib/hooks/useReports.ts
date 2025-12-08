'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export type ReportType = 'MONTHLY_OPERATIONS' | 'QUARTERLY_PROSECUTION' | 'VICTIM_SUPPORT' | 'EXECUTIVE';
export type ExportFormat = 'CSV' | 'EXCEL' | 'PDF';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface Report {
  id: string;
  report_type: ReportType;
  title: string;
  date_range_start: string;
  date_range_end: string;
  generated_at: string;
  generated_by: string;
  export_format: ExportFormat;
  file_size?: number;
  download_url?: string;
}

export interface ScheduledReport {
  id: string;
  report_type: ReportType;
  frequency: ScheduleFrequency;
  recipients: string[]; // email addresses
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  created_by: string;
}

export const REPORT_TYPES = [
  { 
    value: 'MONTHLY_OPERATIONS', 
    label: 'Monthly Operations Report',
    description: 'Case intake, investigation metrics, backlog analysis, and team performance'
  },
  { 
    value: 'QUARTERLY_PROSECUTION', 
    label: 'Quarterly Prosecution Report',
    description: 'Charges filed, court outcomes, conviction rates, and sentencing data'
  },
  { 
    value: 'VICTIM_SUPPORT', 
    label: 'Victim Support Report',
    description: 'Referrals made, services provided, and victim support outcomes'
  },
  { 
    value: 'EXECUTIVE', 
    label: 'Executive Dashboard Report',
    description: 'High-level KPIs, strategic insights, and trend analysis with visualizations'
  },
] as const;

export const EXPORT_FORMATS = [
  { value: 'CSV', label: 'CSV', icon: '📊' },
  { value: 'EXCEL', label: 'Excel (XLSX)', icon: '📈' },
  { value: 'PDF', label: 'PDF', icon: '📄' },
] as const;

export const SCHEDULE_FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
] as const;

// API functions
const fetchReports = async (): Promise<Report[]> => {
  try {
    return await apiClient.get<Report[]>('/reports/');
  } catch (error) {
    console.warn('Reports API not available:', error);
    return [];
  }
};

const fetchScheduledReports = async (): Promise<ScheduledReport[]> => {
  try {
    return await apiClient.get<ScheduledReport[]>('/reports/scheduled/');
  } catch (error) {
    console.warn('Scheduled reports API not available:', error);
    return [];
  }
};

const generateReport = async (data: {
  report_type: ReportType;
  date_range_start: string;
  date_range_end: string;
  export_format: ExportFormat;
}): Promise<Report> => {
  return await apiClient.post<Report>('/reports/generate/', data);
};

const createScheduledReport = async (data: Partial<ScheduledReport>): Promise<ScheduledReport> => {
  return await apiClient.post<ScheduledReport>('/reports/scheduled/', data);
};

const updateScheduledReport = async (id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> => {
  return await apiClient.patch<ScheduledReport>(`/reports/scheduled/${id}/`, data);
};

const deleteScheduledReport = async (id: string): Promise<void> => {
  await apiClient.delete(`/reports/scheduled/${id}/`);
};

const deleteReport = async (id: string): Promise<void> => {
  await apiClient.delete(`/reports/${id}/`);
};

// Custom hooks
export const useReports = () => {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });

  const generateMutation = useMutation({
    mutationFn: generateReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  return {
    reports,
    isLoading,
    error,
    generateReport: generateMutation.mutateAsync,
    deleteReport: deleteMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useScheduledReports = () => {
  const queryClient = useQueryClient();

  const { data: scheduledReports = [], isLoading, error } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: fetchScheduledReports,
  });

  const createMutation = useMutation({
    mutationFn: createScheduledReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduledReport> }) => updateScheduledReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
    },
  });

  return {
    scheduledReports,
    isLoading,
    error,
    createSchedule: createMutation.mutateAsync,
    updateSchedule: updateMutation.mutateAsync,
    deleteSchedule: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
