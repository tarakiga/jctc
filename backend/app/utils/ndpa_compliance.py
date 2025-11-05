"""
NDPA (Nigeria Data Protection Act) compliance utilities and enforcement engine.

This module provides comprehensive utilities for:
- NDPA compliance monitoring and enforcement
- Data localization verification
- Cross-border transfer validation
- NITDA reporting and integration
- Consent management and validation
- Breach notification automation
- DPIA workflow automation
"""

import uuid
import json
import logging
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any, List, Tuple, Union
from enum import Enum
import re
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
import httpx
from cryptography.fernet import Fernet
import ipaddress

from app.models.ndpa_compliance import (
    NDPAConsentRecord, NDPADataProcessingActivity, NDPADataSubjectRequest,
    NDPABreachNotification, NDPAImpactAssessment, NDPARegistrationRecord
)
from app.models.audit import AuditLog, ComplianceViolation
from app.models.users import User
from app.schemas.audit import (
    NDPAComplianceFramework, NDPADataCategory, NDPAProcessingPurpose,
    NDPAConsentType, NDPADataSubjectRights, ViolationType
)


logger = logging.getLogger(__name__)


class NDPAComplianceStatus(str, Enum):
    """NDPA compliance status levels."""
    COMPLIANT = "COMPLIANT"
    MINOR_ISSUES = "MINOR_ISSUES"
    MAJOR_VIOLATIONS = "MAJOR_VIOLATIONS"
    CRITICAL_VIOLATIONS = "CRITICAL_VIOLATIONS"
    NOT_ASSESSED = "NOT_ASSESSED"


class NITDARegion(str, Enum):
    """Nigerian regions for data localization."""
    NIGERIA = "NG"
    WEST_AFRICA = "WA"  # ECOWAS region
    AFRICA = "AF"       # African continent
    GLOBAL = "GLOBAL"   # Global with restrictions


@dataclass
class NDPAViolationContext:
    """Context information for NDPA violations."""
    violation_type: str
    entity_id: str
    entity_type: str
    severity: str
    description: str
    ndpa_article: Optional[str] = None
    nitda_guideline: Optional[str] = None
    recommended_action: Optional[str] = None
    deadline: Optional[datetime] = None


