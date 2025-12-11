"""
Data retention and archival management system.

This module provides:
- Automated data lifecycle management based on retention policies
- Secure archival with compression and encryption
- Policy-driven deletion and cleanup processes
- Compliance verification and reporting
- Background job scheduling and monitoring
"""

import os
import gzip
import json
import shutil
import tempfile
import logging
import hashlib
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import zipfile
import tarfile
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

from app.models.audit import (
    AuditLog, RetentionPolicy, DataRetentionJob, 
    AuditArchive, ComplianceViolation
)
from app.models.cases import Case
from app.models.evidence import Evidence
from app.models.party import Party
from app.models.legal import LegalInstrument
from app.schemas.audit import (
    RetentionPeriod, AuditEntity, ViolationType, 
    AuditSeverity, AuditAction
)


logger = logging.getLogger(__name__)


class RetentionManager:
    """
    Comprehensive data retention and archival management system.
    
    Handles automated lifecycle management, secure archival, and
    compliance verification for all system data.
    """
    
    def __init__(
        self, 
        db: Session, 
        archive_dir: str = None,
        encryption_key: bytes = None
    ):
        self.db = db
        self.archive_dir = Path(archive_dir or tempfile.gettempdir()) / "jctc_archives"
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize encryption
        if encryption_key:
            self.encryption_key = encryption_key
        else:
            # Generate a key from a password (in production, use proper key management)
            password = b"jctc_archive_key_2024"  # Should be from environment/config
            salt = b"jctc_salt_2024_archive"    # Should be randomly generated and stored
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password))
            self.encryption_key = key
        
        self.fernet = Fernet(self.encryption_key)
        
        # Entity type mappings for retention processing
        self.entity_mappings = {
            AuditEntity.CASE: {
                'model': Case,
                'date_field': 'created_at',
                'processor': self._process_case_retention
            },
            AuditEntity.EVIDENCE: {
                'model': Evidence,
                'date_field': 'created_at',
                'processor': self._process_evidence_retention
            },
            AuditEntity.PARTY: {
                'model': Party,
                'date_field': 'created_at',
                'processor': self._process_party_retention
            },
            AuditEntity.LEGAL_INSTRUMENT: {
                'model': LegalInstrument,
                'date_field': 'created_at',
                'processor': self._process_legal_instrument_retention
            },
            AuditEntity.SYSTEM: {
                'model': AuditLog,
                'date_field': 'timestamp',
                'processor': self._process_audit_log_retention
            }
        }
    
    def process_retention_policies(self) -> Dict[str, Any]:
        """
        Process all active retention policies and execute lifecycle actions.
        
        Returns:
            Dictionary with processing results and statistics
        """
        try:
            logger.info("Starting retention policy processing")
            
            # Get all active retention policies
            policies = self.db.query(RetentionPolicy).filter(
                RetentionPolicy.is_active == True
            ).all()
            
            results = {
                'policies_processed': 0,
                'items_archived': 0,
                'items_deleted': 0,
                'violations_detected': 0,
                'errors': [],
                'processing_time': 0
            }
            
            start_time = datetime.utcnow()
            
            for policy in policies:
                try:
                    policy_results = self._process_single_policy(policy)
                    
                    results['policies_processed'] += 1
                    results['items_archived'] += policy_results.get('archived', 0)
                    results['items_deleted'] += policy_results.get('deleted', 0)
                    results['violations_detected'] += policy_results.get('violations', 0)
                    
                    logger.info(f"Processed policy {policy.name}: {policy_results}")
                    
                except Exception as e:
                    error_msg = f"Error processing policy {policy.name}: {str(e)}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            end_time = datetime.utcnow()
            results['processing_time'] = (end_time - start_time).total_seconds()
            
            logger.info(f"Retention processing completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Retention policy processing failed: {str(e)}")
            raise
    
    def _process_single_policy(self, policy: RetentionPolicy) -> Dict[str, Any]:
        """Process a single retention policy."""
        results = {
            'archived': 0,
            'deleted': 0,
            'violations': 0
        }
        
        # Get entity mapping
        entity_mapping = self.entity_mappings.get(policy.entity_type)
        if not entity_mapping:
            logger.warning(f"No mapping found for entity type: {policy.entity_type}")
            return results
        
        # Calculate cutoff dates
        retention_days = policy.get_retention_days()
        if retention_days == -1:  # Permanent or legal hold
            return results
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Query for expired items
        model = entity_mapping['model']
        date_field = getattr(model, entity_mapping['date_field'])
        
        expired_items = self.db.query(model).filter(
            date_field < cutoff_date
        ).all()
        
        # Process each expired item
        processor = entity_mapping['processor']
        for item in expired_items:
            try:
                if policy.auto_archive and not getattr(item, 'is_archived', False):
                    if self._archive_item(item, policy):
                        results['archived'] += 1
                
                if policy.auto_delete and getattr(item, 'is_archived', True):
                    if self._delete_item(item, policy):
                        results['deleted'] += 1
                
            except Exception as e:
                logger.error(f"Error processing item {item.id}: {str(e)}")
                self._create_compliance_violation(
                    policy, item, f"Retention processing failed: {str(e)}"
                )
                results['violations'] += 1
        
        return results
    
    def _archive_item(self, item: Any, policy: RetentionPolicy) -> bool:
        """Archive a single item according to policy."""
        try:
            # Create archive entry
            archive_data = {
                'item_id': str(item.id),
                'entity_type': policy.entity_type,
                'data': self._serialize_item(item),
                'archived_at': datetime.utcnow().isoformat(),
                'policy_id': str(policy.id)
            }
            
            # Compress and encrypt data
            json_data = json.dumps(archive_data, default=str).encode()
            compressed_data = gzip.compress(json_data)
            encrypted_data = self.fernet.encrypt(compressed_data)
            
            # Generate archive filename
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            archive_filename = f"{policy.entity_type}_{item.id}_{timestamp}.enc"
            archive_path = self.archive_dir / archive_filename
            
            # Write encrypted archive
            with open(archive_path, 'wb') as f:
                f.write(encrypted_data)
            
            # Calculate checksums
            original_checksum = hashlib.sha256(json_data).hexdigest()
            archive_checksum = hashlib.sha256(encrypted_data).hexdigest()
            
            # Create archive record
            archive_record = AuditArchive(
                archive_name=archive_filename,
                start_date=item.created_at if hasattr(item, 'created_at') else datetime.utcnow(),
                end_date=datetime.utcnow(),
                record_count=1,
                entity_types=[policy.entity_type],
                compressed_size=len(encrypted_data),
                original_size=len(json_data),
                file_path=str(archive_path),
                checksum=archive_checksum,
                status="ACTIVE",
                created_by=None  # System operation
            )
            
            self.db.add(archive_record)
            
            # Mark item as archived
            if hasattr(item, 'is_archived'):
                item.is_archived = True
                item.archived_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Successfully archived {policy.entity_type} item {item.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to archive item {item.id}: {str(e)}")
            self.db.rollback()
            return False
    
    def _delete_item(self, item: Any, policy: RetentionPolicy) -> bool:
        """Securely delete an item according to policy."""
        try:
            # Verify item is properly archived before deletion
            if policy.auto_archive and hasattr(item, 'is_archived'):
                if not item.is_archived:
                    logger.warning(f"Item {item.id} not archived, skipping deletion")
                    return False
            
            # Create deletion audit log before deletion
            deletion_log = AuditLog(
                action=AuditAction.DELETE,
                entity_type=policy.entity_type,
                entity_id=str(item.id),
                description=f"Item deleted by retention policy: {policy.name}",
                severity=AuditSeverity.HIGH,
                details={
                    'policy_id': str(policy.id),
                    'policy_name': policy.name,
                    'retention_period': policy.retention_period,
                    'deletion_reason': 'retention_policy_expiration'
                }
            )
            self.db.add(deletion_log)
            
            # Soft delete first (if supported)
            if hasattr(item, 'is_deleted'):
                item.is_deleted = True
                item.deleted_at = datetime.utcnow()
            else:
                # Hard delete if soft delete not supported
                self.db.delete(item)
            
            self.db.commit()
            
            logger.info(f"Successfully deleted {policy.entity_type} item {item.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete item {item.id}: {str(e)}")
            self.db.rollback()
            return False
    
    def _serialize_item(self, item: Any) -> Dict[str, Any]:
        """Serialize an item for archival."""
        # Convert SQLAlchemy object to dictionary
        item_dict = {}
        
        for column in item.__table__.columns:
            value = getattr(item, column.name)
            if isinstance(value, datetime):
                item_dict[column.name] = value.isoformat()
            else:
                item_dict[column.name] = str(value) if value is not None else None
        
        return item_dict
    
    def create_bulk_archive(
        self, 
        entity_type: str, 
        start_date: datetime, 
        end_date: datetime,
        archive_name: str = None
    ) -> AuditArchive:
        """
        Create a bulk archive for a specific entity type and date range.
        
        Args:
            entity_type: Type of entity to archive
            start_date: Start date for archival
            end_date: End date for archival
            archive_name: Optional custom archive name
        
        Returns:
            AuditArchive record
        """
        try:
            logger.info(f"Creating bulk archive for {entity_type} from {start_date} to {end_date}")
            
            # Get entity mapping
            entity_mapping = self.entity_mappings.get(entity_type)
            if not entity_mapping:
                raise ValueError(f"Unsupported entity type: {entity_type}")
            
            model = entity_mapping['model']
            date_field = getattr(model, entity_mapping['date_field'])
            
            # Query items in date range
            items = self.db.query(model).filter(
                and_(
                    date_field >= start_date,
                    date_field <= end_date
                )
            ).all()
            
            if not items:
                raise ValueError("No items found in specified date range")
            
            # Generate archive name if not provided
            if not archive_name:
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                archive_name = f"{entity_type}_bulk_{timestamp}"
            
            # Create archive data
            archive_data = {
                'archive_name': archive_name,
                'entity_type': entity_type,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'created_at': datetime.utcnow().isoformat(),
                'items': [self._serialize_item(item) for item in items]
            }
            
            # Compress and encrypt
            json_data = json.dumps(archive_data, default=str).encode()
            compressed_data = gzip.compress(json_data)
            encrypted_data = self.fernet.encrypt(compressed_data)
            
            # Save archive file
            archive_filename = f"{archive_name}.tar.gz.enc"
            archive_path = self.archive_dir / archive_filename
            
            with open(archive_path, 'wb') as f:
                f.write(encrypted_data)
            
            # Calculate checksums and sizes
            archive_checksum = hashlib.sha256(encrypted_data).hexdigest()
            
            # Create archive record
            archive_record = AuditArchive(
                archive_name=archive_name,
                start_date=start_date,
                end_date=end_date,
                record_count=len(items),
                entity_types=[entity_type],
                compressed_size=len(encrypted_data),
                original_size=len(json_data),
                file_path=str(archive_path),
                checksum=archive_checksum,
                status="ACTIVE",
                created_by=None  # System operation
            )
            
            self.db.add(archive_record)
            self.db.commit()
            
            logger.info(f"Bulk archive created successfully: {archive_name}")
            return archive_record
            
        except Exception as e:
            logger.error(f"Bulk archive creation failed: {str(e)}")
            self.db.rollback()
            raise
    
    def restore_from_archive(self, archive_id: str) -> Dict[str, Any]:
        """
        Restore data from an archive.
        
        Args:
            archive_id: Archive ID to restore from
        
        Returns:
            Dictionary with restoration results
        """
        try:
            # Get archive record
            archive = self.db.query(AuditArchive).filter(
                AuditArchive.id == archive_id
            ).first()
            
            if not archive:
                raise ValueError(f"Archive not found: {archive_id}")
            
            if not os.path.exists(archive.file_path):
                raise ValueError(f"Archive file not found: {archive.file_path}")
            
            # Read and decrypt archive
            with open(archive.file_path, 'rb') as f:
                encrypted_data = f.read()
            
            # Verify checksum
            if hashlib.sha256(encrypted_data).hexdigest() != archive.checksum:
                raise ValueError("Archive checksum verification failed")
            
            # Decrypt and decompress
            compressed_data = self.fernet.decrypt(encrypted_data)
            json_data = gzip.decompress(compressed_data)
            archive_data = json.loads(json_data.decode())
            
            # Restoration results
            results = {
                'archive_name': archive.archive_name,
                'items_restored': 0,
                'items_failed': 0,
                'errors': []
            }
            
            # Process items (this would need entity-specific restoration logic)
            items = archive_data.get('items', [])
            for item_data in items:
                try:
                    # This is a placeholder - actual restoration would need
                    # entity-specific logic to recreate database records
                    results['items_restored'] += 1
                except Exception as e:
                    results['items_failed'] += 1
                    results['errors'].append(str(e))
            
            logger.info(f"Archive restoration completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Archive restoration failed: {str(e)}")
            raise
    
    def verify_archive_integrity(self, archive_id: str) -> Dict[str, Any]:
        """
        Verify the integrity of an archive.
        
        Args:
            archive_id: Archive ID to verify
        
        Returns:
            Dictionary with verification results
        """
        try:
            # Get archive record
            archive = self.db.query(AuditArchive).filter(
                AuditArchive.id == archive_id
            ).first()
            
            if not archive:
                raise ValueError(f"Archive not found: {archive_id}")
            
            results = {
                'archive_name': archive.archive_name,
                'file_exists': False,
                'checksum_valid': False,
                'decryption_successful': False,
                'data_valid': False,
                'verification_date': datetime.utcnow().isoformat()
            }
            
            # Check file existence
            if os.path.exists(archive.file_path):
                results['file_exists'] = True
                
                # Read file and verify checksum
                with open(archive.file_path, 'rb') as f:
                    file_data = f.read()
                
                file_checksum = hashlib.sha256(file_data).hexdigest()
                if file_checksum == archive.checksum:
                    results['checksum_valid'] = True
                    
                    try:
                        # Test decryption
                        compressed_data = self.fernet.decrypt(file_data)
                        results['decryption_successful'] = True
                        
                        # Test decompression and JSON parsing
                        json_data = gzip.decompress(compressed_data)
                        archive_data = json.loads(json_data.decode())
                        results['data_valid'] = True
                        
                        # Update archive verification timestamp
                        archive.last_verified = datetime.utcnow()
                        self.db.commit()
                        
                    except Exception as e:
                        logger.error(f"Archive content verification failed: {str(e)}")
            
            logger.info(f"Archive integrity verification: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Archive integrity verification failed: {str(e)}")
            raise
    
    def cleanup_expired_archives(self, days_old: int = 30) -> Dict[str, Any]:
        """
        Clean up archives older than specified days.
        
        Args:
            days_old: Number of days after which archives are considered for cleanup
        
        Returns:
            Dictionary with cleanup results
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Find old archives
            old_archives = self.db.query(AuditArchive).filter(
                and_(
                    AuditArchive.created_at < cutoff_date,
                    AuditArchive.status == "ACTIVE"
                )
            ).all()
            
            results = {
                'archives_processed': 0,
                'archives_deleted': 0,
                'files_removed': 0,
                'errors': []
            }
            
            for archive in old_archives:
                try:
                    results['archives_processed'] += 1
                    
                    # Remove file if it exists
                    if os.path.exists(archive.file_path):
                        os.remove(archive.file_path)
                        results['files_removed'] += 1
                    
                    # Mark archive as deleted
                    archive.status = "DELETED"
                    self.db.commit()
                    results['archives_deleted'] += 1
                    
                    logger.info(f"Cleaned up archive: {archive.archive_name}")
                    
                except Exception as e:
                    error_msg = f"Error cleaning archive {archive.id}: {str(e)}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            logger.info(f"Archive cleanup completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Archive cleanup failed: {str(e)}")
            raise
    
    def _create_compliance_violation(
        self, 
        policy: RetentionPolicy, 
        item: Any, 
        description: str
    ):
        """Create a compliance violation for retention policy failures."""
        try:
            violation = ComplianceViolation(
                violation_type=ViolationType.DATA_RETENTION,
                entity_type=policy.entity_type,
                entity_id=str(item.id),
                severity=AuditSeverity.HIGH,
                title=f"Data Retention Policy Violation: {policy.name}",
                description=description,
                compliance_rule=f"Retention policy: {policy.name}",
                remediation_steps="Review retention policy and manually process item if needed"
            )
            self.db.add(violation)
            self.db.commit()
            
            logger.warning(f"Created compliance violation for item {item.id}: {description}")
            
        except Exception as e:
            logger.error(f"Failed to create compliance violation: {str(e)}")
    
    # Entity-specific processors (placeholders for now)
    def _process_case_retention(self, item: Case, policy: RetentionPolicy):
        """Process case-specific retention logic."""
        # Implement case-specific retention rules
        pass
    
    def _process_evidence_retention(self, item: Evidence, policy: RetentionPolicy):
        """Process evidence-specific retention logic."""
        # Implement evidence-specific retention rules
        # Consider chain of custody requirements
        pass
    
    def _process_party_retention(self, item: Party, policy: RetentionPolicy):
        """Process party-specific retention logic."""
        # Implement party-specific retention rules
        # Consider ongoing case dependencies
        pass
    
    def _process_legal_instrument_retention(self, item: LegalInstrument, policy: RetentionPolicy):
        """Process legal instrument-specific retention logic."""
        # Implement legal instrument-specific retention rules
        # Consider legal hold requirements
        pass
    
    def _process_audit_log_retention(self, item: AuditLog, policy: RetentionPolicy):
        """Process audit log-specific retention logic."""
        # Implement audit log-specific retention rules
        # Ensure compliance and chain integrity
        pass


class RetentionJobScheduler:
    """
    Scheduler for automated retention job execution.
    
    Handles background processing of retention policies and
    scheduling of periodic cleanup tasks.
    """
    
    def __init__(self, db: Session, retention_manager: RetentionManager):
        self.db = db
        self.retention_manager = retention_manager
    
    def schedule_retention_job(
        self, 
        job_type: str, 
        entity_type: str = None,
        policy_id: str = None,
        scheduled_at: datetime = None
    ) -> DataRetentionJob:
        """Schedule a new retention job."""
        try:
            job = DataRetentionJob(
                job_type=job_type,
                entity_type=entity_type,
                policy_id=policy_id,
                scheduled_at=scheduled_at or datetime.utcnow(),
                status="PENDING"
            )
            
            self.db.add(job)
            self.db.commit()
            
            logger.info(f"Scheduled retention job: {job_type} for {entity_type}")
            return job
            
        except Exception as e:
            logger.error(f"Failed to schedule retention job: {str(e)}")
            raise
    
    def process_pending_jobs(self) -> Dict[str, Any]:
        """Process all pending retention jobs."""
        try:
            pending_jobs = self.db.query(DataRetentionJob).filter(
                and_(
                    DataRetentionJob.status == "PENDING",
                    DataRetentionJob.scheduled_at <= datetime.utcnow()
                )
            ).all()
            
            results = {
                'jobs_processed': 0,
                'jobs_succeeded': 0,
                'jobs_failed': 0,
                'errors': []
            }
            
            for job in pending_jobs:
                try:
                    results['jobs_processed'] += 1
                    job.mark_started()
                    self.db.commit()
                    
                    # Execute job based on type
                    if job.job_type == "ARCHIVE":
                        job_results = self.retention_manager.process_retention_policies()
                    elif job.job_type == "DELETE":
                        job_results = self.retention_manager.process_retention_policies()
                    elif job.job_type == "CLEANUP":
                        job_results = self.retention_manager.cleanup_expired_archives()
                    else:
                        raise ValueError(f"Unknown job type: {job.job_type}")
                    
                    # Mark job as completed
                    job.mark_completed(
                        succeeded=job_results.get('items_archived', 0) + job_results.get('items_deleted', 0),
                        failed=len(job_results.get('errors', [])),
                        errors=job_results.get('errors')
                    )
                    self.db.commit()
                    
                    results['jobs_succeeded'] += 1
                    logger.info(f"Completed retention job {job.id}: {job_results}")
                    
                except Exception as e:
                    error_msg = f"Retention job {job.id} failed: {str(e)}"
                    logger.error(error_msg)
                    
                    job.mark_failed(str(e))
                    self.db.commit()
                    
                    results['jobs_failed'] += 1
                    results['errors'].append(error_msg)
            
            logger.info(f"Retention job processing completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Retention job processing failed: {str(e)}")
            raise