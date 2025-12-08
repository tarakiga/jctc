/**
 * Admin API service for lookup values management
 */

import { apiClient } from './api-client'

export interface LookupValue {
    id: string
    category: string
    value: string
    label: string
    description?: string
    is_active: boolean
    sort_order: number
    is_system: boolean
    color?: string
    icon?: string
    created_at: string
    updated_at?: string
}

export interface LookupCategory {
    key: string
    name: string
    description: string
    count: number
    active_count: number
}

export interface LookupCategoryWithValues {
    key: string
    name: string
    description: string
    values: LookupValue[]
}

export interface CreateLookupValue {
    category: string
    value: string
    label: string
    description?: string
    is_active?: boolean
    sort_order?: number
    color?: string
    icon?: string
}

export interface UpdateLookupValue {
    label?: string
    description?: string
    is_active?: boolean
    sort_order?: number
    color?: string
    icon?: string
}

export const lookupService = {
    /**
     * Get all lookup categories with counts
     */
    async getCategories(): Promise<LookupCategory[]> {
        return apiClient.get<LookupCategory[]>('/admin/lookups/categories')
    },

    /**
     * Get all values for a specific category
     */
    async getCategoryValues(category: string, includeInactive = true): Promise<LookupCategoryWithValues> {
        return apiClient.get<LookupCategoryWithValues>(`/admin/lookups/categories/${category}`, {
            params: { include_inactive: includeInactive }
        })
    },

    /**
     * Create a new lookup value
     */
    async createValue(data: CreateLookupValue): Promise<LookupValue> {
        return apiClient.post<LookupValue>('/admin/lookups/values', data)
    },

    /**
     * Update an existing lookup value
     */
    async updateValue(id: string, data: UpdateLookupValue): Promise<LookupValue> {
        return apiClient.put<LookupValue>(`/admin/lookups/values/${id}`, data)
    },

    /**
     * Delete a lookup value
     */
    async deleteValue(id: string, force = false): Promise<void> {
        await apiClient.delete(`/admin/lookups/values/${id}`, {
            params: { force }
        })
    },

    /**
     * Bulk update values (e.g., activate/deactivate multiple)
     */
    async bulkUpdate(ids: string[], updates: { is_active?: boolean }): Promise<LookupValue[]> {
        return apiClient.post<LookupValue[]>('/admin/lookups/values/bulk-update', {
            ids,
            ...updates
        })
    },

    /**
     * Reorder values within a category
     */
    async reorderValues(category: string, valueIds: string[]): Promise<void> {
        await apiClient.post('/admin/lookups/values/reorder', null, {
            params: { category, value_ids: valueIds.join(',') }
        })
    },

    /**
     * Get dropdown values for a category (for regular users)
     */
    async getDropdownValues(category: string): Promise<LookupValue[]> {
        return apiClient.get<LookupValue[]>(`/admin/lookups/dropdown/${category}`)
    }
}
