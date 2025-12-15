#!/usr/bin/env python3
"""Complete seed lookup values using asyncpg directly - ALL categories"""
import asyncio
import asyncpg
import os
import uuid

# Complete lookup values from seed_lookup_values.py
LOOKUP_VALUES = [
    # reporter_type
    ("reporter_type", "ANONYMOUS", "Anonymous", None, 1),
    ("reporter_type", "VICTIM", "Victim", None, 2),
    ("reporter_type", "PARENT", "Parent/Guardian", None, 3),
    ("reporter_type", "LEA", "Law Enforcement Agency", None, 4),
    ("reporter_type", "NGO", "NGO", None, 5),
    ("reporter_type", "CORPORATE", "Corporate", None, 6),
    ("reporter_type", "WHISTLEBLOWER", "Whistleblower", None, 7),
    # custody_action
    ("custody_action", "SEIZED", "Seized", None, 1),
    ("custody_action", "TRANSFERRED", "Transferred", None, 2),
    ("custody_action", "ANALYZED", "Analyzed", None, 3),
    ("custody_action", "PRESENTED_COURT", "Presented in Court", None, 4),
    ("custody_action", "RETURNED", "Returned", None, 5),
    ("custody_action", "DISPOSED", "Disposed", None, 6),
    # device_condition
    ("device_condition", "EXCELLENT", "Excellent", "#10B981", 1),
    ("device_condition", "GOOD", "Good", "#3B82F6", 2),
    ("device_condition", "FAIR", "Fair", "#F59E0B", 3),
    ("device_condition", "POOR", "Poor", "#EF4444", 4),
    ("device_condition", "DAMAGED", "Damaged", "#DC2626", 5),
    # encryption_status
    ("encryption_status", "NONE", "None", "#10B981", 1),
    ("encryption_status", "ENCRYPTED", "Encrypted", "#EF4444", 2),
    ("encryption_status", "BITLOCKER", "BitLocker", "#3B82F6", 3),
    ("encryption_status", "FILEVAULT", "FileVault", "#8B5CF6", 4),
    ("encryption_status", "PARTIAL", "Partial", "#F59E0B", 5),
    ("encryption_status", "UNKNOWN", "Unknown", "#6B7280", 6),
    # imaging_status
    ("imaging_status", "NOT_STARTED", "Not Started", "#6B7280", 1),
    ("imaging_status", "IN_PROGRESS", "In Progress", "#F59E0B", 2),
    ("imaging_status", "COMPLETED", "Completed", "#10B981", 3),
    ("imaging_status", "FAILED", "Failed", "#EF4444", 4),
    ("imaging_status", "VERIFIED", "Verified", "#3B82F6", 5),
    # analysis_status
    ("analysis_status", "PENDING", "Pending", "#6B7280", 1),
    ("analysis_status", "IN_PROGRESS", "In Progress", "#F59E0B", 2),
    ("analysis_status", "ANALYZED", "Analyzed", "#10B981", 3),
    ("analysis_status", "BLOCKED", "Blocked", "#EF4444", 4),
    # seizure_status
    ("seizure_status", "PENDING", "Pending", "#F59E0B", 1),
    ("seizure_status", "COMPLETED", "Completed", "#10B981", 2),
    ("seizure_status", "DISPUTED", "Disputed", "#EF4444", 3),
    ("seizure_status", "RETURNED", "Returned", "#3B82F6", 4),
    # warrant_type
    ("warrant_type", "SEARCH_WARRANT", "Search Warrant", None, 1),
    ("warrant_type", "PRODUCTION_ORDER", "Production Order", None, 2),
    ("warrant_type", "COURT_ORDER", "Court Order", None, 3),
    ("warrant_type", "SEIZURE_ORDER", "Seizure Order", None, 4),
    # artefact_type
    ("artefact_type", "CHAT_LOG", "Chat Log", None, 1),
    ("artefact_type", "IMAGE", "Image", None, 2),
    ("artefact_type", "VIDEO", "Video", None, 3),
    ("artefact_type", "DOC", "Document", None, 4),
    ("artefact_type", "BROWSER_HISTORY", "Browser History", None, 5),
    ("artefact_type", "EMAIL", "Email", None, 6),
    ("artefact_type", "CALL_LOG", "Call Log", None, 7),
    ("artefact_type", "SMS", "SMS", None, 8),
    ("artefact_type", "OTHER", "Other", None, 99),
    # charge_status
    ("charge_status", "FILED", "Filed", "#3B82F6", 1),
    ("charge_status", "WITHDRAWN", "Withdrawn", "#6B7280", 2),
    ("charge_status", "AMENDED", "Amended", "#F59E0B", 3),
    # attachment_classification
    ("attachment_classification", "PUBLIC", "Public", "#10B981", 1),
    ("attachment_classification", "LE_SENSITIVE", "Law Enforcement Sensitive", "#F59E0B", 2),
    ("attachment_classification", "PRIVILEGED", "Privileged", "#EF4444", 3),
    # virus_scan_status
    ("virus_scan_status", "PENDING", "Pending", "#6B7280", 1),
    ("virus_scan_status", "CLEAN", "Clean", "#10B981", 2),
    ("virus_scan_status", "INFECTED", "Infected", "#EF4444", 3),
    ("virus_scan_status", "FAILED", "Scan Failed", "#F59E0B", 4),
    # collaboration_status
    ("collaboration_status", "INITIATED", "Initiated", "#3B82F6", 1),
    ("collaboration_status", "ACTIVE", "Active", "#10B981", 2),
    ("collaboration_status", "COMPLETED", "Completed", "#6B7280", 3),
    ("collaboration_status", "SUSPENDED", "Suspended", "#F59E0B", 4),
    # partner_type
    ("partner_type", "LAW_ENFORCEMENT", "Law Enforcement", None, 1),
    ("partner_type", "INTERNATIONAL", "International Agency", None, 2),
    ("partner_type", "REGULATOR", "Regulator", None, 3),
    ("partner_type", "ISP", "Internet Service Provider", None, 4),
    ("partner_type", "BANK", "Bank/Financial Institution", None, 5),
    ("partner_type", "OTHER", "Other", None, 99),
    # issuing_authority
    ("issuing_authority", "HIGH_COURT", "High Court", None, 1),
    ("issuing_authority", "MAGISTRATE_COURT", "Magistrate Court", None, 2),
    ("issuing_authority", "FEDERAL_COURT", "Federal Court", None, 3),
    ("issuing_authority", "STATE_COURT", "State Court", None, 4),
    ("issuing_authority", "EFCC", "EFCC", None, 5),
    ("issuing_authority", "POLICE", "Nigeria Police", None, 6),
    # legal_issuing_authority
    ("legal_issuing_authority", "HIGH_COURT", "High Court", None, 1),
    ("legal_issuing_authority", "MAGISTRATE_COURT", "Magistrate Court", None, 2),
    ("legal_issuing_authority", "FEDERAL_HIGH_COURT", "Federal High Court", None, 3),
    ("legal_issuing_authority", "COURT_OF_APPEAL", "Court of Appeal", None, 4),
    ("legal_issuing_authority", "SUPREME_COURT", "Supreme Court", None, 5),
    ("legal_issuing_authority", "INTERNATIONAL_BODY", "International Body", None, 6),
    # prosecution_section
    ("prosecution_section", "SECTION_419", "Section 419 (Advance Fee Fraud)", None, 1),
    ("prosecution_section", "SECTION_420", "Section 420 (Cheating)", None, 2),
    ("prosecution_section", "CYBERCRIME_ACT_2015", "Cybercrime Act 2015", None, 3),
    ("prosecution_section", "MONEY_LAUNDERING_ACT", "Money Laundering Act", None, 4),
    ("prosecution_section", "EFCC_ACT", "EFCC Establishment Act", None, 5),
    ("prosecution_section", "ACJA_2015", "ACJA 2015", None, 6),
    ("prosecution_section", "OTHER", "Other Statute", None, 99),
    # session_type
    ("session_type", "ARRAIGNMENT", "Arraignment", None, 1),
    ("session_type", "PRELIMINARY_HEARING", "Preliminary Hearing", None, 2),
    ("session_type", "PRE_TRIAL_CONFERENCE", "Pre-Trial Conference", None, 3),
    ("session_type", "MOTION_HEARING", "Motion Hearing", None, 4),
    ("session_type", "TRIAL", "Trial", None, 5),
    ("session_type", "SENTENCING", "Sentencing", None, 6),
    ("session_type", "APPEAL_HEARING", "Appeal Hearing", None, 7),
    ("session_type", "OTHER", "Other", None, 99),
    # Additional device types
    ("device_type", "MEMORY_CARD", "Memory Card", None, 8),
    ("device_type", "NETWORK_DEVICE", "Network Device", None, 9),
    ("device_type", "OTHER", "Other", None, 99),
    # Additional platforms
    ("platform", "Snapchat", "Snapchat", None, 7),
    ("platform", "LinkedIn", "LinkedIn", None, 8),
    # Additional intake channels
    ("intake_channel", "API", "API Integration", None, 6),
    ("intake_channel", "PARTNER_AGENCY", "Partner Agency", None, 7),
    # Additional risk flags
    ("risk_flag", "FINANCIAL_CRITICAL", "Financial Critical", "#F59E0B", 5),
    ("risk_flag", "HIGH_PROFILE", "High Profile", "#8B5CF6", 6),
    ("risk_flag", "CROSS_BORDER", "Cross Border", "#3B82F6", 7),
    # Additional partner organizations
    ("partner_organization", "ICPC", "ICPC", None, 6),
    ("partner_organization", "NDLEA", "NDLEA", None, 7),
    ("partner_organization", "DSS", "DSS", None, 8),
    ("partner_organization", "NIA", "NIA", None, 9),
    ("partner_organization", "NFIU", "NFIU", None, 10),
    ("partner_organization", "CBN", "Central Bank of Nigeria", None, 11),
    ("partner_organization", "FIRS", "FIRS", None, 12),
    ("partner_organization", "NCA_UK", "NCA (UK)", None, 13),
    ("partner_organization", "OTHER", "Other Organization", None, 99),
    # Additional source tools
    ("source_tool", "XWAYS", "X-Ways Forensics", None, 6),
    ("source_tool", "OXYGEN", "Oxygen Forensic", None, 7),
    ("source_tool", "MANUAL", "Manual Extraction", None, 8),
    ("source_tool", "OTHER", "Other", None, 99),
    # Additional storage locations
    ("storage_location", "SECURE_STORAGE_1", "Secure Storage Room 1", None, 5),
    ("storage_location", "SECURE_STORAGE_2", "Secure Storage Room 2", None, 6),
    ("storage_location", "OFFSITE_STORAGE", "Offsite Secure Storage", None, 7),
    ("storage_location", "TEMPORARY_HOLD", "Temporary Holding Area", None, 8),
    ("storage_location", "COURT_EXHIBITS", "Court Exhibits Room", None, 9),
    ("storage_location", "OTHER", "Other Location", None, 99),
    # Additional protection policy
    ("retention_policy", "DESTROY_AFTER_TRIAL", "Destroy After Trial", None, 4),
    # Additional prosecution statuses
    ("prosecution_status", "ADJOURNED", "Adjourned", "#6B7280", 4),
    ("prosecution_status", "WITHDRAWN", "Withdrawn", "#EF4444", 5),
    # case_type - additional values
    ("case_type", "OTHER", "Other", "#6B7280", 99),
]

async def main():
    db_url = os.environ.get("DATABASE_URL", "").replace("+asyncpg", "")
    print(f"Connecting to database...")
    
    conn = await asyncpg.connect(db_url)
    
    count = 0
    for category, value, label, color, sort_order in LOOKUP_VALUES:
        # Check if exists
        row = await conn.fetchrow(
            "SELECT id FROM lookup_values WHERE category = $1 AND value = $2",
            category, value
        )
        if not row:
            await conn.execute(
                """INSERT INTO lookup_values (id, category, value, label, color, is_system, is_active, sort_order, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, true, true, $6, NOW(), NOW())""",
                str(uuid.uuid4()), category, value, label, color, sort_order
            )
            count += 1
    
    await conn.close()
    print(f"Seeded {count} additional lookup values")

asyncio.run(main())
