import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

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
  return apiClient.get<Task[]>(`/cases/${caseId}/tasks/`)
}

async function createTask(caseId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'case_id' | 'created_by' | 'created_by_name'>): Promise<Task> {
  return apiClient.post<Task>(`/cases/${caseId}/tasks/`, task)
}

async function updateTask(caseId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
  return apiClient.patch<Task>(`/cases/${caseId}/tasks/${taskId}/`, updates)
}

async function deleteTask(caseId: string, taskId: string): Promise<void> {
  return apiClient.delete(`/cases/${caseId}/tasks/${taskId}/`)
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
