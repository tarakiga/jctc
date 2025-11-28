# Backend Schema Consolidation - Seizures & Devices

## Overview
This document summarizes the backend schema consolidation completed to align the database schema with mock data fields used in the frontend for seizures and devices.

## Changes Made

### 1. Database Migration
**File**: `backend/alembic/versions/add_seizure_device_fields.py`

Created a comprehensive Alembic migration that adds missing fields to both seizures and devices tables. The migration merges two existing head revisions (`e3df44719336` and `update_casestatus_001`).

#### New Enums Created:
- **WarrantType**: `SEARCH_WARRANT`, `PRODUCTION_ORDER`, `COURT_ORDER`, `SEIZURE_ORDER`
- **SeizureStatus**: `PENDING`, `COMPLETED`, `DISPUTED`, `RETURNED`
- **DeviceCondition**: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `DAMAGED`
- **EncryptionStatus**: `NONE`, `ENCRYPTED`, `BITLOCKER`, `FILEVAULT`, `PARTIAL`, `UNKNOWN`
- **AnalysisStatus**: `PENDING`, `IN_PROGRESS`, `ANALYZED`, `BLOCKED`

#### DeviceType Enum Updates:
Added new values to existing enum:
- `DESKTOP`
- `EXTERNAL_STORAGE`
- `MEMORY_CARD`
- `SERVER`
- `NETWORK_DEVICE`

### 2. Seizures Table Additions

| Column | Type | Description |
|--------|------|-------------|
| `warrant_number` | String(100) | Warrant/court order reference number |
| `warrant_type` | WarrantType enum | Type of legal authorization |
| `issuing_authority` | String(255) | Authority that issued the warrant |
| `description` | Text | Detailed description of seizure |
| `items_count` | Integer | Total number of items seized |
| `status` | SeizureStatus enum | Current status (default: COMPLETED) |
| `witnesses` | JSONB | Array of witness information |
| `photos` | JSONB | Array of photo metadata {id, url, filename} |

### 3. Devices Table Additions

| Column | Type | Description |
|--------|------|-------------|
| `case_id` | UUID (FK) | Direct reference to case |
| `storage_capacity` | String(100) | e.g., "512GB SSD", "256GB" |
| `operating_system` | String(100) | e.g., "Windows 11 Pro", "iOS 17.2" |
| `condition` | DeviceCondition enum | Physical condition |
| `powered_on` | Boolean | Whether device was powered on when seized |
| `password_protected` | Boolean | Whether device is password protected |
| `encryption_status` | EncryptionStatus enum | Encryption status (default: UNKNOWN) |
| `forensic_notes` | Text | Detailed forensic analysis notes |
| `status` | AnalysisStatus enum | Analysis status (default: PENDING) |

### 4. SQLAlchemy Models Update
**File**: `backend/app/models/evidence.py`

#### Added Enum Classes:
```python
class WarrantType(str, enum.Enum)
class SeizureStatus(str, enum.Enum)
class DeviceCondition(str, enum.Enum)
class EncryptionStatus(str, enum.Enum)
class AnalysisStatus(str, enum.Enum)
```

#### Updated Models:
- **Seizure model**: Added all new fields with appropriate Column definitions
- **Device model**: Added all new fields including direct `case_id` FK

### 5. Pydantic Schemas Update
**File**: `backend/app/schemas/devices.py`

#### Updated Schemas:
- **SeizureBase**: Added warrant, status, and documentation fields
- **SeizureUpdate**: Added all optional update fields
- **DeviceBase**: Added physical characteristics, security state, and analysis fields
- **DeviceUpdate**: Added all optional update fields
- **DeviceResponse**: Added `case_id` and `custody_status` to response

#### Schema Imports:
Updated to include all new enum types from models.

### 6. Models Package Export
**File**: `backend/app/models/__init__.py`

Added exports for new enum types:
- `WarrantType`
- `SeizureStatus`
- `DeviceCondition`
- `EncryptionStatus`
- `AnalysisStatus`

## Migration Status

✅ **Migration Applied Successfully**

```bash
alembic upgrade head
```

Output:
```
INFO  [alembic.runtime.migration] Running upgrade e3df44719336, update_casestatus_001 -> add_seizure_device_fields
```

## API Integration

The existing API endpoints in `backend/app/api/v1/endpoints/devices.py` automatically support the new fields through the updated Pydantic schemas:

- `POST /{case_id}/seizures` - Create seizure with all new fields
- `PUT /seizures/{seizure_id}` - Update seizure with new fields
- `POST /seizures/{seizure_id}/devices` - Create device with new fields
- `PUT /devices/{device_id}` - Update device with new fields

No changes were needed to the endpoints as they use `.dict()` methods which automatically include all schema fields.

## Frontend Integration Notes

### Mock Data Alignment

The mock data in `frontend/apps/web/app/cases/[id]/page.tsx` now matches the backend schema:

**Seizures** (lines 262-345):
- `warrant_number`, `warrant_type`, `issuing_authority`
- `description`, `items_count`, `status`
- `witnesses` array, `photos` array

**Devices** (lines 347-444):
- `device_type`, `storage_capacity`, `operating_system`
- `condition`, `powered_on`, `password_protected`
- `encryption_status`, `forensic_notes`, `status`

### Next Steps for Frontend

1. **Update Forms**: Modify `SeizureManager.tsx` and `DeviceInventory.tsx` to include input fields for all new attributes
2. **Update API Hooks**: Ensure `useSeizures.ts` and `useDevices.ts` include new fields in POST/PUT requests
3. **Update TypeScript Types**: Add new fields to TypeScript interfaces
4. **Remove Mock Data**: Once forms are updated, remove mock data and use real API data

## Testing Recommendations

1. **Database Tests**:
   - Verify all new columns exist
   - Test enum constraints
   - Test foreign key relationships

2. **API Tests**:
   - Test creating seizures with warrant information
   - Test creating devices with full metadata
   - Test filtering by new status fields

3. **Integration Tests**:
   - Test full workflow: seizure → device → imaging → analysis
   - Verify JSONB fields (witnesses, photos) properly serialize

## Rollback Procedure

If issues arise, the migration can be rolled back:

```bash
alembic downgrade -1
```

This will:
- Remove all new columns from both tables
- Drop new enum types (except DeviceType which existed before)
- Preserve all existing data in original columns

## Documentation

Updated files:
- ✅ Migration file with comprehensive comments
- ✅ This summary document
- 🔲 API documentation (Swagger auto-generated from schemas)
- 🔲 Frontend form update guide (TODO)
