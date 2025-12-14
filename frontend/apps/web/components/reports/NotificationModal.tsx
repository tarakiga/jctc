'use client'

interface NotificationModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    message: string
    type?: 'info' | 'warning' | 'error' | 'success'
}

const TYPE_STYLES = {
    info: {
        headerGradient: 'from-blue-600 to-indigo-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
    },
    warning: {
        headerGradient: 'from-amber-500 to-orange-600',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600'
    },
    error: {
        headerGradient: 'from-red-600 to-rose-600',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600'
    },
    success: {
        headerGradient: 'from-emerald-600 to-teal-600',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600'
    }
}

const TYPE_ICONS = {
    info: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    warning: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    error: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    success: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}

export function NotificationModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info'
}: NotificationModalProps) {
    if (!isOpen) return null

    const styles = TYPE_STYLES[type]

    return (
        <>
            {/* Backdrop with glassmorphism */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scaleIn">
                <div
                    className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${styles.headerGradient} px-6 py-5`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl text-white">
                                {TYPE_ICONS[type]}
                            </div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <p className="text-slate-700 leading-relaxed">{message}</p>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r ${styles.headerGradient} rounded-xl hover:opacity-90 transition-all shadow-lg`}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS for animations */}
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>
        </>
    )
}
