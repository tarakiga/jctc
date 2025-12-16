'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@jctc/ui'
import { authApi } from '@jctc/api-client'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams?.get('token')
    if (!tokenParam) {
      setError('Invalid or missing reset token. Please request a new password reset link.')
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  function validatePassword(pwd: string): string | null {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Invalid reset token')
      return
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setIsLoading(true)

    try {
      await authApi.resetPassword(token, password)
      setIsSuccess(true)
    } catch (err) {
      setError('Failed to reset password. The link may have expired. Please request a new one.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-neutral-50">
        <Card variant="elevated" className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <CardTitle className="text-center">Password Reset Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-neutral-600 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Button variant="primary" size="lg" className="w-full" asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!token && error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-neutral-50">
        <Card variant="elevated" className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <CardTitle className="text-center">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-neutral-600 mb-6">{error}</p>
            <Button variant="primary" size="lg" className="w-full" asChild>
              <Link href="/forgot-password">Request New Link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/login" className="inline-block">
            <h1 className="text-3xl font-bold text-primary-600 mb-2">JCTC</h1>
          </Link>
          <p className="text-neutral-600">Case Management System</p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <p className="text-sm text-neutral-600 mt-2">
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-3">
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-red-800">Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isLoading}
                helperText="Must be at least 8 characters with uppercase, lowercase, and numbers"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                }
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-black hover:bg-neutral-800 text-white border-black h-12 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                isLoading={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700">
                  ← Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-neutral-500">
          &copy; 2025 Joint Case Team on Cybercrimes. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-8 bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
