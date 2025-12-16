# Admin Settings

The **Admin Settings** console provides full control over the JCTC system configuration, user access, and system health monitoring.

## access
Restricted to users with the `SUPERADMIN` or `ADMIN` role.

## Dashboard Stats
*   **Total Users**: Active vs. Total registered accounts.
*   **Roles**: Number of configured access roles.
*   **System Health**: A 0-100% score indicating operational status (server uptime, database connectivity).
*   **Audit Logs**: Count of system actions monitored this month.

## Management Drawers
The admin interface uses slide-out drawers for quick configuration tasks:

### 1. Lookup Values
Manage the dropdown options used throughout the application.
*   **Categories**: Case Status, Priority, Evidence Types, etc.
*   **Actions**: Add new values, disable deprecated ones, or reorder lists.

### 2. User Management
Control system access.
*   **Create User**: Add new investigators or staff.
*   **Roles**: Assign permissions (Investigator, Prosecutor, Admin).
*   **Deactivate**: Revoke access for departed staff.

### 3. Calendar
Manage the team-wide activity calendar.
*   **Events**: Schedule shifts, court dates, or team operations.
*   **Availability**: Track team member status.

### 4. Audit Logs
A comprehensive security log of *every* action taken in the system.
*   **Filtering**: Search by User, Action Type, or Date.
*   **Details**: View IP address, User Agent, and specific changes made (Before/After values).

### 5. Email System
Configure system notifications.
*   **SMTP Settings**: Server details for outgoing mail.
*   **Templates**: Customize welcome emails, password resets, and alert notifications.
