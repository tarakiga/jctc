#!/usr/bin/env python3
"""Seed lookup values using asyncpg directly"""
import asyncio
import asyncpg
import os
import uuid

LOOKUP_VALUES = [
    # case_status
    ("case_status", "OPEN", "Open", "#3B82F6", 1),
    ("case_status", "UNDER_INVESTIGATION", "Under Investigation", "#F59E0B", 2),
    ("case_status", "PENDING_PROSECUTION", "Pending Prosecution", "#8B5CF6", 3),
    ("case_status", "IN_COURT", "In Court", "#EC4899", 4),
    ("case_status", "CLOSED", "Closed", "#10B981", 5),
    ("case_status", "ARCHIVED", "Archived", "#6B7280", 6),
    # case_scope
    ("case_scope", "LOCAL", "Local", "#3B82F6", 1),
    ("case_scope", "INTERNATIONAL", "International", "#8B5CF6", 2),
    # case_type
    ("case_type", "TIP_SEXTORTION", "Online Sextortion", "#DC2626", 1),
    ("case_type", "ONLINE_CHILD_EXPLOITATION", "Online Child Exploitation", "#EF4444", 2),
    ("case_type", "CYBERBULLYING", "Cyberbullying", "#F59E0B", 3),
    ("case_type", "IDENTITY_THEFT", "Identity Theft", "#8B5CF6", 4),
    ("case_type", "FINANCIAL_FRAUD", "Financial Fraud", "#10B981", 5),
    ("case_type", "RANSOMWARE", "Ransomware Attack", "#6366F1", 6),
    ("case_type", "CYBERSTALKING", "Cyberstalking", "#EC4899", 7),
    ("case_type", "FRAUD", "Fraud", "#EF4444", 8),
    ("case_type", "CYBERCRIME", "Cybercrime", "#3B82F6", 9),
    ("case_type", "MONEY_LAUNDERING", "Money Laundering", "#10B981", 10),
    # case_severity
    ("case_severity", "1", "Minimal", "#6B7280", 1),
    ("case_severity", "2", "Low", "#3B82F6", 2),
    ("case_severity", "3", "Medium", "#F59E0B", 3),
    ("case_severity", "4", "High", "#F97316", 4),
    ("case_severity", "5", "Critical", "#EF4444", 5),
    # party_type
    ("party_type", "SUSPECT", "Suspect", "#EF4444", 1),
    ("party_type", "VICTIM", "Victim", "#3B82F6", 2),
    ("party_type", "WITNESS", "Witness", "#10B981", 3),
    ("party_type", "COMPLAINANT", "Complainant", "#8B5CF6", 4),
    # evidence_category
    ("evidence_category", "DIGITAL", "Digital", "#3B82F6", 1),
    ("evidence_category", "PHYSICAL", "Physical", "#8B5CF6", 2),
    ("evidence_category", "DOCUMENT", "Document", "#10B981", 3),
    ("evidence_category", "TESTIMONIAL", "Testimonial", "#F59E0B", 4),
    # task_status
    ("task_status", "OPEN", "Open", "#3B82F6", 1),
    ("task_status", "IN_PROGRESS", "In Progress", "#F59E0B", 2),
    ("task_status", "DONE", "Done", "#10B981", 3),
    ("task_status", "BLOCKED", "Blocked", "#EF4444", 4),
    # task_priority
    ("task_priority", "1", "Critical", "#EF4444", 1),
    ("task_priority", "2", "High", "#F97316", 2),
    ("task_priority", "3", "Medium", "#F59E0B", 3),
    ("task_priority", "4", "Low", "#3B82F6", 4),
    ("task_priority", "5", "Minimal", "#6B7280", 5),
    # device_type
    ("device_type", "LAPTOP", "Laptop", None, 1),
    ("device_type", "DESKTOP", "Desktop", None, 2),
    ("device_type", "MOBILE_PHONE", "Mobile Phone", None, 3),
    ("device_type", "TABLET", "Tablet", None, 4),
    ("device_type", "EXTERNAL_STORAGE", "External Storage", None, 5),
    ("device_type", "USB_DRIVE", "USB Drive", None, 6),
    ("device_type", "SERVER", "Server", None, 7),
    # platform
    ("platform", "Instagram", "Instagram", None, 1),
    ("platform", "Facebook", "Facebook", None, 2),
    ("platform", "TikTok", "TikTok", None, 3),
    ("platform", "WhatsApp", "WhatsApp", None, 4),
    ("platform", "Twitter/X", "Twitter/X", None, 5),
    ("platform", "Telegram", "Telegram", None, 6),
    # intake_channel
    ("intake_channel", "WALK_IN", "Walk-In", None, 1),
    ("intake_channel", "HOTLINE", "Hotline", None, 2),
    ("intake_channel", "EMAIL", "Email", None, 3),
    ("intake_channel", "REFERRAL", "Referral", None, 4),
    ("intake_channel", "ONLINE_FORM", "Online Form", None, 5),
    # risk_flag
    ("risk_flag", "CHILD_SAFETY", "Child Safety", "#EF4444", 1),
    ("risk_flag", "IMMINENT_HARM", "Imminent Harm", "#DC2626", 2),
    ("risk_flag", "TRAFFICKING", "Trafficking", "#B91C1C", 3),
    ("risk_flag", "SEXTORTION", "Sextortion", "#991B1B", 4),
    # custody_status
    ("custody_status", "IN_VAULT", "In Vault", "#10B981", 1),
    ("custody_status", "RELEASED", "Released", "#F59E0B", 2),
    ("custody_status", "RETURNED", "Returned", "#3B82F6", 3),
    ("custody_status", "DISPOSED", "Disposed", "#6B7280", 4),
    # legal_instrument_type
    ("legal_instrument_type", "WARRANT", "Warrant", None, 1),
    ("legal_instrument_type", "PRESERVATION", "Preservation Order", None, 2),
    ("legal_instrument_type", "MLAT", "MLAT Request", None, 3),
    ("legal_instrument_type", "COURT_ORDER", "Court Order", None, 4),
    # legal_instrument_status
    ("legal_instrument_status", "REQUESTED", "Requested", "#F59E0B", 1),
    ("legal_instrument_status", "ISSUED", "Issued", "#10B981", 2),
    ("legal_instrument_status", "DENIED", "Denied", "#EF4444", 3),
    ("legal_instrument_status", "EXPIRED", "Expired", "#6B7280", 4),
    ("legal_instrument_status", "EXECUTED", "Executed", "#3B82F6", 5),
    # prosecution_status
    ("prosecution_status", "FILED", "Filed", "#3B82F6", 1),
    ("prosecution_status", "PENDING_ARRAIGNMENT", "Pending Arraignment", "#F59E0B", 2),
    ("prosecution_status", "ONGOING_TRIAL", "Ongoing Trial", "#8B5CF6", 3),
    ("prosecution_status", "CONCLUDED", "Concluded", "#10B981", 6),
    # disposition
    ("disposition", "CONVICTED", "Convicted", "#EF4444", 1),
    ("disposition", "ACQUITTED", "Acquitted", "#10B981", 2),
    ("disposition", "PLEA", "Plea Bargain", "#F59E0B", 3),
    ("disposition", "DISMISSED", "Dismissed", "#6B7280", 4),
    # assignment_role
    ("assignment_role", "LEAD", "Lead Investigator", "#8B5CF6", 1),
    ("assignment_role", "SUPPORT", "Support", "#3B82F6", 2),
    ("assignment_role", "PROSECUTOR", "Prosecutor", "#EC4899", 3),
    ("assignment_role", "LIAISON", "Liaison", "#10B981", 4),
    # partner_organization
    ("partner_organization", "INTERPOL", "INTERPOL", None, 1),
    ("partner_organization", "EFCC", "EFCC", None, 2),
    ("partner_organization", "NPF", "Nigeria Police Force", None, 3),
    ("partner_organization", "FBI", "FBI", None, 4),
    ("partner_organization", "EUROPOL", "Europol", None, 5),
    # source_tool
    ("source_tool", "CELLEBRITE", "Cellebrite", None, 1),
    ("source_tool", "FTK", "FTK (Forensic Toolkit)", None, 2),
    ("source_tool", "ENCASE", "EnCase", None, 3),
    ("source_tool", "AXIOM", "Magnet AXIOM", None, 4),
    ("source_tool", "AUTOPSY", "Autopsy", None, 5),
    # storage_location
    ("storage_location", "EVIDENCE_VAULT_A", "Evidence Vault A", None, 1),
    ("storage_location", "EVIDENCE_VAULT_B", "Evidence Vault B", None, 2),
    ("storage_location", "DIGITAL_VAULT", "Digital Evidence Vault", None, 3),
    ("storage_location", "FORENSIC_LAB", "Forensic Laboratory", None, 4),
    # retention_policy
    ("retention_policy", "PERMANENT", "Permanent", None, 1),
    ("retention_policy", "CASE_CLOSE_PLUS_7", "Case Close + 7 Years", None, 2),
    ("retention_policy", "CASE_CLOSE_PLUS_1", "Case Close + 1 Year", None, 3),
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
    print(f"Seeded {count} lookup values")

asyncio.run(main())
