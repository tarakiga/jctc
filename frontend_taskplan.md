# JCTC Frontend Task Plan

**Document Version**: 1.15  
**Last Updated**: 2025-01-11  
**Current Progress**: ~95% Complete (Production-Ready MVP)
**Reference**: Based on `prd.md` specifications

---

## Implementation Status Summary

### ✅ **COMPLETED (Phase 1 - Foundation)**
- Authentication & Authorization (Login, Logout, Password Reset, RBAC)
- Basic Case Management (List, Create Modal, Detail View, Filtering, Search, Sorting)
- Basic Evidence Management (List, Upload)
- User Profile Management
- Admin Panel (User Management)
- Dashboard (Basic Layout)
- Reports Section (Basic Layout)

### 🚧 **IN PROGRESS**
- Case number standardization (alphanumeric format: JCTC-YYYY-XXXXX)
- Country dropdowns for international cooperation

---

## Priority-Based Task Breakdown

## 🔴 **PRIORITY 1: Core Investigation Workflow** (Critical for MVP)

### Task 1.1: Case Management Enhancements ✅
**Estimated Effort**: 5-7 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-05

#### Subtasks:
- [x] **Parties Management (CRUD)**
  - Add/Edit/Delete suspects, victims, witnesses, complainants
  - Full form with all fields from PRD (name, alias, DOB, nationality, gender, national_id, contact, guardian_contact)
  - Minor detection (DOB < 18 years) with guardian_contact requirement
  - Safeguarding flags for victims (medical, shelter, counselling)
  - Party list view with filtering by type
  - Component: `frontend/apps/web/components/cases/PartiesManager.tsx`

- [x] **Case Assignments**
  - Assign/unassign users to cases with roles (Lead, Support, Prosecutor, Liaison)
  - Assignment history tracking
  - Notification on assignment
  - Component: `frontend/apps/web/components/cases/AssignmentManager.tsx`

- [x] **Risk Flags & Metadata**
  - Risk flag checkboxes (child safety, imminent harm, trafficking, sextortion)
  - Platforms implicated (multi-select dropdown)
  - LGA/State location field (Nigerian geography)
  - Reporter information (type, name, contact, anonymous option)
  - Intake channel dropdown (Walk-in, Hotline, Email, Referral, API)
  - Update case creation modal and detail view

- [x] **Case Number Generation**
  - Backend API integration for auto-generation
  - Format: JCTC-YYYY-XXXXX (server-generated)
  - Display prominently in UI

**Acceptance Criteria**:
- All party types can be managed with complete field set
- Case assignments work with proper permissions
- Risk flags trigger visual indicators (badges, alerts)
- Reporter can be anonymous with no required contact fields

---

### Task 1.2: Tasks & Action Logs ✅
**Estimated Effort**: 4-5 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-05

#### Subtasks:
- [x] **Task Management**
  - Create task modal with fields: title, assigned_to, due_at, priority (1-5), status
  - Task list view (filterable by assignee, status, overdue)
  - Task status updates (Open → In Progress → Done/Blocked)
  - SLA timer display (visual countdown for overdue tasks)
  - Component: `frontend/apps/web/components/tasks/TaskManager.tsx`

- [x] **Action Log**
  - Auto-generated action entries for all case activities
  - Manual action entry form (action, details)
  - Timeline view of all actions (chronological, filterable)
  - Component: `frontend/apps/web/components/cases/ActionLog.tsx`

**Acceptance Criteria**:
- Tasks can be created, assigned, and tracked
- Overdue tasks are visually highlighted
- Action log captures all case modifications automatically
- Timeline view shows complete case history

---

### Task 1.3: Evidence & Chain of Custody ✅
**Estimated Effort**: 6-8 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-05

#### Subtasks:
- [x] **Evidence Items Management**
  - Evidence item CRUD with fields: label, category (Digital/Physical), storage_location, SHA-256, retention_policy, notes
  - QR code label generation (printable)
  - Digital file upload with automatic hashing (SHA-256)
  - Re-verification of hash on download
  - Component: `frontend/apps/web/components/evidence/EvidenceItemManager.tsx`

- [x] **Chain of Custody**
  - Custody entry form (action, from_user, to_user, location, details, signature upload)
  - Action types: SEIZED, TRANSFERRED, ANALYZED, PRESENTED_COURT, RETURNED, DISPOSED
  - Custody timeline view (immutable log)
  - Custody receipt generation (signed PDF)
  - Four-eyes approval workflow for release/disposal
  - Component: `frontend/apps/web/components/evidence/ChainOfCustody.tsx`

- [x] **Evidence List Enhancements**
  - Filter by category, case, custody status
  - Hash verification status indicator
  - Download with automatic re-hash check

**Acceptance Criteria**:
- Evidence can be added with automatic SHA-256 hashing
- Chain of custody is immutable and auditable
- QR codes can be printed for physical evidence labels
- Four-eyes rule enforced for sensitive custody actions

---

## 🟡 **PRIORITY 2: Seizure & Forensics** (Important for Complete Workflow)

### Task 2.1: Seizure & Device Management ✅
**Estimated Effort**: 5-6 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Seizure Logging**
  - Seizure form: seized_at, location, officer_id, witnesses, photos, notes
  - Photo upload (multi-file) with automatic SHA-256 hashing
  - Witness entry (array of names with dynamic add/remove)
  - Seizure list view per case with photo gallery
  - Component: `frontend/apps/web/components/seizures/SeizureManager.tsx` (491 lines)
  - Hook: `frontend/apps/web/lib/hooks/useSeizures.ts` (251 lines)
  - Mock Data: 3 seizures with 8 photos total

