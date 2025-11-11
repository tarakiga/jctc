'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ProtectedRoute } from '@/lib/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCase } from '@/lib/hooks/useCases'
import { useEvidenceByCase } from '@/lib/hooks/useEvidence'
import { PartiesManager } from '@/components/cases/PartiesManager'
import { AssignmentManager } from '@/components/cases/AssignmentManager'
import { TaskManager } from '@/components/tasks/TaskManager'
import { ActionLog } from '@/components/cases/ActionLog'
import { EvidenceItemManager } from '@/components/evidence/EvidenceItemManager'
import { ChainOfCustody } from '@/components/evidence/ChainOfCustody'
import { PremiumEvidenceManager } from '@/components/evidence/PremiumEvidenceManager'
import { useParties, usePartyMutations } from '@/lib/hooks/useParties'
import { useAssignments, useAvailableUsers, useAssignmentMutations } from '@/lib/hooks/useAssignments'
import { useTasks, useTaskMutations } from '@/lib/hooks/useTasks'
import { useActionLog, useActionMutations } from '@/lib/hooks/useActionLog'
import { useEvidenceItems, useEvidenceItemMutations, useChainOfCustody, useCustodyMutations } from '@/lib/hooks/useEvidenceManagement'
import { SeizureManager } from '@/components/seizures/SeizureManager'
import { DeviceInventory } from '@/components/seizures/DeviceInventory'
import { useSeizures, useSeizureMutations } from '@/lib/hooks/useSeizures'
import { useDevices, useDeviceMutations } from '@/lib/hooks/useDevices'
import ArtefactManager from '@/components/cases/ArtefactManager'
import ReportUploader from '@/components/cases/ReportUploader'
import LegalInstrumentManager from '@/components/legal/LegalInstrumentManager'
import ProsecutionManager from '@/components/prosecution/ProsecutionManager'
import InternationalCooperationManager from '@/components/international/InternationalCooperationManager'
import AttachmentManager from '@/components/cases/AttachmentManager'
import CollaborationManager from '@/components/collaboration/CollaborationManager'
import { CaseDetailSidebar } from '@/components/cases/CaseDetailSidebar'

