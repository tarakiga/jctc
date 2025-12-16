# Compliance & NDPA

The **Compliance Module** is a powerful tool designed to ensure your organization adheres to the **Nigeria Data Protection Act (NDPA) 2023**. It provides a real-time health check of your data protection practices.

## Compliance Dashboard
The main view offers a comprehensive scorecard:
*   **Overall Score**: A calculated score (0-100) representing your compliance posture.
*   **Status Badge**: Quick indicator (e.g., *Compliant*, *Minor Issues*, *Critical Violations*).
*   **Assessment**: "Run Assessment" button to trigger a system-wide compliance check.

### Key Metrics
*   **Open Violations**: Issues that need immediate remediation.
*   **Critical Issues**: High-severity violations that pose significant legal risk.
*   **Pending DSRs**: Data Subject Requests (e.g., deletion, access) awaiting action.
*   **Open Breaches**: Active data breach incidents being tracked.

## Functional Tabs

### 1. Overview
A consolidated view of recent violations, pending requests, and active breaches. Use this for a daily health check.

### 2. Violations
A detailed list of all compliance gaps.
*   **Severity**: Low, Medium, High, Critical.
*   **Description**: Specific details of the violation (e.g., *"Table users missing encryption for column password"*).
*   **Article Reference**: cites the specific NDPA article violated (e.g., *Art. 24*).

### 3. DSR Requests (Data Subject Rights)
Tracks requests from individuals exercising their rights under NDPA.
*   **Types**: Access, Deletion, Rectification, Portability.
*   **Deadline Tracking**: Monitors the legally mandated response time (usually 30 days).
*   **Status**: Pending, In Progress, Completed, Rejected.

### 4. Breaches
Incident response tracking for data breaches.
*   **Severity**: Assessment of the impactful scope.
*   **NITDA Notification**: Tracks whether the mandatory 72-hour notification to NITDA has been made.
*   **Subjects Affected**: Count of individuals impacted.

## Reports & refresh
*   **Refresh**: Updates all metrics with the latest system data.
*   **Run Assessment**: Performs a deep scan of database schemas, retention policies, and access logs to generate a fresh compliance score.
