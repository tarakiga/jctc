'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addYears, parseISO, isBefore } from 'date-fns';

export type CaseType = 'FRAUD' | 'HARASSMENT' | 'HACKING' | 'IDENTITY_THEFT' | 'SEXTORTION' | 'OTHER';
export type DisposalMethod = 'CRYPTOGRAPHIC_ERASURE' | 'PHYSICAL_DESTRUCTION' | 'SECURE_DELETE';
export type DisposalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface RetentionPolicy {
  id: string;
  case_type: CaseType;
  retention_years: number;
  description: string;
  disposal_method: DisposalMethod;
  requires_dual_approval: boolean;
  active: boolean;
  created_at: string;
}

export interface LegalHold {
  id: string;
  case_id: string;
  reason: string;
  placed_by: string;
  placed_at: string;
  expires_at?: string;
  active: boolean;
}

export interface DisposalRequest {
  id: string;
  case_id: string;
  case_number: string;
  case_type: CaseType;
  retention_policy_id: string;
  eligible_date: string;
  requested_by: string;
  requested_at: string;
  status: DisposalStatus;
  has_legal_hold: boolean;
  disposal_method: DisposalMethod;
  approved_by?: string;
  approved_at?: string;
  completed_by?: string;
  completed_at?: string;
  witness?: string;
  notes?: string;
}

// Mock retention policies
const MOCK_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: '1',
    case_type: 'FRAUD',
    retention_years: 10,
    description: 'Financial fraud cases must be retained for 10 years per regulatory requirements',
    disposal_method: 'CRYPTOGRAPHIC_ERASURE',
    requires_dual_approval: true,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    case_type: 'HARASSMENT',
    retention_years: 7,
    description: 'Cyber harassment cases retained for 7 years',
    disposal_method: 'SECURE_DELETE',
    requires_dual_approval: false,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    case_type: 'HACKING',
    retention_years: 10,
    description: 'Hacking and unauthorized access cases retained for 10 years',
    disposal_method: 'CRYPTOGRAPHIC_ERASURE',
    requires_dual_approval: true,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    case_type: 'IDENTITY_THEFT',
    retention_years: 10,
    description: 'Identity theft cases retained for 10 years',
    disposal_method: 'CRYPTOGRAPHIC_ERASURE',
    requires_dual_approval: true,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Mock legal holds
const MOCK_LEGAL_HOLDS: LegalHold[] = [
  {
    id: '1',
    case_id: '5',
    reason: 'Ongoing appeal process',
    placed_by: 'Legal Team',
    placed_at: '2024-06-15T10:00:00Z',
    active: true,
  },
];

// Mock disposal requests
const MOCK_DISPOSAL_REQUESTS: DisposalRequest[] = [
  {
    id: '1',
    case_id: '10',
    case_number: 'JCTC-2015-00042',
    case_type: 'HARASSMENT',
    retention_policy_id: '2',
    eligible_date: '2022-01-01T00:00:00Z',
    requested_by: 'System',
    requested_at: '2025-01-01T00:00:00Z',
    status: 'PENDING_APPROVAL',
    has_legal_hold: false,
    disposal_method: 'SECURE_DELETE',
  },
  {
    id: '2',
    case_id: '5',
    case_number: 'JCTC-2014-00089',
    case_type: 'FRAUD',
    retention_policy_id: '1',
    eligible_date: '2024-05-01T00:00:00Z',
    requested_by: 'System',
    requested_at: '2025-01-01T00:00:00Z',
    status: 'ON_HOLD',
    has_legal_hold: true,
    disposal_method: 'CRYPTOGRAPHIC_ERASURE',
    notes: 'Legal hold active - ongoing appeal',
  },
];

export const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'HARASSMENT', label: 'Cyber Harassment' },
  { value: 'HACKING', label: 'Hacking/Unauthorized Access' },
  { value: 'IDENTITY_THEFT', label: 'Identity Theft' },
  { value: 'SEXTORTION', label: 'Sextortion' },
  { value: 'OTHER', label: 'Other' },
];

export const DISPOSAL_METHODS: { value: DisposalMethod; label: string; description: string }[] = [
  {
    value: 'CRYPTOGRAPHIC_ERASURE',
    label: 'Cryptographic Erasure',
    description: 'Digital data overwritten with cryptographically secure random data',
  },
  {
    value: 'PHYSICAL_DESTRUCTION',
    label: 'Physical Destruction',
    description: 'Physical media destroyed (shredding, incineration) with witness',
  },
  {
    value: 'SECURE_DELETE',
    label: 'Secure Delete',
    description: 'Standard secure deletion with verification',
  },
];

