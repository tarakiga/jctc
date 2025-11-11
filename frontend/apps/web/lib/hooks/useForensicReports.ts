import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Types
type ReportType = 'EXTRACTION' | 'ANALYSIS' | 'VALIDATION' | 'SUMMARY' | 'OTHER'

interface ForensicReport {
  id: string
  case_id: string
  device_id?: string
  device_label?: string
  report_type: ReportType
  tool_name: string
  tool_version: string
  tool_binary_hash?: string
  file_name: string
  file_size: number
  file_hash: string
  generated_at: string
  generated_by: string
  generated_by_name: string
  notes?: string
  created_at: string
  updated_at: string
}

interface CreateReportInput {
  case_id: string
  device_id?: string
  report_type: ReportType
  tool_name: string
  tool_version: string
  tool_binary_hash?: string
  file: File
  generated_at: string
  notes?: string
}

// Helper function to compute SHA-256 hash
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// API functions (to be implemented with actual API client)
const fetchReports = async (caseId: string): Promise<ForensicReport[]> => {
  // TODO: Replace with actual API call
  // const response = await apiClient.get(`/api/cases/${caseId}/forensic-reports`)
  // return response.data
  
  // Mock data for visual review
  return [
    {
      id: 'report-001',
      case_id: caseId,
      device_id: 'device-001',
      device_label: 'Suspect Laptop - Primary Device',
      report_type: 'EXTRACTION',
      tool_name: 'FTK Imager',
      tool_version: '4.7.1.2',
      tool_binary_hash: 'e9f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1',
      file_name: 'ftk_full_extraction_device001_20250117.pdf',
      file_size: 3456789,
      file_hash: 'a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6',
      generated_at: '2025-01-17T12:00:00Z',
      generated_by: 'user-004',
      generated_by_name: 'Chukwuma Eze',
      notes: 'Full disk extraction completed successfully. All partitions imaged. Hash verification passed.',
      created_at: '2025-01-17T12:05:00Z',
      updated_at: '2025-01-17T12:05:00Z',
    },
    {
      id: 'report-002',
      case_id: caseId,
      device_id: 'device-002',
      device_label: 'Suspect iPhone',
      report_type: 'EXTRACTION',
      tool_name: 'Cellebrite Premium',
      tool_version: '7.62.0.108',
      tool_binary_hash: 'b3e7f1a8d4c9e2f5a1d7b3c6e9f2a5d8b1c4e7f3a6d9b2c5e8f1a4d7b9c3e6f2',
      file_name: 'cellebrite_iphone_extraction_20250117.ufdr',
      file_size: 5678901,
      file_hash: 'c9f2a5d8b1e4f7a3d6b9c2e5f8a1d4b7c3e6f9a2d5b8c1e4f7a6d9b3c5e2f1a8',
      generated_at: '2025-01-17T14:30:00Z',
      generated_by: 'user-004',
      generated_by_name: 'Chukwuma Eze',
      notes: 'Full file system extraction. WhatsApp, Telegram, and SMS data recovered. Device was locked with Face ID - extraction via AFU method.',
      created_at: '2025-01-17T14:35:00Z',
      updated_at: '2025-01-17T14:35:00Z',
    },
    {
      id: 'report-003',
      case_id: caseId,
      device_id: 'device-001',
      device_label: 'Suspect Laptop - Primary Device',
      report_type: 'ANALYSIS',
      tool_name: 'Autopsy',
      tool_version: '4.20.0',
      tool_binary_hash: 'd2e8f4a1b7c3e9f5a2d6b1c8e4f7a9d3b5c2e6f1a8d4b7c9e3f5a2d1b6c8e4f7',
      file_name: 'autopsy_timeline_analysis_20250118.html',
      file_size: 987654,
      file_hash: 'e8f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5d8b1c4e7f9',
      generated_at: '2025-01-18T10:00:00Z',
      generated_by: 'user-004',
      generated_by_name: 'Chukwuma Eze',
      notes: 'Timeline analysis of user activity. Key findings: extensive browser activity on crypto exchanges during suspect timeframe.',
      created_at: '2025-01-18T10:05:00Z',
      updated_at: '2025-01-18T10:05:00Z',
    },
    {
      id: 'report-004',
      case_id: caseId,
      device_id: 'device-004',
      device_label: 'Internet Cafe Desktop',
      report_type: 'ANALYSIS',
      tool_name: 'EnCase Forensic',
      tool_version: '20.4.0.185',
      tool_binary_hash: 'f3a6d9b2c5e8f1a4d7b9c3e6f2a5d8b1c4e7f9a3d6b2c5e8f1a4d7b9c3e6f2a5',
      file_name: 'encase_file_carving_report_20250118.pdf',
      file_size: 1234567,
      file_hash: 'a1d4b7c9e6f3a2d5b8c1e4f7a9d3b6c2e5f8a1d4b7c9e6f3a2d5b1c8e4f7a9d3',
      generated_at: '2025-01-18T15:00:00Z',
      generated_by: 'user-004',
      generated_by_name: 'Chukwuma Eze',
      notes: 'File carving recovered deleted Excel file containing victim ledger. Metadata analysis confirms creation date and author.',
      created_at: '2025-01-18T15:05:00Z',
      updated_at: '2025-01-18T15:05:00Z',
    },
    {
      id: 'report-005',
      case_id: caseId,
      report_type: 'VALIDATION',
      tool_name: 'HashCalc',
      tool_version: '2.02',
      tool_binary_hash: 'b7c3e9f1a5d2b8c4e6f3a9d1b5c7e2f4a8d3b9c5e1f7a4d2b6c8e3f9a1d5b4c7',
      file_name: 'hash_verification_all_evidence_20250119.txt',
      file_size: 45678,
      file_hash: 'c4d8e2f6a3b9c1e5f7a2d4b8c6e9f3a1d5b7c2e4f8a6d3b1c9e5f2a7d4b8c3e6',
      generated_at: '2025-01-19T09:00:00Z',
      generated_by: 'user-004',
      generated_by_name: 'Chukwuma Eze',
      notes: 'Hash verification of all forensic images and extracted artefacts. All hashes match original values - integrity confirmed.',
      created_at: '2025-01-19T09:05:00Z',
      updated_at: '2025-01-19T09:05:00Z',
    },
    {
      id: 'report-006',
      case_id: caseId,
      report_type: 'SUMMARY',
      tool_name: 'Microsoft Word',
      tool_version: '16.0.14931.20648',
      file_name: 'forensic_examination_summary_20250119.docx',
      file_size: 234567,
      file_hash: 'd9e5f1a7b3c2e8f4a6d1b9c5e3f2a8d4b7c1e6f9a3d5b2c8e4f1a7d3b6c9e5f2',
      generated_at: '2025-01-19T14:00:00Z',
      generated_by: 'user-004',
      generated_by_name: 'Chukwuma Eze',
      notes: 'Comprehensive forensic examination summary. Details methodology, findings, and chain of custody. Ready for court presentation.',
      created_at: '2025-01-19T14:05:00Z',
      updated_at: '2025-01-19T14:05:00Z',
    },
  ]
}

