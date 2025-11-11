'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// Mock data
const MOCK_ATTACHMENTS: Attachment[] = [
  {
    id: '1',
    case_id: '1',
    title: 'Initial Complaint Form',
    filename: 'complaint_form_2025-01-10.pdf',
    file_size: 245760, // 240KB
    file_type: 'application/pdf',
    classification: 'LE_SENSITIVE',
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    virus_scan_status: 'CLEAN',
    uploaded_by: 'John Okafor',
    uploaded_at: '2025-01-10T09:30:00Z',
    notes: 'Original complaint form from victim',
  },
  {
    id: '2',
    case_id: '1',
    title: 'Bank Statement - GTBank',
    filename: 'bank_statement_gtb_jan_2025.pdf',
    file_size: 1048576, // 1MB
    file_type: 'application/pdf',
    classification: 'PRIVILEGED',
    sha256_hash: 'a3b5c21398fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b123',
    virus_scan_status: 'CLEAN',
    uploaded_by: 'Jane Adeyemi',
    uploaded_at: '2025-01-10T11:15:00Z',
    notes: 'Financial records showing suspicious transactions',
  },
  {
    id: '3',
    case_id: '1',
    title: 'Screenshot Evidence',
    filename: 'whatsapp_chat_screenshot.png',
    file_size: 524288, // 512KB
    file_type: 'image/png',
    classification: 'LE_SENSITIVE',
    sha256_hash: 'b4c6d32498fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b456',
    virus_scan_status: 'CLEAN',
    uploaded_by: 'John Okafor',
    uploaded_at: '2025-01-10T14:20:00Z',
    notes: 'WhatsApp conversation showing threat messages',
  },
  {
    id: '4',
    case_id: '1',
    title: 'Legal Opinion - Prosecutor',
    filename: 'legal_opinion_cybercrimes_s27.docx',
    file_size: 102400, // 100KB
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    classification: 'PRIVILEGED',
    sha256_hash: 'c5d7e43598fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b789',
    virus_scan_status: 'CLEAN',
    uploaded_by: 'Chidi Nwosu',
    uploaded_at: '2025-01-11T08:45:00Z',
    notes: 'Prosecutor assessment of charges under S27 Cybercrimes Act',
  },
  {
    id: '5',
    case_id: '1',
    title: 'Media Coverage - Premium Times',
    filename: 'premium_times_article_jan11.pdf',
    file_size: 307200, // 300KB
    file_type: 'application/pdf',
    classification: 'PUBLIC',
    sha256_hash: 'd6e8f54698fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b890',
    virus_scan_status: 'CLEAN',
    uploaded_by: 'Fatima Bello',
    uploaded_at: '2025-01-11T10:30:00Z',
    notes: 'Public news article covering the case',
  },
  {
    id: '6',
    case_id: '1',
    title: 'Malware Sample',
    filename: 'suspicious_file.exe',
    file_size: 2097152, // 2MB
    file_type: 'application/x-msdownload',
    classification: 'LE_SENSITIVE',
    sha256_hash: 'e7f9g65798fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b901',
    virus_scan_status: 'INFECTED',
    virus_scan_details: 'Detected: Trojan.GenericKD.12345678',
    uploaded_by: 'John Okafor',
    uploaded_at: '2025-01-11T11:00:00Z',
    notes: 'Malware executable recovered from suspect device - DO NOT EXECUTE',
  },
];

// Simulated API functions
const fetchAttachments = async (caseId: string): Promise<Attachment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_ATTACHMENTS.filter((att) => att.case_id === caseId);
};

const createAttachment = async (data: Partial<Attachment>): Promise<Attachment> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const newAttachment: Attachment = {
    id: String(Date.now()),
    case_id: data.case_id!,
    title: data.title!,
    filename: data.filename!,
    file_size: data.file_size!,
    file_type: data.file_type!,
    classification: data.classification!,
    sha256_hash: data.sha256_hash!,
    virus_scan_status: 'PENDING', // Simulated - would be async in real system
    uploaded_by: 'Current User',
    uploaded_at: new Date().toISOString(),
    notes: data.notes,
  };
  return newAttachment;
};

const deleteAttachment = async (id: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
};

const verifyAttachmentHash = async (id: string, file: File): Promise<boolean> => {
  // Simulate re-hashing the file and comparing
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const attachment = MOCK_ATTACHMENTS.find((att) => att.id === id);
  if (!attachment) return false;
  
  // In reality, would compute hash of downloaded file and compare
  // For mock purposes, randomly return true 95% of time
  return Math.random() > 0.05;
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
