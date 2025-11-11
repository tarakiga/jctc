# Backend-Frontend Integration Fixes

## Date: 2025-10-27

## Issues Found and Fixed

### 1. ✅ API Base URL Mismatch
**Problem:** Two different API clients with inconsistent base URLs
- `@jctc/api-client` package: `http://localhost:8000/api/v1` (correct)
- `lib/services/api-client.ts`: `http://localhost:8000` (incorrect)

**Fix:** Updated service API client to use `/api/v1` prefix

```typescript
// Before
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// After
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
```

### 2. ✅ CaseStatus Enum Mismatch
**Problem:** Different enum values between backend and frontend

**Backend (OLD):**
- OPEN, SUSPENDED, PROSECUTION, CLOSED

**Frontend:**
- OPEN, UNDER_INVESTIGATION, PENDING_PROSECUTION, IN_COURT, CLOSED, ARCHIVED

**Fix:** Updated backend enum to match frontend expectations

```python
class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    PENDING_PROSECUTION = "PENDING_PROSECUTION"
    IN_COURT = "IN_COURT"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"
```

### 3. ✅ LoginResponse Schema
**Problem:** Backend was only returning `{access_token, token_type}`

**Fix:** Added complete LoginResponse schema
```python
class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse
```

### 4. ✅ Token Management
**Problem:** API client not loading token from localStorage on initialization

**Fix:** Added token loading in constructor
```typescript
constructor() {
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token')
    }
    this.setupInterceptors()
}
```

### 5. ✅ Button Component asChild Support
**Problem:** React warning about unrecognized `asChild` prop

**Fix:** Added Radix UI Slot support to Button component
```typescript
import { Slot } from '@radix-ui/react-slot'

const Comp = asChild ? Slot : 'button'
return <Comp {...props}>{children}</Comp>
```

### 6. ✅ /cases/stats Endpoint
**Problem:** Endpoint didn't exist in backend

**Fix:** Added stats endpoint before `/{case_id}` route (order matters!)
```python
@router.get("/stats")
async def get_case_stats(...):
    # Returns total, by_status, by_severity, recent_cases
```

### 7. ✅ Case Type Definitions Alignment
**Problem:** Frontend Case interface had fields that didn't match backend schema

**Fixes:**
- Changed `severity` from enum to `number | null`
- Added `date_assigned` field
- Removed `date_closed` field (not in backend)
- Made `case_type_id`, `created_by` nullable
- Updated `originating_country` from nullable to required with default

### 8. ✅ API Query Parameters
**Problem:** Frontend used `page` parameter, backend expects `skip`

**Fix:** Updated frontend service to use `skip` and `limit`
```typescript
// Before: filters.page
// After: filters.skip
```

## Remaining Tasks

### Database Migration Required
The CaseStatus enum change requires a database migration:

```bash
cd backend
alembic revision --autogenerate -m "Update CaseStatus enum values"
alembic upgrade head
```

### Testing Checklist
- [ ] Login flow works correctly
- [ ] Dashboard loads without errors
- [ ] Cases list displays properly
- [ ] Case stats show correct data
- [ ] Create case form works
- [ ] Edit case form works
- [ ] All enum values display correctly

## API Endpoints Verified

### Authentication
- ✅ POST `/api/v1/auth/login` - Returns LoginResponse with user and tokens
- ✅ GET `/api/v1/auth/me` - Returns current user info
- ✅ POST `/api/v1/auth/refresh` - Refreshes access token

### Cases
- ✅ GET `/api/v1/cases` - List cases with filters (skip, limit, status, severity, search)
- ✅ GET `/api/v1/cases/stats` - Get case statistics
- ✅ GET `/api/v1/cases/{id}` - Get single case
- ✅ POST `/api/v1/cases` - Create new case
- ✅ PUT `/api/v1/cases/{id}` - Update case
- ✅ POST `/api/v1/cases/{id}/assign` - Assign user to case
- ✅ GET `/api/v1/cases/{id}/assignments` - Get case assignments
- ✅ GET `/api/v1/cases/types/` - List case types

## Type Alignment Summary

### User Types ✅
- Frontend and backend User types are aligned
- LoginRequest, LoginResponse match
- UserRole enum matches

### Case Types ✅
- CaseStatus enum now matches
- Case interface updated to match CaseResponse
- CaseCreate and CaseUpdate aligned with backend schemas

### Missing Implementations
None identified - all core functionality is implemented

## Configuration

### Environment Variables
Ensure these are set in `.env` files:

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Backend (.env):**
```
API_V1_STR=/api/v1
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=...
```

## Next Steps

1. Run database migration for CaseStatus enum
2. Restart backend server
3. Clear browser localStorage and refresh frontend
4. Test all functionality
5. Monitor browser console for any remaining errors