const uploadReport = async (input: CreateReportInput): Promise<ForensicReport> => {
  // TODO: Replace with actual API call
  // Process file upload and compute hash
  const file_hash = await computeFileHash(input.file)
  const file_name = input.file.name
  const file_size = input.file.size
  
  // const response = await apiClient.post(`/api/cases/${input.case_id}/forensic-reports`, {
  //   ...input,
  //   file_hash,
  //   file_name,
  //   file_size
  // })
  // return response.data
  
  throw new Error('API not implemented')
}

const deleteReport = async (reportId: string): Promise<void> => {
  // TODO: Replace with actual API call
  // await apiClient.delete(`/api/forensic-reports/${reportId}`)
  throw new Error('API not implemented')
}

const validateToolBinary = async (toolName: string, toolVersion: string, binaryFile: File): Promise<{ valid: boolean; hash: string }> => {
  // TODO: Replace with actual API call
  // Compute hash of tool binary for validation
  const hash = await computeFileHash(binaryFile)
  
  // const response = await apiClient.post('/api/forensic-tools/validate', {
  //   tool_name: toolName,
  //   tool_version: toolVersion,
  //   binary_hash: hash
  // })
  // return response.data
  
  // Mock validation
  return {
    valid: true,
    hash: hash
  }
}

// Hooks
export function useForensicReports(caseId: string) {
  return useQuery({
    queryKey: ['forensic-reports', caseId],
    queryFn: () => fetchReports(caseId),
    enabled: !!caseId,
  })
}

export function useForensicReportMutations(caseId: string) {
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: (input: Omit<CreateReportInput, 'case_id'>) =>
      uploadReport({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forensic-reports', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forensic-reports', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const validateMutation = useMutation({
    mutationFn: ({ toolName, toolVersion, binaryFile }: { toolName: string; toolVersion: string; binaryFile: File }) =>
      validateToolBinary(toolName, toolVersion, binaryFile),
  })

  return {
    uploadReport: async (input: Omit<CreateReportInput, 'case_id'>) => {
      return uploadMutation.mutateAsync(input)
    },
    deleteReport: async (reportId: string) => {
      return deleteMutation.mutateAsync(reportId)
    },
    validateTool: async (toolName: string, toolVersion: string, binaryFile: File) => {
      return validateMutation.mutateAsync({ toolName, toolVersion, binaryFile })
    },
    loading: uploadMutation.isPending || deleteMutation.isPending || validateMutation.isPending,
    error: uploadMutation.error || deleteMutation.error || validateMutation.error,
    validationResult: validateMutation.data,
  }
}
