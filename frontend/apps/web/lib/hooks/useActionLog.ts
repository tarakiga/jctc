import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

// API functions (to be implemented with actual backend endpoints)
async function fetchActions(caseId: string): Promise<Action[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/actions`)
  // return response.json()
  
  // Mock data for visual review
  return [
    {
      id: 'action-001',
      case_id: caseId,
      action_type: 'CASE_CREATED',
      action_details: 'Case JCTC-2025-C9D5E created and assigned initial severity level of 4',
      performed_by: 'user-001',
      performed_by_name: 'Adebayo Williams',
      timestamp: '2025-01-10T08:30:00Z',
      metadata: { severity: 4, status: 'OPEN' },
    },
    {
      id: 'action-002',
      case_id: caseId,
      action_type: 'PARTY_ADDED',
      action_details: 'Added suspect: Chidinma Okafor (DigiQueen) to case parties',
      performed_by: 'user-001',
      performed_by_name: 'Adebayo Williams',
      timestamp: '2025-01-10T14:30:00Z',
      metadata: { party_type: 'SUSPECT', party_name: 'Chidinma Okafor' },
    },
    {
      id: 'action-003',
      case_id: caseId,
      action_type: 'ASSIGNMENT_ADDED',
      action_details: 'Assigned Funke Adeyemi as Lead Investigator',
      performed_by: 'user-001',
      performed_by_name: 'Adebayo Williams',
      timestamp: '2025-01-10T15:00:00Z',
      metadata: { role: 'LEAD', user_name: 'Funke Adeyemi' },
    },
    {
      id: 'action-004',
      case_id: caseId,
      action_type: 'EVIDENCE_ADDED',
      action_details: 'Evidence item EVD-2025-A7X9K (Dell Laptop) added to case',
      performed_by: 'user-003',
      performed_by_name: 'Ngozi Okonkwo',
      timestamp: '2025-01-11T10:15:00Z',
      metadata: { evidence_number: 'EVD-2025-A7X9K', category: 'Digital' },
    },
    {
      id: 'action-005',
      case_id: caseId,
      action_type: 'PARTY_ADDED',
      action_details: 'Added victim: Sarah Mitchell to case parties',
      performed_by: 'user-001',
      performed_by_name: 'Adebayo Williams',
      timestamp: '2025-01-12T16:45:00Z',
      metadata: { party_type: 'VICTIM', party_name: 'Sarah Mitchell', nationality: 'British' },
    },
    {
      id: 'action-006',
      case_id: caseId,
      action_type: 'STATUS_CHANGED',
      action_details: 'Case status changed from OPEN to UNDER_INVESTIGATION',
      performed_by: 'user-002',
      performed_by_name: 'Funke Adeyemi',
      timestamp: '2025-01-13T09:20:00Z',
      metadata: { from_status: 'OPEN', to_status: 'UNDER_INVESTIGATION' },
    },
    {
      id: 'action-007',
      case_id: caseId,
      action_type: 'PARTY_ADDED',
      action_details: 'Added minor victim: Aisha Bello with guardian contact (Fatima Bello)',
      performed_by: 'user-001',
      performed_by_name: 'Adebayo Williams',
      timestamp: '2025-01-13T08:20:00Z',
      metadata: { party_type: 'VICTIM', party_name: 'Aisha Bello', is_minor: true, guardian: 'Fatima Bello' },
    },
    {
      id: 'action-008',
      case_id: caseId,
      action_type: 'TASK_CREATED',
      action_details: 'Created high-priority task: "Obtain bank records from First Bank"',
      performed_by: 'user-001',
      performed_by_name: 'Adebayo Williams',
      timestamp: '2025-01-16T09:00:00Z',
      metadata: { task_title: 'Obtain bank records from First Bank', priority: 1, assigned_to: 'Ngozi Okonkwo' },
    },
    {
      id: 'action-009',
      case_id: caseId,
      action_type: 'ASSIGNMENT_ADDED',
      action_details: 'Assigned Blessing Okoro as Liaison Officer for international coordination',
      performed_by: 'user-002',
      performed_by_name: 'Funke Adeyemi',
      timestamp: '2025-01-16T14:00:00Z',
      metadata: { role: 'LIAISON', user_name: 'Blessing Okoro' },
    },
    {
      id: 'action-010',
      case_id: caseId,
      action_type: 'EVIDENCE_UPDATED',
      action_details: 'Evidence EVD-2025-A7X9K transferred to forensics lab for analysis',
      performed_by: 'user-004',
      performed_by_name: 'Chukwuma Eze',
      timestamp: '2025-01-17T11:30:00Z',
      metadata: { evidence_number: 'EVD-2025-A7X9K', action: 'TRANSFERRED', location: 'Digital Forensics Lab' },
    },
    {
      id: 'action-011',
      case_id: caseId,
      action_type: 'TASK_UPDATED',
      action_details: 'Task "Review evidence documentation" status changed to IN_PROGRESS',
      performed_by: 'user-003',
      performed_by_name: 'Ngozi Okonkwo',
      timestamp: '2025-01-17T08:15:00Z',
      metadata: { task_title: 'Review evidence documentation', from_status: 'OPEN', to_status: 'IN_PROGRESS' },
    },
    {
      id: 'action-012',
      case_id: caseId,
      action_type: 'NOTE_ADDED',
      action_details: 'Added investigative note regarding suspect\'s known associates and communication patterns',
      performed_by: 'user-002',
      performed_by_name: 'Funke Adeyemi',
      timestamp: '2025-01-17T15:45:00Z',
      metadata: { note_category: 'Investigation' },
    },
    {
      id: 'action-013',
      case_id: caseId,
      action_type: 'TASK_COMPLETED',
      action_details: 'Task "Review evidence documentation" marked as completed',
      performed_by: 'user-003',
      performed_by_name: 'Ngozi Okonkwo',
      timestamp: '2025-01-18T16:20:00Z',
      metadata: { task_title: 'Review evidence documentation', completion_notes: 'All forms verified and complete' },
    },
    {
      id: 'action-014',
      case_id: caseId,
      action_type: 'MANUAL_ENTRY',
      action_details: 'Received email response from First Bank compliance officer confirming records request received',
      performed_by: 'user-003',
      performed_by_name: 'Ngozi Okonkwo',
      timestamp: '2025-01-18T10:30:00Z',
      metadata: { entry_type: 'External Communication', source: 'First Bank' },
    },
    {
      id: 'action-015',
      case_id: caseId,
      action_type: 'ASSIGNMENT_ADDED',
      action_details: 'Assigned Ibrahim Hassan as Prosecutor to prepare legal documentation',
      performed_by: 'user-002',
      performed_by_name: 'Funke Adeyemi',
      timestamp: '2025-01-18T11:00:00Z',
      metadata: { role: 'PROSECUTOR', user_name: 'Ibrahim Hassan' },
    },
  ]
}

async function createManualAction(
  caseId: string,
  action: Omit<Action, 'id' | 'timestamp' | 'case_id' | 'performed_by' | 'performed_by_name'>
): Promise<Action> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/actions`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(action),
  // })
  // return response.json()
  
  // Mock response for now
  return {
    ...action,
    id: Math.random().toString(36).substr(2, 9),
    case_id: caseId,
    performed_by: 'current-user-id',
    performed_by_name: 'Current User',
    timestamp: new Date().toISOString(),
  } as Action
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
