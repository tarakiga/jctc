-- ==============================================
-- JCTC Production Database Schema Synchronization
-- Comprehensive One-Time Sync Script
-- ==============================================
-- This script brings the production database in sync
-- with all local SQLAlchemy model definitions.
-- ==============================================

-- STEP 1: CREATE MISSING TABLES
-- ==============================================

-- Notification subsystem tables
CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    categories JSON,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start VARCHAR(5) DEFAULT '22:00',
    quiet_hours_end VARCHAR(5) DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    digest_enabled BOOLEAN DEFAULT FALSE,
    digest_frequency VARCHAR(20) DEFAULT 'daily',
    digest_time VARCHAR(5) DEFAULT '09:00',
    email_address VARCHAR(255),
    phone_number VARCHAR(20),
    push_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    variables JSON,
    default_channels JSON,
    default_priority VARCHAR(20) DEFAULT 'MEDIUM',
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    conditions JSON,
    template_id VARCHAR(255),
    target_roles JSON,
    target_users JSON,
    trigger_delay INTEGER DEFAULT 0,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_interval VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id VARCHAR(255) PRIMARY KEY,
    notification_id VARCHAR(255),
    channel VARCHAR(20) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    external_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_digests (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    notification_count INTEGER DEFAULT 0,
    notification_ids JSON,
    digest_content TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports subsystem tables
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    query_config JSON,
    visualization_config JSON,
    schedule VARCHAR(100),
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    template_config JSON,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    schedule_expression VARCHAR(100),
    next_execution TIMESTAMP WITH TIME ZONE,
    last_execution TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    recipients JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    result_path VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    user_id UUID,
    role_id VARCHAR(100),
    permission_level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    views INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    shared_by UUID,
    shared_with UUID,
    share_type VARCHAR(50),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    user_id UUID,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Task management subsystem tables
CREATE TABLE IF NOT EXISTS task_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_hours DOUBLE PRECISION,
    checklist_items JSON,
    required_fields JSON,
    default_assignee_role VARCHAR(50),
    workflow_template_id VARCHAR(255),
    auto_assign BOOLEAN DEFAULT FALSE,
    auto_start BOOLEAN DEFAULT FALSE,
    prerequisite_tasks JSON,
    follow_up_tasks JSON,
    usage_count INTEGER DEFAULT 0,
    success_rate DOUBLE PRECISION DEFAULT 0.0,
    average_completion_hours DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    tags JSON,
    created_by VARCHAR(255),
    organization_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS workflow_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    steps JSON NOT NULL,
    triggers JSON,
    conditions JSON,
    parallel_execution BOOLEAN DEFAULT FALSE,
    sla_hours INTEGER,
    warning_hours INTEGER,
    escalation_rules JSON,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE,
    allows_skipping BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    success_rate DOUBLE PRECISION DEFAULT 0.0,
    average_execution_hours DOUBLE PRECISION,
    created_by VARCHAR(255),
    organization_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255),
    template_id VARCHAR(255),
    current_step_index INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    progress_percentage DOUBLE PRECISION DEFAULT 0.0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    execution_context JSON,
    step_results JSON,
    error_log JSON,
    total_execution_time_minutes INTEGER,
    steps_completed INTEGER DEFAULT 0,
    steps_skipped INTEGER DEFAULT 0,
    steps_failed INTEGER DEFAULT 0,
    initiated_by VARCHAR(255),
    current_assignee VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id VARCHAR(255) PRIMARY KEY,
    workflow_instance_id VARCHAR(255),
    step_name VARCHAR(255) NOT NULL,
    step_index INTEGER NOT NULL,
    step_type VARCHAR(50),
    required_role VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    input_data JSON,
    output_data JSON,
    notes TEXT,
    attachments JSON,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_slas (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    sla_hours INTEGER NOT NULL,
    warning_hours INTEGER NOT NULL,
    business_hours_only BOOLEAN DEFAULT FALSE,
    exclude_weekends BOOLEAN DEFAULT FALSE,
    exclude_holidays BOOLEAN DEFAULT FALSE,
    auto_escalate BOOLEAN DEFAULT FALSE,
    escalation_hours INTEGER,
    escalation_target_role VARCHAR(50),
    escalation_message TEXT,
    conditions JSON,
    exceptions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_sla BOOLEAN DEFAULT FALSE,
    organization_id VARCHAR(255),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS sla_violations (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255),
    sla_config_id VARCHAR(255),
    case_id VARCHAR(255),
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    violation_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hours_overdue DOUBLE PRECISION NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    violation_type VARCHAR(50) DEFAULT 'sla_breach',
    status VARCHAR(20) DEFAULT 'open',
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    escalation_level VARCHAR(20) DEFAULT 'level_0',
    last_escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to VARCHAR(255),
    escalation_count INTEGER DEFAULT 0,
    resolution_notes TEXT,
    resolution_actions JSON,
    prevention_measures TEXT,
    business_impact VARCHAR(20),
    cost_impact DOUBLE PRECISION,
    customer_impact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_escalations (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255),
    case_id VARCHAR(255),
    reason VARCHAR(50) NOT NULL,
    trigger_event VARCHAR(100),
    description TEXT NOT NULL,
    escalated_from VARCHAR(255),
    escalated_to VARCHAR(255) NOT NULL,
    escalated_by VARCHAR(255) NOT NULL,
    escalation_level VARCHAR(20) NOT NULL,
    old_priority VARCHAR(20),
    new_priority VARCHAR(20),
    old_due_date TIMESTAMP WITH TIME ZONE,
    new_due_date TIMESTAMP WITH TIME ZONE,
    additional_resources JSON,
    status VARCHAR(20) DEFAULT 'active',
    escalation_resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    was_effective BOOLEAN,
    impact_on_resolution TEXT,
    lessons_learned TEXT,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_dependencies (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    depends_on_task_id VARCHAR(255) NOT NULL,
    dependency_type VARCHAR(20) DEFAULT 'finish_to_start',
    lag_hours INTEGER DEFAULT 0,
    is_optional BOOLEAN DEFAULT FALSE,
    is_satisfied BOOLEAN DEFAULT FALSE,
    satisfied_at TIMESTAMP WITH TIME ZONE,
    can_override BOOLEAN DEFAULT FALSE,
    overridden_by VARCHAR(255),
    overridden_at TIMESTAMP WITH TIME ZONE,
    override_reason TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_comments (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'note',
    is_internal BOOLEAN DEFAULT TRUE,
    is_system_comment BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'team',
    mentioned_users JSON,
    attachments JSON,
    parent_comment_id VARCHAR(255),
    thread_id VARCHAR(255),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    reactions JSON,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    edit_history JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_time_entries (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    is_running BOOLEAN DEFAULT FALSE,
    work_description TEXT,
    activity_type VARCHAR(50),
    work_category VARCHAR(50),
    is_billable BOOLEAN DEFAULT FALSE,
    hourly_rate DOUBLE PRECISION,
    billing_amount DOUBLE PRECISION,
    billing_notes TEXT,
    break_duration_minutes INTEGER DEFAULT 0,
    break_reasons JSON,
    productivity_score DOUBLE PRECISION,
    focus_interruptions INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- NDPA Compliance tables
CREATE TABLE IF NOT EXISTS ndpa_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id VARCHAR(255),
    purpose VARCHAR(255),
    legal_basis VARCHAR(100),
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    data_categories JSON,
    processing_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ndpa_processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    purpose VARCHAR(255),
    legal_basis VARCHAR(100),
    data_categories JSON,
    data_subjects JSON,
    recipients JSON,
    retention_period VARCHAR(100),
    security_measures TEXT,
    cross_border_transfers BOOLEAN DEFAULT FALSE,
    transfer_safeguards TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ndpa_data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id VARCHAR(255),
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    response TEXT,
    handled_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ndpa_breach_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_date TIMESTAMP WITH TIME ZONE,
    discovery_date TIMESTAMP WITH TIME ZONE,
    notification_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    data_affected JSON,
    subjects_affected INTEGER,
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'open',
    remediation_steps TEXT,
    notified_authority BOOLEAN DEFAULT FALSE,
    notified_subjects BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ndpa_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    processing_activity_id UUID,
    risk_level VARCHAR(50),
    risks_identified JSON,
    mitigations JSON,
    status VARCHAR(50) DEFAULT 'draft',
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ndpa_registration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number VARCHAR(100),
    organization_name VARCHAR(255),
    registration_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    dpo_name VARCHAR(255),
    dpo_contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Mobile subsystem tables
CREATE TABLE IF NOT EXISTS mobile_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    os_type VARCHAR(50),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    push_token VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS mobile_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS mobile_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID,
    user_id UUID,
    title VARCHAR(255),
    body TEXT,
    data JSON,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID,
    user_id UUID,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'in_progress',
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_log JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_session_id UUID,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    local_data JSON,
    server_data JSON,
    resolution VARCHAR(50),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID,
    metric_type VARCHAR(100),
    metric_value DOUBLE PRECISION,
    metadata JSON,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_offline_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID,
    user_id UUID,
    action_type VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    payload JSON,
    status VARCHAR(50) DEFAULT 'pending',
    synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preferences JSON,
    sync_settings JSON,
    notification_settings JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Organizations table (referenced by task management)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- STEP 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- ==============================================

-- Tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_template_id VARCHAR(255);

-- Users table - notification relationships
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences_id VARCHAR(255);

-- ==============================================
-- STEP 3: FIX ENUM COLUMNS (Convert to VARCHAR)
-- ==============================================

-- devices table
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN condition TYPE VARCHAR(50) USING condition::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN encryption_status TYPE VARCHAR(50) USING encryption_status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN imaging_status TYPE VARCHAR(50) USING imaging_status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN custody_status TYPE VARCHAR(50) USING custody_status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN category TYPE VARCHAR(50) USING category::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN evidence_type TYPE VARCHAR(100) USING evidence_type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE devices ALTER COLUMN retention_policy TYPE VARCHAR(100) USING retention_policy::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- artefacts table
DO $$ BEGIN ALTER TABLE artefacts ALTER COLUMN artefact_type TYPE VARCHAR(50) USING artefact_type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- chain_of_custody table
DO $$ BEGIN ALTER TABLE chain_of_custody ALTER COLUMN action TYPE VARCHAR(50) USING action::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- seizures table
DO $$ BEGIN ALTER TABLE seizures ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE seizures ALTER COLUMN warrant_type TYPE VARCHAR(50) USING warrant_type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- legal_instruments table
DO $$ BEGIN ALTER TABLE legal_instruments ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE legal_instruments ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- charges table
DO $$ BEGIN ALTER TABLE charges ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- outcomes table
DO $$ BEGIN ALTER TABLE outcomes ALTER COLUMN disposition TYPE VARCHAR(50) USING disposition::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- cases table
DO $$ BEGIN ALTER TABLE cases ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cases ALTER COLUMN local_or_international TYPE VARCHAR(50) USING local_or_international::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cases ALTER COLUMN intake_channel TYPE VARCHAR(50) USING intake_channel::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cases ALTER COLUMN reporter_type TYPE VARCHAR(50) USING reporter_type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- parties table
DO $$ BEGIN ALTER TABLE parties ALTER COLUMN party_type TYPE VARCHAR(50) USING party_type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE parties ALTER COLUMN gender TYPE VARCHAR(20) USING gender::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- attachments table
DO $$ BEGIN ALTER TABLE attachments ALTER COLUMN classification TYPE VARCHAR(50) USING classification::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE attachments ALTER COLUMN virus_scan_status TYPE VARCHAR(50) USING virus_scan_status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- case_collaborations table
DO $$ BEGIN ALTER TABLE case_collaborations ALTER COLUMN partner_type TYPE VARCHAR(50) USING partner_type::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE case_collaborations ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- users table
DO $$ BEGIN ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ALTER COLUMN work_activity TYPE VARCHAR(50) USING work_activity::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- audit_logs table
DO $$ BEGIN ALTER TABLE audit_logs ALTER COLUMN severity TYPE VARCHAR(50) USING severity::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- compliance_violations table
DO $$ BEGIN ALTER TABLE compliance_violations ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================
-- STEP 4: FIX NOT NULL CONSTRAINTS
-- ==============================================

ALTER TABLE artefacts ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE seizures ALTER COLUMN legal_instrument_id DROP NOT NULL;
ALTER TABLE parties ALTER COLUMN seizure_id DROP NOT NULL;

-- ==============================================
-- SCHEMA SYNC COMPLETE!
-- ==============================================
