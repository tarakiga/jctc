"""
SQLAlchemy models for NDPA (Nigeria Data Protection Act) compliance.

This module defines the database models for:
- NDPA consent management and tracking
- Data processing activity records
- Data subject rights requests
- Breach notification management
- NITDA registration and compliance tracking
- Data Protection Impact Assessments (DPIA)
"""

import uuid
import json
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any

from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, Float, JSON, Index, ForeignKey, Date, ARRAY
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator, TEXT

from app.database.base_class import Base


# Custom types for NDPA-specific enums
class NDPAEnum(TypeDecorator):
    """Custom enum type for NDPA-specific enumerations."""
    impl = TEXT
    cache_ok = True

    def __init__(self, enum_class, **kw):
        self.enum_class = enum_class
        super().__init__(**kw)

    def process_bind_param(self, value, dialect):
        if value is not None:
            return value.value if hasattr(value, 'value') else str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return self.enum_class(value)
        return value


class NDPAConsentRecord(Base):
    """
    NDPA consent records for data processing activities.
    
    Tracks consent given by data subjects for specific processing purposes
    in compliance with NDPA requirements for lawful processing.
    """
    __tablename__ = "ndpa_consent_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Data subject information
    data_subject_id = Column(String(255), nullable=False, index=True)
    data_subject_name = Column(String(255), nullable=True)
    data_subject_email = Column(String(255), nullable=True)
    data_subject_phone = Column(String(50), nullable=True)
    
    # Consent details
    consent_type = Column(String(50), nullable=False, index=True)  # EXPRESS_CONSENT, IMPLIED_CONSENT, etc.
    processing_purpose = Column(String(100), nullable=False, index=True)  # CRIMINAL_INVESTIGATION, etc.
    data_categories = Column(ARRAY(String(50)), nullable=False)  # PERSONAL_DATA, CRIMINAL_DATA, etc.
    
    # Consent metadata
    consent_given_at = Column(DateTime(timezone=True), nullable=False, index=True)
    consent_text = Column(Text, nullable=False)
    consent_method = Column(String(50), nullable=False)  # WEB_FORM, WRITTEN, VERBAL, etc.
    withdrawal_method = Column(String(255), nullable=True)
    
    # Consent status
    is_withdrawn = Column(Boolean, nullable=False, default=False, index=True)
    withdrawn_at = Column(DateTime(timezone=True), nullable=True)
    withdrawal_reason = Column(Text, nullable=True)
    
    # Processing details
    retention_period = Column(String(50), nullable=False)  # 1_YEAR, 3_YEARS, etc.
    third_party_sharing = Column(Boolean, nullable=False, default=False)
    third_parties = Column(ARRAY(String(255)), nullable=True)
    cross_border_transfer = Column(Boolean, nullable=False, default=False)
    transfer_countries = Column(ARRAY(String(100)), nullable=True)
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="ndpa_consent_records")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_ndpa_consent_data_subject_purpose', data_subject_id, processing_purpose),
        Index('ix_ndpa_consent_status', is_withdrawn, consent_given_at),
        Index('ix_ndpa_consent_cross_border', cross_border_transfer, third_party_sharing),
    )
    
    @hybrid_property
    def is_valid(self):
        """Check if consent is currently valid (not withdrawn and not expired)."""
        if self.is_withdrawn:
            return False
        # Add expiration logic based on retention period if needed
        return True
    
    def withdraw_consent(self, reason: str = None):
        """Withdraw consent with optional reason."""
        self.is_withdrawn = True
        self.withdrawn_at = datetime.utcnow()
        self.withdrawal_reason = reason


