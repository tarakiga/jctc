'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCase } from '@/lib/hooks/useCases'
import { useEvidenceByCase } from '@/lib/hooks/useEvidence'
import { PartiesManager } from '@/components/cases/PartiesManager'
import { AssignmentManager } from '@/components/cases/AssignmentManager'
import { TaskManager } from '@/components/tasks/TaskManager'
import { ActionLog } from '@/components/cases/ActionLog'
import { PremiumEvidenceManager } from '@/components/evidence/PremiumEvidenceManager'
import { ChainOfCustodyForm } from '@/components/evidence/ChainOfCustodyForm'
import { DeleteCustodyModal } from '@/components/evidence/DeleteCustodyModal'
import { DeleteConfirmModal } from '@/components/evidence/DeleteConfirmModal'
import { HashVerificationModal } from '@/components/evidence/HashVerificationModal'
import { QRCodeModal } from '@/components/evidence/QRCodeModal'
import { EvidenceFormModal } from '@/components/evidence/EvidenceFormModal'
import { useParties, usePartyMutations } from '@/lib/hooks/useParties'
import { useAssignments, useAvailableUsers, useAssignmentMutations } from '@/lib/hooks/useAssignments'
import { useTasks, useTaskMutations } from '@/lib/hooks/useTasks'
import { useActionLog, useActionMutations } from '@/lib/hooks/useActionLog'
import { useEvidenceItems, useEvidenceItemMutations, useChainOfCustody, useCustodyMutations } from '@/lib/hooks/useEvidenceManagement'
import { SeizureManager } from '@/components/seizures/SeizureManager'
import { DeviceInventory } from '@/components/seizures/DeviceInventory'
import { useSeizures } from '@/lib/hooks/useSeizures'
import { useDevices } from '@/lib/hooks/useDevices'
import ArtefactManager from '@/components/cases/ArtefactManager'
import ReportUploader from '@/components/cases/ReportUploader'
import LegalInstrumentManager from '@/components/legal/LegalInstrumentManager'
import ProsecutionManager from '@/components/prosecution/ProsecutionManager'
import InternationalCooperationManager from '@/components/international/InternationalCooperationManager'
import AttachmentManager from '@/components/cases/AttachmentManager'
import CollaborationManager from '@/components/collaboration/CollaborationManager'
import { CaseDetailSidebar } from '@/components/cases/CaseDetailSidebar'
import { useLookup } from '@/lib/hooks/useLookup'

