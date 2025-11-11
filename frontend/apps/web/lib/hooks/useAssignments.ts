import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types
type AssignmentRole = 'LEAD' | 'SUPPORT' | 'PROSECUTOR' | 'LIAISON'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  org_unit?: string
}

interface Assignment {
  id: string
  case_id: string
  user_id: string
  user: User
  role: AssignmentRole
  assigned_at: string
}

interface CreateAssignmentInput {
  case_id: string
  user_id: string
  role: AssignmentRole
}

// API functions wired to backend
const fetchAssignments = async (caseId: string): Promise<Assignment[]> => {
  const assignments = await apiClient.get<any[]>(`/cases/${caseId}/assignments`)
  if (!assignments) return []

  // Fetch user details for each assignment (backend response does not include nested user)
  const users = await Promise.all(
    assignments.map((a: any) => apiClient.get<any>(`/users/${String(a.user_id)}`).catch(() => null))
  )

  return assignments.map((a: any, idx: number) => ({
    // Compose a stable ID from composite PK (case_id + user_id + role)
    id: `${String(a.case_id ?? caseId)}|${String(a.user_id)}|${String(a.role)}`,
    case_id: String(a.case_id ?? caseId),
    user_id: String(a.user_id),
    user: users[idx]
      ? {
          id: String(users[idx].id),
          full_name: users[idx].full_name,
          email: users[idx].email,
          role: users[idx].role,
          org_unit: users[idx].org_unit,
        }
      : { id: String(a.user_id), full_name: '', email: '', role: '', org_unit: '' },
    role: a.role,
    assigned_at: a.assigned_at || a.created_at || new Date().toISOString(),
  }))
}

const fetchAvailableUsers = async (): Promise<User[]> => {
  const users = await apiClient.get<any[]>(`/users`, { params: { active_only: true } })
  return (users || []).map((u: any) => ({
    id: String(u.id),
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    org_unit: u.org_unit,
  }))
}

const createAssignment = async (input: CreateAssignmentInput): Promise<Assignment> => {
  const payload = { user_id: input.user_id, role: input.role }
  const a = await apiClient.post<any>(`/cases/${input.case_id}/assign`, payload)
  // Fetch user details
  let user: User = { id: String(a.user_id), full_name: '', email: '', role: '', org_unit: '' }
  try {
    const u = await apiClient.get<any>(`/users/${String(a.user_id)}`)
    user = {
      id: String(u.id),
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      org_unit: u.org_unit,
    }
  } catch {}

  return {
    id: String(a.id),
    case_id: String(a.case_id ?? input.case_id),
    user_id: String(a.user_id),
    user,
    role: a.role,
    assigned_at: a.assigned_at || a.created_at || new Date().toISOString(),
  }
}

const deleteAssignment = async (caseId: string, assignmentId: string): Promise<void> => {
  // Parse composite ID: caseId|userId|role
  const parts = assignmentId.split('|')
  const userId = parts[1]
  const role = parts[2]
  const url = `/cases/${caseId}/assignments/${userId}`
  const params = role ? { role } : undefined
  await apiClient.delete(url, params ? { params } : undefined)
}

// Hooks
export function useAssignments(caseId: string) {
  return useQuery({
    queryKey: ['assignments', caseId],
    queryFn: () => fetchAssignments(caseId),
    enabled: !!caseId,
  })
}

export function useAvailableUsers() {
  return useQuery({
    queryKey: ['users', 'available'],
    queryFn: fetchAvailableUsers,
  })
}

export function useAssignmentMutations(caseId: string) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateAssignmentInput, 'case_id'>) =>
      createAssignment({ ...input, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(caseId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
    },
  })

  return {
    assignUser: async (userId: string, role: AssignmentRole) => {
      return createMutation.mutateAsync({ user_id: userId, role })
    },
    unassignUser: async (assignmentId: string) => {
      return deleteMutation.mutateAsync(assignmentId)
    },
    loading: createMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || deleteMutation.error,
  }
}