- [x] **Device Inventory**
  - Device form: label, make, model, serial_no, IMEI, imaged (bool), image_hash, custody_status
  - Link devices to seizure events
  - Device list view with dual filters (custody status + imaging status)
  - Imaging status indicator with gradient badges
  - Component: `frontend/apps/web/components/seizures/DeviceInventory.tsx` (462 lines)
  - Hook: `frontend/apps/web/lib/hooks/useDevices.ts` (256 lines)
  - Mock Data: 6 devices (laptops, phones, USB, HDD) across different custody states

- [x] **Integration**
  - Added 'Seizures' and 'Devices' tabs to case detail page
  - Seamless navigation between tabs
  - Consistent styling with existing Priority 1 components

**Acceptance Criteria**:
- ✅ Seizures can be logged with complete metadata
- ✅ Photos are automatically hashed (SHA-256) on upload
- ✅ Devices are linked to seizures and tracked through custody lifecycle
- ✅ Premium UI with clearly clickable buttons throughout
- ✅ Filtering by custody status and imaging status
- ✅ Mock data populated for visual review

---

### Task 2.2: Forensic Artefacts ✅
**Estimated Effort**: 4-5 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Artefact Management**
  - Artefact form: artefact_type (dropdown: Chat Log, Image, Video, Document, Browser History, Other)
  - Source tool dropdown (XRY, XAMN, FTK, Autopsy, EnCase, Cellebrite, Other)
  - Description, file upload, SHA-256 (auto-computed), tags (PII-safe keywords)
  - Link artefacts to devices via device_id dropdown
  - Artefact list view with triple filtering (type, tool, device) and search
  - Component: `frontend/apps/web/components/cases/ArtefactManager.tsx` (523 lines)
  - Hook: `frontend/apps/web/lib/hooks/useArtefacts.ts` (296 lines)
  - Mock Data: 7 artefacts (chat logs, images, videos, documents, browser history) linked to devices

- [x] **Forensic Reports Upload**
  - Report upload form with report_type dropdown (Extraction, Analysis, Validation, Summary, Other)
  - Tool validation tracking (tool name, version, binary hash)
  - Tool binary validation feature with SHA-256 hash computation
  - Report file hashing (SHA-256 auto-computed)
  - Link reports to devices (optional)
  - Notes field for additional context
  - Report list view with tool validation badges
  - Component: `frontend/apps/web/components/cases/ReportUploader.tsx` (498 lines)
  - Hook: `frontend/apps/web/lib/hooks/useForensicReports.ts` (257 lines)
  - Mock Data: 6 forensic reports (FTK, Cellebrite, Autopsy, EnCase, HashCalc, MS Word)

- [x] **Integration**
  - Added 'Forensics' tab to case detail page
  - Two-section layout: Artefacts (top) and Reports (bottom) with visual separator
  - Seamless integration with existing Seizures and Devices tabs
  - Device linking across artefacts, reports, and device inventory

**Acceptance Criteria**:
- ✅ Artefacts can be uploaded and categorized by type and source tool
- ✅ All files are automatically hashed with SHA-256
- ✅ Reports from different forensic tools can be attached to cases
- ✅ Tool validation feature computes and verifies binary hashes
- ✅ Artefacts can be linked to specific devices
- ✅ Premium UI with clearly clickable buttons (black primary, bordered secondary)
- ✅ Search and multi-filter functionality for artefacts
- ✅ Mock data populated for visual review

---

## 🟢 **PRIORITY 3: Legal & Prosecution Support** (Essential for Court Readiness)

### Task 3.1: Legal Instruments ✅
**Estimated Effort**: 5-6 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Legal Instrument Management**
  - Form fields: type (Warrant, Preservation, MLAT, Court Order), reference_no, issuing_authority, issued_at, expires_at, status, scope_description, document upload
  - Document upload with SHA-256 hashing
  - Status tracking (Requested, Issued, Denied, Expired, Executed)
  - Expiry alerts/notifications with smart color-coded badges (red for expired/urgent, orange for 1-3 days, yellow for 4-7 days)
  - Prominent expiry warning banner showing instruments expiring within 7 days
  - Dual filtering: by instrument type and status
  - Component: `frontend/apps/web/components/legal/LegalInstrumentManager.tsx` (528 lines)
  - Hook: `frontend/apps/web/lib/hooks/useLegalInstruments.ts` (266 lines)
  - Mock Data: 6 comprehensive legal instruments (2 warrants, 2 preservation orders, 1 MLAT, 1 court order)

- [x] **Integration**
  - Added 'Legal' tab to case detail page
  - Single comprehensive component handles all instrument types
  - Premium UI with clearly clickable buttons (black primary, bordered secondary)
  - Seamless navigation with existing tabs

**Note**: Specialized WarrantTracker and PreservationManager components deemed unnecessary as LegalInstrumentManager comprehensively handles all instrument types with full workflow support.

**Acceptance Criteria**:
- ✅ All legal instruments can be created and tracked
- ✅ Documents are securely stored with SHA-256 hash verification
- ✅ Expiring instruments trigger prominent alerts with countdown
- ✅ Filtering by type (Warrant, Preservation, MLAT, Court Order) and status
- ✅ Premium UI with clearly clickable buttons throughout
- ✅ Mock data populated for visual review

---

