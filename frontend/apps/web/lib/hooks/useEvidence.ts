import { useState, useEffect } from 'react'
import {
  evidenceService,
  Evidence,
  EvidenceFilters,
  CreateEvidenceData,
  UpdateEvidenceData,
  ChainOfCustodyEntry,
} from '../services/evidence'

export function useEvidence(filters?: EvidenceFilters) {
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvidence = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.getEvidence(filters)
      setEvidence(result.evidence)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch evidence'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvidence()
  }, [JSON.stringify(filters)])

  return {
    evidence,
    total,
    loading,
    error,
    refetch: fetchEvidence,

    /**
     * Approve chain of custody entry (four-eyes approval)
     */
    approveChainOfCustodyEntry: async (evidenceId: string, entryId: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await evidenceService.approveChainOfCustodyEntry(evidenceId, entryId)
        console.log('Chain of custody entry approved successfully')
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to approve chain of custody entry'
        setError(new Error(errorMessage))
        console.error('Error approving chain of custody entry:', errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },

    /**
     * Reject chain of custody entry
     */
    rejectChainOfCustodyEntry: async (evidenceId: string, entryId: string, reason?: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await evidenceService.rejectChainOfCustodyEntry(evidenceId, entryId, reason)
        console.log('Chain of custody entry rejected successfully')
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reject chain of custody entry'
        setError(new Error(errorMessage))
        console.error('Error rejecting chain of custody entry:', errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },

    /**
     * Generate custody transfer receipt
     */
    generateCustodyReceipt: async (evidenceId: string, entryId: string) => {
      setLoading(true)
      setError(null)
      try {
        const receiptUrl = await evidenceService.generateCustodyReceipt(evidenceId, entryId)
        console.log('Custody receipt generated successfully')
        return receiptUrl
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate custody receipt'
        setError(new Error(errorMessage))
        console.error('Error generating custody receipt:', errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    }
  }
}

export function useEvidenceItem(id: string) {
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvidence = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.getEvidenceById(id)
      setEvidence(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch evidence'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvidence()
  }, [id])

  return {
    evidence,
    loading,
    error,
    refetch: fetchEvidence,
  }
}

export function useEvidenceByCase(caseId: string) {
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvidence = async () => {
    if (!caseId) return

    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.getEvidenceByCase(caseId)
      setEvidence(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch evidence for case'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvidence()
  }, [caseId])

  return {
    evidence,
    loading,
    error,
    refetch: fetchEvidence,
  }
}

export function useChainOfCustody(evidenceId: string) {
  const [entries, setEntries] = useState<ChainOfCustodyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchChainOfCustody = async () => {
    if (!evidenceId) return

    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.getChainOfCustody(evidenceId)
      setEntries(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch chain of custody'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChainOfCustody()
  }, [evidenceId])

  return {
    entries,
    loading,
    error,
    refetch: fetchChainOfCustody,
  }
}

export function useEvidenceMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createEvidence = async (data: CreateEvidenceData): Promise<Evidence | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.createEvidence(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create evidence'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const createEvidenceWithFiles = async (
    data: CreateEvidenceData,
    files: File[]
  ): Promise<Evidence | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.createEvidenceWithFiles(data, files)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create evidence with files'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (evidenceId: string, file: File): Promise<Evidence | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.uploadEvidenceFile(evidenceId, file)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to upload file'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const uploadMultipleFiles = async (
    evidenceId: string,
    files: File[]
  ): Promise<Evidence | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.uploadMultipleFiles(evidenceId, files)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to upload files'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateEvidence = async (
    id: string,
    data: UpdateEvidenceData
  ): Promise<Evidence | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.updateEvidence(id, data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update evidence'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteEvidence = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      await evidenceService.deleteEvidence(id)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete evidence'))
      return false
    } finally {
      setLoading(false)
    }
  }

  const addChainOfCustodyEntry = async (
    evidenceId: string,
    data: { action: string; location?: string; notes?: string }
  ): Promise<ChainOfCustodyEntry | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.addChainOfCustodyEntry(evidenceId, data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add chain of custody entry'))
      return null
    } finally {
      setLoading(false)
    }
  }

  const downloadEvidence = async (evidenceId: string): Promise<Blob | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await evidenceService.downloadEvidence(evidenceId)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to download evidence'))
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    createEvidence,
    createEvidenceWithFiles,
    uploadFile,
    uploadMultipleFiles,
    updateEvidence,
    deleteEvidence,
    addChainOfCustodyEntry,
    downloadEvidence,
    loading,
    error,
  }
}



