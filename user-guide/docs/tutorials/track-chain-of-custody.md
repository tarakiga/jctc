# Track Chain of Custody

Maintaining a secure and unbreakable Chain of Custody (CoC) is critical for the admissibility of evidence in court. JCTC provides a digital CoC system to track every movement, handover, and action taken on an evidence item.

## Accessing Chain of Custody
1. Open a **Case**.
2. Navigate to the **Evidence Management** tab.
3. Select an evidence item from the list.
4. The **Chain of Custody** panel will appear in the drawer.

---

## Adding a Custody Entry
Whenever evidence changes hands or location, a new entry must be logged.

1. **Select Evidence**: Click the "View Details" or "Custody" button on the evidence card.
2. **Click "Add Entry"**: Found at the top of the timeline in the drawer.
3. **Fill in Details**:
    *   **Action**: Select the type of action (e.g., *Collection*, *Transfer*, *Analysis*, *Storage*).
    *   **From**: The current custodian (defaults to you or last holder).
    *   **To**: The recipient (another user or location like "Evidence Room").
    *   **Date & Time**: Exact moment of transfer.
    *   **Purpose**: Reason for the movement (e.g., "For forensic extraction").
4. **Confirm**: Save the entry. The system will timestamp and digitally sign this record.

!!! warning "Immutable Records"
    Chain of Custody entries are legally significant. Once created, they cannot be edited. Deletion requires special permissions and triggers a "Broken Chain" audit alert.

---

## Verifying Integrity
JCTC automatically calculates cryptographic hashes (SHA-256) for digital evidence files.

### Hashing
*   **Automatic Hashing**: When a file is uploaded, its SHA-256 hash is computed immediately.
*   **Verification**: Click the **Verify Hash** button to re-calculate the hash of the stored file and compare it against the original record.
    *   ✅ **Match**: Detailed in Green. The file has not been altered.
    *   ❌ **Mismatch**: Detailed in Red. The file integrity is compromised.

---

## Generating Reports
You can generate a court-ready Chain of Custody report for any item.

1. Select the evidence item.
2. Click **Export Report** (PDF icon).
3. The report will include:
    *   Item description and unique ID.
    *   Chronological list of all custody events.
    *   Identities of all custodians.
    *   Hash verification logs.