function CaseDetailContent() {
  const { user, logout } = useAuth()
  const params = useParams()
  const caseId = params.id as string
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'parties' | 'assignments' | 'tasks' | 'actions' | 'timeline' | 'seizures' | 'devices' | 'forensics' | 'legal' | 'prosecution' | 'international' | 'attachments' | 'collaboration'>('overview')
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showChainOfCustody, setShowChainOfCustody] = useState(false)
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false)
  const [isEditEvidenceModalOpen, setIsEditEvidenceModalOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<any>(null)
  const [isAddCustodyModalOpen, setIsAddCustodyModalOpen] = useState(false)

  // Fetch case details
  const { caseData, loading: caseLoading, error: caseError } = useCase(caseId)

  // Fetch related evidence
  const { evidence, loading: evidenceLoading, error: evidenceError } = useEvidenceByCase(caseId)

  // Fetch parties
  const { data: parties = [], isLoading: partiesLoading } = useParties(caseId)
  const { createParty, updateParty, deleteParty } = usePartyMutations(caseId)

  // Fetch assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(caseId)
  const { data: availableUsers = [], isLoading: usersLoading } = useAvailableUsers()
  const { assignUser, unassignUser } = useAssignmentMutations(caseId)

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(caseId)
  const { createTask, updateTask, deleteTask } = useTaskMutations(caseId)

  // Fetch actions
  const { data: actions = [], isLoading: actionsLoading } = useActionLog(caseId)
  const { addManualEntry } = useActionMutations(caseId)

  // Fetch evidence items (new detailed evidence management)
  const { data: evidenceItems = [], isLoading: evidenceItemsLoading } = useEvidenceItems(caseId)
  const { createEvidence, updateEvidence, deleteEvidence, generateQR, verifyHash } = useEvidenceItemMutations(caseId)

  // Selected evidence for chain of custody view
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const { data: custodyEntries = [], isLoading: custodyLoading } = useChainOfCustody(selectedEvidenceId || '')
  const { addCustodyEntry, approveEntry, rejectEntry, generateReceipt } = useCustodyMutations(selectedEvidenceId || '')

  // Mock chain of custody data for evidence items (when API returns empty)
  const mockCustodyData = [
    {
      id: 'custody-1',
      evidence_id: evidenceItems[0]?.id || 'evidence-1',
      timestamp: '2025-01-16T09:30:00Z',
      action: 'COLLECTED' as const,
      from_person: null,
      from_person_name: undefined,
      to_person: 'user-1',
      to_person_name: 'Jane Smith',
      location: 'Crime Scene - ABC Corp Office, Floor 3',
      purpose: 'Initial evidence collection from suspect workstation',
      notes: 'Evidence collected in sealed tamper-evident bag. Photographed in situ before collection.',
      signature_verified: true,
      created_by: 'user-1',
      created_by_name: 'Jane Smith',
      created_at: '2025-01-16T09:30:00Z',
    },
    {
      id: 'custody-2',
      evidence_id: evidenceItems[0]?.id || 'evidence-1',
      timestamp: '2025-01-16T14:15:00Z',
      action: 'TRANSFERRED' as const,
      from_person: 'user-1',
      from_person_name: 'Jane Smith',
      to_person: 'user-2',
      to_person_name: 'Michael Chen',
      location: 'Evidence Room A - JCTC Headquarters',
      purpose: 'Transfer to digital forensics lab for analysis',
      notes: 'Seal integrity verified. Evidence bag unopened. Logged into evidence management system.',
      signature_verified: true,
      created_by: 'user-1',
      created_by_name: 'Jane Smith',
      created_at: '2025-01-16T14:15:00Z',
    },
    {
      id: 'custody-3',
      evidence_id: evidenceItems[0]?.id || 'evidence-1',
      timestamp: '2025-01-17T10:00:00Z',
      action: 'EXAMINED' as const,
      from_person: 'user-2',
      from_person_name: 'Michael Chen',
      to_person: 'user-2',
      to_person_name: 'Michael Chen',
      location: 'Digital Forensics Lab - Room 204',
      purpose: 'Forensic analysis and data extraction',
      notes: 'Created forensic image using FTK Imager. Hash values: MD5 verified. Original evidence resealed.',
      signature_verified: true,
      created_by: 'user-2',
      created_by_name: 'Michael Chen',
      created_at: '2025-01-17T10:00:00Z',
    },
    {
      id: 'custody-4',
      evidence_id: evidenceItems[0]?.id || 'evidence-1',
      timestamp: '2025-01-17T16:45:00Z',
      action: 'TRANSFERRED' as const,
      from_person: 'user-2',
      from_person_name: 'Michael Chen',
      to_person: 'user-3',
      to_person_name: 'Sarah Johnson',
      location: 'Secure Storage Vault B',
      purpose: 'Long-term secure storage pending trial',
      notes: 'Analysis complete. Evidence returned to secure storage. Climate-controlled environment.',
      signature_verified: true,
      created_by: 'user-2',
      created_by_name: 'Michael Chen',
      created_at: '2025-01-17T16:45:00Z',
    },
    {
      id: 'custody-5',
      evidence_id: evidenceItems[0]?.id || 'evidence-1',
      timestamp: '2025-01-20T11:20:00Z',
      action: 'ACCESSED' as const,
      from_person: 'user-3',
      from_person_name: 'Sarah Johnson',
      to_person: 'user-3',
      to_person_name: 'Sarah Johnson',
      location: 'Secure Storage Vault B',
      purpose: 'Inspection by defense counsel',
      notes: 'Evidence presented to defense attorney. Seal inspected - intact. No tampering detected.',
      signature_verified: true,
      created_by: 'user-3',
      created_by_name: 'Sarah Johnson',
      created_at: '2025-01-20T11:20:00Z',
    },
  ]

  // Use mock data if API returns empty or use real data
  const displayCustodyEntries = custodyEntries.length > 0 ? custodyEntries : mockCustodyData

  // Fetch seizures and devices
  const { data: seizures = [], isLoading: seizuresLoading } = useSeizures(caseId)
  const { createSeizure, updateSeizure, deleteSeizure } = useSeizureMutations(caseId)
  const { data: devices = [], isLoading: devicesLoading } = useDevices(caseId)
  const { createDevice, updateDevice, deleteDevice, linkDevice } = useDeviceMutations(caseId)

  // Edit case modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
    const map: Record<number, { variant: any; label: string }> = {
      5: { variant: 'critical', label: 'Critical' },
      4: { variant: 'high', label: 'High' },
      3: { variant: 'medium', label: 'Medium' },
    }
    return map[severity] || map[3]
  }

  // Mock timeline data
  const timelineEvents = [
    { id: 1, type: 'created', title: 'Case Created', description: 'Case opened and assigned for investigation', timestamp: caseData.date_reported, user: 'System' },
    { id: 2, type: 'evidence', title: 'Evidence Collected', description: 'Email server logs and transaction records secured', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 2).toISOString(), user: 'Jane Smith' },
    { id: 3, type: 'update', title: 'Status Updated', description: 'Case status changed to Under Investigation', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 3).toISOString(), user: 'John Doe' },
    { id: 4, type: 'evidence', title: 'Additional Evidence', description: 'Bank transaction records and IP logs added to case', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 5).toISOString(), user: 'Jane Smith' },
    { id: 5, type: 'note', title: 'Investigation Note', description: 'Suspect identified. Preparing for arrest warrant', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 7).toISOString(), user: 'Lead Investigator' },
  ]

  // Mock chain of custody data
  const mockChainOfCustody = [
    {
      id: '1',
      timestamp: '2025-01-16T09:30:00Z',
      action: 'COLLECTED',
      from_person: null,
      to_person: 'Jane Smith',
      location: 'Crime Scene - ABC Corp Office, Floor 3',
      purpose: 'Initial evidence collection from suspect workstation',
      notes: 'Evidence collected in sealed tamper-evident bag. Photographed in situ before collection.',
      signature_verified: true,
    },
    {
      id: '2',
      timestamp: '2025-01-16T14:15:00Z',
      action: 'TRANSFERRED',
      from_person: 'Jane Smith',
      to_person: 'Michael Chen',
      location: 'Evidence Room A - JCTC Headquarters',
      purpose: 'Transfer to digital forensics lab for analysis',
      notes: 'Seal integrity verified. Evidence bag unopened. Logged into evidence management system.',
      signature_verified: true,
    },
    {
      id: '3',
      timestamp: '2025-01-17T10:00:00Z',
      action: 'EXAMINED',
      from_person: 'Michael Chen',
      to_person: 'Michael Chen',
      location: 'Digital Forensics Lab - Room 204',
      purpose: 'Forensic analysis and data extraction',
      notes: 'Created forensic image using FTK Imager. Hash values: MD5 verified. Original evidence resealed.',
      signature_verified: true,
    },
    {
      id: '4',
      timestamp: '2025-01-17T16:45:00Z',
      action: 'TRANSFERRED',
      from_person: 'Michael Chen',
      to_person: 'Sarah Johnson',
      location: 'Secure Storage Vault B',
      purpose: 'Long-term secure storage pending trial',
      notes: 'Analysis complete. Evidence returned to secure storage. Climate-controlled environment.',
      signature_verified: true,
    },
    {
      id: '5',
      timestamp: '2025-01-20T11:20:00Z',
      action: 'ACCESSED',
      from_person: 'Sarah Johnson',
      to_person: 'Sarah Johnson',
      location: 'Secure Storage Vault B',
      purpose: 'Inspection by defense counsel',
      notes: 'Evidence presented to defense attorney. Seal inspected - intact. No tampering detected.',
      signature_verified: true,
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SECURE':
        return { variant: 'success' as const, label: 'Secure' }
      case 'IN_TRANSIT':
        return { variant: 'warning' as const, label: 'In Transit' }
      case 'COMPROMISED':
        return { variant: 'critical' as const, label: 'Compromised' }
      default:
        return { variant: 'default' as const, label: status }
    }
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
              <Badge {...getSeverityBadge(caseData.severity)}>
                {getSeverityBadge(caseData.severity).label}
              </Badge>
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
            taskCount: tasks.filter(t => t.status !== 'COMPLETED').length,
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
                        <p className="text-neutral-900">Business Email Compromise</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-600">
                          Date Reported
                        </label>
                        <p className="text-neutral-900">
                          {new Date(caseData.date_reported).toLocaleDateString()}
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
                        <span className="text-lg font-semibold text-neutral-900">13</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Team Members</span>
                        <span className="text-lg font-semibold text-neutral-900">4</span>
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
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div>
            <PremiumEvidenceManager
              caseId={caseId}
              evidence={evidenceItems}
              onAdd={() => setIsAddEvidenceModalOpen(true)}
              onEdit={(item) => {
                setEditingEvidence(item)
                setIsEditEvidenceModalOpen(true)
              }}
              onDelete={async (id) => {
                if (confirm('Are you sure you want to delete this evidence item?')) {
                  await deleteEvidence(id)
                }
              }}
              onGenerateQR={async (id) => {
                return await generateQR(id)
              }}
              onVerifyHash={async (id) => {
                return await verifyHash(id)
              }}
              custodyEntries={displayCustodyEntries}
              onAddCustodyEntry={() => setIsAddCustodyModalOpen(true)}
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
              availableUsers={availableUsers}
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
              {timelineEvents.map((event, index) => (
                <div key={event.id} className="relative pl-16">
                  {/* Timeline Node */}
                  <div className="absolute left-0 flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                      event.type === 'created' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        event.type === 'created' ? 'bg-blue-100 text-blue-700' :
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedEvidence.type === 'DIGITAL' ? 'bg-blue-100 text-blue-700' :
                          selectedEvidence.type === 'PHYSICAL' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {getTypeBadge(selectedEvidence.type).label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          selectedEvidence.chain_of_custody_status === 'SECURE' ? 'bg-green-100 text-green-700' :
                          selectedEvidence.chain_of_custody_status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {getStatusBadge(selectedEvidence.chain_of_custody_status).label}
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
                      <p className="text-base font-bold text-slate-900">{getTypeBadge(selectedEvidence.type).label}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
                      <p className="text-base font-bold text-slate-900">{getStatusBadge(selectedEvidence.chain_of_custody_status).label}</p>
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
                        {new Date(selectedEvidence.collected_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                      <p className="text-base font-bold text-slate-900">{selectedEvidence.collected_by}</p>
                    </div>
                  </div>
                </div>
              </div>

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
                        {mockChainOfCustody.length} Records
                      </span>
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowChainOfCustody(!showChainOfCustody)}
                    >
                      {showChainOfCustody ? 'Hide' : 'View Full Chain'}
                      <svg 
                        className={`w-4 h-4 ml-1.5 transition-transform ${
                          showChainOfCustody ? 'rotate-90' : ''
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
                    {/* Timeline */}
                    <div className="relative">
                      {/* Vertical Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>
                      
                      <div className="space-y-6">
                        {mockChainOfCustody.map((record, index) => {
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
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${
                                  actionColors[record.action as keyof typeof actionColors] || actionColors.TRANSFERRED
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
