# Standard Operating Procedures: Administrators

**Role**: `ADMIN` / `SUPER_ADMIN`  
**Purpose**: To maintain system integrity, manage user access, and ensure technical compliance.

## Daily Checklist
1.  **System Health**: Check the **Dashboard** server status indicators.
2.  **Security Alerts**: Review any failed login attempts or unusual IP activity.
3.  **User Requests**: Process account creations or password resets.

## Core Workflows

### 1. Onboarding New Users
1.  Receive approved request from HR/Command.
2.  Go to **Admin > User Management**.
3.  **Create User**:
    *   Enter official email.
    *   Assign correct **Role** (Start with least privilege).
    *   Set **Org Unit**.
4.  **Notify**: Send the temporary credentials via a secure channel (not plain email).

### 2. Offboarding (Deactivation)
When a staff member leaves or is suspended:
1.  **Immediately** go to **User Management**.
2.  Find the user and toggle status to **Inactive**.
    *   *Do not delete the user account; this preserves the audit trail.*
3.  Invalidate active sessions if necessary.

### 3. Audit & Compliance
1.  **Weekly Review**: Scan **Audit Logs** for "Delete" actions or bulk data exports.
2.  **Configuration**: Update **Lookup Values** (e.g., new Case Types) as requested by policy updates.

## Critical Compliance
!!! danger "Power User Protocols"
    *   **Do not** browse live case data unless required for a technical fix.
    *   **Never** share Admin credentials.
    *   All Admin actions are logged and subject to intense scrutiny.
