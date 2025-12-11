"""
Production Database Schema Synchronization Script

This script generates SQL commands to synchronize the production database
with the local SQLAlchemy model definitions.

Usage:
    python sync_production_schema.py > schema_sync.sql
    
Then transfer and execute on production:
    cat schema_sync.sql | ssh ubuntu@jctc.ng "docker exec -i jctc_db psql -U jctc_user -d jctc_db"
"""

import sys
import os

# Add the backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import inspect, create_engine, MetaData, text
from sqlalchemy.engine import Engine
from app.database import Base

# Import ALL models to ensure they're registered with Base
from app.models.user import User, TeamActivity
from app.models.case import Case, CaseAssignment
from app.models.party import Party
from app.models.task import Task, ActionLog
from app.models.evidence import Evidence, Artefact, ChainOfCustody, Seizure
from app.models.legal import LegalInstrument
from app.models.prosecution import Charge, CourtSession, Outcome
from app.models.misc import Attachment, CaseCollaboration
from app.models.lookup_value import LookupValue
from app.models.forensic import ForensicReport
from app.models.audit import (
    AuditLog, ComplianceReport, RetentionPolicy, 
    ComplianceViolation, AuditConfiguration, DataRetentionJob, AuditArchive
)
from app.models.notifications import (
    Notification, NotificationPreference, NotificationTemplate,
    NotificationRule, NotificationLog, NotificationDigest
)
from app.models.reports import (
    Report, ReportTemplate, ScheduledReport, ReportExecution,
    ReportPermission, ReportAnalytics, ReportShare, ReportComment
)
from app.models.task_management import (
    TaskTemplate, WorkflowTemplate, WorkflowInstance, WorkflowStepExecution,
    TaskSLA, SLAViolation, TaskEscalation, TaskDependency, TaskComment, TaskTimeEntry
)
from app.models.ndpa_compliance import (
    NDPAConsentRecord, NDPAProcessingActivity, NDPADataSubjectRequest,
    NDPABreachNotification, NDPAImpactAssessment, NDPARegistrationRecord
)
from app.models.mobile import (
    MobileDevice, MobilePushToken, MobileNotification, MobileSyncSession,
    MobileSyncConflict, MobilePerformanceLog, MobileOfflineAction, MobileUserPreference
)


def get_sqlalchemy_type_to_postgres(column):
    """Convert SQLAlchemy column type to PostgreSQL type string."""
    from sqlalchemy import String, Text, Integer, BigInteger, Boolean, DateTime, Date, Float, Numeric
    from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
    from sqlalchemy import Enum as SQLEnum
    
    col_type = column.type
    type_name = type(col_type).__name__
    
    # Handle common types
    type_mapping = {
        'String': f"VARCHAR({col_type.length})" if hasattr(col_type, 'length') and col_type.length else "VARCHAR(255)",
        'Text': "TEXT",
        'Integer': "INTEGER",
        'BigInteger': "BIGINT",
        'Boolean': "BOOLEAN",
        'DateTime': "TIMESTAMP WITH TIME ZONE",
        'Date': "DATE",
        'Float': "DOUBLE PRECISION",
        'Numeric': f"NUMERIC({col_type.precision},{col_type.scale})" if hasattr(col_type, 'precision') else "NUMERIC",
        'UUID': "UUID",
        'JSONB': "JSONB",
        'JSON': "JSON",
    }
    
    if type_name in type_mapping:
        return type_mapping[type_name]
    
    # Handle Enum - convert to VARCHAR for compatibility
    if type_name == 'Enum':
        return "VARCHAR(50)"
    
    # Handle ARRAY
    if type_name == 'ARRAY':
        return "VARCHAR[]"
    
    # Handle custom types
    if 'StringArray' in type_name:
        return "VARCHAR[]"
    if 'UUIDArray' in type_name:
        return "UUID[]"
    
    # Default
    return "VARCHAR(255)"


def get_default_clause(column):
    """Get DEFAULT clause for a column."""
    if column.default is not None:
        if hasattr(column.default, 'arg'):
            default_val = column.default.arg
            if callable(default_val):
                return ""  # Skip callable defaults
            if isinstance(default_val, str):
                return f" DEFAULT '{default_val}'"
            if isinstance(default_val, bool):
                return f" DEFAULT {'TRUE' if default_val else 'FALSE'}"
            if isinstance(default_val, (int, float)):
                return f" DEFAULT {default_val}"
    if column.server_default is not None:
        return f" DEFAULT {column.server_default.arg}"
    return ""


def generate_create_table_sql(model_class):
    """Generate CREATE TABLE IF NOT EXISTS SQL for a model."""
    table = model_class.__table__
    table_name = table.name
    
    columns = []
    for column in table.columns:
        col_name = column.name
        col_type = get_sqlalchemy_type_to_postgres(column)
        nullable = "" if column.nullable else " NOT NULL"
        default = get_default_clause(column)
        primary = " PRIMARY KEY" if column.primary_key else ""
        
        # Skip complex defaults for simplicity
        if 'gen_random_uuid' in str(default).lower() or 'now()' in str(default).lower():
            if column.primary_key:
                default = " DEFAULT gen_random_uuid()"
            elif 'now' in str(default).lower():
                default = " DEFAULT NOW()"
            else:
                default = ""
        
        columns.append(f"    {col_name} {col_type}{nullable}{default}{primary}")
    
    columns_sql = ",\n".join(columns)
    
    return f"""
-- Table: {table_name}
CREATE TABLE IF NOT EXISTS {table_name} (
{columns_sql}
);
"""