class NDPADataProcessingActivity(Base):
    """
    NDPA data processing activity records.
    
    Maintains records of all data processing activities as required
    by NDPA Article 29 (Record of Processing Activities).
    """
    __tablename__ = "ndpa_processing_activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Processing identification
    processing_id = Column(String(100), nullable=False, unique=True, index=True)
    activity_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Data controller information
    data_controller = Column(String(255), nullable=False)
    controller_contact = Column(String(255), nullable=True)
    joint_controllers = Column(ARRAY(String(255)), nullable=True)
    
    # Processing details
    processing_purpose = Column(String(100), nullable=False, index=True)
    lawful_basis = Column(String(100), nullable=False)
    lawful_basis_description = Column(Text, nullable=True)
    
    # Data categories
    data_categories = Column(ARRAY(String(50)), nullable=False)
    sensitive_data_categories = Column(ARRAY(String(50)), nullable=True)
    data_subjects_categories = Column(ARRAY(String(100)), nullable=False)
    
    # Recipients and transfers
    recipients = Column(ARRAY(String(255)), nullable=True)
    third_country_transfers = Column(ARRAY(String(100)), nullable=True)
    transfer_safeguards = Column(Text, nullable=True)
    
    # Retention and security
    retention_period = Column(String(50), nullable=False)
    retention_criteria = Column(Text, nullable=True)
    security_measures = Column(ARRAY(String(255)), nullable=False)
    
    # Compliance status
    is_high_risk = Column(Boolean, nullable=False, default=False)
    dpia_required = Column(Boolean, nullable=False, default=False)
    dpia_completed = Column(Boolean, nullable=False, default=False)
    dpia_id = Column(UUID(as_uuid=True), ForeignKey("ndpa_impact_assessments.id"), nullable=True)
    
    # Registration status
    registered_with_nitda = Column(Boolean, nullable=False, default=False)
    nitda_registration_number = Column(String(100), nullable=True)
    registration_date = Column(Date, nullable=True)
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="ndpa_processing_activities")
    dpia = relationship("NDPAImpactAssessment", back_populates="processing_activities")
    
    # Indexes
    __table_args__ = (
        Index('ix_ndpa_processing_purpose_lawful', processing_purpose, lawful_basis),
        Index('ix_ndpa_processing_risk_status', is_high_risk, dpia_required),
        Index('ix_ndpa_processing_registration', registered_with_nitda, registration_date),
    )
    
    def assess_risk_level(self) -> str:
        """Assess the risk level of the processing activity."""
        risk_factors = []
        
        if any('SENSITIVE' in cat or 'BIOMETRIC' in cat or 'CRIMINAL' in cat 
               for cat in (self.data_categories or [])):
            risk_factors.append("sensitive_data")
        
        if self.third_country_transfers:
            risk_factors.append("cross_border_transfer")
        
        if len(self.data_subjects_categories or []) > 5:
            risk_factors.append("large_scale")
        
        if len(risk_factors) >= 2:
            return "HIGH"
        elif len(risk_factors) == 1:
            return "MEDIUM"
        else:
            return "LOW"


class NDPADataSubjectRequest(Base):
    """
    NDPA data subject rights requests.
    
    Tracks requests from data subjects exercising their rights
    under NDPA (access, rectification, erasure, etc.).
    """
    __tablename__ = "ndpa_data_subject_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Request identification
    request_id = Column(String(100), nullable=False, unique=True, index=True)
    request_type = Column(String(50), nullable=False, index=True)  # ACCESS, RECTIFICATION, etc.
    
    # Data subject information
    data_subject_id = Column(String(255), nullable=False, index=True)
    data_subject_name = Column(String(255), nullable=False)
    data_subject_email = Column(String(255), nullable=True)
    data_subject_phone = Column(String(50), nullable=True)
    
    # Request details
    description = Column(Text, nullable=False)
    specific_data_requested = Column(ARRAY(String(255)), nullable=True)
    reason_for_request = Column(Text, nullable=True)
    
    # Request processing
    submitted_at = Column(DateTime(timezone=True), nullable=False, index=True)
    submission_method = Column(String(50), nullable=False)  # EMAIL, WEB_FORM, WRITTEN, etc.
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    
    # Response timeline (30 days under NDPA)
    response_due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    response_provided_at = Column(DateTime(timezone=True), nullable=True)
    response_method = Column(String(50), nullable=True)
    
    # Identity verification
    verification_method = Column(String(100), nullable=False)
    verification_completed = Column(Boolean, nullable=False, default=False)
    verification_date = Column(DateTime(timezone=True), nullable=True)
    
    # Response details
    response_details = Column(Text, nullable=True)
    data_provided = Column(JSON, nullable=True)  # For access requests
    actions_taken = Column(ARRAY(String(255)), nullable=True)
    
    # Additional information
    additional_info_required = Column(Boolean, nullable=False, default=False)
    additional_info_requested = Column(Text, nullable=True)
    additional_info_provided = Column(Text, nullable=True)
    
    # Fee information (if applicable)
    fee_required = Column(Boolean, nullable=False, default=False)
    fee_amount = Column(Float, nullable=True)
    fee_currency = Column(String(10), nullable=True, default="NGN")
    fee_paid = Column(Boolean, nullable=False, default=False)
    
    # Audit fields
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    assignee = relationship("User", back_populates="ndpa_data_subject_requests")
    
    # Indexes
    __table_args__ = (
        Index('ix_ndpa_dsr_type_status', request_type, status),
        Index('ix_ndpa_dsr_due_date', response_due_date, status),
        Index('ix_ndpa_dsr_verification', verification_completed, verification_date),
    )
    
    @hybrid_property
    def is_overdue(self):
        """Check if the request response is overdue."""
        if self.status in ["COMPLETED", "REJECTED"]:
            return False
        return datetime.utcnow() > self.response_due_date
    
    @hybrid_property
    def days_until_due(self):
        """Calculate days until response is due."""
        if self.status in ["COMPLETED", "REJECTED"]:
            return 0
        return (self.response_due_date - datetime.utcnow()).days
    
    def complete_request(self, response_details: str, actions_taken: List[str] = None):
        """Mark request as completed."""
        self.status = "COMPLETED"
        self.response_provided_at = datetime.utcnow()
        self.response_details = response_details
        if actions_taken:
            self.actions_taken = actions_taken