// Calculate if a case is eligible for disposal
export const calculateDisposalEligibility = (
  caseClosedDate: string | Date,
  retentionYears: number
): { eligible: boolean; eligibleDate: Date } => {
  const closedDate = typeof caseClosedDate === 'string' ? parseISO(caseClosedDate) : caseClosedDate;
  const eligibleDate = addYears(closedDate, retentionYears);
  const eligible = isBefore(eligibleDate, new Date());
  
  return { eligible, eligibleDate };
};

// Simulated API functions
const fetchRetentionPolicies = async (): Promise<RetentionPolicy[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_RETENTION_POLICIES;
};

const fetchLegalHolds = async (): Promise<LegalHold[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_LEGAL_HOLDS;
};

const fetchDisposalRequests = async (): Promise<DisposalRequest[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_DISPOSAL_REQUESTS;
};

const createRetentionPolicy = async (data: Partial<RetentionPolicy>): Promise<RetentionPolicy> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    id: String(Date.now()),
    case_type: data.case_type!,
    retention_years: data.retention_years!,
    description: data.description!,
    disposal_method: data.disposal_method!,
    requires_dual_approval: data.requires_dual_approval!,
    active: true,
    created_at: new Date().toISOString(),
  };
};

const updateRetentionPolicy = async (id: string, data: Partial<RetentionPolicy>): Promise<RetentionPolicy> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const existing = MOCK_RETENTION_POLICIES.find(p => p.id === id);
  if (!existing) throw new Error('Policy not found');
  return { ...existing, ...data, id };
};

const createLegalHold = async (data: Partial<LegalHold>): Promise<LegalHold> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    id: String(Date.now()),
    case_id: data.case_id!,
    reason: data.reason!,
    placed_by: 'Current User',
    placed_at: new Date().toISOString(),
    expires_at: data.expires_at,
    active: true,
  };
};

const releaseLegalHold = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 800));
};

const approveDisposal = async (id: string, witness?: string): Promise<DisposalRequest> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const existing = MOCK_DISPOSAL_REQUESTS.find(r => r.id === id);
  if (!existing) throw new Error('Disposal request not found');
  
  return {
    ...existing,
    status: 'APPROVED',
    approved_by: 'Current User',
    approved_at: new Date().toISOString(),
    witness,
  };
};

const completeDisposal = async (id: string): Promise<DisposalRequest> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const existing = MOCK_DISPOSAL_REQUESTS.find(r => r.id === id);
  if (!existing) throw new Error('Disposal request not found');
  
  return {
    ...existing,
    status: 'COMPLETED',
    completed_by: 'Current User',
    completed_at: new Date().toISOString(),
  };
};

// Custom hooks
export const useRetentionPolicies = () => {
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading, error } = useQuery({
    queryKey: ['retentionPolicies'],
    queryFn: fetchRetentionPolicies,
  });

  const createMutation = useMutation({
    mutationFn: createRetentionPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retentionPolicies'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RetentionPolicy> }) => updateRetentionPolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retentionPolicies'] });
    },
  });

  return {
    policies,
    isLoading,
    error,
    createPolicy: createMutation.mutateAsync,
    updatePolicy: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};

export const useLegalHolds = () => {
  const queryClient = useQueryClient();

  const { data: holds = [], isLoading, error } = useQuery({
    queryKey: ['legalHolds'],
    queryFn: fetchLegalHolds,
  });

  const createMutation = useMutation({
    mutationFn: createLegalHold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalHolds'] });
      queryClient.invalidateQueries({ queryKey: ['disposalRequests'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseLegalHold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalHolds'] });
      queryClient.invalidateQueries({ queryKey: ['disposalRequests'] });
    },
  });

  return {
    holds,
    isLoading,
    error,
    createHold: createMutation.mutateAsync,
    releaseHold: releaseMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isReleasing: releaseMutation.isPending,
  };
};

export const useDisposalRequests = () => {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['disposalRequests'],
    queryFn: fetchDisposalRequests,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, witness }: { id: string; witness?: string }) => approveDisposal(id, witness),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposalRequests'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeDisposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposalRequests'] });
    },
  });

  return {
    requests,
    isLoading,
    error,
    approveDisposal: approveMutation.mutateAsync,
    completeDisposal: completeMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
};

// Get disposal status badge color
export const getDisposalStatusColor = (status: DisposalStatus): {
  bg: string;
  text: string;
} => {
  const colors = {
    PENDING_APPROVAL: { bg: 'bg-amber-100', text: 'text-amber-700' },
    APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700' },
    IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-700' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
    ON_HOLD: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return colors[status];
};
