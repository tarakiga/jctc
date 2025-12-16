/**
 * API Client
 * Central HTTP client for all backend API requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))

      // Emit custom event for 401 Unauthorized (session expired)
      if (response.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired'))
      }

      // FastAPI returns errors in 'detail' field
      const errorMessage = error.detail || error.message || response.statusText

      // Log full error for debugging
      console.error('API Error:', response.status, response.statusText, JSON.stringify(error, null, 2))

      // Show user-friendly toast for 403 errors
      if (response.status === 403 && typeof window !== 'undefined') {
        // Dispatch custom event with error message for UI to show toast
        window.dispatchEvent(new CustomEvent('api-error', {
          detail: {
            status: 403,
            message: errorMessage
          }
        }))
      }

      throw new Error(errorMessage || `HTTP ${response.status}`)
    }

    // Handle 204 No Content responses (e.g., from DELETE)
    if (response.status === 204) {
      return undefined as T
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      console.log('API Response:', data)
      return data
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options
    const url = this.buildUrl(endpoint, params)
    const headers = { ...this.getAuthHeaders(), ...(customHeaders as Record<string, string>) }

    console.log('API Request:', url)
    const response = await fetch(url, {
      method: 'GET',
      headers,
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options
    const url = this.buildUrl(endpoint, params)

    const headers: Record<string, string> = { ...this.getAuthHeaders() as Record<string, string>, ...(customHeaders as Record<string, string>) }
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData

    if (isFormData) {
      delete headers['Content-Type']
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options
    const url = this.buildUrl(endpoint, params)

    const headers: Record<string, string> = { ...this.getAuthHeaders() as Record<string, string>, ...(customHeaders as Record<string, string>) }
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData

    if (isFormData) {
      delete headers['Content-Type']
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options
    const url = this.buildUrl(endpoint, params)

    const headers: Record<string, string> = { ...this.getAuthHeaders() as Record<string, string>, ...(customHeaders as Record<string, string>) }
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData

    if (isFormData) {
      delete headers['Content-Type']
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options
    const url = this.buildUrl(endpoint, params)
    const headers = { ...this.getAuthHeaders(), ...(customHeaders as Record<string, string>) }

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      ...fetchOptions,
    })

    return this.handleResponse<T>(response)
  }

  // Helper method to set auth token
  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token)
    }
  }

  // Helper method to clear auth token
  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// Export class for testing
export default ApiClient
