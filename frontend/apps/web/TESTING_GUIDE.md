# JCTC Frontend Testing Guide

## Test Users & Credentials

Use these credentials to test different user role flows:

### 1. 👨‍💼 Administrator
- **Email:** `admin@jctc.gov.ng`
- **Password:** `Admin@123`
- **Access Level:** Full system access
- **Can:**
  - View all cases and evidence
  - Manage users and permissions
  - Access all reports and analytics
  - Perform administrative tasks

---

### 2. 👩‍💼 Supervisor
- **Email:** `supervisor@jctc.gov.ng`
- **Password:** `Supervisor@123`
- **Name:** Sarah Williams
- **Office:** Lagos State Office
- **Can:**
  - View and manage all cases in their jurisdiction
  - Assign cases to team members
  - Approve case status changes
  - Generate reports

---

### 3. ⚖️ Prosecutor
- **Email:** `prosecutor@jctc.gov.ng`
- **Password:** `Prosecutor@123`
- **Name:** Michael Okonkwo
- **Division:** Prosecution Division
- **Can:**
  - View cases pending prosecution
  - View cases in court
  - Access evidence for assigned cases
  - Update prosecution status

---

### 4. 🔍 Investigator
- **Email:** `investigator@jctc.gov.ng`
- **Password:** `Investigator@123`
- **Name:** John Adebayo
- **Unit:** Investigation Unit
- **Can:**
  - Create new cases
  - Update investigation progress
  - Upload and manage evidence
  - View assigned cases

---

### 5. 🔬 Forensic Analyst
- **Email:** `forensic@jctc.gov.ng`
- **Password:** `Forensic@123`
- **Name:** Dr. Amina Hassan
- **Lab:** Forensic Analysis Lab
- **Can:**
  - Analyze digital and physical evidence
  - Update chain of custody
  - Generate forensic reports
  - View cases with evidence to analyze

---

### 6. 🌍 Liaison Officer
- **Email:** `liaison@jctc.gov.ng`
- **Password:** `Liaison@123`
- **Name:** Emmanuel Nwosu
- **Unit:** International Cooperation
- **Can:**
  - View international cases
  - Coordinate with foreign agencies
  - Access federal jurisdiction cases
  - View related evidence

---

### 7. 📝 Intake Officer
- **Email:** `intake@jctc.gov.ng`
- **Password:** `Intake@123`
- **Name:** Grace Okoro
- **Office:** Case Intake Office
- **Can:**
  - Create new cases
  - Initial case assessment
  - View open cases
  - Basic case data entry

---

## Mock Cases Overview

### Case 1: Business Email Compromise (Critical - Active)
- **Case Number:** JCTC-2024-001
- **Status:** Under Investigation
- **Severity:** 5 (Critical)
- **Amount:** N50 Million
- **Lead:** John Adebayo
- **Evidence Items:** 2 (Digital logs, Financial records)

### Case 2: Romance Scam Network (High - Pending Prosecution)
- **Case Number:** JCTC-2024-002
- **Status:** Pending Prosecution
- **Severity:** 4 (High)
- **Victims:** 15
- **Lead:** Sarah Williams
- **Prosecutor:** Michael Okonkwo
- **Evidence Items:** 2 (Seized laptop, Victim statements)

### Case 3: Corporate Data Breach (Critical - In Court)
- **Case Number:** JCTC-2023-045
- **Status:** In Court
- **Severity:** 5 (Critical)
- **Records Stolen:** 500,000
- **Lead:** Sarah Williams
- **Evidence Items:** 1 (Database dump)

### Case 4: Phishing Campaign (Medium - Open)
- **Case Number:** JCTC-2024-003
- **Status:** Open
- **Severity:** 3 (Medium)
- **Lead:** Grace Okoro (Intake)
- **Evidence Items:** 1 (Phishing websites)

### Case 5: Cryptocurrency Fraud (High - Investigation)
- **Case Number:** JCTC-2024-004
- **Status:** Under Investigation
- **Severity:** 4 (High)
- **Amount:** N30 Million
- **Victims:** 200+
- **Evidence Items:** 1 (Blockchain analysis)

### Case 6: Identity Theft (Low - Closed)
- **Case Number:** JCTC-2023-089
- **Status:** Closed
- **Severity:** 2 (Low)
- **Outcome:** Convicted

### Case 7: E-commerce Fraud (Medium - Open)
- **Case Number:** JCTC-2024-005
- **Status:** Open
- **Severity:** 3 (Medium)
- **Lead:** Grace Okoro

### Case 8: International Money Laundering (Critical - Investigation)
- **Case Number:** JCTC-2024-006
- **Status:** Under Investigation
- **Severity:** 5 (Critical)
- **Scope:** International
- **Lead:** Emmanuel Nwosu (Liaison)
- **Agencies:** INTERPOL, FBI

### Case 9: Ransomware Attack (High - Pending Prosecution)
- **Case Number:** JCTC-2023-098
- **Status:** Pending Prosecution
- **Severity:** 5 (Critical)
- **Target:** Hospital Systems
- **Ransom:** $50,000 Bitcoin
- **Lead:** Dr. Amina Hassan (Forensics)
- **Evidence Items:** 1 (Server hard drives)

