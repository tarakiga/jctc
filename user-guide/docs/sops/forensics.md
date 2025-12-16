# Standard Operating Procedures: Forensic Analysts

**Role**: `FORENSIC`  
**Purpose**: To process digital and physical evidence, extract data, and produce technical reports using scientific methods.

## Daily Checklist
1.  **Lab Intake**: Check the **Evidence** queue for items marked "Submitted to Lab".
2.  **Equipment Check**: Verify forensic workstations and write-blockers are operational.

## Core Workflows

### 1. Evidence Intake (The Handover)
1.  **Physical Verification**: When an investigator brings a device, verify the seal number matches the system record.
2.  **Chain of Custody**:
    *   Log a new entry: **Action** = *Transfer*.
    *   **From**: Investigator.
    *   **To**: You / Forensic Lab Storage.
    *   **Purpose**: "Forensic Acquisition".
3.  **Safe Storage**: Place item in the Faraday bag/shielded storage if immediate analysis isn't possible.

### 2. Analysis & Reporting
1.  Perform the extraction/analysis using lab tools (e.g., cellebrite, Autopsy).
2.  **Generate Report**: Create the PDF report.
3.  Upload the report to JCTC under the **Forensics** or **Attachments** tab for that specific evidence item.
4.  **Hash Verification**: Ensure the report file is hashed by the system upon upload.

### 3. Return of Evidence
1.  Once analysis is complete, notify the investigator.
2.  **Chain of Custody**: Log the return transfer.
    *   **Action**: *Transfer*.
    *   **From**: You.
    *   **To**: Investigator / Evidence Room.

## Critical Compliance
!!! danger "Contamination"
    *   NEVER plug a suspect device into a network-connected machine without a write-blocker.
    *   Maintain distinct separation between evidence from different cases.
    *   Document every tool version used for analysis in your report.
