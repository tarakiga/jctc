'use client'

import { useState } from 'react'
import { Card, CardContent, Badge } from '@jctc/ui'
import { useEvidence, useSeizureEvidence, useEvidenceMutations, EvidenceCategory, DeviceType, DeviceCondition, EncryptionStatus, CustodyStatus } from '../../lib/hooks/useEvidence'
import { useSeizures } from '../../lib/hooks/useSeizures'
import { useLookups, LOOKUP_CATEGORIES } from '@/lib/hooks/useLookup'
import { useArtifactMutations } from '../../lib/hooks/useArtifacts'
import { useUsers } from '@/lib/hooks/useUsers'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

interface EvidenceListProps {
    caseId: string
}

const STEPS = [
    { id: 1, title: 'Classification', description: 'Type & Category' },
    { id: 2, title: 'Identification', description: 'Make, Model & Serial' },
    { id: 3, title: 'Condition & State', description: 'Physical State' },
    { id: 4, title: 'Collection Info', description: 'When & Who Collected' },
    { id: 5, title: 'Custody & Notes', description: 'Storage & Documentation' }
]

const TOTAL_STEPS = STEPS.length

export function EvidenceList({ caseId }: EvidenceListProps) {
    const { data: evidenceList = [], isLoading } = useEvidence(caseId)
    const { data: seizures = [] } = useSeizures(caseId)

    const { createEvidence, deleteEvidence, loading: mutationLoading } = useEvidenceMutations(caseId)
    // We need to implement artifact creation for photos, assuming imported from separate hook
    // const { createArtifact } = useArtifactMutations(...) // Placeholder logic for now

    // NEW: Fetch users for collected_by dropdown
    const { users = [] } = useUsers()

    const {
        [LOOKUP_CATEGORIES.EVIDENCE_TYPE]: evidenceTypeLookup,
        [LOOKUP_CATEGORIES.PARTY_TYPE]: partyTypeLookup,
        [LOOKUP_CATEGORIES.CUSTODY_ACTION]: custodyActionLookup,
        [LOOKUP_CATEGORIES.RETENTION_POLICY]: retentionPolicyLookup
    } = useLookups([LOOKUP_CATEGORIES.EVIDENCE_TYPE, LOOKUP_CATEGORIES.PARTY_TYPE, LOOKUP_CATEGORIES.CUSTODY_ACTION, LOOKUP_CATEGORIES.RETENTION_POLICY])

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [photoFiles, setPhotoFiles] = useState<File[]>([])

    const [formData, setFormData] = useState({
        seizure_id: '',
        label: '',
        category: 'PHYSICAL' as EvidenceCategory,
        evidence_type: '' as DeviceType | '',
        make: '',
        model: '',
        serial_no: '',
        imei: '',
        storage_capacity: '',
        operating_system: '',
        condition: '' as DeviceCondition | '',
        description: '',
        powered_on: false,
        password_protected: false,
        encryption_status: 'UNKNOWN' as EncryptionStatus,
        storage_location: '',
        notes: '',
        // NEW: Missing fields from schema
        retention_policy: '',
        forensic_notes: '',
        collected_at: '',
        collected_by: '',
    })

    // Handlers
    const handleOpenModal = () => {
        setFormData({
            seizure_id: '',
            label: '',
            category: 'PHYSICAL',
            evidence_type: '',
            make: '',
            model: '',
            serial_no: '',
            imei: '',
            storage_capacity: '',
            operating_system: '',
            condition: '',
            description: '',
            powered_on: false,
            password_protected: false,
            encryption_status: 'UNKNOWN',
            storage_location: '',
            notes: '',
            // NEW: Missing fields
            retention_policy: '',
            forensic_notes: '',
            collected_at: '',
            collected_by: '',
        })
        setPhotoFiles([])
        setCurrentStep(1)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
    }

    const handleNextStep = () => {
        if (currentStep < TOTAL_STEPS) setCurrentStep(c => c + 1)
    }

    const handlePrevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1)
    }

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotoFiles([...photoFiles, ...Array.from(e.target.files)])
        }
    }

    const handleRemovePhoto = (index: number) => {
        setPhotoFiles(photoFiles.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!formData.seizure_id) {
            alert("Seizure ID is required")
            return
        }
        try {
            // 1. Create Evidence with all fields
            const newEvidence = await createEvidence({
                seizure_id: formData.seizure_id,
                label: formData.label,
                category: formData.category,
                evidence_type: formData.evidence_type || undefined,
                make: formData.make || undefined,
                model: formData.model || undefined,
                serial_no: formData.serial_no || undefined,
                imei: formData.imei || undefined,
                storage_capacity: formData.storage_capacity || undefined,
                operating_system: formData.operating_system || undefined,
                condition: formData.condition || undefined,
                description: formData.description || undefined,
                powered_on: formData.powered_on,
                password_protected: formData.password_protected,
                encryption_status: formData.encryption_status,
                storage_location: formData.storage_location || undefined,
                notes: formData.notes || undefined,
                // NEW: Include missing fields
                retention_policy: formData.retention_policy || undefined,
                forensic_notes: formData.forensic_notes || undefined,
                collected_at: formData.collected_at || undefined,
                collected_by: formData.collected_by || undefined,
            })

            // 2. Upload Photos (as Artefacts)
            // Note: In real implementation, we'd loop through photoFiles and call createArtefact
            // For now, we'll log it as a placeholder or component extension
            if (photoFiles.length > 0) {
                console.log("Creating artifacts for photos:", photoFiles)
                // await Promise.all(photoFiles.map(f => createArtifact(newEvidence.id, f)))
            }

            handleCloseModal()
        } catch (err) {
            console.error("Failed to create evidence:", err)
            alert("Failed to create evidence item")
        }
    }

    const handleDelete = async (id: string) => {
        // Custom Dialog Trigger would go here
        if (confirm("Are you sure you want to delete this evidence? This is irreversible.")) {
            await deleteEvidence(id)
        }
    }

    // Render Helpers
    const getDeviceIcon = (type: string) => {
        // ... (Same icon logic as before)
        return 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
    }

    if (isLoading) return <div>Loading evidence...</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Evidence Inventory</h3>
                    <p className="text-sm text-slate-600 mt-1">Manage seized physical and digital evidence</p>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="px-4 py-2.5 bg-black text-white rounded-lg font-medium shadow-sm hover:shadow-md hover:bg-neutral-800 transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Evidence
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {evidenceList.map((item) => (
                    <Card key={item.id} className="group relative overflow-hidden hover:shadow-xl transition-all duration-500 border-2 border-slate-200 hover:border-indigo-300">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                                    {/* Icon placeholder */}
                                    <div className="w-6 h-6 text-white font-bold text-center">{item.label[0]}</div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-slate-900">{item.label}</h4>
                                    <p className="text-sm text-slate-600">{item.make} {item.model}</p>
                                    <Badge className="mt-2 bg-slate-100 text-slate-700">{item.evidence_type?.replace('_', ' ')}</Badge>
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm font-medium hover:underline">Delete</button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Wizard Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={handleCloseModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
                            {/* Modal Header */}
                            <div className="relative px-8 pt-8 pb-6 border-b border-slate-200/60">
                                <button
                                    onClick={handleCloseModal}
                                    className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg">
                                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold text-slate-900">Add New Evidence</h2>
                                        <p className="text-slate-600 mt-1">Register an evidence item seized during investigation</p>
                                    </div>
                                </div>

                                {/* Progress Steps - Matching Create Case Style */}
                                <div className="flex items-center gap-2">
                                    {STEPS.map((step, index) => (
                                        <div key={step.id} className="flex items-center flex-1">
                                            <div className="flex items-center gap-2 flex-1">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step.id === currentStep
                                                    ? 'bg-indigo-600 text-white shadow-lg'
                                                    : step.id < currentStep
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {step.id < currentStep ? (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        step.id
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-xs font-semibold uppercase tracking-wide ${step.id === currentStep ? 'text-slate-900' : 'text-slate-400'
                                                        }`}>
                                                        {step.title}
                                                    </div>
                                                </div>
                                            </div>
                                            {index < STEPS.length - 1 && (
                                                <div className={`h-0.5 w-full mx-2 transition-colors ${step.id < currentStep ? 'bg-green-500' : 'bg-slate-200'
                                                    }`}></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="px-8 py-8 max-h-[60vh] overflow-y-auto">
                                {currentStep === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Seizure <span className="text-red-500">*</span></label>
                                            <select
                                                value={formData.seizure_id}
                                                onChange={(e) => setFormData({ ...formData, seizure_id: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            >
                                                <option value="">Select Seizure...</option>
                                                {seizures.map(s => <option key={s.id} value={s.id}>{s.location} ({new Date(s.seized_at).toLocaleDateString()})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Label <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.label}
                                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                                placeholder="e.g. Item #1 - MacBook Pro"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                                                <select
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value as EvidenceCategory })}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                                >
                                                    <option value="PHYSICAL">Physical</option>
                                                    <option value="DIGITAL">Digital</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                                                <select
                                                    value={formData.evidence_type}
                                                    onChange={e => setFormData({ ...formData, evidence_type: e.target.value as DeviceType })}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                                >
                                                    <option value="">Select Type...</option>
                                                    {evidenceTypeLookup?.values.map(v => <option key={v.id} value={v.code}>{v.display_text}</option>)}
                                                    {!evidenceTypeLookup && <>
                                                        <option value="MOBILE_PHONE">Mobile Phone</option>
                                                        <option value="LAPTOP">Laptop</option>
                                                        <option value="OTHER">Other</option>
                                                    </>}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Make</label>
                                                <input type="text" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Model</label>
                                                <input type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Serial Number</label>
                                            <input type="text" value={formData.serial_no} onChange={e => setFormData({ ...formData, serial_no: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">IMEI</label>
                                            <input type="text" value={formData.imei} onChange={e => setFormData({ ...formData, imei: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Physical Condition</label>
                                            <select value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value as any })} className="w-full px-4 py-3 border border-slate-300 rounded-xl">
                                                <option value="">Select...</option>
                                                <option value="EXCELLENT">Excellent</option>
                                                <option value="GOOD">Good</option>
                                                <option value="POOR">Poor</option>
                                                <option value="DAMAGED">Damaged</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-6 py-2">
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={formData.powered_on} onChange={e => setFormData({ ...formData, powered_on: e.target.checked })} className="w-5 h-5 rounded border-slate-300" />
                                                <span className="text-slate-700 font-medium">Powered On</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={formData.password_protected} onChange={e => setFormData({ ...formData, password_protected: e.target.checked })} className="w-5 h-5 rounded border-slate-300" />
                                                <span className="text-slate-700 font-medium">Password Protected</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Storage Capacity</label>
                                            <input type="text" value={formData.storage_capacity} onChange={e => setFormData({ ...formData, storage_capacity: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl" placeholder="e.g. 512GB" />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-4">
                                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Collection Information
                                            </h4>
                                            <p className="text-xs text-slate-600">Record when and who collected this evidence</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Date & Time Collected</label>
                                            <DateTimePicker
                                                value={formData.collected_at}
                                                onChange={(value) => setFormData({ ...formData, collected_at: value })}
                                                maxDate={new Date()}
                                                placeholder="Select collection date and time"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Collected By</label>
                                            <select
                                                value={formData.collected_by}
                                                onChange={(e) => setFormData({ ...formData, collected_by: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="">Select officer who collected...</option>
                                                {users.map((user: any) => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.full_name || user.email} {user.role ? `(${user.role})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none h-24"
                                                placeholder="Brief description of the evidence item..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 5 && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
                                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                Custody & Documentation
                                            </h4>
                                            <p className="text-xs text-slate-600">Storage details, policies, and notes</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Storage Location</label>
                                                <input
                                                    type="text"
                                                    value={formData.storage_location}
                                                    onChange={e => setFormData({ ...formData, storage_location: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                                    placeholder="e.g. Vault Shelf A-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Retention Policy</label>
                                                <select
                                                    value={formData.retention_policy}
                                                    onChange={(e) => setFormData({ ...formData, retention_policy: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
                                                >
                                                    <option value="">Select policy...</option>
                                                    {retentionPolicyLookup?.values?.map((v: any) => (
                                                        <option key={v.id} value={v.code}>{v.display_text}</option>
                                                    ))}
                                                    {!retentionPolicyLookup && <>
                                                        <option value="STANDARD">Standard (7 years)</option>
                                                        <option value="EXTENDED">Extended (10 years)</option>
                                                        <option value="PERMANENT">Permanent</option>
                                                    </>}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">General Notes</label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none h-20"
                                                placeholder="Any additional notes about this evidence..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Forensic Notes</label>
                                            <textarea
                                                value={formData.forensic_notes}
                                                onChange={(e) => setFormData({ ...formData, forensic_notes: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none h-20"
                                                placeholder="Forensic examination notes, findings, etc..."
                                            />
                                        </div>

                                        <div className="border-t border-slate-100 pt-4">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Photo Documentation</label>
                                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" id="evidence-photos" />
                                                <label htmlFor="evidence-photos" className="cursor-pointer">
                                                    <div className="text-slate-500 font-medium">Click to upload photos</div>
                                                    <div className="text-xs text-slate-400 mt-1">or drag and drop here</div>
                                                </label>
                                            </div>
                                            {photoFiles.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    {photoFiles.map((f, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                                            <span className="truncate">{f.name}</span>
                                                            <button onClick={() => handleRemovePhoto(i)} className="text-red-500 hover:text-red-700">×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-6 border-t border-slate-200/60 flex justify-between items-center">
                                <div>
                                    {currentStep > 1 && (
                                        <button
                                            onClick={handlePrevStep}
                                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Previous
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCloseModal}
                                        className="px-6 py-2.5 rounded-xl font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>

                                    {currentStep < TOTAL_STEPS ? (
                                        <button
                                            onClick={handleNextStep}
                                            disabled={!formData.seizure_id || !formData.label}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Next
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!formData.seizure_id || !formData.label || mutationLoading}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20 transition-all"
                                        >
                                            {mutationLoading ? (
                                                <>
                                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Create Evidence
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
