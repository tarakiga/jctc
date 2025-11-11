'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Calendar, 
  Download, 
  Plus, 
  X, 
  Clock, 
  Mail, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { 
  useReports, 
  useScheduledReports, 
  REPORT_TYPES, 
  EXPORT_FORMATS, 
  SCHEDULE_FREQUENCIES,
  type ReportType,
  type ExportFormat,
  type ScheduleFrequency 
} from '@/lib/hooks/useReports';
import { formatFileSize } from '@/lib/hooks/useAttachments';

function ReportsPageContent() {
  const { reports, isLoading: reportsLoading, generateReport, deleteReport, isGenerating, isDeleting } = useReports();
  const { 
    scheduledReports, 
    isLoading: schedulesLoading, 
    createSchedule, 
    updateSchedule, 
    deleteSchedule,
    isCreating,
    isUpdating 
  } = useScheduledReports();

  const [activeTab, setActiveTab] = useState<'generate' | 'scheduled' | 'history'>('generate');
  
  // Generation form state
  const [genFormData, setGenFormData] = useState({
    report_type: '' as ReportType | '',
    date_range_start: '',
    date_range_end: '',
    export_format: 'PDF' as ExportFormat,
  });

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    report_type: '' as ReportType | '',
    frequency: 'MONTHLY' as ScheduleFrequency,
    recipients: [''],
  });

  const handleGenerate = async () => {
    if (!genFormData.report_type || !genFormData.date_range_start || !genFormData.date_range_end) return;

    try {
      await generateReport(genFormData as any);
      alert('✅ Report generated successfully! Check the History tab to download.');
      setGenFormData({
        report_type: '',
        date_range_start: '',
        date_range_end: '',
        export_format: 'PDF',
      });
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleFormData.report_type || scheduleFormData.recipients.filter(r => r).length === 0) return;

    try {
      await createSchedule({
        ...scheduleFormData,
        recipients: scheduleFormData.recipients.filter((r) => r.trim() !== ''),
      });
      setShowScheduleForm(false);
      setScheduleFormData({
        report_type: '',
        frequency: 'MONTHLY',
        recipients: [''],
      });
    } catch (error) {
      console.error('Schedule creation failed:', error);
    }
  };

  const toggleSchedule = async (id: string, currentState: boolean) => {
    try {
      await updateSchedule({ id, data: { enabled: !currentState } });
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const addRecipient = () => {
    setScheduleFormData({
      ...scheduleFormData,
      recipients: [...scheduleFormData.recipients, ''],
    });
  };

  const removeRecipient = (index: number) => {
    setScheduleFormData({
      ...scheduleFormData,
      recipients: scheduleFormData.recipients.filter((_, i) => i !== index),
    });
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...scheduleFormData.recipients];
    newRecipients[index] = value;
    setScheduleFormData({ ...scheduleFormData, recipients: newRecipients });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Reports</h1>
          <p className="text-neutral-600 mt-1">Generate on-demand reports and manage scheduled deliveries</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex gap-8">
            {(['generate', 'scheduled', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab === 'generate' && '📊 Generate Report'}
                {tab === 'scheduled' && '🕐 Scheduled Reports'}
                {tab === 'history' && '📜 Report History'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'generate' && (
          <div className="max-w-3xl">
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Generate On-Demand Report</h2>
              
              <div className="space-y-4">
                {/* Report Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Report Type *
                  </label>
                  <select
                    value={genFormData.report_type}
                    onChange={(e) => setGenFormData({ ...genFormData, report_type: e.target.value as ReportType })}
                    className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  >
                    <option value="">Select report type</option>
                    {REPORT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {genFormData.report_type && (
                    <p className="text-xs text-neutral-600 mt-1">
                      {REPORT_TYPES.find((t) => t.value === genFormData.report_type)?.description}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={genFormData.date_range_start}
                      onChange={(e) => setGenFormData({ ...genFormData, date_range_start: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={genFormData.date_range_end}
                      onChange={(e) => setGenFormData({ ...genFormData, date_range_end: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Export Format */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Export Format *
                  </label>
                  <div className="flex items-center gap-3">
                    {EXPORT_FORMATS.map((fmt) => (
                      <button
                        key={fmt.value}
                        onClick={() => setGenFormData({ ...genFormData, export_format: fmt.value })}
                        className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                          genFormData.export_format === fmt.value
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        {fmt.icon} {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!genFormData.report_type || !genFormData.date_range_start || !genFormData.date_range_end || isGenerating}
                    className="px-6 py-2 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Scheduled Reports</h2>
                <p className="text-sm text-neutral-600 mt-1">Automate report generation and email delivery</p>
              </div>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="px-4 py-2 bg-black text-white hover:bg-neutral-800 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                {showScheduleForm ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    New Schedule
                  </>
                )}
              </button>
            </div>

            {/* Schedule Form */}
            {showScheduleForm && (
              <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-neutral-900 mb-4">Create Scheduled Report</h3>
                
                <div className="space-y-4">
                  {/* Report Type & Frequency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Report Type *
                      </label>
                      <select
                        value={scheduleFormData.report_type}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, report_type: e.target.value as ReportType })}
                        className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                      >
                        <option value="">Select report type</option>
                        {REPORT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Frequency *
                      </label>
                      <select
                        value={scheduleFormData.frequency}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, frequency: e.target.value as ScheduleFrequency })}
                        className="w-full px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                      >
                        {SCHEDULE_FREQUENCIES.map((freq) => (
                          <option key={freq.value} value={freq.value}>
                            {freq.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Recipients */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-neutral-700">
                        Recipients *
                      </label>
                      <button
                        onClick={addRecipient}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Recipient
                      </button>
                    </div>
                    {scheduleFormData.recipients.map((recipient, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input
                          type="email"
                          value={recipient}
                          onChange={(e) => updateRecipient(index, e.target.value)}
                          placeholder="email@example.com"
                          className="flex-1 px-4 py-2 bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        />
                        {scheduleFormData.recipients.length > 1 && (
                          <button
                            onClick={() => removeRecipient(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleCreateSchedule}
                      disabled={!scheduleFormData.report_type || scheduleFormData.recipients.filter(r => r).length === 0 || isCreating}
                      className="px-6 py-2 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-2"
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Create Schedule
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowScheduleForm(false);
                        setScheduleFormData({ report_type: '', frequency: 'MONTHLY', recipients: [''] });
                      }}
                      className="px-6 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Schedules List */}
            {schedulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
              </div>
            ) : scheduledReports.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
                <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">No scheduled reports yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledReports.map((schedule) => {
                  const reportType = REPORT_TYPES.find((t) => t.value === schedule.report_type);
                  return (
                    <div
                      key={schedule.id}
                      className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-neutral-900">{reportType?.label}</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              schedule.enabled 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {schedule.enabled ? '✓ Active' : '⏸ Paused'}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {schedule.frequency}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-neutral-600">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{schedule.recipients.join(', ')}</span>
                            </div>
                            {schedule.next_run && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>Next run: {format(new Date(schedule.next_run), 'PPp')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSchedule(schedule.id, schedule.enabled)}
                            disabled={isUpdating}
                            className="p-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200"
                            title={schedule.enabled ? 'Pause' : 'Resume'}
                          >
                            {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteSchedule(schedule.id)}
                            className="p-2 bg-white hover:bg-red-50 text-red-600 border border-neutral-300 hover:border-red-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Report History</h2>
              <p className="text-sm text-neutral-600 mt-1">Previously generated reports available for download</p>
            </div>

            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
                <FileSpreadsheet className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">No reports generated yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const reportType = REPORT_TYPES.find((t) => t.value === report.report_type);
                  const exportFormat = EXPORT_FORMATS.find((f) => f.value === report.export_format);
                  return (
                    <div
                      key={report.id}
                      className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg text-blue-700">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-neutral-900 mb-1">{report.title}</h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600">
                            <div>
                              <span className="font-medium">Type:</span> {reportType?.label}
                            </div>
                            <div>
                              <span className="font-medium">Generated:</span> {format(new Date(report.generated_at), 'PPp')}
                            </div>
                            <div>
                              <span className="font-medium">Period:</span> {format(new Date(report.date_range_start), 'PP')} - {format(new Date(report.date_range_end), 'PP')}
                            </div>
                            <div>
                              <span className="font-medium">By:</span> {report.generated_by}
                            </div>
                            <div>
                              <span className="font-medium">Format:</span> {exportFormat?.icon} {report.export_format}
                            </div>
                            {report.file_size && (
                              <div>
                                <span className="font-medium">Size:</span> {formatFileSize(report.file_size)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          <button
                            onClick={() => deleteReport(report.id)}
                            disabled={isDeleting}
                            className="p-2 bg-white hover:bg-red-50 text-red-600 border border-neutral-300 hover:border-red-300 rounded-lg text-sm shadow-sm hover:shadow transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ReportsPageContent />
    </ProtectedRoute>
  );
}
