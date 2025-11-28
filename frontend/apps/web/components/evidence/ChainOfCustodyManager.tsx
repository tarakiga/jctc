import { useState } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@jctc/ui'
import { ChainOfCustodyForm } from './ChainOfCustodyForm'
import { ChainOfCustodyTimeline } from './ChainOfCustodyTimeline'
import { useChainOfCustody, useEvidenceMutations, useEvidence } from '@/lib/hooks/useEvidence'

interface ChainOfCustodyManagerProps {
  evidenceId: string
  evidenceNumber: string
  currentUser: {
    id: string
    name: string
    role: string
  }
  availableUsers: Array<{
    id: string
    name: string
    role: string
  }>
}

export function ChainOfCustodyManager({ 
  evidenceId, 
  evidenceNumber, 
  currentUser, 
  availableUsers 
}: ChainOfCustodyManagerProps) {
  const [formModalOpened, setFormModalOpened] = useState(false)
  
  // Use the dedicated chain of custody hook for entries
  const { entries: custodyEntries, loading, refetch: loadCustodyHistory } = useChainOfCustody(evidenceId)
  
  // Use mutations hook for adding entries
  const { addChainOfCustodyEntry, loading: mutationLoading } = useEvidenceMutations()
  
  // Use evidence hook for approve/reject/receipt (these require evidenceId)
  const {
    approveChainOfCustodyEntry,
    rejectChainOfCustodyEntry,
    generateCustodyReceipt
  } = useEvidence()

  const handleAddEntry = async (formData: { action: string; location?: string; notes?: string }) => {
    try {
      await addChainOfCustodyEntry(evidenceId, formData)
      alert('Chain of custody entry added successfully')
      await loadCustodyHistory()
      setFormModalOpened(false)
    } catch (error) {
      alert('Failed to add custody entry')
      throw error
    }
  }

  const handleApprove = async (entryId: string) => {
    try {
      await approveChainOfCustodyEntry(evidenceId, entryId)
      alert('Custody entry approved successfully')
      await loadCustodyHistory()
    } catch (error) {
      alert('Failed to approve custody entry')
    }
  }

  const handleReject = async (entryId: string, reason?: string) => {
    try {
      await rejectChainOfCustodyEntry(evidenceId, entryId, reason)
      alert('Custody entry rejected successfully')
      await loadCustodyHistory()
    } catch (error) {
      alert('Failed to reject custody entry')
      throw error
    }
  }

  const handleGenerateReceipt = async (entryId: string): Promise<string> => {
    try {
      const receiptUrl = await generateCustodyReceipt(evidenceId, entryId)
      alert('Receipt generated successfully')
      window.open(receiptUrl, '_blank')
      return receiptUrl
    } catch (error) {
      alert('Failed to generate receipt')
      throw error
    }
  }
  
  const isLoading = loading || mutationLoading

  // Check for pending approvals
  const pendingApprovals = custodyEntries.filter(
    entry => entry.requires_approval && entry.approval_status === 'PENDING'
  )

  // Determine current custodian and location from latest entry
  const currentCustodian = custodyEntries.length > 0 
    ? custodyEntries[custodyEntries.length - 1].custodian_to || custodyEntries[custodyEntries.length - 1].custodian_from || 'Unknown'
    : 'Not assigned'
  
  const currentLocation = custodyEntries.length > 0
    ? custodyEntries[custodyEntries.length - 1].location_to || custodyEntries[custodyEntries.length - 1].location_from || 'Unknown'
    : 'Not assigned'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chain of Custody</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Chain of Custody</h3>
          <Button onClick={() => setFormModalOpened(true)} variant="primary">
            Add Custody Entry
          </Button>
        </div>

        {pendingApprovals.length > 0 && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>⚠️</span>
              <strong>Pending Approvals</strong>
            </div>
            <p style={{ margin: 0 }}>
              {pendingApprovals.length} custody {pendingApprovals.length === 1 ? 'entry' : 'entries'} require your approval
            </p>
          </div>
        )}

        <ChainOfCustodyTimeline
          entries={custodyEntries}
          currentUserId={currentUser.id}
          onApprove={handleApprove}
          onReject={handleReject}
          onGenerateReceipt={handleGenerateReceipt}
          loading={isLoading}
        />

        {formModalOpened && (
          <ChainOfCustodyForm
            opened={formModalOpened}
            onClose={() => setFormModalOpened(false)}
            evidenceId={evidenceId}
            evidenceNumber={evidenceNumber}
            availableUsers={availableUsers}
            currentCustodian={currentCustodian}
            currentLocation={currentLocation}
            onSubmit={handleAddEntry}
            loading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  )
}