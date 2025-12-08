'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export type CollaborationStatus = 'INITIATED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';

export interface Collaboration {
  id: string;
  case_id: string;
  partner_org: string;
  partner_type: 'LAW_ENFORCEMENT' | 'REGULATOR' | 'ISP' | 'BANK' | 'INTERNATIONAL' | 'OTHER';
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  reference_no?: string;
  scope: string;
  mou_reference?: string;
  status: CollaborationStatus;
  initiated_at: string;
  completed_at?: string;
  notes?: string;
}

// Partner organizations with types
export const PARTNER_ORGANIZATIONS = [
  // Law Enforcement
  { value: 'EFCC', label: 'Economic and Financial Crimes Commission (EFCC)', type: 'LAW_ENFORCEMENT' },
  { value: 'NPF', label: 'Nigeria Police Force (NPF)', type: 'LAW_ENFORCEMENT' },
  { value: 'DSS', label: 'Department of State Services (DSS)', type: 'LAW_ENFORCEMENT' },
  { value: 'ICPC', label: 'Independent Corrupt Practices Commission (ICPC)', type: 'LAW_ENFORCEMENT' },
  
  // International Law Enforcement
  { value: 'INTERPOL', label: 'INTERPOL', type: 'INTERNATIONAL' },
  { value: 'FBI', label: 'Federal Bureau of Investigation (FBI)', type: 'INTERNATIONAL' },
  { value: 'EUROPOL', label: 'European Union Agency for Law Enforcement Cooperation (EUROPOL)', type: 'INTERNATIONAL' },
  { value: 'NCA_UK', label: 'UK National Crime Agency (NCA)', type: 'INTERNATIONAL' },
  
  // Regulators
  { value: 'NCC', label: 'Nigerian Communications Commission (NCC)', type: 'REGULATOR' },
  { value: 'CBN', label: 'Central Bank of Nigeria (CBN)', type: 'REGULATOR' },
  { value: 'NITDA', label: 'National Information Technology Development Agency (NITDA)', type: 'REGULATOR' },
  
  // ISPs & Telecom
  { value: 'MTN', label: 'MTN Nigeria', type: 'ISP' },
  { value: 'AIRTEL', label: 'Airtel Nigeria', type: 'ISP' },
  { value: 'GLO', label: 'Globacom Nigeria', type: 'ISP' },
  { value: '9MOBILE', label: '9mobile Nigeria', type: 'ISP' },
  
  // Banks
  { value: 'GTB', label: 'Guaranty Trust Bank (GTB)', type: 'BANK' },
  { value: 'ZENITH', label: 'Zenith Bank', type: 'BANK' },
  { value: 'ACCESS', label: 'Access Bank', type: 'BANK' },
  { value: 'UBA', label: 'United Bank for Africa (UBA)', type: 'BANK' },
  { value: 'FIRSTBANK', label: 'First Bank of Nigeria', type: 'BANK' },
  
  // Other
  { value: 'OTHER', label: 'Other Organization', type: 'OTHER' },
] as const;

// API functions
const fetchCollaborations = async (caseId: string): Promise<Collaboration[]> => {
  try {
    const response = await apiClient.get<Collaboration[]>(`/cases/${caseId}/collaborations/`);
    return response;
  } catch (error) {
    console.warn('Collaborations API not available:', error);
    return [];
  }
};

const createCollaboration = async (data: Partial<Collaboration>): Promise<Collaboration> => {
  return await apiClient.post<Collaboration>(`/cases/${data.case_id}/collaborations/`, data);
};

const updateCollaboration = async (id: string, data: Partial<Collaboration>): Promise<Collaboration> => {
  return await apiClient.patch<Collaboration>(`/collaborations/${id}/`, data);
};

const deleteCollaboration = async (id: string): Promise<void> => {
  await apiClient.delete(`/collaborations/${id}/`);
};

// Custom hook
export const useCollaborations = (caseId: string) => {
  const queryClient = useQueryClient();

  const { data: collaborations = [], isLoading, error } = useQuery({
    queryKey: ['collaborations', caseId],
    queryFn: () => fetchCollaborations(caseId),
  });

  const createMutation = useMutation({
    mutationFn: createCollaboration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', caseId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collaboration> }) => updateCollaboration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', caseId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollaboration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', caseId] });
    },
  });

  return {
    collaborations,
    isLoading,
    error,
    createCollaboration: createMutation.mutateAsync,
    updateCollaboration: updateMutation.mutateAsync,
    deleteCollaboration: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
