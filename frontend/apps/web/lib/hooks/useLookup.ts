/**
 * Hook for fetching lookup values for dropdowns
 */

import { useState, useEffect } from 'react'
import { lookupService, LookupValue } from '@/lib/services/lookups'

interface UseLookupOptions {
    enabled?: boolean
}

interface UseLookupResult {
    values: LookupValue[]
    loading: boolean
    error: string | null
    refresh: () => void
}

/**
 * Hook to fetch lookup values for a specific category
 * @param category - The lookup category key (e.g., 'case_status', 'risk_flags')
 * @param options - Optional configuration
 */
export function useLookup(category: string, options: UseLookupOptions = {}): UseLookupResult {
    const { enabled = true } = options
    const [values, setValues] = useState<LookupValue[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchValues = async () => {
        if (!category || !enabled) return

        try {
            setLoading(true)
            setError(null)
            const data = await lookupService.getDropdownValues(category)
            setValues(data)
        } catch (err: unknown) {
            console.error(`Failed to fetch lookup values for ${category}:`, err)
            const message = err instanceof Error ? err.message : 'Failed to fetch values'
            setError(message)
            setValues([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchValues()
    }, [category, enabled])

    return {
        values,
        loading,
        error,
        refresh: fetchValues
    }
}

/**
 * Hook to fetch multiple lookup categories at once
 */
export function useLookups(categories: string[]): Record<string, UseLookupResult> {
    const [results, setResults] = useState<Record<string, UseLookupResult>>({})

    useEffect(() => {
        const fetchAll = async () => {
            const newResults: Record<string, UseLookupResult> = {}

            for (const category of categories) {
                newResults[category] = {
                    values: [],
                    loading: true,
                    error: null,
                    refresh: () => { }
                }
            }
            setResults(newResults)

            const promises = categories.map(async (category) => {
                try {
                    const data = await lookupService.getDropdownValues(category)
                    return { category, values: data, error: null }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Failed to fetch values'
                    return { category, values: [], error: message }
                }
            })

            const resolved = await Promise.all(promises)

            const finalResults: Record<string, UseLookupResult> = {}
            for (const { category, values, error } of resolved) {
                finalResults[category] = {
                    values,
                    loading: false,
                    error,
                    refresh: () => fetchAll()
                }
            }
            setResults(finalResults)
        }

        if (categories.length > 0) {
            fetchAll()
        }
    }, [categories.join(',')])

    return results
}

// Pre-defined category constants for type safety
export const LOOKUP_CATEGORIES = {
    CASE_STATUS: 'case_status',
    CASE_SEVERITY: 'case_severity',
    CASE_TYPE: 'case_type',
    CASE_SCOPE: 'case_scope',
    INTAKE_CHANNEL: 'intake_channel',
    REPORTER_TYPE: 'reporter_type',
    RISK_FLAG: 'risk_flag', // Singular to match backend
    EVIDENCE_CATEGORY: 'evidence_category',
    STORAGE_LOCATION: 'storage_location',
    CUSTODY_STATUS: 'custody_status',
    CUSTODY_ACTION: 'custody_action',
    PLATFORM: 'platform',
    DEVICE_TYPE: 'device_type',
    DEVICE_CONDITION: 'device_condition',
    ENCRYPTION_STATUS: 'encryption_status',
    IMAGING_STATUS: 'imaging_status',
    ANALYSIS_STATUS: 'analysis_status',
    PARTY_TYPE: 'party_type',
    TASK_STATUS: 'task_status',
    TASK_PRIORITY: 'task_priority',
    ASSIGNMENT_ROLE: 'assignment_role',
    RETENTION_POLICY: 'retention_policy',
    PARTNER_TYPE: 'partner_type',
    PARTNER_ORGANIZATION: 'partner_organization',
    LEGAL_INSTRUMENT_TYPE: 'legal_instrument_type',
    LEGAL_INSTRUMENT_STATUS: 'legal_instrument_status',
    LEGAL_ISSUING_AUTHORITY: 'legal_issuing_authority',
    ARTEFACT_TYPE: 'artefact_type',
    SOURCE_TOOL: 'source_tool',
    WARRANT_TYPE: 'warrant_type',
    ISSUING_AUTHORITY: 'issuing_authority',
    SEIZURE_STATUS: 'seizure_status',
    CHARGE_STATUS: 'charge_status',
    PROSECUTION_SECTION: 'prosecution_section',
    PROSECUTION_STATUS: 'prosecution_status',
    DISPOSITION: 'disposition',
    COLLABORATION_STATUS: 'collaboration_status',
    ATTACHMENT_CLASSIFICATION: 'attachment_classification',
    VIRUS_SCAN_STATUS: 'virus_scan_status',
    REPORT_TYPE: 'report_type',
    ACTIVITY_TYPE: 'activity_type',
} as const

export type LookupCategory = typeof LOOKUP_CATEGORIES[keyof typeof LOOKUP_CATEGORIES]
