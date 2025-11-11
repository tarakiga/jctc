# API Integration Guide

Quick reference for integrating mock data pages with the real backend API.

---

## Overview

All pages currently use mock data. To integrate with the backend:

1. Remove mock data constants
2. Import and use the appropriate React hook
3. Handle loading and error states
4. Update UI to display real data

---

## Cases List Page (`app/cases/page.tsx`)

### Before (Mock Data)
```typescript
const mockCases = [
  { id: '1', case_number: 'JCTC-2025-A7B3C', ... },
  // ...
]
const filteredCases = mockCases.filter(...)
```

### After (Real API)
```typescript
import { useCases } from '@/lib/hooks/useCases'

function CasesListContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  // Fetch cases with filters
  const { cases, total, loading, error, refetch } = useCases({
    search: searchTerm || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    severity: severityFilter !== 'ALL' ? parseInt(severityFilter) : undefined,
  })

  // Loading state
  if (loading) {
    return <div>Loading cases...</div>
  }

  // Error state
  if (error) {
    return <div>Error: {error.message}</div>
  }

  // Render with real data
  return (
    <div className="space-y-4">
      {cases.length === 0 ? (
        <Card><div className="p-12 text-center">No cases found</div></Card>
      ) : (
        cases.map((caseItem) => (
          <Card key={caseItem.id}>
            {/* Render case */}
          </Card>
        ))
      )}
    </div>
  )
}
```

---

## Case Detail Page (`app/cases/[id]/page.tsx`)

### Before (Mock Data)
```typescript
const mockCase = { id: '1', case_number: 'JCTC-2025-A7B3C', ... }
const mockEvidence = [...]
```

### After (Real API)
```typescript
import { useCase } from '@/lib/hooks/useCases'
import { useEvidenceByCase } from '@/lib/hooks/useEvidence'

function CaseDetailContent() {
  const params = useParams()
  const caseId = params.id as string

  // Fetch case details
  const { caseData, loading: caseLoading, error: caseError } = useCase(caseId)

  // Fetch related evidence
  const { 
    evidence, 
    loading: evidenceLoading, 
    error: evidenceError 
  } = useEvidenceByCase(caseId)

  if (caseLoading) return <div>Loading case...</div>
  if (caseError) return <div>Error: {caseError.message}</div>
  if (!caseData) return <div>Case not found</div>

  return (
    <div>
      <h2>{caseData.case_number}</h2>
      {/* Use caseData instead of mockCase */}
      
      {activeTab === 'evidence' && (
        <div>
          {evidenceLoading ? (
            <div>Loading evidence...</div>
          ) : (
            evidence.map(item => (
              <Card key={item.id}>{/* Render evidence */}</Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

---

## New Case Form (`app/cases/new/page.tsx`)

### Before (Mock Data)
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  console.log('Creating case:', formData)
  router.push('/cases')
}
```

### After (Real API)
```typescript
import { useCaseMutations } from '@/lib/hooks/useCases'

function NewCaseContent() {
  const router = useRouter()
  const { createCase, loading, error } = useCaseMutations()
  const [formData, setFormData] = useState({ ... })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newCase = await createCase({
      title: formData.title,
      description: formData.description,
      severity: parseInt(formData.severity),
      case_type: formData.case_type,
      local_or_international: formData.local_or_international,
      originating_country: formData.originating_country || undefined,
      date_reported: formData.date_reported,
    })

    if (newCase) {
      // Success - redirect to new case
      router.push(`/cases/${newCase.id}`)
    } else if (error) {
      // Handle error (show toast, etc.)
      console.error('Failed to create case:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      
      {error && (
        <div className="text-red-600">Error: {error.message}</div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Case'}
      </Button>
    </form>
  )
}
```

---

## Evidence List Page (`app/evidence/page.tsx`)

### Before (Mock Data)
```typescript
const mockEvidence = [...]
const filteredEvidence = mockEvidence.filter(...)
```

### After (Real API)
```typescript
import { useEvidence } from '@/lib/hooks/useEvidence'

function EvidenceListContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { evidence, total, loading, error } = useEvidence({
    search: searchTerm || undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    chain_of_custody_status: statusFilter !== 'ALL' ? statusFilter : undefined,
  })

  if (loading) return <div>Loading evidence...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="space-y-4">
      {evidence.length === 0 ? (
        <Card><div className="p-12 text-center">No evidence found</div></Card>
      ) : (
        evidence.map((item) => (
          <Card key={item.id}>
            {/* Render evidence */}
          </Card>
        ))
      )}
    </div>
  )
}
```

---

## Evidence Upload Page (`app/evidence/upload/page.tsx`)

