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

  // Mock assignment data for UI testing
  const mockAssignments = [
    {
      id: 'assign-1',
      user_id: 'user-1',
      user: {
        id: 'user-1',
        full_name: 'Jane Smith',
        email: 'jane.smith@jctc.gov',
        role: 'Senior Investigator',
        org_unit: 'Cybercrime Division',
      },
      role: 'LEAD' as const,
      assigned_at: '2025-01-10T08:00:00Z',
    },
    {
      id: 'assign-2',
      user_id: 'user-2',
      user: {
        id: 'user-2',
        full_name: 'Michael Chen',
        email: 'michael.chen@jctc.gov',
        role: 'Digital Forensics Specialist',
        org_unit: 'Forensics Lab',
      },
      role: 'SUPPORT' as const,
      assigned_at: '2025-01-10T09:30:00Z',
    },
    {
      id: 'assign-3',
      user_id: 'user-3',
      user: {
        id: 'user-3',
        full_name: 'Sarah Johnson',
        email: 'sarah.johnson@prosecutor.gov',
        role: 'Prosecutor',
        org_unit: 'State Prosecution Office',
      },
      role: 'PROSECUTOR' as const,
      assigned_at: '2025-01-12T14:00:00Z',
    },
    {
      id: 'assign-4',
      user_id: 'user-4',
      user: {
        id: 'user-4',
        full_name: 'David Martinez',
        email: 'david.martinez@jctc.gov',
        role: 'International Liaison Officer',
        org_unit: 'International Cooperation',
      },
      role: 'LIAISON' as const,
      assigned_at: '2025-01-15T10:00:00Z',
    },
    {
      id: 'assign-5',
      user_id: 'user-5',
      user: {
        id: 'user-5',
        full_name: 'Emma Wilson',
        email: 'emma.wilson@jctc.gov',
        role: 'Intelligence Analyst',
        org_unit: 'Intelligence Unit',
      },
      role: 'SUPPORT' as const,
      assigned_at: '2025-01-11T11:00:00Z',
    },
  ]

  // Use mock assignments data for UI testing - bypass real API
  const displayAssignments = mockAssignments

  // Fetch tasks
  const { data: tasks = [] } = useTasks(caseId)
  const { createTask, updateTask, deleteTask } = useTaskMutations(caseId)

  // Fetch actions
  const { data: actions = [] } = useActionLog(caseId)
  const { addManualEntry } = useActionMutations(caseId)

  // Mock timeline data for UI testing - only create when caseData exists
  const timelineEvents = caseData ? [
    { id: 1, type: 'created', title: 'Case Created', description: 'Case opened and assigned for investigation', timestamp: caseData.date_reported, user: 'System' },
    { id: 2, type: 'evidence', title: 'Evidence Collected', description: 'Email server logs and transaction records secured', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 2).toISOString(), user: 'Jane Smith' },
    { id: 3, type: 'update', title: 'Status Updated', description: 'Case status changed to Under Investigation', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 3).toISOString(), user: 'John Doe' },
    { id: 4, type: 'evidence', title: 'Additional Evidence', description: 'Bank transaction records and IP logs added to case', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 5).toISOString(), user: 'Jane Smith' },
    { id: 5, type: 'note', title: 'Investigation Note', description: 'Suspect identified. Preparing for arrest warrant', timestamp: new Date(new Date(caseData.date_reported).getTime() + 86400000 * 7).toISOString(), user: 'Lead Investigator' },
  ] : []

  // Fetch evidence items (new detailed evidence management)
  const { data: evidenceItems = [] } = useEvidenceItems(caseId)
  const { createEvidence, updateEvidence, deleteEvidence, verifyHash } = useEvidenceItemMutations(caseId)

  // Selected evidence for chain of custody view
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const selectedEvidence = evidenceItems.find(e => e.id === selectedEvidenceId)
  const { data: custodyEntries = [] } = useChainOfCustody(selectedEvidenceId || '')
  const { addCustodyEntry } = useCustodyMutations(selectedEvidenceId || '')
  // const { addCustodyEntry, approveEntry, rejectEntry, generateReceipt } = useCustodyMutations(selectedEvidenceId || '')

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
  useSeizures(caseId)
  // const { createSeizure, updateSeizure, deleteSeizure } = useSeizureMutations(caseId)
  useDevices(caseId)
  // const { createDevice, updateDevice, deleteDevice, linkDevice } = useDeviceMutations(caseId)

  // Mock seizures data for UI testing
  const mockSeizures = [
    {
      id: 'seizure-1',
      case_id: caseId,
      seizure_date: '2025-01-16T08:30:00Z',
      seized_at: '2025-01-16T08:30:00Z',
      location: 'ABC Corporation Headquarters, 123 Tech Street, Floor 3, Room 305',
      seized_by: 'user-1',
      seized_by_name: 'Jane Smith',
      officer_id: 'user-1',
      officer_name: 'Jane Smith',
      warrant_number: 'WRT-2025-00147',
      warrant_type: 'SEARCH_WARRANT' as const,
      issuing_authority: 'District Court Judge Maria Rodriguez',
      items_count: 8,
      description: 'Execution of search warrant at suspect\'s workplace. Multiple digital devices and documents seized from cubicle and file cabinets.',
      notes: 'All items photographed in situ before seizure. Chain of custody forms completed on-site. Building security footage preserved.',
      status: 'COMPLETED' as const,
      photos: [
        { id: 'photo-1', url: '/evidence/seizure-1-photo-1.jpg', filename: 'cubicle_overview.jpg' },
        { id: 'photo-2', url: '/evidence/seizure-1-photo-2.jpg', filename: 'laptop_in_situ.jpg' },
        { id: 'photo-3', url: '/evidence/seizure-1-photo-3.jpg', filename: 'desk_items.jpg' },
        { id: 'photo-4', url: '/evidence/seizure-1-photo-4.jpg', filename: 'filing_cabinet.jpg' },
      ],
      witnesses: ['Security Guard - Robert Martinez', 'HR Manager - Lisa Thompson'],
      created_at: '2025-01-16T08:30:00Z',
      updated_at: '2025-01-16T15:00:00Z',
    },
    {
      id: 'seizure-2',
      case_id: caseId,
      seizure_date: '2025-01-18T14:00:00Z',
      seized_at: '2025-01-18T14:00:00Z',
      location: '456 Residential Ave, Apartment 12B, Suspect\'s Residence',
      seized_by: 'user-1',
      seized_by_name: 'Jane Smith',
      officer_id: 'user-1',
      officer_name: 'Jane Smith',
      warrant_number: 'WRT-2025-00148',
      warrant_type: 'SEARCH_WARRANT' as const,
      issuing_authority: 'District Court Judge Thomas Williams',
      items_count: 12,
      description: 'Residential search warrant execution. Additional computing devices, storage media, and financial documents recovered.',
      notes: 'Suspect not present during search. Landlord present as witness. Items inventoried and documented with detailed photographs.',
      status: 'COMPLETED' as const,
      photos: [
        { id: 'photo-5', url: '/evidence/seizure-2-photo-1.jpg', filename: 'home_office.jpg' },
        { id: 'photo-6', url: '/evidence/seizure-2-photo-2.jpg', filename: 'desktop_setup.jpg' },
        { id: 'photo-7', url: '/evidence/seizure-2-photo-3.jpg', filename: 'storage_devices.jpg' },
        { id: 'photo-8', url: '/evidence/seizure-2-photo-4.jpg', filename: 'documents_found.jpg' },
        { id: 'photo-9', url: '/evidence/seizure-2-photo-5.jpg', filename: 'bedroom_tablet.jpg' },
        { id: 'photo-10', url: '/evidence/seizure-2-photo-6.jpg', filename: 'evidence_bags.jpg' },
      ],
      witnesses: ['Landlord - Thomas Anderson', 'Neighbor - Maria Gonzalez'],
      created_at: '2025-01-18T14:00:00Z',
      updated_at: '2025-01-18T18:30:00Z',
    },
    {
      id: 'seizure-3',
      case_id: caseId,
      seizure_date: '2025-01-20T10:30:00Z',
      seized_at: '2025-01-20T10:30:00Z',
      location: 'Cloud Storage Provider - Legal Compliance Office, 789 Data Center Blvd',
      seized_by: 'user-2',
      seized_by_name: 'Michael Chen',
      officer_id: 'user-2',
      officer_name: 'Michael Chen',
      warrant_number: 'WRT-2025-00151',
      warrant_type: 'PRODUCTION_ORDER' as const,
      issuing_authority: 'District Court Judge Patricia Anderson',
      items_count: 3,
      description: 'Production order executed for cloud storage account data. Email communications, file metadata, and access logs obtained.',
      notes: 'Data provided in encrypted format with decryption keys. Legal counsel for provider present during handover. 30-day preservation order remains active.',
      status: 'COMPLETED' as const,
      photos: [
        { id: 'photo-11', url: '/evidence/seizure-3-photo-1.jpg', filename: 'handover_document.jpg' },
        { id: 'photo-12', url: '/evidence/seizure-3-photo-2.jpg', filename: 'encrypted_drive.jpg' },
      ],
      witnesses: ['Legal Counsel - Jennifer Lee', 'Compliance Officer - David Park'],
      created_at: '2025-01-20T10:30:00Z',
      updated_at: '2025-01-20T16:00:00Z',
    },
  ]

  // Use mock seizures data for UI testing - bypass real API
  const displaySeizures = mockSeizures

  // Mock devices data for UI testing
  const mockDevices = [
    {
      id: 'device-1',
      case_id: caseId,
      seizure_id: 'seizure-1',
      device_type: 'LAPTOP' as const,
      make: 'Dell',
      model: 'Latitude 5520',
      serial_number: 'DL5520-2024-X7J9K3',
      imei: null,
      storage_capacity: '512GB SSD',
      operating_system: 'Windows 11 Pro',
      condition: 'GOOD' as const,
      powered_on: false,
      password_protected: true,
      encryption_status: 'BITLOCKER' as const,
      description: 'Primary work laptop found on suspect\'s desk. Contains business documents and email client.',
      forensic_notes: 'Device imaged using write blocker. Full disk encryption detected. Acquisition completed successfully.',
      status: 'ANALYZED' as const,
      created_at: '2025-01-16T09:00:00Z',
      updated_at: '2025-01-17T14:30:00Z',
    },
    {
      id: 'device-2',
      case_id: caseId,
      seizure_id: 'seizure-1',
      device_type: 'MOBILE_PHONE' as const,
      make: 'Apple',
      model: 'iPhone 14 Pro',
      serial_number: 'FKWQ7N2PQR',
      imei: '356789012345678',
      storage_capacity: '256GB',
      operating_system: 'iOS 17.2',
      condition: 'EXCELLENT' as const,
      powered_on: false,
      password_protected: true,
      encryption_status: 'ENCRYPTED' as const,
      description: 'Personal smartphone found in desk drawer. Multiple encrypted messaging apps installed.',
      forensic_notes: 'Device in airplane mode. SIM card removed and catalogued separately. Logical extraction attempted - partial success.',
      status: 'IN_PROGRESS' as const,
      created_at: '2025-01-16T09:15:00Z',
      updated_at: '2025-01-22T10:00:00Z',
    },
    {
      id: 'device-3',
      case_id: caseId,
      seizure_id: 'seizure-1',
      device_type: 'EXTERNAL_STORAGE' as const,
      make: 'Samsung',
      model: 'T7 Portable SSD',
      serial_number: 'S6XNNS0T123456',
      imei: null,
      storage_capacity: '1TB',
      operating_system: null,
      condition: 'GOOD' as const,
      powered_on: false,
      password_protected: false,
      encryption_status: 'NONE' as const,
      description: 'External SSD found connected to laptop via USB. Contains archived project files and backups.',
      forensic_notes: 'No encryption detected. Full bit-by-bit image created. Contains deleted files recovered during analysis.',
      status: 'ANALYZED' as const,
      created_at: '2025-01-16T09:20:00Z',
      updated_at: '2025-01-17T16:00:00Z',
    },
    {
      id: 'device-4',
      case_id: caseId,
      seizure_id: 'seizure-2',
      device_type: 'DESKTOP' as const,
      make: 'Custom Built',
      model: 'Gaming PC',
      serial_number: 'N/A',
      imei: null,
      storage_capacity: '2TB NVMe + 4TB HDD',
      operating_system: 'Windows 11 Home',
      condition: 'EXCELLENT' as const,
      powered_on: false,
      password_protected: true,
      encryption_status: 'PARTIAL' as const,
      description: 'High-performance desktop computer from suspect\'s home office. Multiple storage drives installed.',
      forensic_notes: 'System drive encrypted, data drives unencrypted. Evidence of file wiping software. RAM imaging performed.',
      status: 'IN_PROGRESS' as const,
      created_at: '2025-01-18T15:00:00Z',
      updated_at: '2025-01-22T09:00:00Z',
    },
    {
      id: 'device-5',
      case_id: caseId,
      seizure_id: 'seizure-2',
      device_type: 'TABLET' as const,
      make: 'Samsung',
      model: 'Galaxy Tab S9',
      serial_number: 'RF8T1234567',
      imei: '352468098765432',
      storage_capacity: '128GB',
      operating_system: 'Android 14',
      condition: 'GOOD' as const,
      powered_on: false,
      password_protected: true,
      encryption_status: 'ENCRYPTED' as const,
      description: 'Android tablet recovered from bedroom nightstand. Used for personal browsing and communication.',
      forensic_notes: 'Device locked with pattern lock. ADB debugging disabled. Attempting alternative extraction methods.',
      status: 'PENDING' as const,
      created_at: '2025-01-18T15:30:00Z',
      updated_at: '2025-01-18T15:30:00Z',
    },
    {
      id: 'device-6',
      case_id: caseId,
      seizure_id: 'seizure-2',
      device_type: 'USB_DRIVE' as const,
      make: 'SanDisk',
      model: 'Ultra Flair',
      serial_number: '1234567890ABCD',
      imei: null,
      storage_capacity: '64GB',
      operating_system: null,
      condition: 'GOOD' as const,
      powered_on: false,
      password_protected: true,
      encryption_status: 'ENCRYPTED' as const,
      description: 'Encrypted USB flash drive found in desk drawer. Password-protected with BitLocker To Go.',
      forensic_notes: 'Strong encryption detected. Attempting password recovery through suspect interview and related documents.',
      status: 'PENDING' as const,
      created_at: '2025-01-18T16:00:00Z',
      updated_at: '2025-01-20T11:00:00Z',
    },
  ]

  // Use mock devices data for UI testing - bypass real API
  const displayDevices = mockDevices

  // Mock attachments data (matches Attachment interface from useAttachments)
  const mockAttachments = [
    {
      id: 'attach-1',
      case_id: caseId,
      title: 'Forensic Analysis Report - January 2025',
      filename: 'Forensic_Analysis_Report_Jan2025.pdf',
      file_type: 'application/pdf',
      file_size: 2458624, // 2.4 MB
      classification: 'LE_SENSITIVE' as const,
      sha256_hash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      virus_scan_status: 'CLEAN' as const,
      uploaded_by: 'Michael Chen',
      uploaded_at: '2025-01-22T16:30:00Z',
      notes: 'Comprehensive forensic analysis report covering all digital devices seized. Contains chat log extracts, timeline analysis, and financial traces.',
    },
    {
      id: 'attach-2',
      case_id: caseId,
      title: 'Witness Statement - Security Guard',
      filename: 'Witness_Statement_Robert_Martinez.docx',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 156789, // 156 KB
      classification: 'PRIVILEGED' as const,
      sha256_hash: 'b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      virus_scan_status: 'CLEAN' as const,
      uploaded_by: 'Jane Smith',
      uploaded_at: '2025-01-17T09:15:00Z',
      notes: 'Witness statement from Robert Martinez, building security guard present during seizure at ABC Corporation.',
    },
    {
      id: 'attach-3',
      case_id: caseId,
      title: 'Crime Scene Photography Archive',
      filename: 'Crime_Scene_Photos_ABC_Corp.zip',
      file_type: 'application/zip',
      file_size: 15728640, // 15 MB
      classification: 'LE_SENSITIVE' as const,
      sha256_hash: 'c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      virus_scan_status: 'CLEAN' as const,
      uploaded_by: 'Jane Smith',
      uploaded_at: '2025-01-16T14:45:00Z',
      notes: 'High-resolution photographs of crime scene at ABC Corporation workstation and surrounding area. 47 images total.',
    },
    {
      id: 'attach-4',
      case_id: caseId,
      title: 'Bank Transaction Records Q4 2024',
      filename: 'Bank_Transaction_Records_Q4_2024.xlsx',
      file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 892456, // 892 KB
      classification: 'PRIVILEGED' as const,
      sha256_hash: 'd4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      virus_scan_status: 'CLEAN' as const,
      uploaded_by: 'Emma Wilson',
      uploaded_at: '2025-01-19T11:00:00Z',
      notes: 'Detailed bank transaction records for suspect accounts obtained via production order. Shows suspicious patterns in October-December 2024.',
    },
  ]

  // Mock collaboration data (matches Collaboration interface from useCollaborations)
  const mockCollaborations = [
    {
      id: 'collab-1',
      case_id: caseId,
      partner_org: 'FBI',
      partner_type: 'INTERNATIONAL' as const,
      contact_person: 'Agent Sarah Mitchell',
      contact_email: 'sarah.mitchell@ic.fbi.gov',
      contact_phone: '+1-202-324-3000',
      reference_no: 'FBI-IC-2025-0087',
      scope: 'Cross-border financial fraud investigation. FBI Cyber Division providing intelligence on related cases in the United States. Information sharing under mutual legal assistance framework.',
      mou_reference: 'MOU-JCTC-FBI-2024-003',
      status: 'ACTIVE' as const,
      initiated_at: '2025-01-18T10:00:00Z',
      notes: 'Weekly coordination calls scheduled every Friday 14:00 GMT. Primary contact: Cyber Division, International Operations Unit.',
    },
    {
      id: 'collab-2',
      case_id: caseId,
      partner_org: 'EUROPOL',
      partner_type: 'INTERNATIONAL' as const,
      contact_person: 'Inspector Lars Andersson',
      contact_email: 'lars.andersson@europol.europa.eu',
      contact_phone: '+31-70-302-5000',
      reference_no: 'EC3-2025-0234',
      scope: 'Joint investigation into international cybercrime network operating across EU and West Africa. Europol EC3 coordinating with multiple EU member states. Formal MLA request submitted.',
      mou_reference: 'EUROPOL-JCTC-Framework-2023',
      status: 'ACTIVE' as const,
      initiated_at: '2025-01-20T09:30:00Z',
      notes: 'Active joint investigation team (JIT) established. Evidence sharing through SIENA platform.',
    },
    {
      id: 'collab-3',
      case_id: caseId,
      partner_org: 'NCA_UK',
      partner_type: 'INTERNATIONAL' as const,
      contact_person: 'Detective Inspector James Cooper',
      contact_email: 'james.cooper@nca.gov.uk',
      contact_phone: '+44-370-496-7622',
      reference_no: 'NCA-CYBER-2025-0156',
      scope: 'Evidence exchange request for server logs hosted in London data center. Metropolitan Police Cyber Crime Unit assisting with physical evidence collection. Requires UK Home Office approval.',
      mou_reference: 'MOU-JCTC-NCA-2024-008',
      status: 'INITIATED' as const,
      initiated_at: '2025-01-22T11:00:00Z',
      notes: 'Awaiting UK Home Office approval. Estimated timeline: 2-3 weeks. Expedited request submitted due to data preservation concerns.',
    },
    {
      id: 'collab-4',
      case_id: caseId,
      partner_org: 'INTERPOL',
      partner_type: 'INTERNATIONAL' as const,
      contact_person: 'Officer Wei Zhang',
      contact_email: 'w.zhang@interpol.int',
      contact_phone: '+65-6550-2200',
      reference_no: 'INTERPOL-RN-2025-0089',
      scope: 'Red Notice request processed for primary suspect with international travel history. Notice distributed to all 195 member countries. Subject has known connections to Singapore and Malaysia.',
      mou_reference: 'INTERPOL-JCTC-Framework-Agreement',
      status: 'COMPLETED' as const,
      initiated_at: '2025-01-12T08:00:00Z',
      completed_at: '2025-01-16T15:30:00Z',
      notes: 'Red Notice successfully published. INTERPOL reference: A-0089/1-2025. All border agencies notified.',
    },
  ]

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
                        <p className="text-neutral-900">Business Email Compromise</p>
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
              custodyEntries={displayCustodyEntries}
              onAddCustodyEntry={() => setShowChainOfCustodyForm(true)}
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
              assignments={displayAssignments}
              availableUsers={displayAssignments.map(a => a.user)} // Use mock users
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
            <SeizureManager caseId={caseId} seizures={displaySeizures} />
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <DeviceInventory caseId={caseId} devices={displayDevices} seizures={displaySeizures} />
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
            <AttachmentManager caseId={caseId} attachments={mockAttachments} />
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div>
            <CollaborationManager caseId={caseId} collaborations={mockCollaborations} />
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
                          selectedEvidence.category === 'DIGITAL' ? 'bg-blue-100 text-blue-700' :
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
                        {mockChainOfCustody.map((record) => {
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
              action: data.action,
              to_person: data.custodian_to || '',
              to_person_name: toUser ? toUser.full_name : 'Unknown',
              from_person: data.custodian_from,
              from_person_name: fromUser ? fromUser.full_name : undefined,
              location: data.location_to || '',
              purpose: data.purpose,
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