### Case 10: SIM Swap Fraud (Low - Archived)
- **Case Number:** JCTC-2023-012
- **Status:** Archived
- **Severity:** 2 (Low)
- **Outcome:** Funds recovered

---

## Testing Workflows

### Workflow 1: New Case Intake → Investigation → Prosecution
1. **Login as Intake Officer** (Grace)
   - Create new case from report
   - Fill in initial details
   - Assign to investigator

2. **Login as Investigator** (John)
   - View assigned case
   - Upload evidence
   - Update investigation notes
   - Change status to "Under Investigation"

3. **Login as Forensic Analyst** (Amina)
   - View evidence items
   - Add chain of custody entries
   - Upload forensic reports

4. **Login as Investigator** (John)
   - Review forensic reports
   - Update case status to "Pending Prosecution"

5. **Login as Prosecutor** (Michael)
   - Review case file
   - Check all evidence
   - Prepare for court

6. **Login as Supervisor** (Sarah)
   - Oversee all activities
   - Generate reports
   - Monitor progress

---

### Workflow 2: Evidence Management
1. **Login as Investigator**
   - Navigate to evidence upload
   - Upload files with drag-and-drop
   - Fill in evidence metadata
   - Link to specific case

2. **Login as Forensic Analyst**
   - View evidence list
   - Open specific evidence item
   - Add chain of custody entry
   - Document analysis findings

3. **Login as Prosecutor**
   - Review evidence chain of custody
   - Verify integrity
   - Prepare evidence for court

---

### Workflow 3: Case Assignment & Collaboration
1. **Login as Supervisor**
   - View dashboard with all cases
   - Open specific case
   - Click "Assign Team Member"
   - Select investigator from modal
   - Assign case

2. **Login as Assigned Investigator**
   - See new case in dashboard
   - Review case details
   - Start investigation

---

### Workflow 4: International Case Coordination
1. **Login as Liaison Officer** (Emmanuel)
   - View international cases
   - Access Case 008 (Money Laundering)
   - Review evidence
   - Update coordination notes

2. **Login as Supervisor**
   - Monitor international case
   - Review liaison updates
   - Approve next steps

---

## Testing Checklist

### Authentication & Authorization
- [ ] Login with each role successfully
- [ ] Verify dashboard access after login
- [ ] Test logout functionality
- [ ] Verify role-based navigation

### Cases Module
- [ ] View cases list with filters
- [ ] Search cases by keywords
- [ ] Filter by status and severity
- [ ] Sort cases by different fields
- [ ] Navigate pagination
- [ ] View case details
- [ ] Switch between tabs (Overview, Evidence, Timeline, Team)
- [ ] Update case status
- [ ] Create new case (multi-step form)
- [ ] Assign case to team member

### Evidence Module
- [ ] View evidence list
- [ ] Toggle grid/list view
- [ ] Filter by evidence type
- [ ] Search evidence items
- [ ] View evidence details
- [ ] See chain of custody timeline
- [ ] Upload new evidence with files
- [ ] Drag and drop files
- [ ] Preview uploaded files
- [ ] Link evidence to case

### Dashboard
- [ ] View statistics cards
- [ ] See case status chart
- [ ] Use quick action buttons
- [ ] View recent cases
- [ ] Navigate from dashboard to cases

### UI/UX
- [ ] Responsive design on different screens
- [ ] Loading states appear correctly
- [ ] Error messages display properly
- [ ] Empty states show helpful messages
- [ ] Hover effects work
- [ ] Transitions smooth
- [ ] Icons display correctly

### Data Validation
- [ ] Required fields show errors
- [ ] Form validation works
- [ ] Date pickers function
- [ ] Dropdowns populate correctly
- [ ] File size limits enforced

---

## Mock Data Statistics

- **Total Cases:** 10
- **Total Evidence Items:** 8
- **Test Users:** 7 (one per role)
- **Case Statuses:** All statuses represented
- **Severity Levels:** Range from 1 to 5
- **Evidence Types:** Digital, Physical, Document, Financial

---

## Tips for Testing

1. **Start with Admin** - Get overview of entire system
2. **Test Role Permissions** - Verify each role only sees relevant data
3. **Follow Complete Workflows** - Test end-to-end processes
4. **Test Edge Cases** - Empty states, error scenarios, etc.
5. **Check Responsiveness** - Test on different screen sizes
6. **Verify Data Consistency** - Ensure related data links correctly

---

## Known Mock Data Limitations

- File uploads don't actually store files (UI only)
- Chain of custody entries are pre-populated
- User avatars are initials only
- Real-time updates not implemented
- Email notifications not functional
- Print/export features are placeholders

---

## Next Steps After Testing

1. **Backend Integration**
   - Connect to real API endpoints
   - Replace mock data with API calls
   - Implement real authentication

2. **Additional Features**
   - Notifications system
   - Real-time updates
   - Advanced search
   - Report generation
   - Export functionality

3. **Production Readiness**
   - Add comprehensive error handling
   - Implement logging
   - Set up monitoring
   - Configure deployment

---

## Need Help?

If you encounter any issues during testing:
1. Check browser console for errors
2. Verify you're using the correct test credentials
3. Ensure all dependencies are installed
4. Try clearing browser cache

---

**Happy Testing! 🚀**
