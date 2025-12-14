'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api-client'

// Types for NDPA Compliance
export interface ComplianceStatus {
    overall_status: 'COMPLIANT' | 'MINOR_ISSUES' | 'MAJOR_VIOLATIONS' | 'CRITICAL_VIOLATIONS' | 'NOT_ASSESSED'
    compliance_score: number
    last_assessment: string | null
    total_violations: number
    open_violations: number
    pending_dsr_requests: number
    consent_rate: number
    recent_breaches: number
}

export interface ComplianceDashboard {
    status: ComplianceStatus
    consent_summary: {
        total_consents: number
        active_consents: number
        withdrawn_consents: number
        expired_consents: number
    }
    dsr_summary: {
        total_requests: number
        pending_requests: number
        completed_requests: number
        overdue_requests: number
    }
    breach_summary: {
        total_breaches: number
        open_breaches: number
        nitda_notified: number
        subjects_notified: number
    }
    recent_violations: ComplianceViolation[]
    upcoming_deadlines: ComplianceDeadline[]
}

export interface ComplianceViolation {
    id: string
    violation_type: string
    entity_id: string
    entity_type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    ndpa_article?: string
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'
    created_at: string
    resolved_at?: string
}

export interface ComplianceDeadline {
    id: string
    type: 'DSR_RESPONSE' | 'BREACH_NOTIFICATION' | 'DPIA_REVIEW' | 'CONSENT_EXPIRY'
    description: string
    due_date: string
    days_remaining: number
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface ConsentRecord {
    id: string
    data_subject_id: string
    data_subject_name?: string
    case_id?: string
    consent_type: string
    processing_purpose: string
    data_categories: string[]
    is_active: boolean
    consent_given_at: string
    expires_at?: string
    withdrawn_at?: string
}

export interface DSRRequest {
    id: string
    request_type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION'
    data_subject_name: string
    data_subject_email?: string
    case_id?: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
    request_date: string
    due_date: string
    completed_at?: string
    is_overdue: boolean
}

export interface BreachNotification {
    id: string
    breach_type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    data_categories_affected: string[]
    subjects_affected_count: number
    discovered_at: string
    nitda_notified: boolean
    nitda_notification_date?: string
    subjects_notified: boolean
    status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED'
}

// Fetch compliance dashboard
async function fetchComplianceDashboard(): Promise<ComplianceDashboard> {
    return await apiClient.get<ComplianceDashboard>('/ndpa/dashboard')
}

// Fetch compliance status
async function fetchComplianceStatus(): Promise<ComplianceStatus> {
    return await apiClient.get<ComplianceStatus>('/ndpa/status')
}

// Fetch violations
async function fetchViolations(filters?: {
    severity?: string
    status?: string
    limit?: number
}): Promise<ComplianceViolation[]> {
    const params = new URLSearchParams()
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.limit) params.append('limit', String(filters.limit))

    return await apiClient.get<ComplianceViolation[]>(`/ndpa/violations?${params.toString()}`)
}

// Fetch consent records
async function fetchConsentRecords(): Promise<ConsentRecord[]> {
    try {
        return await apiClient.get<ConsentRecord[]>('/ndpa/consents')
    } catch {
        return []
    }
}

// Fetch DSR requests  
async function fetchDSRRequests(): Promise<DSRRequest[]> {
    try {
        return await apiClient.get<DSRRequest[]>('/ndpa/dsr')
    } catch {
        return []
    }
}

// Fetch breach notifications
async function fetchBreaches(): Promise<BreachNotification[]> {
    try {
        return await apiClient.get<BreachNotification[]>('/ndpa/breaches')
    } catch {
        return []
    }
}

// Main Compliance Hook
export function useCompliance() {
    const queryClient = useQueryClient()

    // Dashboard data
    const dashboardQuery = useQuery({
        queryKey: ['compliance', 'dashboard'],
        queryFn: fetchComplianceDashboard,
        staleTime: 30000, // 30 seconds
        retry: 1,
    })

    // Status only
    const statusQuery = useQuery({
        queryKey: ['compliance', 'status'],
        queryFn: fetchComplianceStatus,
        staleTime: 30000,
        retry: 1,
    })

    // Violations
    const violationsQuery = useQuery({
        queryKey: ['compliance', 'violations'],
        queryFn: () => fetchViolations({ limit: 50 }),
        staleTime: 30000,
        retry: 1,
    })

    // Consent records
    const consentsQuery = useQuery({
        queryKey: ['compliance', 'consents'],
        queryFn: fetchConsentRecords,
        staleTime: 60000,
        retry: 1,
    })

    // DSR Requests
    const dsrQuery = useQuery({
        queryKey: ['compliance', 'dsr'],
        queryFn: fetchDSRRequests,
        staleTime: 30000,
        retry: 1,
    })

    // Breach notifications
    const breachesQuery = useQuery({
        queryKey: ['compliance', 'breaches'],
        queryFn: fetchBreaches,
        staleTime: 30000,
        retry: 1,
    })

    // Refresh all compliance data
    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['compliance'] })
    }

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const violations = violationsQuery.data || []
        const consents = consentsQuery.data || []
        const dsrs = dsrQuery.data || []
        const breaches = breachesQuery.data || []

        return {
            openViolations: violations.filter(v => v.status === 'OPEN').length,
            criticalViolations: violations.filter(v => v.severity === 'CRITICAL').length,
            activeConsents: consents.filter(c => c.is_active).length,
            pendingDSRs: dsrs.filter(d => d.status === 'PENDING').length,
            overdueDSRs: dsrs.filter(d => d.is_overdue).length,
            openBreaches: breaches.filter(b => b.status !== 'RESOLVED').length,
        }
    }, [violationsQuery.data, consentsQuery.data, dsrQuery.data, breachesQuery.data])

    return {
        // Dashboard
        dashboard: dashboardQuery.data,
        isDashboardLoading: dashboardQuery.isLoading,
        dashboardError: dashboardQuery.error,

        // Status
        status: statusQuery.data,
        isStatusLoading: statusQuery.isLoading,

        // Violations
        violations: violationsQuery.data || [],
        isViolationsLoading: violationsQuery.isLoading,

        // Consents
        consents: consentsQuery.data || [],
        isConsentsLoading: consentsQuery.isLoading,

        // DSR
        dsrRequests: dsrQuery.data || [],
        isDSRLoading: dsrQuery.isLoading,

        // Breaches
        breaches: breachesQuery.data || [],
        isBreachesLoading: breachesQuery.isLoading,

        // Summary
        summaryStats,

        // Actions
        refreshAll,
    }
}

// Hook for running compliance assessment
export function useComplianceAssessment() {
    const queryClient = useQueryClient()

    const assessMutation = useMutation({
        mutationFn: async (params?: { entityType?: string; entityId?: string }) => {
            const queryParams = new URLSearchParams()
            if (params?.entityType) queryParams.append('entity_type', params.entityType)
            if (params?.entityId) queryParams.append('entity_id', params.entityId)

            return await apiClient.post(`/ndpa/assess?${queryParams.toString()}`, {})
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['compliance'] })
        },
    })

    return {
        runAssessment: assessMutation.mutate,
        isAssessing: assessMutation.isPending,
        assessmentResult: assessMutation.data,
        assessmentError: assessMutation.error,
    }
}
