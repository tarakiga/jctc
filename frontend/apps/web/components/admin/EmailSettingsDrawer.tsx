'use client'

import { useState, useEffect } from 'react'
import { Badge, Button } from '@jctc/ui' // Assuming standard UI components or fallback
// Using lucide-react icons as seen in other components
import {
    X, Mail, CheckCircle, AlertTriangle, RefreshCw, Send,
    Settings, FileText, Check, Shield, Server,
    ChevronRight, ArrowLeft, Trash2, Power
} from 'lucide-react'
import { emailService, EmailSettings, EmailTemplate, EMAIL_PROVIDERS } from '@/lib/services/email'

interface EmailSettingsDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function EmailSettingsDrawer({ isOpen, onClose }: EmailSettingsDrawerProps) {
    // Data State
    const [settings, setSettings] = useState<EmailSettings | null>(null)
    const [templates, setTemplates] = useState<EmailTemplate[]>([])
    const [loading, setLoading] = useState(true)

    // UI View State
    const [view, setView] = useState<'status' | 'configure' | 'test' | 'templates'>('status')
    const [activeTab, setActiveTab] = useState<'settings' | 'templates'>('settings')

    // Form State
    const [provider, setProvider] = useState('smtp')
    const [formData, setFormData] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_use_tls: true,
        smtp_use_ssl: false,
        smtp_username: '',
        smtp_password: '',
        from_email: '',
        from_name: 'JCTC System',
        reply_to_email: ''
    })
    const [formError, setFormError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Test State
    const [testEmail, setTestEmail] = useState('')
    const [testingConnection, setTestingConnection] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadData()
            setView('status')
            setTestResult(null)
            setTestEmail('')
        }
    }, [isOpen])

    const loadData = async () => {
        try {
            setLoading(true)
            const [allSettings, templatesList] = await Promise.all([
                emailService.getSettings(),  // Get ALL settings, not just active
                emailService.getTemplates()
            ])

            // Use the first settings (most recent) if exists, otherwise null
            const currentSettings = allSettings.length > 0 ? allSettings[0] : null
            setSettings(currentSettings)
            setTemplates(templatesList)

            // Pre-fill form if settings exist
            if (currentSettings) {
                setProvider(currentSettings.provider)
                setFormData({
                    smtp_host: currentSettings.smtp_host,
                    smtp_port: currentSettings.smtp_port,
                    smtp_use_tls: currentSettings.smtp_use_tls,
                    smtp_use_ssl: currentSettings.smtp_use_ssl,
                    smtp_username: currentSettings.smtp_username,
                    smtp_password: '', // Password is encrypted, must re-enter to change
                    from_email: currentSettings.from_email,
                    from_name: currentSettings.from_name,
                    reply_to_email: currentSettings.reply_to_email || ''
                })
            }
        } catch (error) {
            console.error('Failed to load email settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleProviderChange = (providerId: string) => {
        setProvider(providerId)

        // Apply presets
        if (providerId === 'microsoft') {
            setFormData(prev => ({ ...prev, smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_use_tls: true, smtp_use_ssl: false }))
        } else if (providerId === 'gmail') {
            setFormData(prev => ({ ...prev, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_use_tls: true, smtp_use_ssl: false }))
        } else if (providerId === 'zoho') {
            setFormData(prev => ({ ...prev, smtp_host: 'smtp.zoho.com', smtp_port: 587, smtp_use_tls: true, smtp_use_ssl: false }))
        } else if (providerId === 'sendgrid') {
            setFormData(prev => ({ ...prev, smtp_host: 'smtp.sendgrid.net', smtp_port: 587, smtp_use_tls: true, smtp_use_ssl: false, smtp_username: 'apikey' }))
        } else if (providerId === 'ses') {
            setFormData(prev => ({ ...prev, smtp_host: 'email-smtp.us-east-1.amazonaws.com', smtp_port: 587, smtp_use_tls: true, smtp_use_ssl: false }))
        }
    }

    const handleSaveSettings = async () => {
        if (!formData.smtp_host || !formData.smtp_username || !formData.from_email) {
            setFormError('Please fill in all required fields')
            return
        }

        // If creating new or updating with password change
        if (!settings && !formData.smtp_password) {
            setFormError('Password is required for new configuration')
            return
        }

        try {
            setSubmitting(true)
            setFormError('')

            // Build payload matching backend schema (EmailSettingsCreate)
            // Don't send is_active (backend sets it), convert empty strings to undefined
            const payload: any = {
                provider,
                smtp_host: formData.smtp_host,
                smtp_port: formData.smtp_port,
                smtp_use_tls: formData.smtp_use_tls,
                smtp_use_ssl: formData.smtp_use_ssl,
                smtp_username: formData.smtp_username,
                from_email: formData.from_email,
                from_name: formData.from_name || 'JCTC System',
            }

            // Only include password if provided
            if (formData.smtp_password) {
                payload.smtp_password = formData.smtp_password
            }

            // Only include reply_to_email if it's a valid email (not empty)
            if (formData.reply_to_email && formData.reply_to_email.trim()) {
                payload.reply_to_email = formData.reply_to_email
            }

            if (settings) {
                await emailService.updateSettings(settings.id, payload)
            } else {
                await emailService.createSettings(payload)
            }

            await loadData()
            setView('status')
            setFormError('')
        } catch (error: any) {
            setFormError(error.message || 'Failed to save settings')
        } finally {
            setSubmitting(false)
        }
    }

    const handleTestConnection = async () => {
        if (!settings || !testEmail) return

        try {
            setTestingConnection(true)
            setTestResult(null)
            const result = await emailService.testSettings(settings.id, testEmail)
            setTestResult(result)

            // Reload to get updated last_test status
            if (result.success) loadData()
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Connection test failed' })
        } finally {
            setTestingConnection(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right sm:border-l sm:border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600" />
                            Email System
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Configure SMTP settings and templates</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-100 flex gap-6 bg-slate-50/50">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Settings & Connection
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Email Templates
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 max-w-3xl mx-auto">

                            {/* Status Card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-900">Current Status</h3>
                                    {settings ? (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
                                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                                            Not Configured
                                        </Badge>
                                    )}
                                </div>

                                {settings ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Provider</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                                        {EMAIL_PROVIDERS.find(p => p.id === settings.provider)?.icon || '@'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 capitalize">{EMAIL_PROVIDERS.find(p => p.id === settings.provider)?.name || settings.provider}</p>
                                                        <p className="text-xs text-slate-500">{settings.smtp_host}:{settings.smtp_port}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Sender Info</p>
                                                <p className="text-sm font-medium text-slate-900">{settings.from_name}</p>
                                                <p className="text-sm text-slate-600 font-mono">{settings.from_email}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last Test Result</p>
                                                {settings.last_test_sent_at ? (
                                                    <div className={`p-3 rounded-lg border ${settings.last_test_status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {settings.last_test_status === 'success' ? (
                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                            ) : (
                                                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                                            )}
                                                            <span className={`text-sm font-medium ${settings.last_test_status === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                                                                {settings.last_test_status === 'success' ? 'Connection Successful' : 'Connection Failed'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(settings.last_test_sent_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-500 italic">
                                                        No tests run yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                                        <Mail className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                        <p>No email provider configured.</p>
                                        <p className="text-xs">Configure a provider to enable system emails.</p>
                                    </div>
                                )}

                                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                                    {settings && (
                                        <button
                                            onClick={() => setView('test')}
                                            disabled={view === 'test'}
                                            className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            Test Connection
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setView('configure')}
                                        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all shadow-sm"
                                    >
                                        <Settings className="w-4 h-4 mr-2" />
                                        {settings ? 'Edit Configuration' : 'Configure Provider'}
                                    </button>
                                </div>
                            </div>

                            {/* CONFIGURATION FORM */}
                            {view === 'configure' && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-900">Email Configuration</h3>
                                        <button onClick={() => setView('status')} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {/* Provider Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-3">Select Provider</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {EMAIL_PROVIDERS.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => handleProviderChange(p.id)}
                                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${provider === p.id
                                                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                                            : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${provider === p.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                            {p.icon}
                                                        </div>
                                                        <span className={`text-sm font-medium ${provider === p.id ? 'text-blue-900' : 'text-slate-600'}`}>{p.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-medium text-slate-900 border-b pb-2">SMTP Server</h4>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtp_host}
                                                        onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                        placeholder="smtp.example.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                                                    <input
                                                        type="number"
                                                        value={formData.smtp_port}
                                                        onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="flex gap-4 pt-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.smtp_use_tls}
                                                            onChange={e => setFormData({ ...formData, smtp_use_tls: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-slate-700">Use TLS</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.smtp_use_ssl}
                                                            onChange={e => setFormData({ ...formData, smtp_use_ssl: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-slate-700">Use SSL</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-sm font-medium text-slate-900 border-b pb-2">Authentication</h4>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Username / Email</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtp_username}
                                                        onChange={e => setFormData({ ...formData, smtp_username: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                                        Password {settings && <span className="text-xs font-normal text-slate-500">(Leave blank to keep existing)</span>}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={formData.smtp_password}
                                                        onChange={e => setFormData({ ...formData, smtp_password: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                        autoComplete="new-password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4 md:col-span-2">
                                                <h4 className="text-sm font-medium text-slate-900 border-b pb-2">Sender Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
                                                        <input
                                                            type="email"
                                                            value={formData.from_email}
                                                            onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                            placeholder="noreply@jctc.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
                                                        <input
                                                            type="text"
                                                            value={formData.from_name}
                                                            onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                            placeholder="JCTC System"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {formError && (
                                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                {formError}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                            <button
                                                onClick={() => setView('status')}
                                                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveSettings}
                                                disabled={submitting}
                                                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {submitting ? 'Saving...' : 'Save Configuration'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TEST CONNECTION VIEW */}
                            {view === 'test' && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-900">Test Connection</h3>
                                        <button onClick={() => setView('status')} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-slate-600 mb-4">
                                            Enter an email address to send a test message. This validates your SMTP configuration.
                                        </p>
                                        <div className="flex gap-3">
                                            <input
                                                type="email"
                                                value={testEmail}
                                                onChange={e => setTestEmail(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="yourname@example.com"
                                            />
                                            <button
                                                onClick={handleTestConnection}
                                                disabled={testingConnection || !testEmail}
                                                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {testingConnection ? 'Sending...' : 'Send Test'}
                                            </button>
                                        </div>

                                        {testResult && (
                                            <div className={`mt-4 p-4 rounded-xl border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 p-1 rounded-full ${testResult.success ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                                        {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className={`font-semibold ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                                            {testResult.success ? 'Test Email Sent Successfully' : 'Failed to Send Test Email'}
                                                        </p>
                                                        <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                                            {testResult.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* TEMPLATES TAB */}
                    {activeTab === 'templates' && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 gap-4">
                                {templates.map(template => (
                                    <div key={template.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-200 transition-colors cursor-pointer group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 capitalize">
                                                        {template.template_key.replace(/_/g, ' ')}
                                                    </h4>
                                                    <p className="text-sm text-slate-500">{template.subject}</p>
                                                </div>
                                            </div>
                                            <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                                {template.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>

                                        <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 mb-3 border border-slate-100">
                                            Variables: {template.variables?.join(', ') || 'None'}
                                        </div>

                                        {/* Preview Area (Truncated) */}
                                        <div className="text-sm text-slate-500 line-clamp-2">
                                            {template.body_plain || 'No plain text preview available.'}
                                        </div>
                                    </div>
                                ))}

                                {templates.length === 0 && (
                                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                                        No templates found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </>
    )
}
