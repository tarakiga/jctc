import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Task types
type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
type TaskPriority = 1 | 2 | 3 | 4 | 5

interface Task {
  id: string
  case_id: string
  title: string
  description?: string
  assigned_to?: string
  assigned_to_name?: string
  created_by: string
  created_by_name: string
  due_at?: string
  priority: TaskPriority
  status: TaskStatus
  created_at: string
  updated_at: string
}

// API functions (to be implemented with actual backend endpoints)
async function fetchTasks(caseId: string): Promise<Task[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/tasks`)
  // return response.json()
  
  // Mock data for visual review
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const overdue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  
  return [
    {
      id: 'task-001',
      case_id: caseId,
      title: 'Obtain bank records from First Bank',
      description: 'Submit formal request for all transaction records related to account ********1234 for the period Jan 1 - Jan 31, 2025. Include wire transfers and international transactions.',
      assigned_to: 'user-003',
      assigned_to_name: 'Ngozi Okonkwo',
      created_by: 'user-001',
      created_by_name: 'Adebayo Williams',
      due_at: nextWeek.toISOString(),
      priority: 1,
      status: 'IN_PROGRESS',
      created_at: '2025-01-16T09:00:00Z',
      updated_at: '2025-01-17T14:30:00Z',
    },
    {
      id: 'task-002',
      case_id: caseId,
      title: 'Interview primary suspect',
      description: 'Conduct formal interview with Chidinma Okafor. Prepare questions regarding crypto wallet addresses and transaction timeline. Legal counsel required.',
      assigned_to: 'user-001',
      assigned_to_name: 'Adebayo Williams',
      created_by: 'user-001',
      created_by_name: 'Adebayo Williams',
      due_at: tomorrow.toISOString(),
      priority: 1,
      status: 'OPEN',
      created_at: '2025-01-15T11:20:00Z',
      updated_at: '2025-01-15T11:20:00Z',
    },
    {
      id: 'task-003',
      case_id: caseId,
      title: 'Forensic analysis of seized laptop',
      description: 'Extract all data from evidence item EVD-2025-A7X9K. Focus on: chat applications, cryptocurrency wallets, browser history, and financial documents.',
      assigned_to: 'user-004',
      assigned_to_name: 'Chukwuma Eze',
      created_by: 'user-001',
      created_by_name: 'Adebayo Williams',
      due_at: nextWeek.toISOString(),
      priority: 2,
      status: 'IN_PROGRESS',
      created_at: '2025-01-17T08:15:00Z',
      updated_at: '2025-01-18T10:45:00Z',
    },
    {
      id: 'task-004',
      case_id: caseId,
      title: 'Coordinate with UK National Crime Agency',
      description: 'Submit MLA request for victim interview and UK-based evidence collection. Provide case summary and supporting documents.',
      assigned_to: 'user-005',
      assigned_to_name: 'Blessing Okoro',
      created_by: 'user-002',
      created_by_name: 'Funke Adeyemi',
      due_at: nextWeek.toISOString(),
      priority: 2,
      status: 'OPEN',
      created_at: '2025-01-16T15:30:00Z',
      updated_at: '2025-01-16T15:30:00Z',
    },
    {
      id: 'task-005',
      case_id: caseId,
      title: 'Review evidence documentation',
      description: 'Verify all chain of custody forms are complete and signed. Ensure evidence seals are intact and documented.',
      assigned_to: 'user-003',
      assigned_to_name: 'Ngozi Okonkwo',
      created_by: 'user-001',
      created_by_name: 'Adebayo Williams',
      due_at: yesterday.toISOString(),
      priority: 3,
      status: 'DONE',
      created_at: '2025-01-14T10:00:00Z',
      updated_at: '2025-01-16T16:20:00Z',
    },
    {
      id: 'task-006',
      case_id: caseId,
      title: 'Draft prosecution memo',
      description: 'Compile all evidence into comprehensive prosecution memo. Include legal analysis and recommended charges.',
      assigned_to: 'user-006',
      assigned_to_name: 'Ibrahim Hassan',
      created_by: 'user-002',
      created_by_name: 'Funke Adeyemi',
      priority: 3,
      status: 'BLOCKED',
      created_at: '2025-01-18T11:00:00Z',
      updated_at: '2025-01-18T11:00:00Z',
    },
    {
      id: 'task-007',
      case_id: caseId,
      title: 'Update case file with witness statements',
      description: 'Transcribe and file all witness interviews. Ensure proper redaction of sensitive information.',
      assigned_to: 'user-007',
      assigned_to_name: 'Amina Yusuf',
      created_by: 'user-001',
      created_by_name: 'Adebayo Williams',
      due_at: overdue.toISOString(),
      priority: 1,
      status: 'IN_PROGRESS',
      created_at: '2025-01-12T13:45:00Z',
      updated_at: '2025-01-17T09:30:00Z',
    },
  ]
}

async function createTask(caseId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'case_id' | 'created_by' | 'created_by_name'>): Promise<Task> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/tasks`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(task),
  // })
  // return response.json()
  
  // Mock response for now
  return {
    ...task,
    id: Math.random().toString(36).substr(2, 9),
    case_id: caseId,
    created_by: 'current-user-id',
    created_by_name: 'Current User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Task
}

async function updateTask(caseId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cases/${caseId}/tasks/${taskId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates),
  // })
  // return response.json()
  
  // Mock response for now
  return {
    id: taskId,
    case_id: caseId,
    ...updates,
    updated_at: new Date().toISOString(),
  } as Task
}

async function deleteTask(caseId: string, taskId: string): Promise<void> {
  // TODO: Replace with actual API call
  // await fetch(`/api/cases/${caseId}/tasks/${taskId}`, {
  //   method: 'DELETE',
  // })
  
  // Mock response for now
  return Promise.resolve()
}

// Hooks
export function useTasks(caseId: string) {
  return useQuery({
    queryKey: ['tasks', caseId],
    queryFn: () => fetchTasks(caseId),
    enabled: !!caseId,
  })
}

export function useTaskMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'case_id' | 'created_by' | 'created_by_name'>) =>
      createTask(caseId, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', caseId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      updateTask(caseId, taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(caseId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', caseId] })
    },
  })

  return {
    createTask: createMutation.mutateAsync,
    updateTask: (id: string, updates: Partial<Task>) => updateMutation.mutateAsync({ taskId: id, updates }),
    deleteTask: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