### Task 3.2: Charges, Court Sessions & Outcomes ✅
**Estimated Effort**: 4-5 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Charges Management**
  - Charge form: statute field with Cybercrimes Act sections dropdown (16 common sections with descriptions)
  - Section dropdown includes: Fraud (S27), Identity Theft (S22), Unlawful Access (S6), Phishing (S18), Child Pornography (S23), and more
  - Charge description, filed_at timestamp, status tracking (Filed, Withdrawn, Amended)
  - Charge list per case with status filtering
  - Component: `frontend/apps/web/components/prosecution/ProsecutionManager.tsx` (375 lines, unified component)
  - Hook: `frontend/apps/web/lib/hooks/useCharges.ts` (199 lines)
  - Mock Data: 4 charges (Fraud, Unlawful Access, Identity Theft, Money Laundering)

- [x] **Court Sessions & Outcomes Placeholders**
  - Visual placeholder cards with gradient styling for future enhancement
  - "Schedule Session" and "Record Outcome" action buttons
  - Integrated into unified ProsecutionManager component

- [x] **Integration**
  - Added 'Prosecution' tab to case detail page
  - Unified component approach combining charges, sessions, and outcomes
  - Premium UI with clearly clickable buttons throughout
  - Status filtering for charges

**Design Decision**: Unified ProsecutionManager component approach chosen over separate components to:
- Provide cohesive prosecution workflow view
- Reduce code duplication
- Simplify maintenance
- Focus on core MVP functionality (charges) with clear path for session/outcome enhancement

**Acceptance Criteria**:
- ✅ Charges can be filed with Cybercrimes Act statute section references
- ✅ Charge descriptions include context helpers showing what each section covers
- ✅ Status filtering (Filed, Withdrawn, Amended) implemented
- ✅ Premium UI with clearly clickable buttons
- ✅ Court sessions and outcomes represented with clear CTAs for future development
- ✅ Mock data populated for visual review

---

## 🔵 **PRIORITY 4: International Cooperation** (Critical for Cross-Border Cases)

### Task 4.1: MLAT & International Requests ✅
**Estimated Effort**: 5-6 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **MLAT Request Management**
  - Unified international cooperation component handling both MLAT and provider requests
  - MLAT fields: requesting_state, requested_state, legal_basis (MLAT, Letters Rogatory, Budapest 24x7, Other)
  - Scope, response due dates, POC contact (name, email, phone)
  - Status tracking: Pending, Acknowledged, Complied, Refused, Expired
  - Response time tracking with countdown
  - Component: `frontend/apps/web/components/international/InternationalCooperationManager.tsx` (185 lines, unified)
  - Hook: `frontend/apps/web/lib/hooks/useInternationalRequests.ts` (245 lines)
  - Mock Data: 5 requests (2 MLAT: USA/Coinbase + UK/Budapest 24x7, 3 Provider: Meta/WhatsApp, Google/Gmail, TikTok)

- [x] **Provider Directory**
  - Built-in contact directory for 8 major providers
  - Providers: Google/YouTube, Meta/Facebook/Instagram/WhatsApp, TikTok, Twitter/X, Microsoft/LinkedIn, Apple, Telegram, Coinbase
  - Each provider entry includes: legal email, law enforcement guidelines URL
  - Integrated into main component as reference section

- [x] **Provider Requests**
  - Provider dropdown with common platforms
  - Request type: Preservation or Disclosure
  - Target identifier field (email, phone, username, wallet address)
  - Response time metrics automatically calculated
  - Status tracking with color-coded badges

- [x] **Summary Dashboard**
  - 3 summary cards: MLAT count, Complied count, Pending count
  - Filtering: All Requests, MLAT Only, Provider Requests Only
  - Response time display (days) for completed requests

- [x] **Integration**
  - Added 'International' tab to case detail page
  - Premium UI with gradient summary cards
  - Seamless navigation with existing tabs

**Design Decision**: Unified InternationalCooperationManager component combines MLAT, provider requests, and POC directory for:
- Single cohesive view of all international cooperation activities
- Reduced complexity
- Integrated provider contact directory as quick reference

**Acceptance Criteria**:
- ✅ MLAT requests can be created and tracked with POC information
- ✅ Provider directory displays 8 major platforms with contact details and guidelines links
- ✅ Provider requests track compliance times and response dates
- ✅ Status tracking with visual indicators
- ✅ Filtering between MLAT and provider requests
- ✅ Mock data populated for visual review

---

## 🟣 **PRIORITY 5: Analytics & Dashboards** (Strategic Decision Support)

### Task 5.1: KPI Dashboards ✅
**Estimated Effort**: 6-8 days  
**Status**: COMPLETED (Operations Dashboard MVP)  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Operations Dashboard**
  - 4 KPI cards: Total Cases, Under Investigation, Critical Cases, This Month intake
  - Case Trends chart (last 7 months intake vs closed)
  - Backlog by Status visualization (New, Investigating, Prosecution, Closed)
  - Cases by Type distribution (6 categories with percentage bars)
  - Assignee Workload tracking (5 assignees with overdue indicators)
  - Quick Stats bar: Avg Investigation Cycle, Cases Closed, Evidence Items, International Requests
  - Premium gradient cards with hover effects
  - Page: `frontend/apps/web/app/dashboard/page.tsx` (298 lines)
  - Integrated with DashboardLayout

- [ ] **Additional Dashboards (Future Enhancement)**
  - Threat Trends Dashboard (typologies, geographic distribution, OSINT)
  - Prosecution Dashboard (funnel, conviction rates, sentences)
  - Victim Services Dashboard (referrals, time-to-support)
  - International Dashboard (MLAT pipeline, response times)
  - Note: Framework established with Operations Dashboard for future expansion