class NDPAComplianceEngine:
    """
    Comprehensive NDPA compliance monitoring and enforcement engine.
    
    Provides automated compliance checking, violation detection,
    and remediation workflows for Nigerian data protection compliance.
    """
    
    def __init__(self, db: Session, encryption_key: str = None):
        self.db = db
        self.encryption_key = encryption_key or Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
        
        # NDPA compliance rules and thresholds
        self.compliance_rules = self._load_compliance_rules()
        
        # Nigerian IP address ranges (example - would be updated with real ranges)
        self.nigerian_ip_ranges = [
            ipaddress.IPv4Network('196.216.0.0/14'),    # Nigeria Telecommunications Ltd
            ipaddress.IPv4Network('41.223.0.0/16'),     # Airtel Nigeria
            ipaddress.IPv4Network('196.14.0.0/16'),     # MTN Nigeria
            # Additional Nigerian IP ranges would be added here
        ]
    
    def _load_compliance_rules(self) -> Dict[str, Any]:
        """Load NDPA compliance rules and requirements."""
        return {
            "consent_retention_periods": {
                "CRIMINAL_INVESTIGATION": "7_YEARS",
                "PUBLIC_TASK": "5_YEARS",
                "LEGITIMATE_INTERESTS": "3_YEARS",
                "CONSENT": "1_YEAR"
            },
            "breach_notification_hours": 72,  # NITDA notification deadline
            "data_subject_response_days": 30,  # Response to data subject requests
            "dpia_review_months": 12,         # DPIA review frequency
            "registration_renewal_days": 365,  # NITDA registration renewal
            "data_localization_required": ["CRIMINAL_DATA", "BIOMETRIC_DATA", "SENSITIVE_PERSONAL_DATA"],
            "cross_border_restrictions": ["CRIMINAL_DATA", "NATIONAL_SECURITY"]
        }
    
    async def assess_ndpa_compliance(
        self, 
        entity_type: str = None,
        entity_id: str = None,
        assessment_scope: List[str] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive NDPA compliance assessment.
        
        Args:
            entity_type: Specific entity type to assess
            entity_id: Specific entity ID to assess
            assessment_scope: Specific compliance areas to assess
        
        Returns:
            Comprehensive compliance assessment report
        """
        try:
            assessment_id = str(uuid.uuid4())
            assessment_start = datetime.utcnow()
            
            logger.info(f"Starting NDPA compliance assessment {assessment_id}")
            
            # Define assessment scope
            if assessment_scope is None:
                assessment_scope = [
                    "consent_management",
                    "data_processing_records",
                    "data_subject_rights",
                    "breach_notifications",
                    "data_localization",
                    "cross_border_transfers",
                    "nitda_registration",
                    "dpia_compliance"
                ]
            
            assessment_results = {
                "assessment_id": assessment_id,
                "assessment_date": assessment_start.isoformat(),
                "framework": "NDPA_2019",
                "scope": assessment_scope,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "results": {}
            }
            
            # Perform each assessment area
            for scope_area in assessment_scope:
                try:
                    if scope_area == "consent_management":
                        result = await self._assess_consent_management()
                    elif scope_area == "data_processing_records":
                        result = await self._assess_data_processing_records()
                    elif scope_area == "data_subject_rights":
                        result = await self._assess_data_subject_rights()
                    elif scope_area == "breach_notifications":
                        result = await self._assess_breach_notifications()
                    elif scope_area == "data_localization":
                        result = await self._assess_data_localization()
                    elif scope_area == "cross_border_transfers":
                        result = await self._assess_cross_border_transfers()
                    elif scope_area == "nitda_registration":
                        result = await self._assess_nitda_registration()
                    elif scope_area == "dpia_compliance":
                        result = await self._assess_dpia_compliance()
                    else:
                        result = {"status": "SKIPPED", "reason": "Unknown scope area"}
                    
                    assessment_results["results"][scope_area] = result
                    
                except Exception as e:
                    logger.error(f"Error assessing {scope_area}: {str(e)}")
                    assessment_results["results"][scope_area] = {
                        "status": "ERROR",
                        "error": str(e)
                    }
            
            # Calculate overall compliance score
            assessment_results["compliance_score"] = self._calculate_compliance_score(assessment_results["results"])
            assessment_results["compliance_status"] = self._determine_compliance_status(assessment_results["compliance_score"])
            assessment_results["violations_detected"] = self._extract_violations(assessment_results["results"])
            assessment_results["recommendations"] = self._generate_recommendations(assessment_results["results"])
            
            assessment_duration = (datetime.utcnow() - assessment_start).total_seconds()
            assessment_results["duration_seconds"] = assessment_duration
            
            logger.info(f"NDPA compliance assessment {assessment_id} completed in {assessment_duration:.2f}s")
            
            return assessment_results
            
        except Exception as e:
            logger.error(f"NDPA compliance assessment failed: {str(e)}")
            raise
    
    async def _assess_consent_management(self) -> Dict[str, Any]:
        """Assess consent management compliance."""
        try:
            # Get consent records
            consent_records = self.db.query(NDPAConsentRecord).all()
            
            violations = []
            metrics = {
                "total_consents": len(consent_records),
                "valid_consents": 0,
                "expired_consents": 0,
                "withdrawn_consents": 0,
                "missing_withdrawal_method": 0
            }
            
            for consent in consent_records:
                # Check consent validity
                if consent.is_valid:
                    metrics["valid_consents"] += 1
                
                if consent.is_withdrawn:
                    metrics["withdrawn_consents"] += 1
                
                # Check withdrawal method specification
                if not consent.withdrawal_method:
                    metrics["missing_withdrawal_method"] += 1
                    violations.append({
                        "type": "NDPA_CONSENT",
                        "description": f"Consent record {consent.id} missing withdrawal method specification",
                        "severity": "MEDIUM",
                        "entity_id": str(consent.id),
                        "ndpa_article": "Article 7 - Consent Requirements"
                    })
                
                # Check consent text adequacy (basic check)
                if len(consent.consent_text) < 100:
                    violations.append({
                        "type": "NDPA_CONSENT",
                        "description": f"Consent text may be inadequate for record {consent.id}",
                        "severity": "LOW",
                        "entity_id": str(consent.id),
                        "ndpa_article": "Article 7 - Informed Consent"
                    })
            
            # Calculate consent compliance score
            compliance_score = 100
            if metrics["total_consents"] > 0:
                withdrawal_compliance = (metrics["total_consents"] - metrics["missing_withdrawal_method"]) / metrics["total_consents"]
                compliance_score = withdrawal_compliance * 100
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_consent_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"Consent management assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_data_processing_records(self) -> Dict[str, Any]:
        """Assess data processing records compliance (Article 29)."""
        try:
            processing_activities = self.db.query(NDPADataProcessingActivity).all()
            
            violations = []
            metrics = {
                "total_activities": len(processing_activities),
                "registered_activities": 0,
                "high_risk_activities": 0,
                "dpia_required": 0,
                "dpia_completed": 0,
                "missing_lawful_basis": 0
            }
            
            for activity in processing_activities:
                if activity.registered_with_nitda:
                    metrics["registered_activities"] += 1
                
                if activity.is_high_risk:
                    metrics["high_risk_activities"] += 1
                
                if activity.dpia_required:
                    metrics["dpia_required"] += 1
                    
                    if not activity.dpia_completed:
                        violations.append({
                            "type": "NDPA_IMPACT_ASSESSMENT",
                            "description": f"DPIA required but not completed for activity {activity.processing_id}",
                            "severity": "HIGH",
                            "entity_id": str(activity.id),
                            "ndpa_article": "Article 33 - Data Protection Impact Assessment"
                        })
                    else:
                        metrics["dpia_completed"] += 1
                
                # Check lawful basis
                if not activity.lawful_basis:
                    metrics["missing_lawful_basis"] += 1
                    violations.append({
                        "type": "NDPA_PROCESSING_LAWFULNESS",
                        "description": f"Missing lawful basis for processing activity {activity.processing_id}",
                        "severity": "CRITICAL",
                        "entity_id": str(activity.id),
                        "ndpa_article": "Article 8 - Lawfulness of Processing"
                    })
                
                # Check data categories for localization requirements
                if activity.data_categories:
                    restricted_categories = set(activity.data_categories) & set(self.compliance_rules["data_localization_required"])
                    if restricted_categories and activity.third_country_transfers:
                        violations.append({
                            "type": "NDPA_DATA_LOCALIZATION",
                            "description": f"Restricted data categories transferred outside Nigeria: {restricted_categories}",
                            "severity": "CRITICAL",
                            "entity_id": str(activity.id),
                            "ndpa_article": "Article 34 - Cross-border Data Transfer"
                        })
            
            # Calculate processing records compliance score
            compliance_score = 100
            if metrics["total_activities"] > 0:
                lawful_basis_compliance = (metrics["total_activities"] - metrics["missing_lawful_basis"]) / metrics["total_activities"]
                dpia_compliance = 1.0
                if metrics["dpia_required"] > 0:
                    dpia_compliance = metrics["dpia_completed"] / metrics["dpia_required"]
                compliance_score = (lawful_basis_compliance * 0.6 + dpia_compliance * 0.4) * 100
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_processing_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"Data processing records assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_data_subject_rights(self) -> Dict[str, Any]:
        """Assess data subject rights compliance."""
        try:
            # Get data subject requests from the last 12 months
            twelve_months_ago = datetime.utcnow() - timedelta(days=365)
            requests = self.db.query(NDPADataSubjectRequest).filter(
                NDPADataSubjectRequest.submitted_at >= twelve_months_ago
            ).all()
            
            violations = []
            metrics = {
                "total_requests": len(requests),
                "completed_requests": 0,
                "overdue_requests": 0,
                "pending_requests": 0,
                "avg_response_time_days": 0,
                "requests_by_type": {}
            }
            
            response_times = []
            
            for request in requests:
                # Count by request type
                req_type = request.request_type
                metrics["requests_by_type"][req_type] = metrics["requests_by_type"].get(req_type, 0) + 1
                
                # Check completion status
                if request.status == "COMPLETED":
                    metrics["completed_requests"] += 1
                    if request.response_provided_at:
                        response_time = (request.response_provided_at - request.submitted_at).days
                        response_times.append(response_time)
                elif request.status == "PENDING":
                    metrics["pending_requests"] += 1
                
                # Check if overdue
                if request.is_overdue:
                    metrics["overdue_requests"] += 1
                    violations.append({
                        "type": "NDPA_DATA_SUBJECT_RIGHTS",
                        "description": f"Data subject request {request.request_id} is overdue (due: {request.response_due_date})",
                        "severity": "HIGH",
                        "entity_id": str(request.id),
                        "ndpa_article": "Article 13-17 - Data Subject Rights"
                    })
            
            # Calculate average response time
            if response_times:
                metrics["avg_response_time_days"] = sum(response_times) / len(response_times)
            
            # Calculate data subject rights compliance score
            compliance_score = 100
            if metrics["total_requests"] > 0:
                completion_rate = metrics["completed_requests"] / metrics["total_requests"]
                overdue_penalty = metrics["overdue_requests"] / metrics["total_requests"]
                compliance_score = max(0, (completion_rate - overdue_penalty) * 100)
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_dsr_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"Data subject rights assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_breach_notifications(self) -> Dict[str, Any]:
        """Assess breach notification compliance."""
        try:
            # Get breach notifications from the last 24 months
            two_years_ago = datetime.utcnow() - timedelta(days=730)
            breaches = self.db.query(NDPABreachNotification).filter(
                NDPABreachNotification.breach_discovered_at >= two_years_ago
            ).all()
            
            violations = []
            metrics = {
                "total_breaches": len(breaches),
                "nitda_notified": 0,
                "notification_deadline_missed": 0,
                "data_subjects_notified": 0,
                "resolved_breaches": 0,
                "avg_resolution_time_days": 0
            }
            
            resolution_times = []
            
            for breach in breaches:
                if breach.notified_to_nitda:
                    metrics["nitda_notified"] += 1
                
                if breach.data_subjects_notified:
                    metrics["data_subjects_notified"] += 1
                
                if breach.breach_resolved:
                    metrics["resolved_breaches"] += 1
                    if breach.breach_resolved_at:
                        resolution_time = (breach.breach_resolved_at - breach.breach_discovered_at).days
                        resolution_times.append(resolution_time)
                
                # Check NITDA notification deadline compliance
                if breach.notification_deadline_missed:
                    metrics["notification_deadline_missed"] += 1
                    violations.append({
                        "type": "NDPA_BREACH_NOTIFICATION",
                        "description": f"Breach {breach.breach_id} NITDA notification deadline missed (>72 hours)",
                        "severity": "CRITICAL",
                        "entity_id": str(breach.id),
                        "ndpa_article": "Article 35 - Personal Data Breach Notification"
                    })
            
            # Calculate average resolution time
            if resolution_times:
                metrics["avg_resolution_time_days"] = sum(resolution_times) / len(resolution_times)
            
            # Calculate breach notification compliance score
            compliance_score = 100
            if metrics["total_breaches"] > 0:
                notification_compliance = metrics["nitda_notified"] / metrics["total_breaches"]
                deadline_penalty = metrics["notification_deadline_missed"] / metrics["total_breaches"]
                compliance_score = max(0, (notification_compliance - deadline_penalty) * 100)
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_breach_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"Breach notifications assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_data_localization(self) -> Dict[str, Any]:
        """Assess data localization compliance."""
        try:
            violations = []
            metrics = {
                "processing_activities_checked": 0,
                "localization_violations": 0,
                "compliant_activities": 0,
                "restricted_transfers": 0
            }
            
            # Check processing activities for data localization compliance
            activities = self.db.query(NDPADataProcessingActivity).all()
            metrics["processing_activities_checked"] = len(activities)
            
            for activity in activities:
                has_violation = False
                
                # Check if restricted data categories are being transferred
                if activity.data_categories and activity.third_country_transfers:
                    restricted_categories = set(activity.data_categories) & set(self.compliance_rules["data_localization_required"])
                    
                    if restricted_categories:
                        metrics["restricted_transfers"] += 1
                        has_violation = True
                        
                        violations.append({
                            "type": "NDPA_DATA_LOCALIZATION",
                            "description": f"Restricted data categories {restricted_categories} being transferred outside Nigeria in activity {activity.processing_id}",
                            "severity": "CRITICAL",
                            "entity_id": str(activity.id),
                            "ndpa_article": "Article 34 - Cross-border Data Transfer",
                            "recommended_action": "Implement data localization or obtain NITDA approval for transfer"
                        })
                
                if has_violation:
                    metrics["localization_violations"] += 1
                else:
                    metrics["compliant_activities"] += 1
            
            # Calculate data localization compliance score
            compliance_score = 100
            if metrics["processing_activities_checked"] > 0:
                compliance_rate = metrics["compliant_activities"] / metrics["processing_activities_checked"]
                compliance_score = compliance_rate * 100
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_localization_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"Data localization assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_cross_border_transfers(self) -> Dict[str, Any]:
        """Assess cross-border data transfer compliance."""
        try:
            violations = []
            metrics = {
                "activities_with_transfers": 0,
                "transfers_with_safeguards": 0,
                "unauthorized_transfers": 0,
                "restricted_data_transfers": 0
            }
            
            # Check processing activities for cross-border transfers
            activities = self.db.query(NDPADataProcessingActivity).filter(
                NDPADataProcessingActivity.third_country_transfers.isnot(None)
            ).all()
            
            metrics["activities_with_transfers"] = len(activities)
            
            for activity in activities:
                # Check if transfers have adequate safeguards
                if activity.transfer_safeguards:
                    metrics["transfers_with_safeguards"] += 1
                else:
                    metrics["unauthorized_transfers"] += 1
                    violations.append({
                        "type": "NDPA_CROSS_BORDER_TRANSFER",
                        "description": f"Cross-border transfer without adequate safeguards in activity {activity.processing_id}",
                        "severity": "HIGH",
                        "entity_id": str(activity.id),
                        "ndpa_article": "Article 34 - Cross-border Data Transfer"
                    })
                
                # Check for restricted data categories
                if activity.data_categories:
                    restricted_categories = set(activity.data_categories) & set(self.compliance_rules["cross_border_restrictions"])
                    
                    if restricted_categories:
                        metrics["restricted_data_transfers"] += 1
                        violations.append({
                            "type": "NDPA_CROSS_BORDER_TRANSFER",
                            "description": f"Restricted data categories {restricted_categories} being transferred cross-border in activity {activity.processing_id}",
                            "severity": "CRITICAL",
                            "entity_id": str(activity.id),
                            "ndpa_article": "Article 34 - Cross-border Data Transfer"
                        })
            
            # Calculate cross-border transfer compliance score
            compliance_score = 100
            if metrics["activities_with_transfers"] > 0:
                safeguards_compliance = metrics["transfers_with_safeguards"] / metrics["activities_with_transfers"]
                restrictions_penalty = metrics["restricted_data_transfers"] / metrics["activities_with_transfers"]
                compliance_score = max(0, (safeguards_compliance - restrictions_penalty) * 100)
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_transfer_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"Cross-border transfers assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_nitda_registration(self) -> Dict[str, Any]:
        """Assess NITDA registration compliance."""
        try:
            violations = []
            metrics = {
                "total_registrations": 0,
                "active_registrations": 0,
                "expired_registrations": 0,
                "pending_renewals": 0,
                "dpo_appointed": 0
            }
            
            registrations = self.db.query(NDPARegistrationRecord).all()
            metrics["total_registrations"] = len(registrations)
            
            for registration in registrations:
                if registration.registration_status == "ACTIVE":
                    metrics["active_registrations"] += 1
                elif registration.registration_status == "EXPIRED":
                    metrics["expired_registrations"] += 1
                
                if registration.dpo_appointed:
                    metrics["dpo_appointed"] += 1
                
                # Check renewal requirements
                if registration.is_renewal_due:
                    metrics["pending_renewals"] += 1
                    violations.append({
                        "type": "NDPA_REGISTRATION",
                        "description": f"NITDA registration renewal overdue for {registration.organization_name}",
                        "severity": "HIGH",
                        "entity_id": str(registration.id),
                        "nitda_guideline": "NITDA Registration Requirements"
                    })
                
                # Check DPO appointment for high-risk processing
                if registration.high_risk_processing and not registration.dpo_appointed:
                    violations.append({
                        "type": "NDPA_REGISTRATION",
                        "description": f"DPO not appointed for high-risk processing organization {registration.organization_name}",
                        "severity": "MEDIUM",
                        "entity_id": str(registration.id),
                        "ndpa_article": "Article 27 - Data Protection Officer"
                    })
            
            # Calculate NITDA registration compliance score
            compliance_score = 100
            if metrics["total_registrations"] > 0:
                active_rate = metrics["active_registrations"] / metrics["total_registrations"]
                renewal_penalty = metrics["pending_renewals"] / metrics["total_registrations"]
                compliance_score = max(0, (active_rate - renewal_penalty) * 100)
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_registration_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"NITDA registration assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    async def _assess_dpia_compliance(self) -> Dict[str, Any]:
        """Assess DPIA (Data Protection Impact Assessment) compliance."""
        try:
            violations = []
            metrics = {
                "total_dpias": 0,
                "approved_dpias": 0,
                "overdue_reviews": 0,
                "high_risk_activities_without_dpia": 0,
                "consultation_required": 0
            }
            
            # Check DPIAs
            dpias = self.db.query(NDPAImpactAssessment).all()
            metrics["total_dpias"] = len(dpias)
            
            for dpia in dpias:
                if dpia.approval_status == "APPROVED":
                    metrics["approved_dpias"] += 1
                
                if dpia.consultation_required:
                    metrics["consultation_required"] += 1
                
                # Check review deadlines
                if dpia.is_due_for_review():
                    metrics["overdue_reviews"] += 1
                    violations.append({
                        "type": "NDPA_IMPACT_ASSESSMENT",
                        "description": f"DPIA {dpia.assessment_id} review is overdue (due: {dpia.review_date})",
                        "severity": "MEDIUM",
                        "entity_id": str(dpia.id),
                        "ndpa_article": "Article 33 - Data Protection Impact Assessment"
                    })
            
            # Check for high-risk processing activities without DPIA
            high_risk_activities = self.db.query(NDPADataProcessingActivity).filter(
                and_(
                    NDPADataProcessingActivity.is_high_risk == True,
                    NDPADataProcessingActivity.dpia_completed == False
                )
            ).all()
            
            metrics["high_risk_activities_without_dpia"] = len(high_risk_activities)
            
            for activity in high_risk_activities:
                violations.append({
                    "type": "NDPA_IMPACT_ASSESSMENT",
                    "description": f"High-risk processing activity {activity.processing_id} requires DPIA",
                    "severity": "HIGH",
                    "entity_id": str(activity.id),
                    "ndpa_article": "Article 33 - Data Protection Impact Assessment"
                })
            
            # Calculate DPIA compliance score
            compliance_score = 100
            total_required_dpias = metrics["total_dpias"] + metrics["high_risk_activities_without_dpia"]
            
            if total_required_dpias > 0:
                completion_rate = metrics["approved_dpias"] / total_required_dpias
                review_penalty = metrics["overdue_reviews"] / max(1, metrics["total_dpias"])
                compliance_score = max(0, (completion_rate - review_penalty) * 100)
            
            return {
                "status": "COMPLETED",
                "compliance_score": compliance_score,
                "metrics": metrics,
                "violations": violations,
                "recommendations": self._generate_dpia_recommendations(metrics, violations)
            }
            
        except Exception as e:
            logger.error(f"DPIA compliance assessment failed: {str(e)}")
            return {"status": "ERROR", "error": str(e)}
    
    def _calculate_compliance_score(self, results: Dict[str, Any]) -> float:
        """Calculate overall NDPA compliance score."""
        scores = []
        weights = {
            "consent_management": 0.15,
            "data_processing_records": 0.20,
            "data_subject_rights": 0.15,
            "breach_notifications": 0.15,
            "data_localization": 0.20,
            "cross_border_transfers": 0.10,
            "nitda_registration": 0.10,
            "dpia_compliance": 0.15
        }
        
        total_weight = 0
        weighted_score = 0
        
        for area, result in results.items():
            if isinstance(result, dict) and "compliance_score" in result:
                weight = weights.get(area, 0.1)
                weighted_score += result["compliance_score"] * weight
                total_weight += weight
        
        if total_weight > 0:
            return weighted_score / total_weight
        return 0.0
    
    def _determine_compliance_status(self, score: float) -> NDPAComplianceStatus:
        """Determine compliance status based on score."""
        if score >= 95:
            return NDPAComplianceStatus.COMPLIANT
        elif score >= 80:
            return NDPAComplianceStatus.MINOR_ISSUES
        elif score >= 60:
            return NDPAComplianceStatus.MAJOR_VIOLATIONS
        else:
            return NDPAComplianceStatus.CRITICAL_VIOLATIONS
    
    def _extract_violations(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all violations from assessment results."""
        all_violations = []
        
        for area, result in results.items():
            if isinstance(result, dict) and "violations" in result:
                for violation in result["violations"]:
                    violation["assessment_area"] = area
                    all_violations.append(violation)
        
        return all_violations
    
    def _generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """Generate comprehensive recommendations based on assessment results."""
        recommendations = []
        
        for area, result in results.items():
            if isinstance(result, dict) and "recommendations" in result:
                recommendations.extend(result["recommendations"])
        
        # Add general NDPA compliance recommendations
        recommendations.extend([
            "Conduct regular NDPA compliance training for all staff",
            "Establish a Data Protection Officer (DPO) role if not already appointed",
            "Implement automated compliance monitoring and alerting",
            "Create incident response procedures for data breaches",
            "Develop clear data subject request handling procedures",
            "Review and update privacy policies and consent forms",
            "Implement data minimization and purpose limitation practices"
        ])
        
        return list(set(recommendations))  # Remove duplicates
    
    # Recommendation generators for each assessment area
    def _generate_consent_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate consent management recommendations."""
        recommendations = []
        
        if metrics.get("missing_withdrawal_method", 0) > 0:
            recommendations.append("Ensure all consent records specify clear withdrawal methods")
        
        if metrics.get("total_consents", 0) == 0:
            recommendations.append("Implement comprehensive consent management system")
        
        recommendations.extend([
            "Review consent text for clarity and NDPA compliance",
            "Implement consent withdrawal tracking and processing",
            "Provide clear information about data processing purposes",
            "Ensure consent is freely given, specific, informed, and unambiguous"
        ])
        
        return recommendations
    
    def _generate_processing_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate data processing records recommendations."""
        recommendations = []
        
        if metrics.get("missing_lawful_basis", 0) > 0:
            recommendations.append("Establish lawful basis for all processing activities")
        
        if metrics.get("dpia_required", 0) > metrics.get("dpia_completed", 0):
            recommendations.append("Complete outstanding Data Protection Impact Assessments")
        
        recommendations.extend([
            "Maintain comprehensive records of processing activities",
            "Register high-risk processing activities with NITDA",
            "Implement data minimization and purpose limitation",
            "Document data retention periods and deletion procedures"
        ])
        
        return recommendations
    
    def _generate_dsr_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate data subject rights recommendations."""
        recommendations = []
        
        if metrics.get("overdue_requests", 0) > 0:
            recommendations.append("Establish procedures to meet 30-day response deadlines for data subject requests")
        
        if metrics.get("avg_response_time_days", 0) > 25:
            recommendations.append("Improve data subject request processing efficiency")
        
        recommendations.extend([
            "Implement automated data subject request tracking system",
            "Provide clear information about data subject rights",
            "Establish identity verification procedures for requests",
            "Train staff on handling data subject requests"
        ])
        
        return recommendations
    
    def _generate_breach_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate breach notification recommendations."""
        recommendations = []
        
        if metrics.get("notification_deadline_missed", 0) > 0:
            recommendations.append("Implement automated breach notification procedures to meet 72-hour NITDA deadline")
        
        recommendations.extend([
            "Establish incident response procedures and team",
            "Implement breach detection and monitoring systems",
            "Create templates for breach notifications to NITDA and data subjects",
            "Conduct regular incident response drills and training"
        ])
        
        return recommendations
    
    def _generate_localization_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate data localization recommendations."""
        recommendations = []
        
        if metrics.get("localization_violations", 0) > 0:
            recommendations.append("Implement data localization for restricted data categories")
        
        recommendations.extend([
            "Review data storage locations for NDPA compliance",
            "Obtain NITDA approval for necessary cross-border transfers",
            "Implement data residency controls and monitoring",
            "Document data storage and transfer policies"
        ])
        
        return recommendations
    
    def _generate_transfer_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate cross-border transfer recommendations."""
        recommendations = []
        
        if metrics.get("unauthorized_transfers", 0) > 0:
            recommendations.append("Implement adequate safeguards for all cross-border data transfers")
        
        recommendations.extend([
            "Obtain NITDA approval for cross-border transfers where required",
            "Implement data transfer agreements and adequacy assessments",
            "Monitor and log all international data transfers",
            "Review third-party data processing agreements"
        ])
        
        return recommendations
    
    def _generate_registration_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate NITDA registration recommendations."""
        recommendations = []
        
        if metrics.get("pending_renewals", 0) > 0:
            recommendations.append("Complete overdue NITDA registration renewals")
        
        if metrics.get("dpo_appointed", 0) == 0:
            recommendations.append("Appoint a qualified Data Protection Officer")
        
        recommendations.extend([
            "Maintain current NITDA registration status",
            "Update registration information when processing activities change",
            "Ensure DPO certification and ongoing training",
            "Pay registration fees and maintain good standing with NITDA"
        ])
        
        return recommendations
    
    def _generate_dpia_recommendations(self, metrics: Dict, violations: List) -> List[str]:
        """Generate DPIA recommendations."""
        recommendations = []
        
        if metrics.get("high_risk_activities_without_dpia", 0) > 0:
            recommendations.append("Conduct DPIAs for all high-risk processing activities")
        
        if metrics.get("overdue_reviews", 0) > 0:
            recommendations.append("Complete overdue DPIA reviews and updates")
        
        recommendations.extend([
            "Establish DPIA procedures and templates",
            "Train staff on DPIA requirements and process",
            "Implement monitoring measures for high-risk processing",
            "Consult with NITDA when required for high-risk processing"
        ])
        
        return recommendations
    
    def check_nigerian_ip_address(self, ip_address: str) -> bool:
        """Check if an IP address is from Nigeria."""
        try:
            ip = ipaddress.IPv4Address(ip_address)
            for ip_range in self.nigerian_ip_ranges:
                if ip in ip_range:
                    return True
            return False
        except ValueError:
            logger.warning(f"Invalid IP address format: {ip_address}")
            return False
    
    async def validate_cross_border_transfer(
        self, 
        data_categories: List[str],
        destination_country: str,
        safeguards: str = None
    ) -> Dict[str, Any]:
        """Validate if a cross-border transfer is NDPA compliant."""
        validation_result = {
            "allowed": True,
            "restrictions": [],
            "requirements": [],
            "violations": []
        }
        
        # Check for restricted data categories
        restricted_categories = set(data_categories) & set(self.compliance_rules["cross_border_restrictions"])
        
        if restricted_categories:
            validation_result["allowed"] = False
            validation_result["restrictions"].append(f"Restricted data categories: {restricted_categories}")
            validation_result["violations"].append({
                "type": "NDPA_CROSS_BORDER_TRANSFER",
                "description": f"Transfer of restricted data categories {restricted_categories} to {destination_country}",
                "severity": "CRITICAL"
            })
        
        # Check localization requirements
        localization_required = set(data_categories) & set(self.compliance_rules["data_localization_required"])
        
        if localization_required and destination_country.upper() != "NG":
            validation_result["requirements"].append("NITDA approval required for localization-restricted data")
            validation_result["requirements"].append("Implement adequate safeguards")
        
        # Check safeguards
        if not safeguards and destination_country.upper() != "NG":
            validation_result["requirements"].append("Adequate safeguards must be implemented")
        
        return validation_result
    
    async def create_compliance_violation(self, context: NDPAViolationContext, user_id: str) -> ComplianceViolation:
        """Create and record an NDPA compliance violation."""
        violation = ComplianceViolation(
            violation_type=context.violation_type,
            entity_type=context.entity_type,
            entity_id=context.entity_id,
            severity=context.severity,
            title=f"NDPA Compliance Violation: {context.violation_type}",
            description=context.description,
            compliance_rule=context.ndpa_article or context.nitda_guideline,
            remediation_steps=context.recommended_action,
            detected_at=datetime.utcnow()
        )
        
        self.db.add(violation)
        self.db.commit()
        
        logger.warning(f"NDPA compliance violation created: {violation.id} - {context.description}")
        
        return violation


# Export the main compliance engine
__all__ = [
    "NDPAComplianceEngine",
    "NDPAComplianceStatus",
    "NITDARegion", 
    "NDPAViolationContext"
]