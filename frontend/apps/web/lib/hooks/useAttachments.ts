'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export type AttachmentClassification = 'PUBLIC' | 'LE_SENSITIVE' | 'PRIVILEGED';

export type VirusScanStatus = 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';

export interface Attachment {
  id: string;
  case_id: string;
  title: string;
  filename: string;
  file_size: number;
  file_type: string;
  classification: AttachmentClassification;
  sha256_hash: string;
  virus_scan_status: VirusScanStatus;
  virus_scan_details?: string;
  uploaded_by: string;
  uploaded_at: string;
  download_url?: string;
  notes?: string;
}

export const CLASSIFICATION_OPTIONS: { value: AttachmentClassification; label: string; description: string }[] = [
  { 
    value: 'PUBLIC', 
    label: 'Public', 
    description: 'Can be shared publicly with no restrictions' 
  },
  { 
    value: 'LE_SENSITIVE', 
    label: 'Law Enforcement Sensitive', 
    description: 'Restricted to law enforcement personnel only' 
  },
  { 
    value: 'PRIVILEGED', 
    label: 'Privileged/Confidential', 
    description: 'Highest level - restricted to authorized personnel only' 
  },
];

// API functions
const fetchAttachments = async (caseId: string): Promise<Attachment[]> => {
  try {
    const response = await apiClient.get<Attachment[]>(`/cases/${caseId}/attachments/`);
    return response;
  } catch (error) {
    console.warn('Attachments API not available:', error);
    return [];
  }
};

const createAttachment = async (data: Partial<Attachment>): Promise<Attachment> => {
  return await apiClient.post<Attachment>(`/cases/${data.case_id}/attachments/`, data);
};

const deleteAttachment = async (id: string): Promise<void> => {
  await apiClient.delete(`/attachments/${id}/`);
};

const verifyAttachmentHash = async (id: string, file: File): Promise<boolean> => {
  const computedHash = await computeSHA256Hash(file);
  const response = await apiClient.post<{ valid: boolean }>(`/attachments/${id}/verify-hash/`, { hash: computedHash });
  return response.valid;
};

// Helper function to compute SHA-256 hash of a file
export const computeSHA256Hash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Custom hook
export const useAttachments = (caseId: string) => {
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading, error } = useQuery({
    queryKey: ['attachments', caseId],
    queryFn: () => fetchAttachments(caseId),
  });

  const createMutation = useMutation({
    mutationFn: createAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', caseId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', caseId] });
    },
  });

  const verifyHashMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => verifyAttachmentHash(id, file),
  });

  return {
    attachments,
    isLoading,
    error,
    createAttachment: createMutation.mutateAsync,
    deleteAttachment: deleteMutation.mutateAsync,
    verifyHash: verifyHashMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isVerifying: verifyHashMutation.isPending,
  };
};