class NDPABreachNotification(Base):
    """
    NDPA data breach notifications.
    
    Manages data breach notifications in compliance with NDPA
    requirements for reporting to NITDA and affected data subjects.
    """
    __tablename__ = "ndpa_breach_notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Breach identification
    breach_id = Column(String(100), nullable=False, unique=True, index=True)
    breach_type = Column(String(100), nullable=False, index=True)
    severity_level = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Breach timeline
    breach_occurred_at = Column(DateTime(timezone=True), nullable=False, index=True)
    breach_discovered_at = Column(DateTime(timezone=True), nullable=False, index=True)
    breach_contained_at = Column(DateTime(timezone=True), nullable=True)
    breach_resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Affected data
    data_categories_affected = Column(ARRAY(String(50)), nullable=False)
    number_of_data_subjects = Column(Integer, nullable=False)
    data_subjects_notifiable = Column(Boolean, nullable=False, default=True)
    
    # Breach description
    description = Column(Text, nullable=False)
    cause = Column(Text, nullable=False)
    likely_consequences = Column(Text, nullable=False)
    measures_taken = Column(Text, nullable=False)
    preventive_measures = Column(Text, nullable=True)
    
    # NITDA notification (72 hours requirement)
    notified_to_nitda = Column(Boolean, nullable=False, default=False)
    nitda_notification_date = Column(DateTime(timezone=True), nullable=True)
    nitda_notification_method = Column(String(50), nullable=True)
    nitda_reference_number = Column(String(100), nullable=True)
    nitda_response = Column(Text, nullable=True)
    
    # Data subject notification
    data_subjects_notified = Column(Boolean, nullable=False, default=False)
    notification_date = Column(DateTime(timezone=True), nullable=True)
    notification_method = Column(String(50), nullable=True)
    notification_delay_justification = Column(Text, nullable=True)
    
    # Remedial actions
    remedial_actions = Column(ARRAY(String(255)), nullable=False)
    remedial_actions_completed = Column(Boolean, nullable=False, default=False)
    lessons_learned = Column(Text, nullable=True)
    
    # Status tracking
    breach_resolved = Column(Boolean, nullable=False, default=False)
    investigation_completed = Column(Boolean, nullable=False, default=False)
    regulatory_action_required = Column(Boolean, nullable=False, default=False)
    
    # Audit fields
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    reporter = relationship("User", back_populates="ndpa_breach_notifications")
    
    # Indexes
    __table_args__ = (
        Index('ix_ndpa_breach_severity_date', severity_level, breach_occurred_at.desc()),
        Index('ix_ndpa_breach_nitda_notification', notified_to_nitda, nitda_notification_date),
        Index('ix_ndpa_breach_status', breach_resolved, investigation_completed),
    )
    
    @hybrid_property
    def notification_deadline_missed(self):
        """Check if the 72-hour NITDA notification deadline was missed."""
        if self.notified_to_nitda and self.nitda_notification_date:
            hours_diff = (self.nitda_notification_date - self.breach_discovered_at).total_seconds() / 3600
            return hours_diff > 72
        elif not self.notified_to_nitda:
            hours_since_discovery = (datetime.utcnow() - self.breach_discovered_at).total_seconds() / 3600
            return hours_since_discovery > 72
        return False
    
    def calculate_risk_score(self) -> int:
        """Calculate breach risk score (0-100)."""
        score = 0
        
        # Data sensitivity
        sensitive_categories = ['SENSITIVE_PERSONAL_DATA', 'CRIMINAL_DATA', 'BIOMETRIC_DATA', 'FINANCIAL_DATA']
        if any(cat in self.data_categories_affected for cat in sensitive_categories):
            score += 30
        else:
            score += 10
        
        # Number of affected subjects
        if self.number_of_data_subjects > 10000:
            score += 25
        elif self.number_of_data_subjects > 1000:
            score += 20
        elif self.number_of_data_subjects > 100:
            score += 15
        else:
            score += 10
        
        # Breach type severity
        high_risk_types = ['RANSOMWARE', 'MALICIOUS_ATTACK', 'UNAUTHORIZED_ACCESS']
        if any(risk_type in self.breach_type.upper() for risk_type in high_risk_types):
            score += 25
        else:
            score += 15
        
        # Response time
        if self.notification_deadline_missed:
            score += 10
        
        return min(score, 100)


