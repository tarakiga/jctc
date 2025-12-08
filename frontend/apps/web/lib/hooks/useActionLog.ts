import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Action types
type ActionType = 
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'STATUS_CHANGED'
  | 'PARTY_ADDED'
  | 'PARTY_UPDATED'
  | 'PARTY_REMOVED'
  | 'ASSIGNMENT_ADDED'
  | 'ASSIGNMENT_REMOVED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_UPDATED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'NOTE_ADDED'
  | 'MANUAL_ENTRY'

interface Action {
  id: string
  case_id: string
  action_type: ActionType
  action_details: string
  performed_by: string
  performed_by_name: string
  timestamp: string
  metadata?: Record<string, any>
}

// API functions
async function fetchActions(caseId: string): Promise<Action[]> {
  return await apiClient.get<Action[]>(`/cases/${caseId}/actions/`)
}

async function createManualAction(
  caseId: string, 
  action: Omit<Action, 'id' | 'timestamp' | 'case_id' | 'performed_by' | 'performed_by_name'>
): Promise<Action> {
  return await apiClient.post<Action>(`/cases/${caseId}/actions/manual/`, {
    action_type: action.action_type,
    action_details: action.action_details,
    metadata: action.metadata || {}
  })
}

// Hooks
export function useActionLog(caseId: string) {
  return useQuery({
    queryKey: ['actions', caseId],
    queryFn: () => fetchActions(caseId),
    enabled: !!caseId,
  })
}

export function useActionMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (action: Omit<Action, 'id' | 'timestamp' | 'case_id' | 'performed_by' | 'performed_by_name'>) =>
      createManualAction(caseId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions', caseId] })
    },
  })

  return {
    addManualEntry: createMutation.mutateAsync,
    isAdding: createMutation.isPending,
  }
}
