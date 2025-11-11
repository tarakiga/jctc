import { describe, it, expect, vi, beforeEach } from 'vitest'
import { casesService } from './cases'
import { apiClient } from './api-client'

// Mock the API client
vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Cases Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCases', () => {
    it('should fetch cases without filters', async () => {
      const mockCases = {
        cases: [
          { id: '1', case_number: 'JCTC-001', title: 'Test Case', severity: 3 },
        ],
        total: 1,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCases })

      const result = await casesService.getCases()

      expect(apiClient.get).toHaveBeenCalledWith('/cases?')
      expect(result).toEqual(mockCases)
    })

    it('should fetch cases with filters', async () => {
      const mockCases = { cases: [], total: 0 }
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCases })

      await casesService.getCases({
        search: 'test',
        status: 'OPEN',
        severity: 5,
      })

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      )
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=OPEN')
      )
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('severity=5')
      )
    })
  })

  describe('getCase', () => {
    it('should fetch a single case by ID', async () => {
      const mockCase = { id: '1', case_number: 'JCTC-001', title: 'Test Case' }
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCase })

      const result = await casesService.getCase('1')

      expect(apiClient.get).toHaveBeenCalledWith('/cases/1')
      expect(result).toEqual(mockCase)
    })
  })

  describe('createCase', () => {
    it('should create a new case', async () => {
      const newCase = {
        title: 'New Case',
        description: 'Test description',
        severity: 3,
        date_reported: '2025-01-01',
      }
      const mockResponse = { ...newCase, id: '123', case_number: 'JCTC-123' }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse })

      const result = await casesService.createCase(newCase)

      expect(apiClient.post).toHaveBeenCalledWith('/cases', newCase)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateCase', () => {
    it('should update an existing case', async () => {
      const updates = { title: 'Updated Title', severity: 5 }
      const mockResponse = { id: '1', ...updates }

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockResponse })

      const result = await casesService.updateCase('1', updates)

      expect(apiClient.put).toHaveBeenCalledWith('/cases/1', updates)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteCase', () => {
    it('should delete a case', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null })

      await casesService.deleteCase('1')

      expect(apiClient.delete).toHaveBeenCalledWith('/cases/1')
    })
  })

  describe('updateStatus', () => {
    it('should update case status', async () => {
      const mockResponse = { id: '1', status: 'CLOSED' }
      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockResponse })

      const result = await casesService.updateStatus('1', 'CLOSED')

      expect(apiClient.patch).toHaveBeenCalledWith('/cases/1/status', {
        status: 'CLOSED',
      })
      expect(result).toEqual(mockResponse)
    })
  })
})