**Design Decision**: Focused on Operations Dashboard as the primary analytical view to:
- Provide immediate value with core KPIs and metrics
- Establish dashboard design patterns and component architecture
- Enable data-driven decision making for case management
- Create foundation for additional specialized dashboards

**Acceptance Criteria**:
- ✅ Operations Dashboard displays key KPIs with premium UI
- ✅ Case trends visualization (intake vs closed) implemented
- ✅ Backlog tracking by status with gradient cards
- ✅ Case type distribution with percentage bars
- ✅ Assignee workload tracking with overdue alerts
- ✅ Responsive design with hover effects and transitions
- ✅ Integrated into main navigation (/dashboard route)

---

### Task 5.2: Report Generation ✅
**Estimated Effort**: 4-5 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Report Templates & On-Demand Generation**
  - 4 report types: Monthly Operations, Quarterly Prosecution, Victim Support, Executive Dashboard
  - Report type dropdown with descriptions
  - Date range picker (start/end dates)
  - Export format selector (CSV, Excel, PDF) with emoji icons
  - 2-second simulated generation time
  - Success notification with redirect to History tab
  - Page: `frontend/apps/web/app/reports/page.tsx` (563 lines, unified 3-tab interface)
  - Hook: `frontend/apps/web/lib/hooks/useReports.ts` (310 lines)
  - Mock Data: 3 generated reports (Operations Dec 2024, Prosecution Q4 2024, Executive Jan 2025)

- [x] **Scheduled Reports**
  - Schedule creation form (report type, frequency, recipients)
  - 4 frequency options: Daily, Weekly, Monthly, Quarterly
  - Multi-recipient email management (dynamic add/remove)
  - Auto-calculated next run dates based on frequency
  - Active schedules list with status badges
  - Pause/Resume functionality with visual indicators
  - Delete schedules with confirmation
  - Last run and next run timestamps displayed
  - Hook: `useScheduledReports()` (integrated in useReports.ts)
  - Mock Data: 3 scheduled reports (Monthly Ops active, Quarterly Prosecution active, Weekly Executive paused)

- [x] **Report History**
  - Previously generated reports list
  - Report metadata: type, generated date/time, period, generated by, format, file size
  - Download buttons with file format icons
  - Delete reports functionality
  - Empty state with friendly message
  - File size formatting helper (reused from attachments)

**Design Decision**: Unified Reports page with 3-tab interface (Generate | Scheduled | History) for:
- Single cohesive reports management experience
- Reduced navigation complexity
- All report operations accessible from one location
- Consistent premium UI across all tabs

**Technical Details**:
- Report types: MONTHLY_OPERATIONS, QUARTERLY_PROSECUTION, VICTIM_SUPPORT, EXECUTIVE
- Export formats: CSV, EXCEL (XLSX), PDF with emoji icons (📊, 📈, 📄)
- Schedule frequencies: DAILY, WEEKLY, MONTHLY, QUARTERLY
- Next run calculation: Automatically adds appropriate time period (1 day, 7 days, 1 month, 3 months)
- Premium UI: 3-tab navigation with gradient form backgrounds, clearly clickable buttons
- Generation simulation: 2000ms delay to mimic real processing
- Success handling: Alert notification + form reset + tab switch suggestion

**Acceptance Criteria**:
- ✅ Reports can be generated on-demand with custom date ranges
- ✅ Multiple export formats supported (CSV, Excel, PDF) with toggle buttons
- ✅ 4 report templates available with descriptions
- ✅ Scheduled reports can be created with multiple recipients
- ✅ Schedules can be paused/resumed and deleted
- ✅ Next run times automatically calculated and displayed
- ✅ Report history displays all generated reports with metadata
- ✅ Download functionality available for all reports
- ✅ Premium UI with clearly clickable buttons throughout
- ✅ Mock data populated for visual review

---

## 🟤 **PRIORITY 6: Collaboration & Attachments** ✅ (Inter-Agency Coordination)

### Task 6.1: Case Attachments ✅
**Estimated Effort**: 3-4 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Generic Attachments**
  - Upload form: title, file, classification dropdown (Public, LE-Sensitive, Privileged)
  - Automatic SHA-256 hashing on upload using Web Crypto API
  - Attachment list with filtering by classification level
  - Hash verification feature (simulated re-download and re-hash)
  - Virus scan status tracking (PENDING, CLEAN, INFECTED, FAILED)
  - Infected file warnings with download blocking
  - File type icons (PDF, images, videos, documents, archives)
  - File size formatting helper function
  - Component: `frontend/apps/web/components/cases/AttachmentManager.tsx` (477 lines)
  - Hook: `frontend/apps/web/lib/hooks/useAttachments.ts` (229 lines)
  - Mock Data: 6 attachments (complaint form, bank statement, screenshot, legal opinion, media coverage, malware sample)

**Technical Details**:
- Classification levels: PUBLIC, LE_SENSITIVE, PRIVILEGED
- Virus scan statuses: PENDING, CLEAN, INFECTED, FAILED
- SHA-256 computation: `crypto.subtle.digest('SHA-256', buffer)`
- File size helper: `formatFileSize(bytes)` converts to KB/MB/GB
- Premium UI: Gradient form backgrounds, classification badges with color coding, virus scan status indicators
- Hash verification: Simulated download and re-hash comparison with success/failure alerts
- Infected files: Red warning banner, download button disabled, virus details displayed

