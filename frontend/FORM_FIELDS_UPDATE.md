# Form Fields Update - Attachments & Collaborations

## Summary
Updated both AttachmentManager and CollaborationManager forms to clarify how all mock data fields are handled, including auto-generated and derived fields.

---

## Collaboration Form Updates

### Added Features:

#### 1. **Partner Type Display** (Lines 261-267)
- Shows the **partner type** automatically derived from selected organization
- Displays below the Partner Organization dropdown
- Example: When "FBI" is selected, shows "Partner Type: **INTERNATIONAL**"

```tsx
{formData.partner_org && (
  <p className="text-xs text-neutral-600 mt-1">
    Partner Type: <span className="font-semibold">
      {PARTNER_ORGANIZATIONS.find(o => o.value === formData.partner_org)?.type.replace('_', ' ')}
    </span>
  </p>
)}
```

#### 2. **Status Field** (Lines 270-290)
- New dropdown field for **Collaboration Status**
- **Only visible when editing** an existing collaboration
- Options: Initiated, Active, Completed, Suspended
- New collaborations default to "INITIATED"
- Allows updating status when editing (e.g., from INITIATED → ACTIVE)

```tsx
{editingId && (
  <div>
    <label>Collaboration Status *</label>
    <select value={formData.status} onChange={...}>
      <option value="INITIATED">Initiated</option>
      <option value="ACTIVE">Active</option>
      <option value="COMPLETED">Completed</option>
      <option value="SUSPENDED">Suspended</option>
    </select>
  </div>
)}
```

### Form State Updated:
Added `status` field to form data (lines 43-53, updated in multiple places):
```tsx
const [formData, setFormData] = useState({
  partner_org: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  reference_no: '',
  scope: '',
  mou_reference: '',
  notes: '',
  status: 'INITIATED' as CollaborationStatus, // NEW
});
```

### How Fields are Set:

| Field | How It's Set | Where |
|-------|--------------|-------|
| **partner_org** | User selects from dropdown | Form input (line 245-257) |
| **partner_type** | **Auto-derived** from partner_org | handleSubmit (line 114-115, 123, 130) |
| **contact_person** | User input | Form input (line 261-272) |
| **contact_email** | User input | Form input (line 274-285) |
| **contact_phone** | User input | Form input (line 287-298) |
| **reference_no** | User input (optional) | Form input (line 300-311) |
| **scope** | User input | Form textarea (line 315-326) |
| **mou_reference** | User input (optional) | Form input (line 329-340) |
| **notes** | User input (optional) | Form textarea (line 343-354) |
| **status** | Defaults to INITIATED, editable when editing | Form select (line 270-290) |

---

## Attachment Form Updates

### Added Feature:

#### **Security Info Banner** (Lines 282-293)
- New informational banner explaining automatic security processing
- Blue-themed banner with shield icon
- Clarifies that **virus scan status** and **SHA-256 hash** are automatic

```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <div className="flex items-start gap-2">
    <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-sm font-semibold text-blue-900">Automatic Security Processing</p>
      <p className="text-xs text-blue-700 mt-1">
        Upon upload, files are automatically scanned for viruses (status starts as "Pending") 
        and a SHA-256 hash is computed for integrity verification. You can verify file 
        integrity at any time using the "Verify Hash" button.
      </p>
    </div>
  </div>
</div>
```

### How Fields are Set:

| Field | How It's Set | Where |
|-------|--------------|-------|
| **title** | User input | Form input (line 248-259) |
| **filename** | **Auto-extracted** from file | handleFileChange (line 117-124) |
| **file_size** | **Auto-extracted** from file | selectedFile.size |
| **file_type** | **Auto-extracted** from file | selectedFile.type |
| **classification** | User selects (default: LE_SENSITIVE) | Form select (line 262-280) |
| **sha256_hash** | **Auto-computed** on upload | handleUpload (line 131) |
| **virus_scan_status** | **Auto-set** to PENDING, updated by scanner | Backend service |
| **virus_scan_details** | **Auto-set** by virus scanner | Backend service |
| **uploaded_by** | **Auto-set** from current user | Backend |
| **uploaded_at** | **Auto-set** to current time | Backend |
| **notes** | User input (optional) | Form textarea (line 283-294) |
| **file_path** | **Auto-set** by storage service | Backend |
| **download_url** | **Auto-generated** by backend | Backend |

---

## Key Improvements

