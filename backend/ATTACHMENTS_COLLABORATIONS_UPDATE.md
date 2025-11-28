# Attachments & Collaborations Backend Update

## Overview
Updated backend models, schemas, and database to fully support the frontend mock data for attachments and collaborations. This brings complete alignment between frontend and backend for external case management features.

---

## Database Schema Changes

### Migration: `13548486c725_update_attachments_and_collaborations_tables`

#### New Enum Types Created:
1. **`attachmentclassification`**: `PUBLIC`, `LE_SENSITIVE`, `PRIVILEGED`
2. **`virusscanstatus`**: `PENDING`, `CLEAN`, `INFECTED`, `FAILED`
3. **`collaborationstatus`**: `INITIATED`, `ACTIVE`, `COMPLETED`, `SUSPENDED`
4. **`partnertype`**: `LAW_ENFORCEMENT`, `INTERNATIONAL`, `REGULATOR`, `ISP`, `BANK`, `OTHER`

### Attachments Table Schema

```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,  -- Bytes
    file_type VARCHAR(100) NOT NULL,  -- MIME type
    file_path VARCHAR(500),  -- Storage location
    download_url VARCHAR(1000),  -- Pre-signed URL
    classification attachmentclassification NOT NULL DEFAULT 'LE_SENSITIVE',
    sha256_hash VARCHAR(64) NOT NULL UNIQUE,  -- Integrity verification
    virus_scan_status virusscanstatus NOT NULL DEFAULT 'PENDING',
    virus_scan_details TEXT,  -- Scan results if infected/failed
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_attachments_case_id ON attachments(case_id);
```

#### Key Features:
- **Security Classification**: Three levels (Public, LE Sensitive, Privileged)
- **Integrity Verification**: SHA-256 hash with unique constraint
- **Virus Scanning**: Automated scan status tracking
- **Audit Trail**: Track uploader and timestamps
- **Chain of Custody**: Notes field for custody documentation

### Case Collaborations Table Schema

```sql
CREATE TABLE case_collaborations (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    partner_org VARCHAR(255) NOT NULL,  -- Organization code (FBI, EFCC, MTN, etc.)
    partner_type partnertype NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    reference_no VARCHAR(100),  -- Partner's case/ticket reference
    scope TEXT NOT NULL,  -- What assistance is being provided
    mou_reference VARCHAR(255),  -- Governing framework/MoU
    status collaborationstatus NOT NULL DEFAULT 'INITIATED',
    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,  -- Coordination notes
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_case_collaborations_case_id ON case_collaborations(case_id);
```

#### Partner Types Supported:
- **LAW_ENFORCEMENT**: EFCC, NPF, DSS, ICPC
- **INTERNATIONAL**: FBI, Europol, INTERPOL, NCA
- **REGULATOR**: NCC, CBN, NITDA
- **ISP**: MTN, Airtel, Glo, 9mobile
- **BANK**: GTB, Zenith, Access, UBA, First Bank
- **OTHER**: Custom organizations

---

## Updated Models

### File: `backend/app/models/misc.py`

#### Attachment Model
```python
class Attachment(BaseModel):
    """Case attachments with security classification and virus scanning."""
    case_id: UUID  # Foreign key to cases
    title: str  # Descriptive title (max 500 chars)
    filename: str  # Original filename (max 255 chars)
    file_size: int  # Size in bytes
    file_type: str  # MIME type
    file_path: str  # Storage location
    download_url: str  # Pre-signed URL
    classification: AttachmentClassification
    sha256_hash: str  # 64-char hex hash
    virus_scan_status: VirusScanStatus
    virus_scan_details: str
    uploaded_by: UUID  # Foreign key to users
    uploaded_at: datetime
    notes: str
```

#### CaseCollaboration Model
```python
class CaseCollaboration(BaseModel):
    """Inter-agency collaboration tracking."""
    case_id: UUID
    partner_org: str  # Organization code
    partner_type: PartnerType
    contact_person: str
    contact_email: str
    contact_phone: str
    reference_no: str
    scope: str  # Collaboration scope
    mou_reference: str
    status: CollaborationStatus
    initiated_at: datetime
    completed_at: datetime
    notes: str
```

---

## Pydantic Schemas

### Attachments Schemas: `backend/app/schemas/attachments.py`

#### Schemas Created:
1. **`AttachmentBase`**: Base fields for attachments
2. **`AttachmentCreate`**: Create new attachment (includes case_id)
3. **`AttachmentUpdate`**: Update attachment (optional fields)
4. **`AttachmentResponse`**: API response format
5. **`AttachmentListResponse`**: Paginated list response
6. **`AttachmentHashVerification`**: Hash verification request
7. **`AttachmentHashVerificationResponse`**: Hash verification result

#### Key Validation:
- SHA-256 hash format validation (64 hex chars)
- File size must be > 0
- Title min 1, max 500 chars
- Filename min 1, max 255 chars
- Notes max 5000 chars

### Collaborations Schemas: `backend/app/schemas/collaborations.py`

#### Schemas Created:
1. **`CollaborationBase`**: Base fields for collaborations
2. **`CollaborationCreate`**: Create new collaboration
3. **`CollaborationUpdate`**: Update collaboration (optional fields)
4. **`CollaborationResponse`**: API response format
5. **`CollaborationListResponse`**: Paginated list response
6. **`CollaborationStatusUpdate`**: Update status only
7. **`CollaborationSummary`**: Statistics/summary data