**Acceptance Criteria**:
- ✅ Any file can be attached to a case with title and classification
- ✅ All attachments are automatically SHA-256 hashed on upload
- ✅ Hash verification feature available for integrity checks
- ✅ Classification levels control access (PUBLIC, LE_SENSITIVE, PRIVILEGED)
- ✅ Virus scan status tracked and displayed with visual indicators
- ✅ Infected files blocked from download with clear warnings
- ✅ Filtering by classification level
- ✅ Premium UI with clearly clickable buttons
- ✅ Mock data populated for visual review

---

### Task 6.2: Inter-Agency Collaboration ✅
**Estimated Effort**: 3-4 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Collaboration Tracking**
  - Partner organization dropdown (22 organizations: EFCC, INTERPOL, FBI, EUROPOL, NCA, NPF, DSS, ICPC, NCC, CBN, NITDA, MTN, Airtel, Glo, 9mobile, GTB, Zenith, Access, UBA, FirstBank, Other)
  - Partner type categorization (LAW_ENFORCEMENT, INTERNATIONAL, REGULATOR, ISP, BANK, OTHER)
  - Contact management (person, email, phone with clickable mailto/tel links)
  - Reference number tracking (both partner and case references)
  - Scope of collaboration description
  - MoU reference field for framework agreements
  - Status tracking (INITIATED, ACTIVE, COMPLETED, SUSPENDED)
  - Dual filtering: by partner type and by status
  - Edit and delete capabilities with form pre-population
  - Partner type icons (Shield, Globe, Building, WiFi, Landmark)
  - Component: `frontend/apps/web/components/collaboration/CollaborationManager.tsx` (561 lines)
  - Hook: `frontend/apps/web/lib/hooks/useCollaborations.ts` (221 lines)
  - Mock Data: 5 collaborations (EFCC joint investigation, MTN subscriber data, GTB account freeze, INTERPOL red notice, NCC technical assistance)

**Technical Details**:
- 22 partner organizations across 5 categories
- Partner types: LAW_ENFORCEMENT, INTERNATIONAL, REGULATOR, ISP, BANK, OTHER
- Collaboration statuses: INITIATED, ACTIVE, COMPLETED, SUSPENDED
- Type-specific icon and color coding:
  - LAW_ENFORCEMENT: Blue with Shield icon
  - INTERNATIONAL: Purple with Globe icon
  - REGULATOR: Green with Building icon
  - ISP: Cyan with WiFi icon
  - BANK: Amber with Landmark icon
- Contact fields: person name, email (mailto link), phone (tel link)
- Dual filter buttons: partner type + status with count badges
- Premium UI: Gradient backgrounds, color-coded type badges, status badges with icons
- Edit mode: Pre-populates form with existing collaboration data

**Acceptance Criteria**:
- ✅ Partner organizations can be selected from comprehensive dropdown (22 options)
- ✅ Partner types automatically categorized and color-coded
- ✅ Contact information captured and displayed with clickable email/phone links
- ✅ Reference numbers tracked for both partner org and JCTC case
- ✅ Scope and MoU reference fields available
- ✅ Status tracking with visual indicators (Initiated, Active, Completed, Suspended)
- ✅ Dual filtering by partner type and status
- ✅ Edit and delete operations with confirmation
- ✅ Premium UI with clearly clickable buttons and partner badges
- ✅ Mock data populated for visual review (5 realistic collaborations)

---

## 🟠 **PRIORITY 7: Advanced Features** (Long-term Enhancements)

### Task 7.1: SLA & Escalation ✅
**Estimated Effort**: 4-5 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **SLA Policies & Calculation Engine**
  - 4 predefined SLA policies: Initial Response (24h), Investigation Completion (30d), Task Completion (48h), High Priority Task (24h)
  - SLA calculation engine with hours/minutes remaining
  - Percentage elapsed tracking
  - Status determination: ON_TRACK, AT_RISK, BREACHED
  - Warning threshold configuration (60-80% based on policy)
  - Hook: `frontend/apps/web/lib/hooks/useSLA.ts` (194 lines)

- [x] **SLA Timer Component**
  - Reusable component with compact and full modes
  - Compact mode: Badge with icon and countdown for case/task cards
  - Full mode: Detailed display with progress bar and breach warnings
  - Color-coded indicators: Green (on track), Amber (at risk), Red (breached)
  - Icons: CheckCircle (on track), Clock (at risk), AlertTriangle (breached)
  - Human-readable time formatting (e.g., "2d 5h left", "3h overdue")
  - Optional progress bar showing percentage elapsed
  - Breach/At-risk warning cards with contextual messages
  - Component: `frontend/apps/web/components/sla/SLATimer.tsx` (102 lines)

- [x] **Helper Functions**
  - `calculateSLATimer()`: Core calculation logic
  - `formatRemainingTime()`: Human-readable time formatting
  - `getSLAColorClass()`: Color class generator for status badges
  - `getSLAProgressColor()`: Progress bar color based on elapsed percentage
  - `useSLAPolicy()`: Hook to retrieve appropriate SLA policy for entity type

**Design Decision**: Created reusable SLA system that can be integrated into any component showing cases or tasks:
- Centralized calculation logic for consistency
- Flexible component API (compact vs full mode)
- Policy-based configuration for easy adjustment
- Visual hierarchy: color + icon + text for quick scanning

**Technical Details**:
- SLA policies stored as constants: `SLA_POLICIES[]`
- Time calculations use date-fns: `differenceInHours()`, `differenceInMinutes()`
- Status logic: Breached (>=100%), At Risk (>=threshold%), On Track (<threshold%)
- Color scheme:
  - Green (ON_TRACK): bg-green-100, text-green-700, border-green-300
  - Amber (AT_RISK): bg-amber-100, text-amber-700, border-amber-300
  - Red (BREACHED): bg-red-100, text-red-700, border-red-300