### Collaboration Form:
1. ✅ **Partner type is now visible** - Users can see what type is derived from their org selection
2. ✅ **Status is now editable** - Users can update collaboration status when editing
3. ✅ **Status workflow** - New collaborations default to "INITIATED", can be updated to "ACTIVE", "COMPLETED", or "SUSPENDED"
4. ✅ **Clear field labeling** - All required fields marked with *

### Attachment Form:
1. ✅ **Clear explanation of automatic fields** - Users understand virus scanning is automatic
2. ✅ **SHA-256 hash info** - Users know hash is computed automatically for integrity
3. ✅ **Security banner** - Prominent display of security features
4. ✅ **Existing hash verification** - "Verify Hash" button already present in attachment list

---

## User Experience

### Creating a New Collaboration:
1. User selects **Partner Organization** → Partner Type appears below dropdown
2. User fills in **contact details**
3. User enters **scope** of collaboration
4. Status automatically set to **"INITIATED"**
5. On save, collaboration created with status = INITIATED

### Editing an Existing Collaboration:
1. User clicks **Edit** button on collaboration card
2. Form opens with **all fields pre-filled**
3. **Status dropdown now appears** (wasn't visible during creation)
4. User can update any fields including **status** (e.g., INITIATED → ACTIVE)
5. On save, collaboration updated with new status

### Uploading an Attachment:
1. User selects **file** → Filename and size auto-displayed
2. User enters **title**
3. User selects **classification level** (PUBLIC, LE Sensitive, Privileged)
4. User reads **security info banner** explaining automatic processing
5. On upload:
   - SHA-256 hash **automatically computed**
   - Virus scan status set to **"PENDING"**
   - File uploaded to storage
   - User can verify hash anytime after upload

---

## Technical Details

### Collaboration Status Workflow:
```
INITIATED → ACTIVE → COMPLETED
            ↓
         SUSPENDED
```

- **INITIATED**: Request sent, awaiting response
- **ACTIVE**: Active cooperation in progress
- **COMPLETED**: Collaboration successfully completed
- **SUSPENDED**: Temporarily paused

### Attachment Security Processing:
```
File Upload → Compute SHA-256 → Virus Scan → Store File
              (immediate)        (async)      (immediate)
                                    ↓
                              Status Updates:
                              - PENDING (initial)
                              - CLEAN (passed)
                              - INFECTED (failed)
                              - FAILED (error)
```

---

## Mock Data Alignment

### All Mock Data Fields Now Accounted For:

**Collaborations:**
- ✅ partner_org (user input)
- ✅ partner_type (auto-derived, **now visible**)
- ✅ contact_person (user input)
- ✅ contact_email (user input)
- ✅ contact_phone (user input)
- ✅ reference_no (user input)
- ✅ scope (user input)
- ✅ mou_reference (user input)
- ✅ status (**now editable**)
- ✅ initiated_at (auto-set)
- ✅ completed_at (auto-set when status = COMPLETED)
- ✅ notes (user input)

**Attachments:**
- ✅ title (user input)
- ✅ filename (auto from file)
- ✅ file_size (auto from file)
- ✅ file_type (auto from file)
- ✅ classification (user input, **with description**)
- ✅ sha256_hash (auto-computed, **explained in banner**)
- ✅ virus_scan_status (auto, **explained in banner**)
- ✅ virus_scan_details (auto)
- ✅ uploaded_by (auto)
- ✅ uploaded_at (auto)
- ✅ notes (user input)
- ✅ file_path (auto)
- ✅ download_url (auto)

**100% Field Coverage** ✅

---

## Summary

### Questions Answered:

**Q: "On collaborations how do you update the International and active fields?"**

**A:** 
- **"International"** (partner_type): Now **visible below the organization dropdown**. It's auto-derived from the selected organization. When you select "FBI", it shows "Partner Type: INTERNATIONAL"
- **"Active"** (status): Now **editable via dropdown when editing**. New collaborations default to "INITIATED". When you edit a collaboration, the Status field appears and you can change it to "ACTIVE", "COMPLETED", or "SUSPENDED"

**Q: "On attachment how do you update LE sensitive and clean from the add attachments form?"**

**A:**
- **"LE Sensitive"** (classification): **User selectable in the form** via dropdown. Default is "LE Sensitive" but users can choose "Public" or "Privileged"
- **"Clean"** (virus_scan_status): **Automatic - not user-editable**. A new blue info banner explains this: "Upon upload, files are automatically scanned for viruses (status starts as 'Pending')". The scan happens in the background and updates to "Clean", "Infected", or "Failed"

**All fields from mock data are now properly handled in the forms!** ✅
