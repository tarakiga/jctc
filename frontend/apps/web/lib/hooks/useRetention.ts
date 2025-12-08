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

import { apiClient } from '../services/api-client';

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

// API functions
const fetchRetentionPolicies = async (): Promise<RetentionPolicy[]> => {
  try {
    return await apiClient.get<RetentionPolicy[]>('/retention/policies/');
  } catch (error) {
    console.warn('Retention policies API not available:', error);
    return [];
  }
};

const fetchLegalHolds = async (): Promise<LegalHold[]> => {
  try {
    return await apiClient.get<LegalHold[]>('/retention/legal-holds/');
  } catch (error) {
    console.warn('Legal holds API not available:', error);
    return [];
  }
};

const fetchDisposalRequests = async (): Promise<DisposalRequest[]> => {
  try {
    return await apiClient.get<DisposalRequest[]>('/retention/disposal-requests/');
  } catch (error) {
    console.warn('Disposal requests API not available:', error);
    return [];
  }
};

const createRetentionPolicy = async (data: Partial<RetentionPolicy>): Promise<RetentionPolicy> => {
  return await apiClient.post<RetentionPolicy>('/retention/policies/', data);
};

const updateRetentionPolicy = async (id: string, data: Partial<RetentionPolicy>): Promise<RetentionPolicy> => {
  return await apiClient.patch<RetentionPolicy>(`/retention/policies/${id}/`, data);
};

const createLegalHold = async (data: Partial<LegalHold>): Promise<LegalHold> => {
  return await apiClient.post<LegalHold>('/retention/legal-holds/', data);
};

const releaseLegalHold = async (id: string): Promise<void> => {
  await apiClient.delete(`/retention/legal-holds/${id}/`);
};

const approveDisposal = async (id: string, witness?: string): Promise<DisposalRequest> => {
  return await apiClient.post<DisposalRequest>(`/retention/disposal-requests/${id}/approve/`, { witness });
};

const completeDisposal = async (id: string): Promise<DisposalRequest> => {
  return await apiClient.post<DisposalRequest>(`/retention/disposal-requests/${id}/complete/`, {});
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
