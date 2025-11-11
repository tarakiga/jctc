'use client'

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@jctc/ui'

export default function AdminPage() {
  return (
    <>
      <div className="mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">
            System Administration
          </h2>
          <p className="text-slate-600 text-lg">
            Manage users, roles, and system configuration
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Admin Stats Cards */}
        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">42</p>
            <p className="text-xs text-slate-500 mt-2">Active accounts</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Roles</p>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">7</p>
            <p className="text-xs text-slate-500 mt-2">Access levels</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">System Health</p>
            <p className="text-4xl font-bold text-emerald-600 tracking-tight">98%</p>
            <p className="text-xs text-slate-500 mt-2">All systems operational</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Audit Logs</p>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">1.2K</p>
            <p className="text-xs text-slate-500 mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: 'John Doe', action: 'Created new case', role: 'Investigator', time: '5 min ago' },
                { user: 'Jane Smith', action: 'Updated evidence', role: 'Forensic', time: '15 min ago' },
                { user: 'Mike Johnson', action: 'Generated report', role: 'Supervisor', time: '1 hour ago' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-semibold text-slate-700">
                      {activity.user.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{activity.user}</p>
                      <p className="text-sm text-slate-600">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" size="sm">{activity.role}</Badge>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>System Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-blue-900">System Update Available</p>
                    <p className="text-sm text-blue-700 mt-1">Version 2.1.0 is ready to install</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-green-200 bg-green-50">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-900">Backup Completed</p>
                    <p className="text-sm text-green-700 mt-1">Daily backup finished successfully</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-amber-900">Storage Warning</p>
                    <p className="text-sm text-amber-700 mt-1">Database storage at 75% capacity</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
