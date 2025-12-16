# Legal Instruments

Manage the legal authority for your investigation. This module tracks Warrants, Court Orders, and other instruments, monitoring their validity and expiration.

## Types of Instruments
- **Search Warrant**: Authority to search premises and seize evidence.
- **Preservation Order**: Order to freeze or preserve digital data.
- **Production Order**: Order compelling an entity to produce data.
- **MLAT**: Mutual Legal Assistance Treaty request.

## Adding an Instrument
1. Navigate to the **Legal Instruments** tab.
2. Click **Add Instrument**.
3. **Reference No**: The official court reference number (e.g., *FHC/ABJ/CR/2024/001*).
4. **Issuing Authority**: The court or judge granting the order.
5. **Dates**:
    *   **Issued At**: Date granted.
    *   **Expires At**: Date validity ends.
6. **Scope Description**: What exactly does this instrument authorize? 
7. **Document Upload**: Upload a scanned copy of the signed warrant.
    *   *System Note: The uploaded file is automatically hashed and secured.*

## Expiry Alerts
The system automatically monitors expiration dates.
*   **Warning (Yellow)**: Expiring within 7 days.
*   **Critical (Orange)**: Expiring within 3 days.
*   **Urgent (Red)**: Expiring today or expired.

These alerts appear on the dashboard and within the case detail view to ensure you never operate with an expired mandate.
