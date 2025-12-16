import { apiClient } from './api-client'

export const EMAIL_PROVIDERS = [
    { id: 'microsoft', name: 'Microsoft 365', logo: 'microsoft', icon: 'M' },
    { id: 'gmail', name: 'Google Workspace', logo: 'google', icon: 'G' },
    { id: 'zoho', name: 'Zoho Mail', logo: 'zoho', icon: 'Z' },
    { id: 'smtp', name: 'Custom SMTP', logo: 'smtp', icon: '@' },
    { id: 'sendgrid', name: 'SendGrid', logo: 'sendgrid', icon: 'S' },
    { id: 'ses', name: 'AWS SES', logo: 'aws', icon: 'A' }
]

export interface EmailSettings {
    id: string
    provider: string
    smtp_host: string
    smtp_port: number
    smtp_use_tls: boolean
    smtp_use_ssl: boolean
    smtp_username: string
    smtp_password?: string // Only for creating/updating
    from_email: string
    from_name: string
    reply_to_email?: string
    is_active: boolean
    test_email?: string
    last_test_sent_at?: string
    last_test_status?: 'success' | 'failed'
    last_test_error?: string
    created_at: string
    updated_at: string
}

export interface EmailTemplate {
    id: string
    template_key: string
    subject: string
    body_html: string
    body_plain: string
    variables?: string[]
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TestEmailRequest {
    target_email: string
}

export interface TestEmailResponse {
    success: boolean
    message: string
}

export const emailService = {
    /**
     * Get all email settings (configurations)
     */
    async getSettings(): Promise<EmailSettings[]> {
        const response = await apiClient.get('/admin/email/email-settings')
        return Array.isArray(response) ? response : []
    },

    /**
     * Get active email configuration
     */
    async getActiveSettings(): Promise<EmailSettings | null> {
        try {
            return await apiClient.get('/admin/email/email-settings/active')
        } catch (error) {
            return null
        }
    },

    /**
     * Create new email settings
     */
    async createSettings(data: Partial<EmailSettings>): Promise<EmailSettings> {
        return await apiClient.post('/admin/email/email-settings', data)
    },

    /**
     * Update email settings
     */
    async updateSettings(id: string, data: Partial<EmailSettings>): Promise<EmailSettings> {
        return await apiClient.put(`/admin/email/email-settings/${id}`, data)
    },

    /**
     * Delete email settings
     */
    async deleteSettings(id: string): Promise<void> {
        await apiClient.delete(`/admin/email/email-settings/${id}`)
    },

    /**
     * Test email configuration
     */
    async testSettings(id: string, email: string): Promise<TestEmailResponse> {
        return await apiClient.post(`/admin/email/email-settings/${id}/test`, { test_email: email })
    },

    /**
     * Activate specific email configuration
     */
    async activateSettings(id: string): Promise<EmailSettings> {
        return await apiClient.post(`/admin/email/email-settings/${id}/activate`)
    },

    /**
     * Get all email templates
     */
    async getTemplates(): Promise<EmailTemplate[]> {
        const response = await apiClient.get('/admin/email/email-templates')
        return Array.isArray(response) ? response : []
    }
}
