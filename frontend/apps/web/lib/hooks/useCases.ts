import { useState, useEffect } from 'react'
import { casesService, Case, CaseFilters, CreateCaseData, UpdateCaseData } from '../services/cases'

export function useCases(filters?: CaseFilters) {
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCases = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await casesService.getCases(filters)
      setCases(result.cases)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch cases'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [JSON.stringify(filters)])

  return {
    cases,
    total,
    loading,
    error,
    refetch: fetchCases,
  }
}

export function useCase(id: string) {
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCase = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const result = await casesService.getCase(id)
      setCaseData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch case'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCase()
  }, [id])

  return {
    caseData,
    loading,
    error,
    refetch: fetchCase,
  }
}

export function useCaseStats() {
  const [stats, setStats] = useState<{
    total: number
    by_status: Record<string, number>
    by_severity: Record<number, number>
    recent_cases: Case[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await casesService.getCaseStats()
      setStats(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch case stats'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}

export function useCaseMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createCase = async (data: CreateCaseData): Promise<Case | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await casesService.createCase(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create case'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateCase = async (id: string, data: UpdateCaseData): Promise<Case | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await casesService.updateCase(id, data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update case'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteCase = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      await casesService.deleteCase(id)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete case'))
      return false
    } finally {
      setLoading(false)
    }
  }

  const assignInvestigator = async (caseId: string, userId: string): Promise<Case | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await casesService.assignInvestigator(caseId, userId)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to assign investigator'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (caseId: string, status: string): Promise<Case | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await casesService.updateStatus(caseId, status)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update status'))
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    createCase,
    updateCase,
    deleteCase,
    assignInvestigator,
    updateStatus,
    loading,
    error,
  }
}
