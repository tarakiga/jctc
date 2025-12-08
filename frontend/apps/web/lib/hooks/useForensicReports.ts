import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

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

// API functions
const fetchReports = async (caseId: string): Promise<ForensicReport[]> => {
  return await apiClient.get<ForensicReport[]>(`/cases/${caseId}/forensic-reports/`)
}

const uploadReport = async (input: CreateReportInput): Promise<ForensicReport> => {
  // Process file upload and compute hash
  const file_hash = await computeFileHash(input.file)
  
  // Create FormData for file upload
  const formData = new FormData()
  formData.append('case_id', input.case_id)
  if (input.device_id) {
    formData.append('device_id', input.device_id)
  }
  formData.append('report_type', input.report_type)
  formData.append('tool_name', input.tool_name)
  formData.append('tool_version', input.tool_version)
  if (input.tool_binary_hash) {
    formData.append('tool_binary_hash', input.tool_binary_hash)
  }
  formData.append('file', input.file)
  formData.append('file_hash', file_hash)
  formData.append('generated_at', input.generated_at)
  if (input.notes) {
    formData.append('notes', input.notes)
  }
  
  return await apiClient.post<ForensicReport>(`/cases/${input.case_id}/forensic-reports/`, formData)
}

const deleteReport = async (reportId: string): Promise<void> => {
  await apiClient.delete(`/forensic-reports/${reportId}/`)
}

const validateToolBinary = async (toolName: string, toolVersion: string, binaryFile: File): Promise<{ valid: boolean; hash: string }> => {
  // Compute hash of tool binary for validation
  const hash = await computeFileHash(binaryFile)
  
  return await apiClient.post<{ valid: boolean; hash: string }>('/forensic-tools/validate/', {
    tool_name: toolName,
    tool_version: toolVersion,
    binary_hash: hash
  })
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
