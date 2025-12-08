'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/services/api-client'

export default function DebugPage() {
  const [apiResults, setApiResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testAPIs() {
      const results: Record<string, any> = {}
      
      try {
        // Test case stats
        console.log('Testing case stats...')
        const caseStats = await apiClient.get('/cases/stats/')
        results.caseStats = caseStats
        console.log('Case stats result:', caseStats)
      } catch (error) {
        console.error('Case stats error:', error)
        results.caseStatsError = error
      }

      try {
        // Test cases list
        console.log('Testing cases list...')
        const cases = await apiClient.get('/cases/')
        results.cases = cases
        console.log('Cases result:', cases)
      } catch (error) {
        console.error('Cases error:', error)
        results.casesError = error
      }

      try {
        // Test evidence list
        console.log('Testing evidence list...')
        const evidence = await apiClient.get('/evidence/')
        results.evidence = evidence
        console.log('Evidence result:', evidence)
      } catch (error) {
        console.error('Evidence error:', error)
        results.evidenceError = error
      }

      try {
        // Test user stats
        console.log('Testing user stats...')
        const userStats = await apiClient.get('/analytics/performance')
        results.userStats = userStats
        console.log('User stats result:', userStats)
      } catch (error) {
        console.error('User stats error:', error)
        results.userStatsError = error
      }

      setApiResults(results)
      setLoading(false)
    }

    testAPIs()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">API Debug Page</h1>
        <div className="text-gray-600">Testing API endpoints...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Debug Page</h1>
      <div className="space-y-4">
        {Object.entries(apiResults).map(([key, value]) => (
          <div key={key} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{key}:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}