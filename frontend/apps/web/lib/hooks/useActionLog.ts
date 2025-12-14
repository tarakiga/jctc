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

// Interface matching actual backend response
interface Action {
  id: string
  case_id: string
  action: ActionType | string  // Backend returns 'action' not 'action_type'
  details: string              // Backend returns 'details' not 'action_details'
  user_id: string | null
  user: {
    id: string
    full_name: string
    email: string
  } | null
  created_at: string           // Backend returns 'created_at' not 'timestamp'
}


// API functions
async function fetchActions(caseId: string): Promise<Action[]> {
  return await apiClient.get<Action[]>(`/cases/${caseId}/actions/`, {
    cache: 'no-store'
  })
}

async function createManualAction(
  caseId: string,
  action: { action_type: string; action_details: string }
): Promise<Action> {
  return await apiClient.post<Action>(`/cases/${caseId}/actions/manual/`, {
    action_type: action.action_type,
    action_details: action.action_details
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
    mutationFn: (action: { action_type: string; action_details: string }) =>
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
