import { apiClient } from './api-client';
import { IntelRecord, IntelCategory, IntelStatus, IntelPriority, IntelStats } from '../../types/intelligence';

// Transformer to map API snake_case to Frontend camelCase
const transformRecord = (apiRecord: any): IntelRecord => {
    return {
        id: apiRecord.id,
        title: apiRecord.title,
        description: apiRecord.description,
        source: apiRecord.source,
        category: apiRecord.category as IntelCategory,
        priority: apiRecord.priority as IntelPriority,
        status: apiRecord.status as IntelStatus,
        isConfidential: apiRecord.is_confidential,
        createdAt: apiRecord.created_at,
        updatedAt: apiRecord.updated_at,
        tags: apiRecord.tags ? apiRecord.tags.map((t: any) => t.tag) : [],
        author: {
            name: apiRecord.author_name || 'Unknown',
            role: 'Investigator', // Placeholder
            avatar: undefined,
        },
        // Handle attachments if array, map fields
        attachments: apiRecord.attachments ? apiRecord.attachments.map((a: any) => ({
            id: a.id,
            fileName: a.file_name,
            fileSize: a.file_size || 'Unknown',
            fileType: a.file_type || 'Unknown',
            uploadedAt: a.uploaded_at
        })) : [],
        // Handle linked cases
        linkedCases: apiRecord.case_links ? apiRecord.case_links.map((l: any) => ({
            caseId: l.case_id,
            caseNumber: l.case?.case_number || 'LINKED-CASE',
            caseTitle: l.case?.title || 'Case details unavailable'
        })) : []
    };
};

export const intelligenceService = {
    /**
     * Get intelligence records with filters
     */
    async getRecords(filters?: {
        search?: string;
        category?: string;
        status?: string;
        skip?: number;
        limit?: number;
    }): Promise<{ items: IntelRecord[], total: number }> {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const response = await apiClient.get<any>(`/intelligence/?${params.toString()}`);

        return {
            items: response.items.map(transformRecord),
            total: response.total
        };
    },

    /**
     * Get single record by ID
     */
    async getRecord(id: string): Promise<IntelRecord> {
        const response = await apiClient.get<any>(`/intelligence/${id}`);
        return transformRecord(response);
    },

    /**
     * Create new record
     */
    async createRecord(data: any): Promise<IntelRecord> {
        const payload = {
            title: data.title,
            description: data.description,
            source: data.source,
            category: data.category,
            priority: data.priority,
            status: data.status,
            is_confidential: data.isConfidential,
            tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : []
        };
        const response = await apiClient.post<any>('/intelligence/', payload);
        return transformRecord(response);
    },

    /**
     * Update record
     */
    async updateRecord(id: string, data: any): Promise<IntelRecord> {
        // Map fields to snake_case if needed, similar to create
        const payload: any = {};
        if (data.title) payload.title = data.title;
        if (data.description) payload.description = data.description;
        if (data.status) payload.status = data.status;
        // ... add others

        const response = await apiClient.put<any>(`/intelligence/${id}`, payload);
        return transformRecord(response);
    },

    /**
     * Delete record
     */
    async deleteRecord(id: string): Promise<void> {
        await apiClient.delete(`/intelligence/${id}`);
    },

    /**
     * Link Case
     */
    async linkCase(recordId: string, caseId: string): Promise<void> {
        await apiClient.post(`/intelligence/${recordId}/link-case?case_id=${caseId}`);
    }
};