class NDPAImpactAssessment(Base):
    """
    NDPA Data Protection Impact Assessment (DPIA).
    
    Manages DPIAs required for high-risk processing activities
    under NDPA compliance requirements.
    """
    __tablename__ = "ndpa_impact_assessments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Assessment identification
    assessment_id = Column(String(100), nullable=False, unique=True, index=True)
    assessment_name = Column(String(255), nullable=False)
    processing_activity = Column(String(255), nullable=False)
    
    # Assessment details
    assessment_date = Column(Date, nullable=False, index=True)
    assessor_name = Column(String(255), nullable=False)
    assessor_role = Column(String(100), nullable=False)
    
    # Risk assessment triggers
    high_risk_processing = Column(Boolean, nullable=False)
    systematic_monitoring = Column(Boolean, nullable=False, default=False)
    large_scale_processing = Column(Boolean, nullable=False, default=False)
    sensitive_data_processing = Column(Boolean, nullable=False, default=False)
    automated_decision_making = Column(Boolean, nullable=False, default=False)
    public_area_monitoring = Column(Boolean, nullable=False, default=False)
    vulnerable_subjects = Column(Boolean, nullable=False, default=False)
    
    # Assessment content
    necessity_assessment = Column(Text, nullable=False)
    proportionality_assessment = Column(Text, nullable=False)
    data_minimization_measures = Column(Text, nullable=False)
    
    # Risk identification
    risks_identified = Column(ARRAY(String(255)), nullable=False)
    risk_likelihood = Column(ARRAY(String(20)), nullable=False)  # LOW, MEDIUM, HIGH
    risk_severity = Column(ARRAY(String(20)), nullable=False)  # LOW, MEDIUM, HIGH
    
    # Risk mitigation
    risk_mitigation_measures = Column(ARRAY(String(255)), nullable=False)
    residual_risks = Column(ARRAY(String(255)), nullable=True)
    residual_risk_acceptance = Column(Text, nullable=True)
    
    # Consultation requirements
    consultation_required = Column(Boolean, nullable=False, default=False)
    consultation_date = Column(Date, nullable=True)
    consultation_outcome = Column(Text, nullable=True)
    nitda_guidance_received = Column(Boolean, nullable=False, default=False)
    
    # Approval and monitoring
    approval_status = Column(String(50), nullable=False, default="DRAFT", index=True)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    review_date = Column(Date, nullable=False)
    next_review_date = Column(Date, nullable=False)
    
    # Monitoring
    monitoring_measures = Column(ARRAY(String(255)), nullable=True)
    monitoring_frequency = Column(String(50), nullable=True)
    effectiveness_review_date = Column(Date, nullable=True)
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="ndpa_impact_assessments")
    processing_activities = relationship("NDPADataProcessingActivity", back_populates="dpia")
    
    # Indexes
    __table_args__ = (
        Index('ix_ndpa_dpia_status_date', approval_status, assessment_date.desc()),
        Index('ix_ndpa_dpia_review_dates', review_date, next_review_date),
        Index('ix_ndpa_dpia_high_risk', high_risk_processing, consultation_required),
    )
    
    def calculate_overall_risk_score(self) -> float:
        """Calculate overall risk score for the DPIA."""
        if not self.risks_identified or not self.risk_likelihood or not self.risk_severity:
            return 0.0
        
        risk_scores = []
        likelihood_map = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
        severity_map = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
        
        for i in range(min(len(self.risk_likelihood), len(self.risk_severity))):
            likelihood = likelihood_map.get(self.risk_likelihood[i], 1)
            severity = severity_map.get(self.risk_severity[i], 1)
            risk_scores.append(likelihood * severity)
        
        if risk_scores:
            return sum(risk_scores) / len(risk_scores)
        return 0.0
    
    def is_due_for_review(self) -> bool:
        """Check if DPIA is due for review."""
        return date.today() >= self.review_date


