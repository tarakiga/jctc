# Evidence Tracking

The **Evidence Tracking** system is the backbone of establishing a chain of custody and managing physical and digital assets in an investigation.

## Core Capabilities

### 1. Digital & Physical Management
JCTC handles both types of evidence seamlessly:
*   **Physical**: Weapons, documents, devices, biological samples.
*   **Digital**: Hard drive images, mobile extractions, network logs.

### 2. Chain of Custody (CoC)
Every interaction with an evidence item is logged in an immutable ledger.
*   **Handover**: Record transfer from Person A to Person B.
*   **Location Tracking**: Move items to specific storage locations (e.g., *Evidence Room A, Shelf 3*).
*   **Purpose**: Document why an item was moved (e.g., "For Court Appearance").
*   [View Chain of Custody Tutorial](../tutorials/track-chain-of-custody.md)

### 3. Seizures
Link evidence to the specific operation where it was acquired.
*   **Search Warrants**: Associate evidence with the legal authority that allowed its seizure.
*   **Raid Logs**: capturing the location, time, and team members involved.
*   [View Seizures Tutorial](../tutorials/manage-seizures.md)

### 4. Integrity Verification
*   **Hashing**: All digital files are automatically hashed (SHA-256) upon upload.
*   **Verification**: On-demand integrity checks compare the current file hash against the original record to detect tampering.

### 5. Classification
Categorize evidence for easier retrieval:
*   **Type**: e.g., Mobile Device, Laptop, Hard Drive, SIM Card, Drone.
*   **Status**: In Custody, Checked Out, Disposed, Released.

This robust system ensures that all evidence presented in court is traceable, authentic, and legally admissible.
