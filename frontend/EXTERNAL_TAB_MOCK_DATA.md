# External Tab Mock Data - Complete

## Overview
Added comprehensive mock data for Attachments and Collaborations under the External tab to demonstrate full case management capabilities.

---

## Changes Made

### File: `frontend/apps/web/app/cases/[id]/page.tsx`

#### 1. Mock Attachments Data (Lines 481-523)

Added **4 mock attachments** representing common case file types:

| ID | Filename | Type | Size | Category | Uploaded By | Date |
|----|----------|------|------|----------|-------------|------|
| attach-1 | Forensic_Analysis_Report_Jan2025.pdf | PDF | 2.4 MB | Report | Michael Chen | Jan 22, 2025 |
| attach-2 | Witness_Statement_Robert_Martinez.docx | DOCX | 156 KB | Legal | Jane Smith | Jan 17, 2025 |
| attach-3 | Crime_Scene_Photos_ABC_Corp.zip | ZIP | 15 MB | Evidence | Jane Smith | Jan 16, 2025 |
| attach-4 | Bank_Transaction_Records_Q4_2024.xlsx | XLSX | 892 KB | Financial | Emma Wilson | Jan 19, 2025 |

**Mock Attachment Structure:**
```typescript
{
  id: string
  filename: string
  file_type: string  // PDF, DOCX, ZIP, XLSX, etc.
  file_size: number  // in bytes
  description: string
  uploaded_by_name: string
  uploaded_at: string  // ISO date
  category: string  // Report, Legal, Evidence, Financial
}
```

**Realistic File Sizes:**
- PDF reports: ~2-3 MB
- Word documents: ~150-200 KB
- Photo archives (ZIP): ~15 MB
- Excel spreadsheets: ~1 MB

#### 2. Mock Collaboration Data (Lines 525-571)

Added **4 international collaboration entries** representing different cooperation types:

| ID | Organization | Country | Contact | Type | Status | Start Date |
|----|--------------|---------|---------|------|--------|------------|
| collab-1 | FBI | United States | Agent Sarah Mitchell | Information Sharing | Active | Jan 18, 2025 |
| collab-2 | Europol EC3 | Netherlands | Inspector Lars Andersson | Joint Investigation | Active | Jan 20, 2025 |
| collab-3 | Metropolitan Police | United Kingdom | DI James Cooper | Evidence Exchange | Pending | Jan 22, 2025 |
| collab-4 | INTERPOL | Singapore | Officer Wei Zhang | Red Notice | Completed | Jan 12, 2025 |

**Mock Collaboration Structure:**
```typescript
{
  id: string
  organization: string
  country: string
  contact_person: string
  contact_email: string
  type: string  // Cooperation type
  status: string  // Active, Pending, Completed
  start_date: string  // ISO date
  description: string
}
```

**Realistic Scenarios:**
1. **FBI** - Cross-border financial fraud, intelligence sharing
2. **Europol** - Joint investigation, EU coordination
3. **Met Police** - Evidence exchange (server logs in UK)
4. **INTERPOL** - Red Notice issued and completed

---

## Component Integration

### AttachmentManager Component
**Updated**: Now receives `attachments` prop
```tsx
<AttachmentManager caseId={caseId} attachments={mockAttachments} />
```

**Props Interface:**
```typescript
interface AttachmentManagerProps {
  caseId: string
  attachments?: any[]  // Mock attachments array
}
```

### CollaborationManager Component
**Updated**: Now receives `collaborations` prop
```tsx
<CollaborationManager caseId={caseId} collaborations={mockCollaborations} />
```

**Props Interface:**
```typescript
interface CollaborationManagerProps {
  caseId: string
  collaborations?: any[]  // Mock collaborations array
}
```

---

## Mock Data Details

### Attachments

#### 1. Forensic Analysis Report
- **Purpose**: Comprehensive technical analysis
- **File**: PDF document (2.4 MB)
- **Content**: Digital device analysis, timeline, chat logs, financial traces
- **Uploaded by**: Forensic specialist (Michael Chen)
- **Category**: Report

#### 2. Witness Statement
- **Purpose**: Legal documentation
- **File**: Word document (156 KB)
- **Content**: Statement from security guard present at seizure
- **Uploaded by**: Lead investigator (Jane Smith)
- **Category**: Legal

#### 3. Crime Scene Photos
- **Purpose**: Visual evidence
- **File**: ZIP archive (15 MB)
- **Content**: High-resolution photos of ABC Corp workstation and surroundings
- **Uploaded by**: Lead investigator (Jane Smith)
- **Category**: Evidence

