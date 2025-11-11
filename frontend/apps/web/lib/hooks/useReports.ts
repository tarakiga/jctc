'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// Mock data - Generated reports
const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    report_type: 'MONTHLY_OPERATIONS',
    title: 'Operations Report - December 2024',
    date_range_start: '2024-12-01',
    date_range_end: '2024-12-31',
    generated_at: '2025-01-05T10:00:00Z',
    generated_by: 'John Okafor',
    export_format: 'PDF',
    file_size: 2457600, // 2.4MB
    download_url: '/reports/operations-2024-12.pdf',
  },
  {
    id: '2',
    report_type: 'QUARTERLY_PROSECUTION',
    title: 'Prosecution Report - Q4 2024',
    date_range_start: '2024-10-01',
    date_range_end: '2024-12-31',
    generated_at: '2025-01-08T14:30:00Z',
    generated_by: 'Chidi Nwosu',
    export_format: 'EXCEL',
    file_size: 1048576, // 1MB
    download_url: '/reports/prosecution-q4-2024.xlsx',
  },
  {
    id: '3',
    report_type: 'EXECUTIVE',
    title: 'Executive Dashboard - January 2025',
    date_range_start: '2025-01-01',
    date_range_end: '2025-01-31',
    generated_at: '2025-01-11T09:00:00Z',
    generated_by: 'Fatima Bello',
    export_format: 'PDF',
    file_size: 3145728, // 3MB
    download_url: '/reports/executive-2025-01.pdf',
  },
];

// Mock data - Scheduled reports
const MOCK_SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: '1',
    report_type: 'MONTHLY_OPERATIONS',
    frequency: 'MONTHLY',
    recipients: ['director@jctc.gov.ng', 'ops.team@jctc.gov.ng'],
    enabled: true,
    last_run: '2025-01-01T00:00:00Z',
    next_run: '2025-02-01T00:00:00Z',
    created_at: '2024-06-15T10:00:00Z',
    created_by: 'Admin',
  },
  {
    id: '2',
    report_type: 'QUARTERLY_PROSECUTION',
    frequency: 'QUARTERLY',
    recipients: ['prosecutor@jctc.gov.ng', 'legal.team@jctc.gov.ng'],
    enabled: true,
    last_run: '2025-01-01T00:00:00Z',
    next_run: '2025-04-01T00:00:00Z',
    created_at: '2024-06-15T10:00:00Z',
    created_by: 'Admin',
  },
  {
    id: '3',
    report_type: 'EXECUTIVE',
    frequency: 'WEEKLY',
    recipients: ['director@jctc.gov.ng'],
    enabled: false,
    last_run: '2025-01-06T00:00:00Z',
    next_run: '2025-01-13T00:00:00Z',
    created_at: '2024-09-01T10:00:00Z',
    created_by: 'Admin',
  },
];

// Simulated API functions
const fetchReports = async (): Promise<Report[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_REPORTS;
};

const fetchScheduledReports = async (): Promise<ScheduledReport[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_SCHEDULED_REPORTS;
};

const generateReport = async (data: {
  report_type: ReportType;
  date_range_start: string;
  date_range_end: string;
  export_format: ExportFormat;
}): Promise<Report> => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate generation time
  
  const reportTypeInfo = REPORT_TYPES.find((r) => r.value === data.report_type);
  const newReport: Report = {
    id: String(Date.now()),
    report_type: data.report_type,
    title: `${reportTypeInfo?.label} - ${new Date(data.date_range_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    date_range_start: data.date_range_start,
    date_range_end: data.date_range_end,
    generated_at: new Date().toISOString(),
    generated_by: 'Current User',
    export_format: data.export_format,
    file_size: Math.floor(Math.random() * 3000000) + 500000, // Random size between 500KB and 3.5MB
    download_url: `/reports/generated-${Date.now()}.${data.export_format.toLowerCase()}`,
  };
  return newReport;
};

const createScheduledReport = async (data: Partial<ScheduledReport>): Promise<ScheduledReport> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  // Calculate next run based on frequency
  const now = new Date();
  let nextRun = new Date(now);
  switch (data.frequency) {
    case 'DAILY':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'WEEKLY':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'MONTHLY':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
  }
  
  const newSchedule: ScheduledReport = {
    id: String(Date.now()),
    report_type: data.report_type!,
    frequency: data.frequency!,
    recipients: data.recipients!,
    enabled: true,
    next_run: nextRun.toISOString(),
    created_at: new Date().toISOString(),
    created_by: 'Current User',
  };
  return newSchedule;
};

const updateScheduledReport = async (id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const existing = MOCK_SCHEDULED_REPORTS.find((s) => s.id === id);
  if (!existing) throw new Error('Schedule not found');
  
  return {
    ...existing,
    ...data,
    id,
  };
};

const deleteScheduledReport = async (id: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
};

const deleteReport = async (id: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
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
