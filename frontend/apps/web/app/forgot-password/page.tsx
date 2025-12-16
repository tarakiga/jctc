'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@jctc/ui'
import { authApi } from '@jctc/api-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await authApi.requestPasswordReset(email)
      setIsSuccess(true)
    } catch (err) {
      setError('Failed to send reset email. Please check your email address and try again.')
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
            <CardTitle className="text-center">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-neutral-600 mb-6">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <p className="text-sm text-neutral-500 text-center mb-6">
              Please check your inbox and follow the link to reset your password. The link will
              expire in 1 hour.
            </p>
            <div className="space-y-3">
              <Button variant="primary" size="lg" className="w-full" asChild>
                <Link href="/login">Return to Login</Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => {
                  setIsSuccess(false)
                  setEmail('')
                }}
              >
                Try Different Email
              </Button>
            </div>
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
            <CardTitle>Forgot Password?</CardTitle>
            <p className="text-sm text-neutral-600 mt-2">
              Enter your email address and we'll send you instructions to reset your password.
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
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@jctc.gov.ng"
                required
                disabled={isLoading}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
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
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
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