#### 4. Bank Transaction Records
- **Purpose**: Financial evidence
- **File**: Excel spreadsheet (892 KB)
- **Content**: Q4 2024 transaction records from suspect accounts
- **Uploaded by**: Intelligence analyst (Emma Wilson)
- **Category**: Financial

### Collaborations

#### 1. FBI Cooperation (Active)
- **Type**: Information Sharing
- **Purpose**: Cross-border financial fraud investigation
- **Scope**: Intelligence on related US cases
- **Status**: Active with weekly coordination calls

#### 2. Europol EC3 (Active)
- **Type**: Joint Investigation
- **Purpose**: International cybercrime network
- **Scope**: Multi-country coordination, evidence sharing
- **Status**: Active, formal MLA submitted

#### 3. Metropolitan Police (Pending)
- **Type**: Evidence Exchange
- **Purpose**: Server logs hosted in London
- **Scope**: Physical server data extraction
- **Status**: Pending UK Home Office approval (2-3 weeks)

#### 4. INTERPOL (Completed)
- **Type**: Red Notice
- **Purpose**: International travel alert for suspect
- **Scope**: Distributed to 195 member countries
- **Status**: Completed - notice published successfully

---

## Realistic Context

### Attachment Timeline
- **Jan 16** - Crime scene photos uploaded (day of seizure)
- **Jan 17** - Witness statement added
- **Jan 19** - Bank records obtained via production order
- **Jan 22** - Forensic analysis report completed

### Collaboration Timeline
- **Jan 12** - INTERPOL Red Notice initiated
- **Jan 16** - Red Notice completed
- **Jan 18** - FBI cooperation began
- **Jan 20** - Europol joint investigation started
- **Jan 22** - Met Police evidence exchange requested

### Geographic Coverage
- **North America**: FBI (US)
- **Europe**: Europol (Netherlands), Met Police (UK)
- **Asia-Pacific**: INTERPOL Singapore
- **International**: Multi-jurisdictional coordination

---

## File Type Distribution

### Attachments by Type:
- **Documents**: 2 (PDF report, DOCX statement)
- **Archives**: 1 (ZIP photos)
- **Spreadsheets**: 1 (XLSX financial data)

### Attachments by Category:
- **Report**: 1 (Forensic analysis)
- **Legal**: 1 (Witness statement)
- **Evidence**: 1 (Photos)
- **Financial**: 1 (Bank records)

---

## Implementation Complete ✅

### AttachmentManager Component:
- ✅ Accepts `attachments` prop (optional, falls back to API)
- ✅ Renders file list with icons based on file_type (PDF, DOCX, ZIP, XLSX)
- ✅ Displays file sizes in human-readable format (KB, MB, GB)
- ✅ Shows upload dates and uploaders with proper formatting
- ✅ Includes download and verify hash buttons
- ✅ Classification badges (Public, LE Sensitive, Privileged)
- ✅ Virus scan status indicators (Clean, Pending, Infected)
- ✅ SHA-256 hash display for integrity verification
- ✅ Filter by classification level

### CollaborationManager Component:
- ✅ Accepts `collaborations` prop (optional, falls back to API)
- ✅ Display organization cards with partner type icons
- ✅ Status badges: Initiated (blue), Active (green), Completed (gray), Suspended (amber)
- ✅ Contact information display (person, email, phone)
- ✅ Partner type badges (Law Enforcement, International, Regulator, ISP, Bank)
- ✅ Reference numbers and MoU references
- ✅ Scope of collaboration in highlighted section
- ✅ Filter by partner type and status
- ✅ Edit and delete functionality

### Backend Integration (Future):
   - Create Attachment model and API endpoints
   - Create Collaboration model and API endpoints
   - File upload/download functionality
   - Secure file storage integration
   - Email notifications for collaboration updates

---

## Summary

✅ **Mock Data Added**:
- 4 realistic attachments (reports, statements, photos, financial data)
- 4 international collaborations (FBI, Europol, Met Police, INTERPOL)

✅ **Components Updated**:
- AttachmentManager now receives mock data prop
- CollaborationManager now receives mock data prop

✅ **Realistic Scenarios**:
- File types commonly used in cybercrime cases
- International law enforcement cooperation
- Timeline aligned with case events
- Professional contacts and organizations

**External Tab Status**: Fully populated with mock data ✅
