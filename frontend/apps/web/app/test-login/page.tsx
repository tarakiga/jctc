'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/services/api-client'

export default function TestLoginPage() {
  const [email, setEmail] = useState('admin@jctc.gov.ng')
  const [password, setPassword] = useState('Admin@123')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    try {
      console.log('Testing login with:', { email, password })
      
      // Test the auth endpoint directly
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('Login response status:', response.status)
      console.log('Login response headers:', response.headers)
      
      const data = await response.json()
      console.log('Login response data:', data)
      
      setResult({ success: true, data })
      
      // If login successful, store token and test authenticated endpoint
      if (response.ok && data.access_token) {
        localStorage.setItem('access_token', data.access_token)
        
        // Test an authenticated endpoint
        try {
          const caseStats = await apiClient.get('/cases/stats/')
          console.log('Case stats after login:', caseStats)
          setResult((prev: any) => ({ ...prev, caseStats }))
        } catch (error) {
          console.error('Failed to fetch case stats:', error)
          setResult((prev: any) => ({ ...prev, caseStatsError: error }))
        }
      }
      
    } catch (error) {
      console.error('Login test failed:', error)
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Test Login</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={testLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Login'}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}