def generate_add_column_sql(model_class):
    """Generate ALTER TABLE ADD COLUMN IF NOT EXISTS for all columns."""
    table = model_class.__table__
    table_name = table.name
    
    statements = []
    for column in table.columns:
        if column.primary_key:
            continue  # Skip primary key columns
            
        col_name = column.name
        col_type = get_sqlalchemy_type_to_postgres(column)
        default = get_default_clause(column)
        
        # Simplify default for ALTER TABLE
        if 'gen_random_uuid' in str(default).lower():
            default = ""
        if 'now()' in str(default).lower():
            default = " DEFAULT NOW()"
        
        statements.append(
            f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}{default};"
        )
    
    return "\n".join(statements)


def main():
    """Generate comprehensive schema sync SQL."""
    
    print("-- ==============================================")
    print("-- JCTC Production Database Schema Synchronization")
    print("-- Generated automatically from SQLAlchemy models")
    print("-- ==============================================")
    print()
    print("-- Run this script on production to sync the database schema")
    print("-- with the local development environment.")
    print()
    
    # Get all mapped classes from Base
    all_models = []
    for mapper in Base.registry.mappers:
        model_class = mapper.class_
        if hasattr(model_class, '__tablename__'):
            all_models.append(model_class)
    
    # Sort by table name for consistent output
    all_models.sort(key=lambda x: x.__tablename__)
    
    print(f"-- Total models found: {len(all_models)}")
    print()
    
    # Step 1: Create all tables that might be missing
    print("-- ==============================================")
    print("-- STEP 1: Create Missing Tables")
    print("-- ==============================================")
    for model in all_models:
        print(generate_create_table_sql(model))
    
    print()
    print("-- ==============================================")
    print("-- STEP 2: Add Missing Columns to Existing Tables")
    print("-- ==============================================")
    for model in all_models:
        print(f"\n-- Columns for: {model.__tablename__}")
        print(generate_add_column_sql(model))
    
    print()
    print("-- ==============================================")
    print("-- STEP 3: Fix Enum Columns (Convert to VARCHAR)")
    print("-- ==============================================")
    print("""
-- Fix any enum type columns that cause type mismatch errors
-- These are preemptively converted to VARCHAR for compatibility

-- devices table
ALTER TABLE devices ALTER COLUMN condition TYPE VARCHAR(50) USING condition::VARCHAR;
ALTER TABLE devices ALTER COLUMN encryption_status TYPE VARCHAR(50) USING encryption_status::VARCHAR;
ALTER TABLE devices ALTER COLUMN imaging_status TYPE VARCHAR(50) USING imaging_status::VARCHAR;
ALTER TABLE devices ALTER COLUMN custody_status TYPE VARCHAR(50) USING custody_status::VARCHAR;
ALTER TABLE devices ALTER COLUMN category TYPE VARCHAR(50) USING category::VARCHAR;
ALTER TABLE devices ALTER COLUMN evidence_type TYPE VARCHAR(100) USING evidence_type::VARCHAR;
ALTER TABLE devices ALTER COLUMN retention_policy TYPE VARCHAR(100) USING retention_policy::VARCHAR;

-- artefacts table
ALTER TABLE artefacts ALTER COLUMN artefact_type TYPE VARCHAR(50) USING artefact_type::VARCHAR;

-- chain_of_custody table
ALTER TABLE chain_of_custody ALTER COLUMN action TYPE VARCHAR(50) USING action::VARCHAR;

-- seizures table
ALTER TABLE seizures ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;
ALTER TABLE seizures ALTER COLUMN warrant_type TYPE VARCHAR(50) USING warrant_type::VARCHAR;

-- legal_instruments table
ALTER TABLE legal_instruments ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR;
ALTER TABLE legal_instruments ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;

-- charges table
ALTER TABLE charges ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;

-- outcomes table
ALTER TABLE outcomes ALTER COLUMN disposition TYPE VARCHAR(50) USING disposition::VARCHAR;

-- cases table
ALTER TABLE cases ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;
ALTER TABLE cases ALTER COLUMN local_or_international TYPE VARCHAR(50) USING local_or_international::VARCHAR;
ALTER TABLE cases ALTER COLUMN intake_channel TYPE VARCHAR(50) USING intake_channel::VARCHAR;
ALTER TABLE cases ALTER COLUMN reporter_type TYPE VARCHAR(50) USING reporter_type::VARCHAR;

-- parties table
ALTER TABLE parties ALTER COLUMN party_type TYPE VARCHAR(50) USING party_type::VARCHAR;
ALTER TABLE parties ALTER COLUMN gender TYPE VARCHAR(20) USING gender::VARCHAR;

-- attachments table
ALTER TABLE attachments ALTER COLUMN classification TYPE VARCHAR(50) USING classification::VARCHAR;
ALTER TABLE attachments ALTER COLUMN virus_scan_status TYPE VARCHAR(50) USING virus_scan_status::VARCHAR;

-- case_collaborations table
ALTER TABLE case_collaborations ALTER COLUMN partner_type TYPE VARCHAR(50) USING partner_type::VARCHAR;
ALTER TABLE case_collaborations ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;

-- users table
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::VARCHAR;
ALTER TABLE users ALTER COLUMN work_activity TYPE VARCHAR(50) USING work_activity::VARCHAR;
""")
    
    print()
    print("-- ==============================================")
    print("-- STEP 4: Drop NOT NULL Constraints on Optional Columns")
    print("-- ==============================================")
    print("""
-- Some columns may have been created with NOT NULL but should be nullable
ALTER TABLE artefacts ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE seizures ALTER COLUMN legal_instrument_id DROP NOT NULL;
ALTER TABLE parties ALTER COLUMN seizure_id DROP NOT NULL;
""")
    
    print()
    print("-- ==============================================")
    print("-- Schema Sync Complete!")
    print("-- ==============================================")


if __name__ == "__main__":
    main()