### Before (Mock Data)
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  console.log('Uploading evidence:', { formData, files: selectedFiles })
  router.push('/evidence')
}
```

### After (Real API)
```typescript
import { useEvidenceMutations } from '@/lib/hooks/useEvidence'

function EvidenceUploadContent() {
  const router = useRouter()
  const { createEvidenceWithFiles, loading, error } = useEvidenceMutations()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({ ... })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const evidence = await createEvidenceWithFiles(
      {
        case_id: formData.case_id,
        type: formData.type,
        description: formData.description,
        collected_date: formData.collected_date,
        collected_by: formData.collected_by,
        location_collected: formData.location_collected || undefined,
      },
      selectedFiles
    )

    if (evidence) {
      // Success
      router.push('/evidence')
    } else if (error) {
      // Handle error
      console.error('Failed to upload evidence:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* File upload and form fields */}
      
      {error && (
        <div className="text-red-600">Error: {error.message}</div>
      )}

      <Button type="submit" disabled={loading || selectedFiles.length === 0}>
        {loading ? 'Uploading...' : 'Upload Evidence'}
      </Button>
    </form>
  )
}
```

---

## Environment Setup

### 1. Create `.env.local` file
```bash
# In frontend/apps/web directory
touch .env.local
```

### 2. Add API URL
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Restart dev server
```bash
npm run dev
```

---

## Testing the Integration

### 1. Test Authentication
```bash
# Try logging in
# Check if JWT token is stored in localStorage
# Verify token is sent with API requests (Network tab)
```

### 2. Test Cases API
```bash
# Navigate to /cases
# Verify API call to GET /cases
# Check response data matches UI
```

### 3. Test Evidence API
```bash
# Navigate to /evidence
# Verify API call to GET /evidence
# Upload new evidence
# Verify POST /evidence/upload
```

### 4. Error Handling
```bash
# Stop backend API
# Verify error messages display correctly
# Check fallback UI for loading states
```

---

## Common Patterns

### Loading Skeleton (Better UX)
Instead of simple "Loading..." text:

```typescript
if (loading) {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-32 bg-neutral-200 rounded-md"></div>
        </div>
      ))}
    </div>
  )
}
```

### Error Boundary
```typescript
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
      <p className="text-red-600 mt-1">{error.message}</p>
      <Button onClick={refetch} className="mt-4">Retry</Button>
    </div>
  )
}
```

### Toast Notifications (Optional Enhancement)
```bash
npm install react-hot-toast
```

```typescript
import toast from 'react-hot-toast'

const handleSubmit = async () => {
  const result = await createCase(data)
  
  if (result) {
    toast.success('Case created successfully!')
    router.push(`/cases/${result.id}`)
  } else {
    toast.error('Failed to create case')
  }
}
```

---

## Debugging Tips

### 1. Check Network Tab
- Open DevTools → Network
- Filter by XHR/Fetch
- Inspect request/response

### 2. Check Console
- Look for API errors
- Check error messages from hooks

### 3. Verify API Client
```typescript
// In browser console
localStorage.getItem('token')  // Should show JWT token
```

### 4. Test API Directly
```bash
# Use curl or Postman
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/cases
```

---

## Migration Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` in `.env.local`
- [ ] Replace mock data in `/cases` page
- [ ] Replace mock data in `/cases/[id]` page
- [ ] Replace mock data in `/cases/new` page
- [ ] Replace mock data in `/evidence` page
- [ ] Replace mock data in `/evidence/upload` page
- [ ] Test authentication flow
- [ ] Test all CRUD operations
- [ ] Implement loading skeletons
- [ ] Implement error handling
- [ ] Add toast notifications (optional)
- [ ] Test pagination (when added)
- [ ] Test file uploads
- [ ] Test permissions/authorization

---

## Next Steps After Integration

1. **Add Pagination**
   ```typescript
   const [page, setPage] = useState(1)
   const { cases } = useCases({ page, limit: 10 })
   ```

2. **Add Debounced Search**
   ```typescript
   import { useDebouncedValue } from '@/lib/hooks/useDebounce'
   const debouncedSearch = useDebouncedValue(searchTerm, 500)
   const { cases } = useCases({ search: debouncedSearch })
   ```

3. **Add Optimistic Updates**
   ```typescript
   const { createCase } = useCaseMutations()
   const { refetch } = useCases()
   
   await createCase(data)
   refetch()  // Refresh list immediately
   ```

---

**Need Help?**
- Check [PHASE_3_SUMMARY.md](./PHASE_3_SUMMARY.md) for detailed API docs
- Review [handoff.md](./handoff.md) for project overview
- Check service files in `lib/services/` for available methods