#### Key Validation:
- Email validation using EmailStr
- Scope minimum 10 chars (ensure meaningful description)
- Phone number format validation
- Partner organization code validation

---

## Migration Details

### Applied Migration: `13548486c725`
- **Revision ID**: 13548486c725
- **Previous**: a414e95b1821 (add_device_description_field)
- **Status**: ✅ Successfully applied

### What Was Changed:
1. **Dropped** old `attachments` and `case_collaborations` tables
2. **Created** 4 new enum types for type safety
3. **Recreated** both tables with comprehensive schemas
4. **Added** indexes on case_id foreign keys for query performance
5. **Added** unique constraint on sha256_hash for attachments

### Downgrade Support:
The migration includes a full downgrade path that:
- Drops new tables and indexes
- Drops enum types
- Recreates original simple table schemas

---

## Alignment with Frontend Mock Data

### Attachments Alignment

| Frontend Field | Backend Column | Type | Notes |
|----------------|----------------|------|-------|
| id | id | UUID | Primary key |
| case_id | case_id | UUID | Foreign key |
| title | title | VARCHAR(500) | ✅ Matches |
| filename | filename | VARCHAR(255) | ✅ Matches |
| file_size | file_size | INTEGER | ✅ Bytes |
| file_type | file_type | VARCHAR(100) | ✅ MIME type |
| classification | classification | ENUM | ✅ 3 levels |
| sha256_hash | sha256_hash | VARCHAR(64) | ✅ Unique |
| virus_scan_status | virus_scan_status | ENUM | ✅ 4 states |
| virus_scan_details | virus_scan_details | TEXT | ✅ Optional |
| uploaded_by | uploaded_by | UUID | ✅ User ID |
| uploaded_at | uploaded_at | TIMESTAMPTZ | ✅ Auto-set |
| notes | notes | TEXT | ✅ Optional |
| download_url | download_url | VARCHAR(1000) | ✅ Added |
| file_path | file_path | VARCHAR(500) | ✅ Added |

**Frontend-Backend Alignment: 100%** ✅

### Collaborations Alignment

| Frontend Field | Backend Column | Type | Notes |
|----------------|----------------|------|-------|
| id | id | UUID | Primary key |
| case_id | case_id | UUID | Foreign key |
| partner_org | partner_org | VARCHAR(255) | ✅ Matches |
| partner_type | partner_type | ENUM | ✅ 6 types |
| contact_person | contact_person | VARCHAR(255) | ✅ Matches |
| contact_email | contact_email | VARCHAR(255) | ✅ Validated |
| contact_phone | contact_phone | VARCHAR(50) | ✅ Matches |
| reference_no | reference_no | VARCHAR(100) | ✅ Optional |
| scope | scope | TEXT | ✅ Required |
| mou_reference | mou_reference | VARCHAR(255) | ✅ Optional |
| status | status | ENUM | ✅ 4 states |
| initiated_at | initiated_at | TIMESTAMPTZ | ✅ Auto-set |
| completed_at | completed_at | TIMESTAMPTZ | ✅ Optional |
| notes | notes | TEXT | ✅ Optional |

**Frontend-Backend Alignment: 100%** ✅

---

## Next Steps

### Still TODO:
1. **Create API Endpoints** (in progress)
   - `POST /api/cases/{case_id}/attachments` - Upload attachment
   - `GET /api/cases/{case_id}/attachments` - List attachments
   - `GET /api/attachments/{id}` - Get attachment
   - `PATCH /api/attachments/{id}` - Update attachment
   - `DELETE /api/attachments/{id}` - Delete attachment
   - `POST /api/attachments/{id}/verify-hash` - Verify integrity
   
   - `POST /api/cases/{case_id}/collaborations` - Create collaboration
   - `GET /api/cases/{case_id}/collaborations` - List collaborations
   - `GET /api/collaborations/{id}` - Get collaboration
   - `PATCH /api/collaborations/{id}` - Update collaboration
   - `DELETE /api/collaborations/{id}` - Delete collaboration
   - `PATCH /api/collaborations/{id}/status` - Update status

2. **File Storage Integration**
   - Implement S3/local file storage
   - Generate pre-signed URLs for downloads
   - Implement file upload handling

3. **Virus Scanning Integration**
   - Integrate with ClamAV or similar
   - Asynchronous scan jobs
   - Quarantine infected files

4. **Audit Logging**
   - Log all file uploads/downloads
   - Log collaboration status changes
   - Track access to classified attachments

---

## Testing Recommendations

### Attachment Testing:
1. Upload various file types (PDF, DOCX, ZIP, XLSX)
2. Test classification levels and access control
3. Verify SHA-256 hash generation and verification
4. Test virus scan status workflows
5. Test file size limits and validation
6. Test duplicate hash prevention (unique constraint)

### Collaboration Testing:
1. Create collaborations for each partner type
2. Test status transitions (INITIATED → ACTIVE → COMPLETED)
3. Verify email and phone validation
4. Test filtering by status and partner type
5. Test MoU reference tracking
6. Test completion date workflows

---

## Summary

✅ **Completed**:
- Updated Attachment model with 15 fields
- Updated CaseCollaboration model with 14 fields
- Created 4 new enum types
- Created 7 Pydantic schemas for Attachments
- Created 7 Pydantic schemas for Collaborations
- Applied database migration successfully
- 100% alignment with frontend mock data

🔄 **In Progress**:
- API endpoint creation

📋 **Pending**:
- File storage integration
- Virus scanning integration
- Access control implementation

**Backend Schema Status**: Complete and Ready for API Development ✅
