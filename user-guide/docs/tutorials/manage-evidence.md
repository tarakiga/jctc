# Manage Evidence

Learn how to register devices, track evidence, and manage the chain of custody.

---

## Overview

The Evidence module allows you to:

- Register seized devices and digital evidence
- Track chain of custody with full audit trail
- Record forensic analysis results
- Manage evidence storage locations

---

## Register a New Device

### Step 1: Navigate to Evidence

1. Go to **Evidence** in the side menu
2. Click **+ Add Device**

### Step 2: Device Information

Fill in the device details:

| Field | Description |
|-------|-------------|
| **Device Type** | Laptop, Mobile Phone, USB Drive, etc. |
| **Make/Model** | Device manufacturer and model |
| **Serial Number** | Unique device identifier |
| **IMEI** | For mobile devices |
| **Condition** | Excellent, Good, Fair, Poor, Damaged |

### Step 3: Evidence Classification

- **Evidence Type**: Primary, Secondary, Derivative
- **Category**: Digital, Physical, Document
- **Custody Status**: In Vault, Released, Returned

### Step 4: Link to Case

1. Select the **Case** this evidence belongs to
2. Optionally link to a **Seizure** record
3. Click **Save**

---

## Chain of Custody

!!! danger "Critical Legal Requirement"
    Every transfer of evidence MUST be logged. Gaps in chain of custody can invalidate evidence in court.

### Recording a Transfer

1. Open the device record
2. Click **Chain of Custody** tab
3. Click **+ New Entry**
4. Fill in:
    - **Action**: Transferred, Analyzed, Presented in Court, etc.
    - **From**: Previous custodian
    - **To**: New custodian
    - **Location**: Storage/Lab location
    - **Purpose**: Reason for transfer
5. **Sign** the transfer (digital signature)
6. Click **Submit**

### Viewing History

The Chain of Custody tab shows a complete timeline:

```mermaid
graph LR
    A[Seized at Scene] --> B[Evidence Vault A]
    B --> C[Forensic Lab]
    C --> D[Evidence Vault A]
    D --> E[Court Exhibits]
```

---

## Forensic Reports

After analysis, attach forensic reports:

1. Open device record
2. Go to **Forensic Reports** tab
3. Click **Upload Report**
4. Fill in:
    - Tool used (Cellebrite, EnCase, etc.)
    - Analysis date
    - Upload PDF report

---

## Best Practices

!!! tip "Evidence Handling"
    - Always photograph devices before seizure
    - Document all transfers immediately
    - Use tamper-evident bags for physical evidence
    - Verify hash values for digital copies