function CaseDetailContent() {
  const params = useParams()
  const caseId = params?.id as string
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'parties' | 'assignments' | 'tasks' | 'actions' | 'timeline' | 'seizures' | 'devices' | 'forensics' | 'legal' | 'prosecution' | 'international' | 'attachments' | 'collaboration'>('overview')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showChainOfCustody, setShowChainOfCustody] = useState(false)
  const [showChainOfCustodyForm, setShowChainOfCustodyForm] = useState(false)
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false)
  const [isEditEvidenceModalOpen, setIsEditEvidenceModalOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<any>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingCustodyEntry, setDeletingCustodyEntry] = useState<{ id: string; action: string; timestamp: string; evidenceId: string } | null>(null)
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null)
  const [isHashVerifyModalOpen, setIsHashVerifyModalOpen] = useState(false)
  const [hashVerifyResult, setHashVerifyResult] = useState<{ isValid: boolean; evidenceName: string; hash?: string } | null>(null)
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false)
  const [qrCodeEvidence, setQRCodeEvidence] = useState<{ id: string; number: string; label: string } | null>(null)

  // Fetch case details
  const { caseData, loading: caseLoading, error: caseError } = useCase(caseId)

  // Fetch related evidence
  const { evidence } = useEvidenceByCase(caseId)

  // Fetch parties
  const { data: parties = [] } = useParties(caseId)
  const { createParty, updateParty, deleteParty } = usePartyMutations(caseId)

  // Fetch assignments
  const { data: assignments = [] } = useAssignments(caseId)
  const { data: availableUsers = [] } = useAvailableUsers()
  const { assignUser, unassignUser } = useAssignmentMutations(caseId)


  // Fetch tasks
  const { data: tasks = [] } = useTasks(caseId)
  const { createTask, updateTask, deleteTask } = useTaskMutations(caseId)

  // Fetch actions
  const { data: actions = [] } = useActionLog(caseId)
  const { addManualEntry } = useActionMutations(caseId)

  // Transform actions into timeline events
  const timelineEvents = actions.map((action: any) => ({
    id: action.id,
    type: action.action?.toLowerCase().includes('evidence') ? 'evidence' :
      action.action?.toLowerCase().includes('create') ? 'created' :
        action.action?.toLowerCase().includes('update') ? 'update' : 'note',
    title: action.action || 'Action',
    description: action.details || '',
    timestamp: action.created_at,
    user: action.user?.full_name || 'System'
  }))

  // Fetch evidence items (new detailed evidence management)
  const { data: evidenceItems = [] } = useEvidenceItems(caseId)
  const { createEvidence, updateEvidence, deleteEvidence, verifyHash } = useEvidenceItemMutations(caseId)

  // Selected evidence for chain of custody view
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const selectedEvidence = evidenceItems.find(e => e.id === selectedEvidenceId)
  const { data: custodyEntries = [] } = useChainOfCustody(selectedEvidenceId || '')
  const { addCustodyEntry, deleteCustodyEntry } = useCustodyMutations(selectedEvidenceId || '')

  // const { addCustodyEntry, approveEntry, rejectEntry, generateReceipt } = useCustodyMutations(selectedEvidenceId || '')


  // Fetch seizures and devices
  useSeizures(caseId)
  // const { createSeizure, updateSeizure, deleteSeizure } = useSeizureMutations(caseId)
  useDevices(caseId)
  // const { createDevice, updateDevice, deleteDevice, linkDevice } = useDeviceMutations(caseId)



  // Edit case modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Get severity lookup values for colors (must be before conditional returns)
  const { values: severityLookup } = useLookup('case_severity')

  // Loading state
  if (caseLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded-2xl w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (caseError || !caseData) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Case Not Found</h3>
              <p className="text-red-700 mb-4">{caseError?.message || 'This case does not exist'}</p>
              <Button asChild variant="outline">
                <Link href="/cases">Back to Cases</Link>
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getSeverityBadge = (severity: number) => {
    // Find the lookup value matching the severity number
    const severityValue = severityLookup.find(v => v.value === String(severity))
    if (severityValue && severityValue.color) {
      return {
        label: severityValue.label || `Level ${severity}`,
        color: severityValue.color,
        style: { backgroundColor: severityValue.color, color: '#fff' }
      }
    }
    // Fallback to hardcoded values if lookup not found
    const map: Record<number, { label: string; color: string; style: object }> = {
      5: { label: 'Critical', color: '#dc2626', style: { backgroundColor: '#dc2626', color: '#fff' } },
      4: { label: 'High', color: '#ea580c', style: { backgroundColor: '#ea580c', color: '#fff' } },
      3: { label: 'Medium', color: '#ca8a04', style: { backgroundColor: '#ca8a04', color: '#fff' } },
      2: { label: 'Low', color: '#16a34a', style: { backgroundColor: '#16a34a', color: '#fff' } },
      1: { label: 'Info', color: '#0284c7', style: { backgroundColor: '#0284c7', color: '#fff' } },
    }
    return map[severity] || map[3]
  }



  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DIGITAL':
        return { variant: 'info' as const, label: 'Digital' }
      case 'PHYSICAL':
        return { variant: 'default' as const, label: 'Physical' }
      case 'DOCUMENT':
        return { variant: 'default' as const, label: 'Document' }
      default:
        return { variant: 'default' as const, label: type }
    }
  }

  const getRetentionLabel = (policy: string): string => {
    const labels: Record<string, string> = {
      PERMANENT: 'Permanent',
      CASE_CLOSE_PLUS_7: 'Case Close + 7 Years',
      CASE_CLOSE_PLUS_1: 'Case Close + 1 Year',
      DESTROY_AFTER_TRIAL: 'Destroy After Trial',
    }
    return labels[policy] || policy
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/cases" className="text-slate-600 hover:text-blue-600 transition-colors">Cases</Link>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-900 font-medium">{caseData.case_number}</span>
      </div>

      {/* Case Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-neutral-900">{caseData.case_number}</h2>
              <span
                className="px-2.5 py-1 text-xs font-semibold rounded-full"
                style={getSeverityBadge(caseData.severity).style as React.CSSProperties}
              >
                {getSeverityBadge(caseData.severity).label}
              </span>
              <Badge variant="warning">{caseData.status}</Badge>
            </div>
            <p className="text-xl text-neutral-700">{caseData.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>Edit Case</Button>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <CaseDetailSidebar
          activeSection={activeTab}
          onSectionChange={setActiveTab}
          stats={{
            evidenceCount: evidenceItems.length,
            taskCount: tasks.filter(t => t.status !== 'DONE').length,
            teamCount: assignments.length
          }}
          className="flex-shrink-0"
        />

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-8">

          {/* Section Header */}
          <div className="mb-6 pb-4 border-b border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 capitalize flex items-center gap-3">
              {activeTab === 'overview' && <><svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Case Overview</>}
              {activeTab === 'evidence' && <><svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Evidence Management</>}
              {activeTab === 'parties' && <><svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>Parties & Individuals</>}
              {activeTab === 'assignments' && <><svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>Team Assignments</>}
              {activeTab === 'tasks' && <><svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Tasks</>}
              {activeTab === 'actions' && <><svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>Action Log</>}
              {activeTab === 'seizures' && <><svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>Seizures</>}
              {activeTab === 'devices' && <><svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>Devices</>}
              {activeTab === 'forensics' && <><svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>Forensic Analysis</>}
              {activeTab === 'legal' && <><svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>Legal Instruments</>}
              {activeTab === 'prosecution' && <><svg className="w-6 h-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>Prosecution</>}
              {activeTab === 'international' && <><svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>International Cooperation</>}
              {activeTab === 'attachments' && <><svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>Attachments</>}
              {activeTab === 'collaboration' && <><svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>Collaboration</>}
              {activeTab === 'timeline' && <><svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Case Timeline</>}
            </h3>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Case Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-700">{caseData.description}</p>
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Investigation Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Case Type
                          </label>
                          <p className="text-neutral-900">{caseData.case_type || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Date Reported
                          </label>
                          <p className="text-neutral-900">
                            {caseData ? new Date(caseData.date_reported).toLocaleDateString() : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Lead Investigator
                          </label>
                          <p className="text-neutral-900">{caseData.lead_investigator || 'Unassigned'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-600">Scope</label>
                          <p className="text-neutral-900">{caseData.local_or_international}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Intake Information Card */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Intake Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Intake Channel
                          </label>
                          <p className="text-neutral-900 capitalize">
                            {caseData.intake_channel?.replace(/_/g, ' ').toLowerCase() || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            State/Location
                          </label>
                          <p className="text-neutral-900">{caseData.lga_state_location || 'Not specified'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-600">
                          Incident Date/Time
                        </label>
                        <p className="text-neutral-900">
                          {caseData.incident_datetime
                            ? new Date(caseData.incident_datetime).toLocaleString()
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reporter Information Card */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Reporter Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Reporter Type
                          </label>
                          <p className="text-neutral-900 capitalize">
                            {caseData.reporter_type?.replace(/_/g, ' ').toLowerCase() || 'Anonymous'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Reporter Name
                          </label>
                          <p className="text-neutral-900">{caseData.reporter_name || 'Not disclosed'}</p>
                        </div>
                      </div>
                      {caseData.reporter_contact && (caseData.reporter_contact.phone || caseData.reporter_contact.email) && (
                        <div>
                          <label className="text-sm font-medium text-neutral-600">
                            Contact Information
                          </label>
                          <div className="flex flex-wrap gap-4 mt-1">
                            {caseData.reporter_contact.phone && (
                              <span className="text-neutral-900 flex items-center gap-1">
                                <span className="text-neutral-500">📞</span> {caseData.reporter_contact.phone}
                              </span>
                            )}
                            {caseData.reporter_contact.email && (
                              <span className="text-neutral-900 flex items-center gap-1">
                                <span className="text-neutral-500">✉️</span> {caseData.reporter_contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600">Evidence Items</span>
                          <span className="text-lg font-semibold text-neutral-900">
                            {evidence.length}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600">Days Open</span>
                          <span className="text-lg font-semibold text-neutral-900">
                            {Math.floor((new Date().getTime() - new Date(caseData.date_reported).getTime()) / (1000 * 60 * 60 * 24))}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600">Team Members</span>
                          <span className="text-lg font-semibold text-neutral-900">{assignments.length}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Countries Involved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-neutral-600">Origin:</span>
                        <p className="text-neutral-900">{caseData.originating_country || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-neutral-600">
                          Cooperating:
                        </span>
                        <p className="text-neutral-900">
                          {caseData.cooperating_countries?.join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Flags Card */}
                {caseData.risk_flags && caseData.risk_flags.length > 0 && (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle>Risk Flags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {caseData.risk_flags.map((flag: string, index: number) => {
                          const flagColors: Record<string, string> = {
                            'CHILD_SAFETY': 'bg-red-100 text-red-800 border-red-200',
                            'IMMINENT_HARM': 'bg-red-100 text-red-800 border-red-200',
                            'TRAFFICKING': 'bg-orange-100 text-orange-800 border-orange-200',
                            'SEXTORTION': 'bg-purple-100 text-purple-800 border-purple-200',
                            'FINANCIAL_CRITICAL': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                            'HIGH_PROFILE': 'bg-blue-100 text-blue-800 border-blue-200',
                            'CROSS_BORDER': 'bg-indigo-100 text-indigo-800 border-indigo-200',
                          }
                          const colorClass = flagColors[flag] || 'bg-gray-100 text-gray-800 border-gray-200'
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}
                            >
                              {flag.replace(/_/g, ' ')}
                            </span>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Platforms Implicated Card */}
                {caseData.platforms_implicated && caseData.platforms_implicated.length > 0 && (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle>Platforms Implicated</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {caseData.platforms_implicated.map((platform: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="-m-8 h-[calc(100vh-12rem)]">
              <PremiumEvidenceManager
                caseId={caseId}
                evidence={evidenceItems}
                onAdd={() => setIsAddEvidenceModalOpen(true)}
                onEdit={(item) => {
                  setEditingEvidence(item)
                  setIsEditEvidenceModalOpen(true)
                }}
                onDelete={(id) => {
                  setDeletingEvidenceId(id)
                  setIsDeleteModalOpen(true)
                }}
                onView={(item) => {
                  setSelectedEvidenceId(item.id)
                  setIsDrawerOpen(true)
                }}
                onGenerateQR={async (id) => {
                  const evidence = evidenceItems.find(e => e.id === id)
                  if (evidence) {
                    setQRCodeEvidence({
                      id: evidence.id,
                      number: evidence.evidence_number || 'Unknown',
                      label: evidence.label || 'Evidence Item'
                    })
                    setIsQRCodeModalOpen(true)
                  }
                }}
                onDeleteCustodyEntry={(evidenceId, entryId, action, timestamp) => {
                  setDeletingCustodyEntry({ id: entryId, action, timestamp, evidenceId })
                }}
                onVerifyHash={async (id) => {
                  const evidence = evidenceItems.find(e => e.id === id)
                  const isValid = await verifyHash(id)
                  setHashVerifyResult({
                    isValid,
                    evidenceName: evidence?.label || 'Unknown',
                    hash: evidence?.sha256_hash
                  })
                  setIsHashVerifyModalOpen(true)
                  return isValid
                }}
                custodyEntries={custodyEntries}
                onAddCustodyEntry={(id) => {
                  setSelectedEvidenceId(id)
                  setShowChainOfCustodyForm(true)
                }}
              />
            </div>
          )}

          {activeTab === 'parties' && (
            <div>
              <PartiesManager
                caseId={caseId}
                parties={parties}
                onAdd={async (party) => {
                  await createParty(party)
                }}
                onEdit={async (id, party) => {
                  await updateParty(id, party)
                }}
                onDelete={async (id) => {
                  await deleteParty(id)
                }}
              />
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              <AssignmentManager
                caseId={caseId}
                assignments={assignments}
                availableUsers={assignments.map(a => a.user)}
                onAssign={async (userId, role) => {
                  await assignUser(userId, role)
                }}
                onUnassign={async (assignmentId) => {
                  await unassignUser(assignmentId)
                }}
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <TaskManager
                caseId={caseId}
                tasks={tasks}
                availableUsers={availableUsers}
                onAdd={async (task) => {
                  await createTask(task)
                }}
                onEdit={async (id, updates) => {
                  await updateTask(id, updates)
                }}
                onDelete={async (id) => {
                  await deleteTask(id)
                }}
              />
            </div>
          )}

          {activeTab === 'actions' && (
            <div>
              <ActionLog
                caseId={caseId}
                actions={actions}
                onAddManualEntry={async (action) => {
                  await addManualEntry(action)
                }}
              />
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>

              <div className="space-y-8">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="relative pl-16">
                    {/* Timeline Node */}
                    <div className="absolute left-0 flex items-center justify-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${event.type === 'created' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                        event.type === 'evidence' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                          event.type === 'update' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                            'bg-gradient-to-br from-purple-500 to-purple-600'
                        }`}>
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {event.type === 'created' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
                          {event.type === 'evidence' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                          {event.type === 'update' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />}
                          {event.type === 'note' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                        </svg>
                      </div>
                    </div>

                    {/* Event Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{event.title}</h3>
                          <p className="text-slate-600">{event.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.type === 'created' ? 'bg-blue-100 text-blue-700' :
                          event.type === 'evidence' ? 'bg-emerald-100 text-emerald-700' :
                            event.type === 'update' ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-100 text-purple-700'
                          }`}>
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {event.user}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'seizures' && (
            <div>
              <SeizureManager caseId={caseId} />
            </div>
          )}

          {activeTab === 'devices' && (
            <div>
              <DeviceInventory caseId={caseId} />
            </div>
          )}

          {activeTab === 'forensics' && (
            <div className="space-y-8">
              <ArtefactManager caseId={caseId} />
              <div className="border-t border-neutral-200 pt-8">
                <ReportUploader caseId={caseId} />
              </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div>
              <LegalInstrumentManager caseId={caseId} />
            </div>
          )}

          {activeTab === 'prosecution' && (
            <div>
              <ProsecutionManager caseId={caseId} />
            </div>
          )}

          {activeTab === 'international' && (
            <div>
              <InternationalCooperationManager caseId={caseId} />
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              <AttachmentManager caseId={caseId} />
            </div>
          )}

          {activeTab === 'collaboration' && (
            <div>
              <CollaborationManager caseId={caseId} />
            </div>
          )}
        </div>
      </div>

      {/* Premium Evidence Details Drawer */}
      {isDrawerOpen && selectedEvidence && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 shadow-2xl z-50 overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-8 py-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedEvidence.evidence_number}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedEvidence.category === 'DIGITAL' ? 'bg-blue-100 text-blue-700' :
                          selectedEvidence.category === 'PHYSICAL' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                          {getTypeBadge(selectedEvidence.category).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Description</h3>
                <p className="text-slate-900 leading-relaxed">{selectedEvidence.description}</p>
              </div>

              {/* Evidence Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</p>
                      <p className="text-base font-bold text-slate-900">{getTypeBadge(selectedEvidence.category).label}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collected</p>
                      <p className="text-base font-bold text-slate-900">
                        {new Date(selectedEvidence.collected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collected By</p>
                      <p className="text-base font-bold text-slate-900">{selectedEvidence.collected_by_name || 'System'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Storage</p>
                      <p className="text-base font-bold text-slate-900">{selectedEvidence.storage_location || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Retention Policy</p>
                      <p className="text-base font-bold text-slate-900">{getRetentionLabel(selectedEvidence.retention_policy)}</p>
                    </div>
                  </div>
                </div>

                {selectedEvidence.file_path && (
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">File Information</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-base font-bold text-slate-900 truncate pr-2">{selectedEvidence.file_path}</p>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full whitespace-nowrap">{formatFileSize(selectedEvidence.file_size)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SHA-256 Section */}
              {selectedEvidence.sha256_hash && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/60 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    SHA-256 Hash Verified
                  </h3>
                  <code className="block w-full p-3 bg-white/50 rounded-lg border border-green-200 text-xs font-mono text-green-700 break-all select-all">
                    {selectedEvidence.sha256_hash}
                  </code>
                </div>
              )}

              {/* Notes Section */}
              {selectedEvidence.notes && (
                <div className="bg-yellow-50 rounded-2xl border border-yellow-200/60 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-yellow-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notes
                  </h3>
                  <p className="text-yellow-900 leading-relaxed">{selectedEvidence.notes}</p>
                </div>
              )}

              {/* Related Case */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Related Case
                </h3>
                <Link
                  href={`/cases/${selectedEvidence.case_id}`}
                  className="block text-lg font-bold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  {caseData.case_number}
                </Link>
              </div>

              {/* Chain of Custody Section */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Chain of Custody
                      <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {custodyEntries.length} Records
                      </span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChainOfCustody(!showChainOfCustody)}
                    >
                      {showChainOfCustody ? 'Hide' : 'View Full Chain'}
                      <svg
                        className={`w-4 h-4 ml-1.5 transition-transform ${showChainOfCustody ? 'rotate-90' : ''
                          }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {!showChainOfCustody && (
                  <div className="p-6">
                    <p className="text-slate-600">View complete chain of custody records and transfer history.</p>
                  </div>
                )}

                {showChainOfCustody && (
                  <div className="p-6">
                    {custodyEntries.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-neutral-900 font-medium">No custody records yet</p>
                            <p className="text-sm text-neutral-500 mt-1">Chain of custody entries will appear here</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Timeline */
                      <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>

                        <div className="space-y-6">
                          {custodyEntries.map((record) => {
                            const actionColors = {
                              COLLECTED: 'from-emerald-500 to-emerald-600',
                              TRANSFERRED: 'from-blue-500 to-blue-600',
                              EXAMINED: 'from-purple-500 to-purple-600',
                              ACCESSED: 'from-amber-500 to-amber-600',
                            }
                            const actionIcons = {
                              COLLECTED: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              ),
                              TRANSFERRED: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              ),
                              EXAMINED: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              ),
                              ACCESSED: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              ),
                            }

                            return (
                              <div key={record.id} className="relative pl-16">
                                {/* Timeline Node */}
                                <div className="absolute left-0 flex items-center justify-center">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${actionColors[record.action as keyof typeof actionColors] || actionColors.TRANSFERRED
                                    }`}>
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      {actionIcons[record.action as keyof typeof actionIcons] || actionIcons.TRANSFERRED}
                                    </svg>
                                  </div>
                                </div>

                                {/* Record Card */}
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-blue-300 transition-colors">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="text-base font-bold text-slate-900">{record.action}</h4>
                                        {record.signature_verified && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Verified
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-600 mb-3">{record.purpose}</p>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500">
                                      {new Date(record.timestamp).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>

                                  {/* Transfer Details */}
                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    {record.from_person && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">From</p>
                                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          {record.from_person}
                                        </p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                        {record.from_person ? 'To' : 'By'}
                                      </p>
                                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {record.to_person}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Location */}
                                  <div className="mb-3">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Location</p>
                                    <p className="text-sm text-slate-900 flex items-start gap-1.5">
                                      <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {record.location}
                                    </p>
                                  </div>

                                  {/* Notes */}
                                  {record.notes && (
                                    <div className="pt-3 border-t border-slate-200">
                                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                                      <p className="text-sm text-slate-700 leading-relaxed">{record.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="primary" className="flex-1 shadow-lg shadow-blue-500/20">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Evidence
                </Button>
                <Button variant="outline" className="flex-1">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Files
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Case Modal */}
      {isEditModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setIsEditModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl">
              <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-slate-900">Edit Case</h2>
                <p className="text-slate-600 mt-1">{caseData.case_number}</p>
              </div>

              <form className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Case Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={caseData.title}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="Brief case title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    defaultValue={caseData.description}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
                    placeholder="Detailed case description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Date Reported */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date Reported <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      defaultValue={caseData.date_reported?.split('T')[0]}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    />
                  </div>

                  {/* Lead Investigator */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Lead Investigator
                    </label>
                    <input
                      type="text"
                      defaultValue={caseData.lead_investigator}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                      placeholder="Investigator name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Severity Level */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Severity Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={caseData.severity}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="5">5 - Critical</option>
                      <option value="4">4 - High</option>
                      <option value="3">3 - Medium</option>
                      <option value="2">2 - Low</option>
                      <option value="1">1 - Very Low</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={caseData.status}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all bg-white"
                    >
                      <option value="OPEN">Open</option>
                      <option value="UNDER_INVESTIGATION">Under Investigation</option>
                      <option value="PENDING_PROSECUTION">Pending Prosecution</option>
                      <option value="IN_COURT">In Court</option>
                      <option value="CLOSED">Closed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              </form>

              <div className="px-8 py-6 border-t border-slate-200/60 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (deletingEvidenceId) {
            await deleteEvidence(deletingEvidenceId)
            setDeletingEvidenceId(null)
          }
        }}
        evidenceName={evidenceItems.find(e => e.id === deletingEvidenceId)?.label || 'Unknown'}
      />

      {/* Hash Verification Result Modal */}
      {hashVerifyResult && (
        <HashVerificationModal
          isOpen={isHashVerifyModalOpen}
          onClose={() => {
            setIsHashVerifyModalOpen(false)
            setHashVerifyResult(null)
          }}
          isValid={hashVerifyResult.isValid}
          evidenceName={hashVerifyResult.evidenceName}
          hash={hashVerifyResult.hash}
        />
      )}

      {/* Add/Edit Evidence Modal */}
      <EvidenceFormModal
        isOpen={isAddEvidenceModalOpen || isEditEvidenceModalOpen}
        onClose={() => {
          setIsAddEvidenceModalOpen(false)
          setIsEditEvidenceModalOpen(false)
          setEditingEvidence(null)
        }}
        onSubmit={async (evidence) => {
          if (editingEvidence) {
            await updateEvidence(editingEvidence.id, evidence)
          } else {
            await createEvidence(evidence)
          }
          setEditingEvidence(null)
        }}
        editingEvidence={editingEvidence}
      />

      {/* QR Code Modal */}
      {qrCodeEvidence && (
        <QRCodeModal
          isOpen={isQRCodeModalOpen}
          onClose={() => {
            setIsQRCodeModalOpen(false)
            setQRCodeEvidence(null)
          }}
          evidenceNumber={qrCodeEvidence.number}
          evidenceLabel={qrCodeEvidence.label}
          evidenceId={qrCodeEvidence.id}
        />
      )}

      {/* Delete Custody Entry Confirmation Modal */}
      {deletingCustodyEntry && (
        <DeleteCustodyModal
          isOpen={!!deletingCustodyEntry}
          onClose={() => setDeletingCustodyEntry(null)}
          onConfirm={async () => {
            if (deletingCustodyEntry) {
              await deleteCustodyEntry(deletingCustodyEntry.id)
              setDeletingCustodyEntry(null)
            }
          }}
          itemAction={deletingCustodyEntry.action}
          itemDate={deletingCustodyEntry.timestamp}
        />
      )}

      {/* Chain of Custody Form Modal */}
      {showChainOfCustodyForm && (
        <ChainOfCustodyForm
          opened={showChainOfCustodyForm}
          onClose={() => setShowChainOfCustodyForm(false)}
          evidenceId={selectedEvidenceId || ''}
          evidenceNumber={selectedEvidence?.evidence_number || ''}
          currentCustodian={selectedEvidence?.collected_by}
          currentLocation={selectedEvidence?.storage_location}
          availableUsers={availableUsers.map(u => ({ id: u.id, name: u.full_name, role: u.role }))}
          onSubmit={async (data) => {
            const toUser = availableUsers.find(u => u.id === data.custodian_to)
            const fromUser = availableUsers.find(u => u.id === data.custodian_from)

            await addCustodyEntry({
              action: data.action as 'COLLECTED' | 'SEIZED' | 'TRANSFERRED' | 'ANALYZED' | 'PRESENTED_COURT' | 'RETURNED' | 'DISPOSED',
              to_person: data.custodian_to || '',
              to_person_name: toUser ? toUser.full_name : 'Unknown',
              from_person: data.custodian_from,
              from_person_name: fromUser ? fromUser.full_name : undefined,
              location: data.location_to || '',
              purpose: data.notes, // Using notes as purpose since form doesn't have dedicated purpose field
              notes: data.notes,
              signature_verified: data.signature_verified,
              requires_approval: data.requires_approval
            })
            setShowChainOfCustodyForm(false)
          }}
        />
      )}
    </DashboardLayout>
  )
}

export default function CaseDetailPage() {
  return (
    <ProtectedRoute requireAuth requiredPermissions={['cases:view']}>
      <CaseDetailContent />
    </ProtectedRoute>
  )
}