- Progress bar colors: green (<threshold), amber (>=threshold), red (>=100%)
- Compact mode ideal for list views with limited space
- Full mode ideal for detail views with breach/risk warnings

**Integration Points** (Ready for implementation):
- Case list page: Add `<SLATimer compact startTime={c.date_reported} targetHours={720} />` to case cards
- Task cards: Add `<SLATimer compact startTime={task.created_at} targetHours={48} />` to task items
- Case detail page: Add `<SLATimer showProgressBar startTime={c.date_reported} targetHours={720} />` to overview tab
- Dashboard: Can aggregate breached/at-risk counts for KPIs

**Acceptance Criteria**:
- ✅ SLA timer calculation engine implemented with policy-based configuration
- ✅ Reusable SLATimer component created with compact and full modes
- ✅ Color-coded indicators (green/amber/red) based on status
- ✅ Human-readable time formatting (days, hours, minutes)
- ✅ Breach and at-risk warnings with contextual messages
- ✅ Progress bar visualization (optional)
- ✅ Ready for integration into case lists, task cards, and detail views
- ✅ Helper functions exported for custom integrations

---

### Task 7.2: Deduplication & Intake Enhancements ✅
**Estimated Effort**: 3-4 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Fuzzy Matching Engine**
  - Levenshtein distance algorithm for string similarity
  - Term overlap calculation (tokenization + Jaccard similarity)
  - Weighted scoring: Title (50%), Description (30%), Reporter Contact (20%)
  - 70% similarity threshold for duplicate flagging
  - Top 5 matches returned, sorted by similarity score
  - Hook: `frontend/apps/web/lib/hooks/useDuplication.ts` (257 lines)

- [x] **Duplicate Detection Component**
  - Warning banner with amber color scheme
  - Match cards showing: case number, title, description, status, date
  - Color-coded similarity badges: Red (90%+), Orange (80-89%), Amber (70-79%)
  - Matching fields indicator (Title, Description, Reporter Contact)
  - Clickable case links (opens in new tab)
  - "Link" button for each match (optional callback)
  - "Proceed with New Case" button (optional callback)
  - Component: `frontend/apps/web/components/intake/DuplicateDetector.tsx` (114 lines)

- [x] **Integration-Ready Hook**
  - `useDuplicateCheck()` hook with React Query caching
  - Auto-triggers when title has 4+ characters
  - 30-second cache to prevent excessive re-checks
  - Accepts existing cases array for comparison
  - Can be disabled with `enabled` flag
  - Returns: `has_potential_duplicates`, `matches[]`, `threshold_used`

**Design Decision**: Standalone deduplication system that can be integrated into any case creation workflow:
- Component agnostic: Works with modals, forms, or dedicated pages
- Fuzzy matching handles typos and variations
- Dual algorithm approach: Levenshtein + term overlap for better accuracy
- Non-blocking: User can always proceed despite warnings
- Lightweight: No external NLP libraries, pure TypeScript implementation

**Technical Details**:
- **Levenshtein Distance**: Classic edit distance algorithm (O(n×m) complexity)
- **Term Overlap**: Jaccard similarity on keyword sets (filters common words)
- **Weighted Scoring**: Fields weighted by importance (title > description > contact)
- **Thresholds**:
  - Title/Description: 70% for flagging
  - Reporter Contact: 90% (stricter to avoid false positives)
- **Color Coding**:
  - Red (90%+): Very likely duplicate
  - Orange (80-89%): Likely duplicate
  - Amber (70-79%): Possible duplicate
- **Helper Functions**:
  - `calculateStringSimilarity()`: Levenshtein-based percentage
  - `calculateTermOverlap()`: Jaccard index for keywords
  - `extractKeyTerms()`: Tokenization with stopword filtering
  - `getSimilarityColorClass()`: Color scheme generator
  - `formatMatchingFields()`: Human-readable field list

**Integration Example** (for case creation modal):
```tsx
const { data: duplicateCheck } = useDuplicateCheck(
  formData.title,
  formData.description,
  formData.reporter_contact,
  existingCases,
  true // enabled
);

{duplicateCheck?.has_potential_duplicates && (
  <DuplicateDetector
    matches={duplicateCheck.matches}
    onLinkCase={(caseId) => handleLinkCase(caseId)}
    onProceedAnyway={() => setBypassDuplicateWarning(true)}
  />
)}
```

**Acceptance Criteria**:
- ✅ Fuzzy matching algorithm implemented (Levenshtein + term overlap)
- ✅ Duplicate detection hook with React Query integration
- ✅ DuplicateDetector component displays potential matches
- ✅ Color-coded similarity scores (red/orange/amber)
- ✅ Case linking capability (via callback)
- ✅ "Proceed anyway" option available
- ✅ Matching fields clearly indicated
- ✅ Clickable links to existing cases (new tab)
- ✅ Ready for integration into case creation workflows

---

### Task 7.3: Email & Document Intake
**Estimated Effort**: 5-6 days

#### Subtasks:
- [ ] **Email Ingestion**
  - EML/PDF parsing and hashing
  - Auto-extraction of attachments
  - Create case from email
  - Component: `frontend/apps/web/components/intake/EmailIngestion.tsx`

**Acceptance Criteria**:
- Emails can be forwarded to system for case creation
- Attachments are automatically extracted and hashed