class NDPARegistrationRecord(Base):
    """
    NDPA data controller registration with NITDA.
    
    Tracks organizational registration status and compliance
    with NITDA registration requirements.
    """
    __tablename__ = "ndpa_registration_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Organization details
    organization_name = Column(String(255), nullable=False)
    organization_type = Column(String(100), nullable=False)  # PUBLIC, PRIVATE, NGO, etc.
    business_registration_number = Column(String(100), nullable=True)
    
    # Contact information
    contact_person = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    physical_address = Column(Text, nullable=False)
    
    # Data Protection Officer
    dpo_appointed = Column(Boolean, nullable=False, default=False)
    dpo_name = Column(String(255), nullable=True)
    dpo_email = Column(String(255), nullable=True)
    dpo_certification = Column(String(255), nullable=True)
    
    # Registration details
    registration_number = Column(String(100), nullable=True, unique=True)
    registration_status = Column(String(50), nullable=False, default="PENDING", index=True)
    registration_date = Column(Date, nullable=True, index=True)
    renewal_due_date = Column(Date, nullable=True, index=True)
    
    # Processing activities
    processing_activities_count = Column(Integer, nullable=False, default=0)
    high_risk_processing = Column(Boolean, nullable=False, default=False)
    cross_border_transfers = Column(Boolean, nullable=False, default=False)
    third_country_list = Column(ARRAY(String(100)), nullable=True)
    
    # Compliance status
    compliance_score = Column(Float, nullable=False, default=0.0)
    last_assessment_date = Column(Date, nullable=True)
    next_assessment_date = Column(Date, nullable=True)
    violations_count = Column(Integer, nullable=False, default=0)
    
    # Fees and payments
    registration_fee_paid = Column(Boolean, nullable=False, default=False)
    fee_amount = Column(Float, nullable=True)
    fee_currency = Column(String(10), nullable=False, default="NGN")
    payment_date = Column(Date, nullable=True)
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    last_updated = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="ndpa_registrations")
    
    # Indexes
    __table_args__ = (
        Index('ix_ndpa_registration_status_date', registration_status, registration_date),
        Index('ix_ndpa_registration_renewal', renewal_due_date, registration_status),
        Index('ix_ndpa_registration_compliance', compliance_score, last_assessment_date),
    )
    
    @hybrid_property
    def is_renewal_due(self):
        """Check if registration renewal is due."""
        if self.renewal_due_date:
            return date.today() >= self.renewal_due_date
        return False
    
    @hybrid_property
    def days_until_renewal(self):
        """Calculate days until renewal is due."""
        if self.renewal_due_date:
            return (self.renewal_due_date - date.today()).days
        return None
    
    def update_compliance_score(self, new_score: float):
        """Update compliance score and assessment date."""
        self.compliance_score = new_score
        self.last_assessment_date = date.today()
        # Next assessment in 6 months
        self.next_assessment_date = date.today() + timedelta(days=180)


# Add relationships to the User model (these would be added to the User model)
"""
# To be added to User model:
ndpa_consent_records = relationship("NDPAConsentRecord", back_populates="creator")
ndpa_processing_activities = relationship("NDPADataProcessingActivity", back_populates="creator")
ndpa_data_subject_requests = relationship("NDPADataSubjectRequest", back_populates="assignee")
ndpa_breach_notifications = relationship("NDPABreachNotification", back_populates="reporter")
ndpa_impact_assessments = relationship("NDPAImpactAssessment", back_populates="creator")
ndpa_registrations = relationship("NDPARegistrationRecord", back_populates="creator")
"""