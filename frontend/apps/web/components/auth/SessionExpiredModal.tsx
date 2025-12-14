'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SessionExpiredModalProps {
    isOpen: boolean
    onClose: () => void
    onLogout: () => void
    countdownSeconds?: number
}

export function SessionExpiredModal({
    isOpen,
    onClose,
    onLogout,
    countdownSeconds = 60
}: SessionExpiredModalProps) {
    const [timeLeft, setTimeLeft] = useState(countdownSeconds)
    const router = useRouter()

    // Reset timer when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeLeft(countdownSeconds)
        }
    }, [isOpen, countdownSeconds])

    // Countdown timer
    useEffect(() => {
        if (!isOpen) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleLogout()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isOpen])

    const handleLogout = useCallback(() => {
        // Clear tokens
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
        }
        onLogout()
        router.push('/login')
    }, [onLogout, router])

    const handleLoginNow = useCallback(() => {
        handleLogout()
    }, [handleLogout])

    if (!isOpen) return null

    // Calculate progress for the circular timer
    const progress = (timeLeft / countdownSeconds) * 100
    const circumference = 2 * Math.PI * 45 // radius = 45
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] animate-in fade-in duration-300" />

            {/* Modal */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 fade-in duration-300 overflow-hidden">
                    {/* Gradient Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

                    {/* Content */}
                    <div className="p-8 text-center">
                        {/* Animated Timer Circle */}
                        <div className="relative w-28 h-28 mx-auto mb-6">
                            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                                {/* Background circle */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="#f1f5f9"
                                    strokeWidth="6"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="url(#timerGradient)"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-1000 ease-linear"
                                />
                                <defs>
                                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#f59e0b" />
                                        <stop offset="50%" stopColor="#f97316" />
                                        <stop offset="100%" stopColor="#ef4444" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            {/* Timer number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                                    {timeLeft}
                                </span>
                            </div>
                        </div>

                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center shadow-lg shadow-orange-100">
                            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Session Expired
                        </h2>

                        {/* Description */}
                        <p className="text-slate-600 mb-2">
                            Your session has timed out for security reasons.
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            You will be automatically redirected to login in <span className="font-bold text-orange-600">{timeLeft}</span> seconds.
                        </p>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-blue-900">Don&apos;t worry!</p>
                                    <p className="text-sm text-blue-700 mt-0.5">
                                        Your work is safe. Simply log in again to continue where you left off.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleLoginNow}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 active:scale-[0.98]"
                            >
                                Log In Now
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-500">
                            Session timeout is a security feature to protect your account.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