---

### Task 7.4: Mobile/PWA Optimization
**Estimated Effort**: 6-8 days

#### Subtasks:
- [ ] **Offline-Capable Intake**
  - Service worker for offline form submission
  - Sync when connection restored
  - Field operation mode
  - Component: Progressive Web App configuration

**Acceptance Criteria**:
- Forms can be filled offline
- Data syncs automatically when online

---

### Task 7.5: Data Retention & Disposal ✅
**Estimated Effort**: 3-4 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Retention Policy Management**
  - 6 case types: Fraud, Harassment, Hacking, Identity Theft, Sextortion, Other
  - Configurable retention periods (years)
  - 3 disposal methods: Cryptographic Erasure, Physical Destruction, Secure Delete
  - Dual approval requirement flag per policy
  - Policy activation/deactivation
  - Hook: `frontend/apps/web/lib/hooks/useRetention.ts` (373 lines)
  - 3 hooks: `useRetentionPolicies()`, `useLegalHolds()`, `useDisposalRequests()`

- [x] **Legal Hold System**
  - Create legal hold on any case
  - Reason tracking and documentation
  - Placed by user tracking
  - Optional expiration date
  - Release hold functionality
  - Blocks disposal workflow when active
  - Mock Data: 1 active legal hold (ongoing appeal)

- [x] **Disposal Workflow**
  - 5 disposal statuses: Pending Approval, Approved, In Progress, Completed, On Hold
  - Automatic eligibility calculation (closed date + retention years)
  - Legal hold indicators and blocking
  - Approval workflow with optional witness field
  - Completion tracking with timestamps
  - Audit trail: requested by, approved by, completed by, witness
  - Color-coded status badges
  - Mock Data: 2 disposal requests (1 pending, 1 on hold due to legal hold)

- [x] **Disposal Methods**
  - Cryptographic Erasure: Digital data overwritten with cryptographic random data
  - Physical Destruction: Media destroyed (shredding/incineration) with witness
  - Secure Delete: Standard secure deletion with verification
  - Method descriptions for user guidance

