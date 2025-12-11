"""Seed script for populating lookup_values table with default enum values."""

import asyncio
from app.database.base import AsyncSessionLocal
from app.models.lookup_value import LookupValue


# Default values organized by category
DEFAULT_LOOKUP_VALUES = {
    "case_status": [
        {"value": "OPEN", "label": "Open", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "UNDER_INVESTIGATION", "label": "Under Investigation", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "PENDING_PROSECUTION", "label": "Pending Prosecution", "color": "#8B5CF6", "is_system": True, "sort_order": 3},
        {"value": "IN_COURT", "label": "In Court", "color": "#EC4899", "is_system": True, "sort_order": 4},
        {"value": "CLOSED", "label": "Closed", "color": "#10B981", "is_system": True, "sort_order": 5},
        {"value": "ARCHIVED", "label": "Archived", "color": "#6B7280", "is_system": True, "sort_order": 6},
    ],
    "case_scope": [
        {"value": "LOCAL", "label": "Local", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "INTERNATIONAL", "label": "International", "color": "#8B5CF6", "is_system": True, "sort_order": 2},
    ],
    # Case types matching lookup_case_type table codes
    "case_type": [
        {"value": "TIP_SEXTORTION", "label": "Online Sextortion", "color": "#DC2626", "is_system": True, "sort_order": 1},
        {"value": "ONLINE_CHILD_EXPLOITATION", "label": "Online Child Exploitation", "color": "#EF4444", "is_system": True, "sort_order": 2},
        {"value": "CYBERBULLYING", "label": "Cyberbullying", "color": "#F59E0B", "is_system": True, "sort_order": 3},
        {"value": "IDENTITY_THEFT", "label": "Identity Theft", "color": "#8B5CF6", "is_system": True, "sort_order": 4},
        {"value": "FINANCIAL_FRAUD", "label": "Financial Fraud", "color": "#10B981", "is_system": True, "sort_order": 5},
        {"value": "RANSOMWARE", "label": "Ransomware Attack", "color": "#6366F1", "is_system": True, "sort_order": 6},
        {"value": "CYBERSTALKING", "label": "Cyberstalking", "color": "#EC4899", "is_system": True, "sort_order": 7},
    ],
    "intake_channel": [
        {"value": "WALK_IN", "label": "Walk-In", "is_system": True, "sort_order": 1},
        {"value": "HOTLINE", "label": "Hotline", "is_system": True, "sort_order": 2},
        {"value": "EMAIL", "label": "Email", "is_system": True, "sort_order": 3},
        {"value": "REFERRAL", "label": "Referral", "is_system": True, "sort_order": 4},
        {"value": "API", "label": "API Integration", "is_system": True, "sort_order": 5},
        {"value": "ONLINE_FORM", "label": "Online Form", "is_system": True, "sort_order": 6},
        {"value": "PARTNER_AGENCY", "label": "Partner Agency", "is_system": True, "sort_order": 7},
    ],
    "reporter_type": [
        {"value": "ANONYMOUS", "label": "Anonymous", "is_system": True, "sort_order": 1},
        {"value": "VICTIM", "label": "Victim", "is_system": True, "sort_order": 2},
        {"value": "PARENT", "label": "Parent/Guardian", "is_system": True, "sort_order": 3},
        {"value": "LEA", "label": "Law Enforcement Agency", "is_system": True, "sort_order": 4},
        {"value": "NGO", "label": "NGO", "is_system": True, "sort_order": 5},
        {"value": "CORPORATE", "label": "Corporate", "is_system": True, "sort_order": 6},
        {"value": "WHISTLEBLOWER", "label": "Whistleblower", "is_system": True, "sort_order": 7},
    ],
    "risk_flag": [
        {"value": "CHILD_SAFETY", "label": "Child Safety", "color": "#EF4444", "is_system": True, "sort_order": 1},
        {"value": "IMMINENT_HARM", "label": "Imminent Harm", "color": "#DC2626", "is_system": True, "sort_order": 2},
        {"value": "TRAFFICKING", "label": "Trafficking", "color": "#B91C1C", "is_system": True, "sort_order": 3},
        {"value": "SEXTORTION", "label": "Sextortion", "color": "#991B1B", "is_system": True, "sort_order": 4},
        {"value": "FINANCIAL_CRITICAL", "label": "Financial Critical", "color": "#F59E0B", "is_system": True, "sort_order": 5},
        {"value": "HIGH_PROFILE", "label": "High Profile", "color": "#8B5CF6", "is_system": True, "sort_order": 6},
        {"value": "CROSS_BORDER", "label": "Cross Border", "color": "#3B82F6", "is_system": True, "sort_order": 7},
    ],
    "party_type": [
        {"value": "SUSPECT", "label": "Suspect", "color": "#EF4444", "is_system": True, "sort_order": 1},
        {"value": "VICTIM", "label": "Victim", "color": "#3B82F6", "is_system": True, "sort_order": 2},
        {"value": "WITNESS", "label": "Witness", "color": "#10B981", "is_system": True, "sort_order": 3},
        {"value": "COMPLAINANT", "label": "Complainant", "color": "#8B5CF6", "is_system": True, "sort_order": 4},
    ],
    "evidence_category": [
        {"value": "DIGITAL", "label": "Digital", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "PHYSICAL", "label": "Physical", "color": "#8B5CF6", "is_system": True, "sort_order": 2},
    ],
    "custody_status": [
        {"value": "IN_VAULT", "label": "In Vault", "color": "#10B981", "is_system": True, "sort_order": 1},
        {"value": "RELEASED", "label": "Released", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "RETURNED", "label": "Returned", "color": "#3B82F6", "is_system": True, "sort_order": 3},
        {"value": "DISPOSED", "label": "Disposed", "color": "#6B7280", "is_system": True, "sort_order": 4},
    ],
    "custody_action": [
        {"value": "SEIZED", "label": "Seized", "is_system": True, "sort_order": 1},
        {"value": "TRANSFERRED", "label": "Transferred", "is_system": True, "sort_order": 2},
        {"value": "ANALYZED", "label": "Analyzed", "is_system": True, "sort_order": 3},
        {"value": "PRESENTED_COURT", "label": "Presented in Court", "is_system": True, "sort_order": 4},
        {"value": "RETURNED", "label": "Returned", "is_system": True, "sort_order": 5},
        {"value": "DISPOSED", "label": "Disposed", "is_system": True, "sort_order": 6},
    ],
    "task_status": [
        {"value": "OPEN", "label": "Open", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "IN_PROGRESS", "label": "In Progress", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "DONE", "label": "Done", "color": "#10B981", "is_system": True, "sort_order": 3},
        {"value": "BLOCKED", "label": "Blocked", "color": "#EF4444", "is_system": True, "sort_order": 4},
    ],
    "assignment_role": [
        {"value": "LEAD", "label": "Lead Investigator", "color": "#8B5CF6", "is_system": True, "sort_order": 1},
        {"value": "SUPPORT", "label": "Support", "color": "#3B82F6", "is_system": True, "sort_order": 2},
        {"value": "PROSECUTOR", "label": "Prosecutor", "color": "#EC4899", "is_system": True, "sort_order": 3},
        {"value": "LIAISON", "label": "Liaison", "color": "#10B981", "is_system": True, "sort_order": 4},
    ],
    "device_type": [
        {"value": "LAPTOP", "label": "Laptop", "is_system": True, "sort_order": 1},
        {"value": "DESKTOP", "label": "Desktop", "is_system": True, "sort_order": 2},
        {"value": "MOBILE_PHONE", "label": "Mobile Phone", "is_system": True, "sort_order": 3},
        {"value": "TABLET", "label": "Tablet", "is_system": True, "sort_order": 4},
        {"value": "EXTERNAL_STORAGE", "label": "External Storage", "is_system": True, "sort_order": 5},
        {"value": "USB_DRIVE", "label": "USB Drive", "is_system": True, "sort_order": 6},
        {"value": "MEMORY_CARD", "label": "Memory Card", "is_system": True, "sort_order": 7},
        {"value": "SERVER", "label": "Server", "is_system": True, "sort_order": 8},
        {"value": "NETWORK_DEVICE", "label": "Network Device", "is_system": True, "sort_order": 9},
        {"value": "OTHER", "label": "Other", "is_system": True, "sort_order": 99},
    ],
    "device_condition": [
        {"value": "EXCELLENT", "label": "Excellent", "color": "#10B981", "is_system": True, "sort_order": 1},
        {"value": "GOOD", "label": "Good", "color": "#3B82F6", "is_system": True, "sort_order": 2},
        {"value": "FAIR", "label": "Fair", "color": "#F59E0B", "is_system": True, "sort_order": 3},
        {"value": "POOR", "label": "Poor", "color": "#EF4444", "is_system": True, "sort_order": 4},
        {"value": "DAMAGED", "label": "Damaged", "color": "#DC2626", "is_system": True, "sort_order": 5},
    ],
    "encryption_status": [
        {"value": "NONE", "label": "None", "color": "#10B981", "is_system": True, "sort_order": 1},
        {"value": "ENCRYPTED", "label": "Encrypted", "color": "#EF4444", "is_system": True, "sort_order": 2},
        {"value": "BITLOCKER", "label": "BitLocker", "color": "#3B82F6", "is_system": True, "sort_order": 3},
        {"value": "FILEVAULT", "label": "FileVault", "color": "#8B5CF6", "is_system": True, "sort_order": 4},
        {"value": "PARTIAL", "label": "Partial", "color": "#F59E0B", "is_system": True, "sort_order": 5},
        {"value": "UNKNOWN", "label": "Unknown", "color": "#6B7280", "is_system": True, "sort_order": 6},
    ],
    "imaging_status": [
        {"value": "NOT_STARTED", "label": "Not Started", "color": "#6B7280", "is_system": True, "sort_order": 1},
        {"value": "IN_PROGRESS", "label": "In Progress", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "COMPLETED", "label": "Completed", "color": "#10B981", "is_system": True, "sort_order": 3},
        {"value": "FAILED", "label": "Failed", "color": "#EF4444", "is_system": True, "sort_order": 4},
        {"value": "VERIFIED", "label": "Verified", "color": "#3B82F6", "is_system": True, "sort_order": 5},
    ],
    "analysis_status": [
        {"value": "PENDING", "label": "Pending", "color": "#6B7280", "is_system": True, "sort_order": 1},
        {"value": "IN_PROGRESS", "label": "In Progress", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "ANALYZED", "label": "Analyzed", "color": "#10B981", "is_system": True, "sort_order": 3},
        {"value": "BLOCKED", "label": "Blocked", "color": "#EF4444", "is_system": True, "sort_order": 4},
    ],
    "seizure_status": [
        {"value": "PENDING", "label": "Pending", "color": "#F59E0B", "is_system": True, "sort_order": 1},
        {"value": "COMPLETED", "label": "Completed", "color": "#10B981", "is_system": True, "sort_order": 2},
        {"value": "DISPUTED", "label": "Disputed", "color": "#EF4444", "is_system": True, "sort_order": 3},
        {"value": "RETURNED", "label": "Returned", "color": "#3B82F6", "is_system": True, "sort_order": 4},
    ],
    "warrant_type": [
        {"value": "SEARCH_WARRANT", "label": "Search Warrant", "is_system": True, "sort_order": 1},
        {"value": "PRODUCTION_ORDER", "label": "Production Order", "is_system": True, "sort_order": 2},
        {"value": "COURT_ORDER", "label": "Court Order", "is_system": True, "sort_order": 3},
        {"value": "SEIZURE_ORDER", "label": "Seizure Order", "is_system": True, "sort_order": 4},
    ],
    "artefact_type": [
        {"value": "CHAT_LOG", "label": "Chat Log", "is_system": True, "sort_order": 1},
        {"value": "IMAGE", "label": "Image", "is_system": True, "sort_order": 2},
        {"value": "VIDEO", "label": "Video", "is_system": True, "sort_order": 3},
        {"value": "DOC", "label": "Document", "is_system": True, "sort_order": 4},
        {"value": "BROWSER_HISTORY", "label": "Browser History", "is_system": True, "sort_order": 5},
        {"value": "EMAIL", "label": "Email", "is_system": True, "sort_order": 6},
        {"value": "CALL_LOG", "label": "Call Log", "is_system": True, "sort_order": 7},
        {"value": "SMS", "label": "SMS", "is_system": True, "sort_order": 8},
        {"value": "OTHER", "label": "Other", "is_system": True, "sort_order": 99},
    ],
    "legal_instrument_type": [
        {"value": "WARRANT", "label": "Warrant", "is_system": True, "sort_order": 1},
        {"value": "PRESERVATION", "label": "Preservation Order", "is_system": True, "sort_order": 2},
        {"value": "MLAT", "label": "MLAT Request", "is_system": True, "sort_order": 3},
        {"value": "COURT_ORDER", "label": "Court Order", "is_system": True, "sort_order": 4},
    ],
    "legal_instrument_status": [
        {"value": "REQUESTED", "label": "Requested", "color": "#F59E0B", "is_system": True, "sort_order": 1},
        {"value": "ISSUED", "label": "Issued", "color": "#10B981", "is_system": True, "sort_order": 2},
        {"value": "DENIED", "label": "Denied", "color": "#EF4444", "is_system": True, "sort_order": 3},
        {"value": "EXPIRED", "label": "Expired", "color": "#6B7280", "is_system": True, "sort_order": 4},
        {"value": "EXECUTED", "label": "Executed", "color": "#3B82F6", "is_system": True, "sort_order": 5},
    ],
    "charge_status": [
        {"value": "FILED", "label": "Filed", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "WITHDRAWN", "label": "Withdrawn", "color": "#6B7280", "is_system": True, "sort_order": 2},
        {"value": "AMENDED", "label": "Amended", "color": "#F59E0B", "is_system": True, "sort_order": 3},
    ],
    "disposition": [
        {"value": "CONVICTED", "label": "Convicted", "color": "#EF4444", "is_system": True, "sort_order": 1},
        {"value": "ACQUITTED", "label": "Acquitted", "color": "#10B981", "is_system": True, "sort_order": 2},
        {"value": "PLEA", "label": "Plea Bargain", "color": "#F59E0B", "is_system": True, "sort_order": 3},
        {"value": "DISMISSED", "label": "Dismissed", "color": "#6B7280", "is_system": True, "sort_order": 4},
    ],
    "attachment_classification": [
        {"value": "PUBLIC", "label": "Public", "color": "#10B981", "is_system": True, "sort_order": 1},
        {"value": "LE_SENSITIVE", "label": "Law Enforcement Sensitive", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "PRIVILEGED", "label": "Privileged", "color": "#EF4444", "is_system": True, "sort_order": 3},
    ],
    "virus_scan_status": [
        {"value": "PENDING", "label": "Pending", "color": "#6B7280", "is_system": True, "sort_order": 1},
        {"value": "CLEAN", "label": "Clean", "color": "#10B981", "is_system": True, "sort_order": 2},
        {"value": "INFECTED", "label": "Infected", "color": "#EF4444", "is_system": True, "sort_order": 3},
        {"value": "FAILED", "label": "Scan Failed", "color": "#F59E0B", "is_system": True, "sort_order": 4},
    ],
    "collaboration_status": [
        {"value": "INITIATED", "label": "Initiated", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "ACTIVE", "label": "Active", "color": "#10B981", "is_system": True, "sort_order": 2},
        {"value": "COMPLETED", "label": "Completed", "color": "#6B7280", "is_system": True, "sort_order": 3},
        {"value": "SUSPENDED", "label": "Suspended", "color": "#F59E0B", "is_system": True, "sort_order": 4},
    ],
    "partner_type": [
        {"value": "LAW_ENFORCEMENT", "label": "Law Enforcement", "is_system": True, "sort_order": 1},
        {"value": "INTERNATIONAL", "label": "International Agency", "is_system": True, "sort_order": 2},
        {"value": "REGULATOR", "label": "Regulator", "is_system": True, "sort_order": 3},
        {"value": "ISP", "label": "Internet Service Provider", "is_system": True, "sort_order": 4},
        {"value": "BANK", "label": "Bank/Financial Institution", "is_system": True, "sort_order": 5},
        {"value": "OTHER", "label": "Other", "is_system": True, "sort_order": 99},
    ],
    "case_type": [
        {"value": "FRAUD", "label": "Fraud", "color": "#EF4444", "is_system": True, "sort_order": 1},
        {"value": "CYBERCRIME", "label": "Cybercrime", "color": "#3B82F6", "is_system": True, "sort_order": 2},
        {"value": "MONEY_LAUNDERING", "label": "Money Laundering", "color": "#10B981", "is_system": True, "sort_order": 3},
        {"value": "IDENTITY_THEFT", "label": "Identity Theft", "color": "#8B5CF6", "is_system": True, "sort_order": 4},
        {"value": "OTHER", "label": "Other", "color": "#6B7280", "is_system": True, "sort_order": 99},
    ],
    "case_severity": [
        {"value": "1", "label": "Minimal", "color": "#6B7280", "is_system": True, "sort_order": 1},
        {"value": "2", "label": "Low", "color": "#3B82F6", "is_system": True, "sort_order": 2},
        {"value": "3", "label": "Medium", "color": "#F59E0B", "is_system": True, "sort_order": 3},
        {"value": "4", "label": "High", "color": "#F97316", "is_system": True, "sort_order": 4},
        {"value": "5", "label": "Critical", "color": "#EF4444", "is_system": True, "sort_order": 5},
    ],
    "platform": [
        {"value": "Instagram", "label": "Instagram", "is_system": True, "sort_order": 1},
        {"value": "Facebook", "label": "Facebook", "is_system": True, "sort_order": 2},
        {"value": "TikTok", "label": "TikTok", "is_system": True, "sort_order": 3},
        {"value": "WhatsApp", "label": "WhatsApp", "is_system": True, "sort_order": 4},
        {"value": "Twitter/X", "label": "Twitter/X", "is_system": True, "sort_order": 5},
        {"value": "Telegram", "label": "Telegram", "is_system": True, "sort_order": 6},
        {"value": "Snapchat", "label": "Snapchat", "is_system": True, "sort_order": 7},
        {"value": "LinkedIn", "label": "LinkedIn", "is_system": True, "sort_order": 8},
    ],
    "retention_policy": [
        {"value": "PERMANENT", "label": "Permanent", "is_system": True, "sort_order": 1},
        {"value": "CASE_CLOSE_PLUS_7", "label": "Case Close + 7 Years", "is_system": True, "sort_order": 2},
        {"value": "CASE_CLOSE_PLUS_1", "label": "Case Close + 1 Year", "is_system": True, "sort_order": 3},
        {"value": "DESTROY_AFTER_TRIAL", "label": "Destroy After Trial", "is_system": True, "sort_order": 4},
    ],
    "evidence_category": [
        {"value": "DIGITAL", "label": "Digital", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "PHYSICAL", "label": "Physical", "color": "#8B5CF6", "is_system": True, "sort_order": 2},
        {"value": "DOCUMENT", "label": "Document", "color": "#10B981", "is_system": True, "sort_order": 3},
        {"value": "TESTIMONIAL", "label": "Testimonial", "color": "#F59E0B", "is_system": True, "sort_order": 4},
    ],
    "storage_location": [
        {"value": "EVIDENCE_VAULT_A", "label": "Evidence Vault A", "is_system": True, "sort_order": 1},
        {"value": "EVIDENCE_VAULT_B", "label": "Evidence Vault B", "is_system": True, "sort_order": 2},
        {"value": "DIGITAL_ARCHIVE", "label": "Digital Archive", "is_system": True, "sort_order": 3},
        {"value": "OFFSITE_STORAGE", "label": "Offsite Storage", "is_system": True, "sort_order": 4},
        {"value": "FORENSIC_LAB", "label": "Forensic Lab", "is_system": True, "sort_order": 5},
        {"value": "COURT_REGISTRY", "label": "Court Registry", "is_system": True, "sort_order": 6},
    ],
    "task_priority": [
        {"value": "1", "label": "Critical", "color": "#EF4444", "is_system": True, "sort_order": 1},
        {"value": "2", "label": "High", "color": "#F97316", "is_system": True, "sort_order": 2},
        {"value": "3", "label": "Medium", "color": "#F59E0B", "is_system": True, "sort_order": 3},
        {"value": "4", "label": "Low", "color": "#3B82F6", "is_system": True, "sort_order": 4},
        {"value": "5", "label": "Minimal", "color": "#6B7280", "is_system": True, "sort_order": 5},
    ],
    "issuing_authority": [
        {"value": "HIGH_COURT", "label": "High Court", "is_system": True, "sort_order": 1},
        {"value": "MAGISTRATE_COURT", "label": "Magistrate Court", "is_system": True, "sort_order": 2},
        {"value": "FEDERAL_COURT", "label": "Federal Court", "is_system": True, "sort_order": 3},
        {"value": "STATE_COURT", "label": "State Court", "is_system": True, "sort_order": 4},
        {"value": "EFCC", "label": "EFCC", "is_system": True, "sort_order": 5},
        {"value": "POLICE", "label": "Nigeria Police", "is_system": True, "sort_order": 6},
    ],
    "legal_issuing_authority": [
        {"value": "HIGH_COURT", "label": "High Court", "is_system": True, "sort_order": 1},
        {"value": "MAGISTRATE_COURT", "label": "Magistrate Court", "is_system": True, "sort_order": 2},
        {"value": "FEDERAL_HIGH_COURT", "label": "Federal High Court", "is_system": True, "sort_order": 3},
        {"value": "COURT_OF_APPEAL", "label": "Court of Appeal", "is_system": True, "sort_order": 4},
        {"value": "SUPREME_COURT", "label": "Supreme Court", "is_system": True, "sort_order": 5},
        {"value": "INTERNATIONAL_BODY", "label": "International Body", "is_system": True, "sort_order": 6},
    ],
    "source_tool": [
        {"value": "CELLEBRITE", "label": "Cellebrite", "is_system": True, "sort_order": 1},
        {"value": "FTK", "label": "FTK (Forensic Toolkit)", "is_system": True, "sort_order": 2},
        {"value": "ENCASE", "label": "EnCase", "is_system": True, "sort_order": 3},
        {"value": "AXIOM", "label": "Magnet AXIOM", "is_system": True, "sort_order": 4},
        {"value": "AUTOPSY", "label": "Autopsy", "is_system": True, "sort_order": 5},
        {"value": "XWAYS", "label": "X-Ways Forensics", "is_system": True, "sort_order": 6},
        {"value": "OXYGEN", "label": "Oxygen Forensic", "is_system": True, "sort_order": 7},
        {"value": "MANUAL", "label": "Manual Extraction", "is_system": True, "sort_order": 8},
        {"value": "OTHER", "label": "Other", "is_system": True, "sort_order": 99},
    ],
    "prosecution_section": [
        {"value": "SECTION_419", "label": "Section 419 (Advance Fee Fraud)", "is_system": True, "sort_order": 1},
        {"value": "SECTION_420", "label": "Section 420 (Cheating)", "is_system": True, "sort_order": 2},
        {"value": "CYBERCRIME_ACT_2015", "label": "Cybercrime Act 2015", "is_system": True, "sort_order": 3},
        {"value": "MONEY_LAUNDERING_ACT", "label": "Money Laundering Act", "is_system": True, "sort_order": 4},
        {"value": "EFCC_ACT", "label": "EFCC Establishment Act", "is_system": True, "sort_order": 5},
        {"value": "ACJA_2015", "label": "ACJA 2015", "is_system": True, "sort_order": 6},
        {"value": "OTHER", "label": "Other Statute", "is_system": True, "sort_order": 99},
    ],
    "prosecution_status": [
        {"value": "FILED", "label": "Filed", "color": "#3B82F6", "is_system": True, "sort_order": 1},
        {"value": "PENDING_ARRAIGNMENT", "label": "Pending Arraignment", "color": "#F59E0B", "is_system": True, "sort_order": 2},
        {"value": "ONGOING_TRIAL", "label": "Ongoing Trial", "color": "#8B5CF6", "is_system": True, "sort_order": 3},
        {"value": "ADJOURNED", "label": "Adjourned", "color": "#6B7280", "is_system": True, "sort_order": 4},
        {"value": "WITHDRAWN", "label": "Withdrawn", "color": "#EF4444", "is_system": True, "sort_order": 5},
        {"value": "CONCLUDED", "label": "Concluded", "color": "#10B981", "is_system": True, "sort_order": 6},
    ],
    "partner_organization": [
        {"value": "INTERPOL", "label": "INTERPOL", "is_system": True, "sort_order": 1},
        {"value": "EFCC", "label": "EFCC", "is_system": True, "sort_order": 2},
        {"value": "ICPC", "label": "ICPC", "is_system": True, "sort_order": 3},
        {"value": "NDLEA", "label": "NDLEA", "is_system": True, "sort_order": 4},
        {"value": "NPF", "label": "Nigeria Police Force", "is_system": True, "sort_order": 5},
        {"value": "DSS", "label": "DSS", "is_system": True, "sort_order": 6},
        {"value": "NIA", "label": "NIA", "is_system": True, "sort_order": 7},
        {"value": "NFIU", "label": "NFIU", "is_system": True, "sort_order": 8},
        {"value": "CBN", "label": "Central Bank of Nigeria", "is_system": True, "sort_order": 9},
        {"value": "FIRS", "label": "FIRS", "is_system": True, "sort_order": 10},
        {"value": "FBI", "label": "FBI", "is_system": True, "sort_order": 11},
        {"value": "EUROPOL", "label": "Europol", "is_system": True, "sort_order": 12},
        {"value": "NCA_UK", "label": "NCA (UK)", "is_system": True, "sort_order": 13},
        {"value": "OTHER", "label": "Other Organization", "is_system": True, "sort_order": 99},
    ],
    "storage_location": [
        {"value": "EVIDENCE_VAULT_A", "label": "Evidence Vault A", "is_system": True, "sort_order": 1},
        {"value": "EVIDENCE_VAULT_B", "label": "Evidence Vault B", "is_system": True, "sort_order": 2},
        {"value": "SECURE_STORAGE_1", "label": "Secure Storage Room 1", "is_system": True, "sort_order": 3},
        {"value": "SECURE_STORAGE_2", "label": "Secure Storage Room 2", "is_system": True, "sort_order": 4},
        {"value": "DIGITAL_VAULT", "label": "Digital Evidence Vault", "is_system": True, "sort_order": 5},
        {"value": "FORENSIC_LAB", "label": "Forensic Laboratory", "is_system": True, "sort_order": 6},
        {"value": "OFFSITE_STORAGE", "label": "Offsite Secure Storage", "is_system": True, "sort_order": 7},
        {"value": "TEMPORARY_HOLD", "label": "Temporary Holding Area", "is_system": True, "sort_order": 8},
        {"value": "COURT_EXHIBITS", "label": "Court Exhibits Room", "is_system": True, "sort_order": 9},
        {"value": "OTHER", "label": "Other Location", "is_system": True, "sort_order": 99},
    ],
    "session_type": [
        {"value": "ARRAIGNMENT", "label": "Arraignment", "is_system": True, "sort_order": 1},
        {"value": "PRELIMINARY_HEARING", "label": "Preliminary Hearing", "is_system": True, "sort_order": 2},
        {"value": "PRE_TRIAL_CONFERENCE", "label": "Pre-Trial Conference", "is_system": True, "sort_order": 3},
        {"value": "MOTION_HEARING", "label": "Motion Hearing", "is_system": True, "sort_order": 4},
        {"value": "TRIAL", "label": "Trial", "is_system": True, "sort_order": 5},
        {"value": "SENTENCING", "label": "Sentencing", "is_system": True, "sort_order": 6},
        {"value": "APPEAL_HEARING", "label": "Appeal Hearing", "is_system": True, "sort_order": 7},
        {"value": "OTHER", "label": "Other", "is_system": True, "sort_order": 99},
    ],
}


async def seed_lookup_values():
    """Seed the lookup_values table with default values."""
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        
        count = 0
        for category, values in DEFAULT_LOOKUP_VALUES.items():
            for val_data in values:
                # Check if value already exists
                result = await session.execute(
                    select(LookupValue).where(
                        LookupValue.category == category,
                        LookupValue.value == val_data["value"]
                    )
                )
                existing = result.scalar_one_or_none()
                
                if not existing:
                    lookup_value = LookupValue(
                        category=category,
                        value=val_data["value"],
                        label=val_data["label"],
                        color=val_data.get("color"),
                        is_system=val_data.get("is_system", True),
                        sort_order=val_data.get("sort_order", 0),
                        is_active=True
                    )
                    session.add(lookup_value)
                    count += 1
        
        await session.commit()
        print(f"Seeded {count} lookup values")


if __name__ == "__main__":
    asyncio.run(seed_lookup_values())
