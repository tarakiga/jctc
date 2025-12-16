"""Add NDPA compliance tables

Revision ID: ndpa_compliance_001
Revises: hi0123456789
Create Date: 2024-12-14

Creates 6 tables for NDPA (Nigeria Data Protection Act) compliance:
- ndpa_impact_assessments (must be created first due to FK from processing_activities)
- ndpa_consent_records
- ndpa_processing_activities
- ndpa_data_subject_requests
- ndpa_breach_notifications
- ndpa_registration_records
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'ndpa_compliance_001'
down_revision = 'hi0123456789'  # Using current DB state
branch_labels = ('ndpa',)  # Create separate branch to avoid conflict
depends_on = None


def upgrade():
    # 1. Create ndpa_impact_assessments table first (referenced by processing_activities)
    op.create_table(
        'ndpa_impact_assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assessment_id', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('assessment_name', sa.String(255), nullable=False),
        sa.Column('processing_activity', sa.String(255), nullable=False),
        
        # Assessment details
        sa.Column('assessment_date', sa.Date, nullable=False, index=True),
        sa.Column('assessor_name', sa.String(255), nullable=False),
        sa.Column('assessor_role', sa.String(100), nullable=False),
        
        # Risk assessment triggers
        sa.Column('high_risk_processing', sa.Boolean, nullable=False),
        sa.Column('systematic_monitoring', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('large_scale_processing', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('sensitive_data_processing', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('automated_decision_making', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('public_area_monitoring', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('vulnerable_subjects', sa.Boolean, nullable=False, server_default='false'),
        
        # Assessment content
        sa.Column('necessity_assessment', sa.Text, nullable=False),
        sa.Column('proportionality_assessment', sa.Text, nullable=False),
        sa.Column('data_minimization_measures', sa.Text, nullable=False),
        
        # Risk identification (arrays)
        sa.Column('risks_identified', postgresql.ARRAY(sa.String(255)), nullable=False),
        sa.Column('risk_likelihood', postgresql.ARRAY(sa.String(20)), nullable=False),
        sa.Column('risk_severity', postgresql.ARRAY(sa.String(20)), nullable=False),
        
        # Risk mitigation
        sa.Column('risk_mitigation_measures', postgresql.ARRAY(sa.String(255)), nullable=False),
        sa.Column('residual_risks', postgresql.ARRAY(sa.String(255)), nullable=True),
        sa.Column('residual_risk_acceptance', sa.Text, nullable=True),
        
        # Consultation requirements
        sa.Column('consultation_required', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('consultation_date', sa.Date, nullable=True),
        sa.Column('consultation_outcome', sa.Text, nullable=True),
        sa.Column('nitda_guidance_received', sa.Boolean, nullable=False, server_default='false'),
        
        # Approval and monitoring
        sa.Column('approval_status', sa.String(50), nullable=False, server_default='DRAFT', index=True),
        sa.Column('approved_by', sa.String(255), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_date', sa.Date, nullable=False),
        sa.Column('next_review_date', sa.Date, nullable=False),
        
        # Monitoring
        sa.Column('monitoring_measures', postgresql.ARRAY(sa.String(255)), nullable=True),
        sa.Column('monitoring_frequency', sa.String(50), nullable=True),
        sa.Column('effectiveness_review_date', sa.Date, nullable=True),
        
        # Audit fields
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Indexes for impact_assessments
    op.create_index('ix_ndpa_dpia_status_date', 'ndpa_impact_assessments', ['approval_status', sa.text('assessment_date DESC')])
    op.create_index('ix_ndpa_dpia_review_dates', 'ndpa_impact_assessments', ['review_date', 'next_review_date'])
    op.create_index('ix_ndpa_dpia_high_risk', 'ndpa_impact_assessments', ['high_risk_processing', 'consultation_required'])

    # 2. Create ndpa_consent_records table
    op.create_table(
        'ndpa_consent_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Data subject information
        sa.Column('data_subject_id', sa.String(255), nullable=False, index=True),
        sa.Column('data_subject_name', sa.String(255), nullable=True),
        sa.Column('data_subject_email', sa.String(255), nullable=True),
        sa.Column('data_subject_phone', sa.String(50), nullable=True),
        
        # Consent details
        sa.Column('consent_type', sa.String(50), nullable=False, index=True),
        sa.Column('processing_purpose', sa.String(100), nullable=False, index=True),
        sa.Column('data_categories', postgresql.ARRAY(sa.String(50)), nullable=False),
        
        # Consent metadata
        sa.Column('consent_given_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('consent_text', sa.Text, nullable=False),
        sa.Column('consent_method', sa.String(50), nullable=False),
        sa.Column('withdrawal_method', sa.String(255), nullable=True),
        
        # Consent status
        sa.Column('is_withdrawn', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('withdrawal_reason', sa.Text, nullable=True),
        
        # Processing details
        sa.Column('retention_period', sa.String(50), nullable=False),
        sa.Column('third_party_sharing', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('third_parties', postgresql.ARRAY(sa.String(255)), nullable=True),
        sa.Column('cross_border_transfer', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('transfer_countries', postgresql.ARRAY(sa.String(100)), nullable=True),
        
        # Audit fields
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Indexes for consent_records
    op.create_index('ix_ndpa_consent_data_subject_purpose', 'ndpa_consent_records', ['data_subject_id', 'processing_purpose'])
    op.create_index('ix_ndpa_consent_status', 'ndpa_consent_records', ['is_withdrawn', 'consent_given_at'])
    op.create_index('ix_ndpa_consent_cross_border', 'ndpa_consent_records', ['cross_border_transfer', 'third_party_sharing'])

    # 3. Create ndpa_processing_activities table
    op.create_table(
        'ndpa_processing_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Processing identification
        sa.Column('processing_id', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('activity_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        
        # Data controller information
        sa.Column('data_controller', sa.String(255), nullable=False),
        sa.Column('controller_contact', sa.String(255), nullable=True),
        sa.Column('joint_controllers', postgresql.ARRAY(sa.String(255)), nullable=True),
        
        # Processing details
        sa.Column('processing_purpose', sa.String(100), nullable=False, index=True),
        sa.Column('lawful_basis', sa.String(100), nullable=False),
        sa.Column('lawful_basis_description', sa.Text, nullable=True),
        
        # Data categories
        sa.Column('data_categories', postgresql.ARRAY(sa.String(50)), nullable=False),
        sa.Column('sensitive_data_categories', postgresql.ARRAY(sa.String(50)), nullable=True),
        sa.Column('data_subjects_categories', postgresql.ARRAY(sa.String(100)), nullable=False),
        
        # Recipients and transfers
        sa.Column('recipients', postgresql.ARRAY(sa.String(255)), nullable=True),
        sa.Column('third_country_transfers', postgresql.ARRAY(sa.String(100)), nullable=True),
        sa.Column('transfer_safeguards', sa.Text, nullable=True),
        
        # Retention and security
        sa.Column('retention_period', sa.String(50), nullable=False),
        sa.Column('retention_criteria', sa.Text, nullable=True),
        sa.Column('security_measures', postgresql.ARRAY(sa.String(255)), nullable=False),
        
        # Compliance status
        sa.Column('is_high_risk', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('dpia_required', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('dpia_completed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('dpia_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ndpa_impact_assessments.id'), nullable=True),
        
        # Registration status
        sa.Column('registered_with_nitda', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('nitda_registration_number', sa.String(100), nullable=True),
        sa.Column('registration_date', sa.Date, nullable=True),
        
        # Audit fields
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Indexes for processing_activities
    op.create_index('ix_ndpa_processing_purpose_lawful', 'ndpa_processing_activities', ['processing_purpose', 'lawful_basis'])
    op.create_index('ix_ndpa_processing_risk_status', 'ndpa_processing_activities', ['is_high_risk', 'dpia_required'])
    op.create_index('ix_ndpa_processing_registration', 'ndpa_processing_activities', ['registered_with_nitda', 'registration_date'])

    # 4. Create ndpa_data_subject_requests table
    op.create_table(
        'ndpa_data_subject_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Request identification
        sa.Column('request_id', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('request_type', sa.String(50), nullable=False, index=True),
        
        # Data subject information
        sa.Column('data_subject_id', sa.String(255), nullable=False, index=True),
        sa.Column('data_subject_name', sa.String(255), nullable=False),
        sa.Column('data_subject_email', sa.String(255), nullable=True),
        sa.Column('data_subject_phone', sa.String(50), nullable=True),
        
        # Request details
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('specific_data_requested', postgresql.ARRAY(sa.String(255)), nullable=True),
        sa.Column('reason_for_request', sa.Text, nullable=True),
        
        # Request processing
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('submission_method', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='PENDING', index=True),
        
        # Response timeline (30 days under NDPA)
        sa.Column('response_due_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('response_provided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response_method', sa.String(50), nullable=True),
        
        # Identity verification
        sa.Column('verification_method', sa.String(100), nullable=False),
        sa.Column('verification_completed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('verification_date', sa.DateTime(timezone=True), nullable=True),
        
        # Response details
        sa.Column('response_details', sa.Text, nullable=True),
        sa.Column('data_provided', postgresql.JSON, nullable=True),
        sa.Column('actions_taken', postgresql.ARRAY(sa.String(255)), nullable=True),
        
        # Additional information
        sa.Column('additional_info_required', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('additional_info_requested', sa.Text, nullable=True),
        sa.Column('additional_info_provided', sa.Text, nullable=True),
        
        # Fee information
        sa.Column('fee_required', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('fee_amount', sa.Float, nullable=True),
        sa.Column('fee_currency', sa.String(10), nullable=True, server_default='NGN'),
        sa.Column('fee_paid', sa.Boolean, nullable=False, server_default='false'),
        
        # Audit fields
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Indexes for data_subject_requests
    op.create_index('ix_ndpa_dsr_type_status', 'ndpa_data_subject_requests', ['request_type', 'status'])
    op.create_index('ix_ndpa_dsr_due_date', 'ndpa_data_subject_requests', ['response_due_date', 'status'])
    op.create_index('ix_ndpa_dsr_verification', 'ndpa_data_subject_requests', ['verification_completed', 'verification_date'])

    # 5. Create ndpa_breach_notifications table
    op.create_table(
        'ndpa_breach_notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Breach identification
        sa.Column('breach_id', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('breach_type', sa.String(100), nullable=False, index=True),
        sa.Column('severity_level', sa.String(20), nullable=False, index=True),
        
        # Breach timeline
        sa.Column('breach_occurred_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('breach_discovered_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('breach_contained_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('breach_resolved_at', sa.DateTime(timezone=True), nullable=True),
        
        # Affected data
        sa.Column('data_categories_affected', postgresql.ARRAY(sa.String(50)), nullable=False),
        sa.Column('number_of_data_subjects', sa.Integer, nullable=False),
        sa.Column('data_subjects_notifiable', sa.Boolean, nullable=False, server_default='true'),
        
        # Breach description
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('cause', sa.Text, nullable=False),
        sa.Column('likely_consequences', sa.Text, nullable=False),
        sa.Column('measures_taken', sa.Text, nullable=False),
        sa.Column('preventive_measures', sa.Text, nullable=True),
        
        # NITDA notification (72 hours requirement)
        sa.Column('notified_to_nitda', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('nitda_notification_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('nitda_notification_method', sa.String(50), nullable=True),
        sa.Column('nitda_reference_number', sa.String(100), nullable=True),
        sa.Column('nitda_response', sa.Text, nullable=True),
        
        # Data subject notification
        sa.Column('data_subjects_notified', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('notification_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notification_method', sa.String(50), nullable=True),
        sa.Column('notification_delay_justification', sa.Text, nullable=True),
        
        # Remedial actions
        sa.Column('remedial_actions', postgresql.ARRAY(sa.String(255)), nullable=False),
        sa.Column('remedial_actions_completed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('lessons_learned', sa.Text, nullable=True),
        
        # Status tracking
        sa.Column('breach_resolved', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('investigation_completed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('regulatory_action_required', sa.Boolean, nullable=False, server_default='false'),
        
        # Audit fields
        sa.Column('reported_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Indexes for breach_notifications
    op.create_index('ix_ndpa_breach_severity_date', 'ndpa_breach_notifications', ['severity_level', sa.text('breach_occurred_at DESC')])
    op.create_index('ix_ndpa_breach_nitda_notification', 'ndpa_breach_notifications', ['notified_to_nitda', 'nitda_notification_date'])
    op.create_index('ix_ndpa_breach_status', 'ndpa_breach_notifications', ['breach_resolved', 'investigation_completed'])

    # 6. Create ndpa_registration_records table
    op.create_table(
        'ndpa_registration_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Organization details
        sa.Column('organization_name', sa.String(255), nullable=False),
        sa.Column('organization_type', sa.String(100), nullable=False),
        sa.Column('business_registration_number', sa.String(100), nullable=True),
        
        # Contact information
        sa.Column('contact_person', sa.String(255), nullable=False),
        sa.Column('contact_email', sa.String(255), nullable=False),
        sa.Column('contact_phone', sa.String(50), nullable=False),
        sa.Column('physical_address', sa.Text, nullable=False),
        
        # Data Protection Officer
        sa.Column('dpo_appointed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('dpo_name', sa.String(255), nullable=True),
        sa.Column('dpo_email', sa.String(255), nullable=True),
        sa.Column('dpo_certification', sa.String(255), nullable=True),
        
        # Registration details
        sa.Column('registration_number', sa.String(100), nullable=True, unique=True),
        sa.Column('registration_status', sa.String(50), nullable=False, server_default='PENDING', index=True),
        sa.Column('registration_date', sa.Date, nullable=True, index=True),
        sa.Column('renewal_due_date', sa.Date, nullable=True, index=True),
        
        # Processing activities
        sa.Column('processing_activities_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('high_risk_processing', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('cross_border_transfers', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('third_country_list', postgresql.ARRAY(sa.String(100)), nullable=True),
        
        # Compliance status
        sa.Column('compliance_score', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('last_assessment_date', sa.Date, nullable=True),
        sa.Column('next_assessment_date', sa.Date, nullable=True),
        sa.Column('violations_count', sa.Integer, nullable=False, server_default='0'),
        
        # Fees and payments
        sa.Column('registration_fee_paid', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('fee_amount', sa.Float, nullable=True),
        sa.Column('fee_currency', sa.String(10), nullable=False, server_default='NGN'),
        sa.Column('payment_date', sa.Date, nullable=True),
        
        # Audit fields
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    
    # Indexes for registration_records
    op.create_index('ix_ndpa_registration_status_date', 'ndpa_registration_records', ['registration_status', 'registration_date'])
    op.create_index('ix_ndpa_registration_renewal', 'ndpa_registration_records', ['renewal_due_date', 'registration_status'])
    op.create_index('ix_ndpa_registration_compliance', 'ndpa_registration_records', ['compliance_score', 'last_assessment_date'])


def downgrade():
    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_table('ndpa_registration_records')
    op.drop_table('ndpa_breach_notifications')
    op.drop_table('ndpa_data_subject_requests')
    op.drop_table('ndpa_processing_activities')
    op.drop_table('ndpa_consent_records')
    op.drop_table('ndpa_impact_assessments')