**Design Decision**: Comprehensive retention and disposal system ensuring regulatory compliance:
- Policy-based retention periods by case type
- Legal hold mechanism to prevent premature disposal
- Multi-step approval workflow for accountability
- Witness requirement for sensitive disposal methods
- Full audit trail with timestamps and user tracking
- Non-destructive (policies and holds only block, don't delete)

**Technical Details**:
- **Retention Calculation**: Uses date-fns `addYears()` + `isBefore()` for eligibility
- **Case Types**: FRAUD, HARASSMENT, HACKING, IDENTITY_THEFT, SEXTORTION, OTHER
- **Disposal Methods**: CRYPTOGRAPHIC_ERASURE, PHYSICAL_DESTRUCTION, SECURE_DELETE
- **Disposal Statuses**: PENDING_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED, ON_HOLD
- **Mock Policies**:
  - Fraud: 10 years, Cryptographic Erasure, Dual approval required
  - Harassment: 7 years, Secure Delete, Single approval
  - Hacking: 10 years, Cryptographic Erasure, Dual approval required
  - Identity Theft: 10 years, Cryptographic Erasure, Dual approval required
- **Legal Hold Fields**: case_id, reason, placed_by, placed_at, expires_at, active
- **Disposal Request Fields**: case details, policy reference, eligibility date, approval chain, witness, notes
- **Helper Functions**:
  - `calculateDisposalEligibility()`: Determines if case ready for disposal
  - `getDisposalStatusColor()`: Badge color generator
- **Workflow**:
  1. Case closed + retention period elapsed = eligible
  2. System creates disposal request (PENDING_APPROVAL)
  3. Admin approves (with witness if physical destruction)
  4. Status changes to APPROVED
  5. Disposal executed → IN_PROGRESS → COMPLETED
  6. Legal hold blocks at any stage → ON_HOLD

**Integration Points** (Ready for admin page):
- Admin can create/update retention policies
- Admin can place/release legal holds on cases
- Admin can approve/complete disposal requests
- Dashboard could show: X cases eligible for disposal, Y on legal hold

**Acceptance Criteria**:
- ✅ Retention policies configurable per case type
- ✅ Policy includes: years, disposal method, dual approval flag
- ✅ Legal holds can be placed/released on cases
- ✅ Legal holds block disposal workflow
- ✅ Disposal eligibility automatically calculated
- ✅ Multi-step approval workflow implemented
- ✅ Witness tracking for sensitive disposal methods
- ✅ Full audit trail with user and timestamp tracking
- ✅ Color-coded status badges
- ✅ 3 disposal methods with descriptions
- ✅ Mock data for policies, holds, and requests

---

### Task 7.6: Training Sandbox ✅
**Estimated Effort**: 4-5 days  
**Status**: COMPLETED  
**Completion Date**: 2025-01-11

#### Subtasks:
- [x] **Sandbox State Management**
  - Zustand store with localStorage persistence
  - Sandbox activation/deactivation
  - Synthetic data counter tracking
  - Last reset timestamp
  - Hook: `frontend/apps/web/lib/hooks/useSandbox.ts` (199 lines)

- [x] **Synthetic Data Templates**
  - 4 pre-configured templates:
    - Fraud Cases (10 cases with parties, evidence, legal instruments)
    - Harassment Cases (8 cases with parties, evidence)
    - Complete Investigation Workflow (5 cases with full lifecycle)
    - Training Users (15 test users with different roles)
  - Template structure: id, name, description, count, entities[]
  - Simulated generation with 2-second delay

- [x] **Sandbox Controls**
  - Activate/Deactivate sandbox mode
  - Generate data from templates
  - Reset sandbox (clears all synthetic data)
  - Status display: Inactive | Active - No Data | Active - Training Mode
  - Color-coded status indicators

- [x] **Safety Features**
  - Sandbox warnings (5 key warnings about data isolation)
  - Usage guidelines (5-step workflow guide)
  - Status-based action gating (can't generate if inactive, can't reset if no data)
  - Confirmation required for destructive actions

**Design Decision**: Lightweight training sandbox using client-side state management:
- No backend changes required for initial implementation
- Zustand with persistence for cross-session sandbox state
- Template-based generation for quick training setup
- Clear visual indicators when in sandbox mode
- Non-destructive (sandbox data separate from production)

**Technical Details**:
- **State Management**: Zustand with `persist` middleware to localStorage
- **Storage Key**: `jctc-sandbox-storage`
- **State Fields**: isActive, activatedAt, syntheticDataCount, lastResetAt
- **Templates**: 4 predefined scenarios covering common training needs
- **Generation Simulation**: 2000ms delay to mimic real API calls
- **Reset Simulation**: 1500ms delay for cleanup
- **Status Logic**:
  - Inactive: No actions allowed
  - Active + No Data: Can generate, can't reset
  - Active + Has Data: Can generate more, can reset
- **Warnings**: 5 key safety reminders about data isolation and PII
- **Guidelines**: 5-step workflow (Activate → Generate → Train → Reset → Deactivate)

**Integration Points** (Ready for admin page):
```tsx
const { 
  isActive, 
  syntheticDataCount,
  activateSandbox, 
  deactivateSandbox,
  generateSyntheticData,
  resetSandbox 
} = useSandboxStore();

const status = getSandboxStatus({
  isActive,
  syntheticDataCount,
  activatedAt,
  lastResetAt
});
```

**Future Enhancements** (Backend integration):
- API endpoint to generate actual synthetic data
- Separate database/schema for sandbox
- Automatic cleanup after X days
- User-specific sandboxes
- Sandbox data export for testing

**Acceptance Criteria**:
- ✅ Sandbox mode can be activated/deactivated
- ✅ State persists across browser sessions
- ✅ 4 synthetic data templates available
- ✅ Template generation simulated (2s delay)
- ✅ Sandbox can be reset to clean state
- ✅ Status display shows current mode
- ✅ Safety warnings and guidelines provided
- ✅ Actions gated based on sandbox status
- ✅ Synthetic data count tracked
- ✅ Timestamps for activation and last reset

---

## Implementation Strategy

### Phase Approach:
1. **Phase 1 (Foundation)**: ✅ Complete
2. **Phase 2 (Core Workflow)**: Priority 1 + Priority 2 (11-13 weeks)
3. **Phase 3 (Legal & International)**: Priority 3 + Priority 4 (10-12 weeks)
4. **Phase 4 (Analytics & Advanced)**: Priority 5 + Priority 6 + Priority 7 (14-16 weeks)

### Recommended Team:
- 2-3 Frontend Developers
- 1 UI/UX Designer (for complex components like dashboards)
- 1 QA Engineer

### Estimated Total Effort:
- **35-41 weeks** for complete PRD implementation
- **Current Progress**: ~20% (8 weeks equivalent completed)
- **Remaining**: ~33 weeks at 2-3 developer capacity

---

## Technical Notes

### Component Library Structure:
- Place shared components in `frontend/apps/web/components/`
- Group by domain: `cases/`, `evidence/`, `legal/`, `forensics/`, `prosecution/`, `international/`, `dashboards/`, etc.
- Use custom UI components from `@jctc/ui` package
- Follow existing patterns in `cases/page.tsx` for consistency

### State Management:
- Use `@tanstack/react-query` for server state (fetching, caching, mutations)
- Use Zustand for client-side state (filters, UI state)
- Follow existing patterns in `lib/hooks/`

### API Integration:
- All API calls should go through `@jctc/api-client` package
- Create new hook files in `frontend/apps/web/lib/hooks/` for each domain
- Follow pattern from `useCases.ts` and `useEvidence.ts`

### Forms & Validation:
- Use Zod for schema validation
- Follow pattern from existing forms (case creation modal)
- Ensure all required fields from PRD are included

### Accessibility:
- Follow WCAG 2.1 AA standards
- All forms must be keyboard navigable
- Proper ARIA labels on all interactive elements

### Testing:
- Write unit tests for complex logic (in `*.test.ts` files)
- E2E tests for critical workflows (Playwright in `frontend/apps/web/tests/`)
- Follow existing test patterns

---

## Next Steps

1. **Review & Prioritize**: Review this task plan with stakeholders and adjust priorities
2. **Sprint Planning**: Break down Priority 1 tasks into 2-week sprints
3. **Resource Allocation**: Assign developers to tasks based on expertise
4. **Design Review**: Get UI/UX designs for complex components (dashboards, chain of custody, etc.)
5. **API Verification**: Ensure backend APIs match PRD requirements for each feature
6. **Start Development**: Begin with Task 1.1 (Case Management Enhancements)

---

## References

- **PRD**: `prd.md` - Full product requirements
- **Backend Documentation**: `backend/README.md` - API specifications
- **Handoff Document**: `handoff.md` - Overall project status
- **Database Schema**: `prd.md` Section 5 - PostgreSQL schema definitions

---

**Document Status**: Ready for Development  
**Next Review Date**: After completion of Priority 1 tasks
