"""
Database Performance Optimization for JCTC Management System.

This module provides performance optimizations including:
- Optimized database indexes for prosecution and device tables
- Connection pooling configuration
- Query performance monitoring
- Database health checks and metrics
"""

from sqlalchemy import Index, text, func, desc
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
import time

from app.database.session import get_db
from app.models import (
    Case, User, Charge, CourtSession, Outcome, 
    Seizure, Device, Artefact, EvidenceItem,
    ChainOfCustody, AuditLog, Party, LegalInstrument
)

logger = logging.getLogger(__name__)


class DatabasePerformanceOptimizer:
    """
    Database performance optimization and monitoring utilities.
    """
    
    def __init__(self, engine: Engine):
        self.engine = engine
        self.query_metrics = {}
        
    def create_optimized_indexes(self, db: Session) -> Dict[str, bool]:
        """
        Create optimized indexes for improved query performance.
        
        Returns:
            Dict of index creation results
        """
        results = {}
        
        try:
            # Prosecution-related indexes
            prosecution_indexes = [
                # Charges table indexes
                Index('idx_charges_case_id', Charge.case_id),
                Index('idx_charges_status', Charge.status),
                Index('idx_charges_filed_date', Charge.filed_date),
                Index('idx_charges_prosecutor_id', Charge.prosecutor_id),
                Index('idx_charges_case_status_combo', Charge.case_id, Charge.status),
                
                # Court sessions indexes  
                Index('idx_court_sessions_case_id', CourtSession.case_id),
                Index('idx_court_sessions_date', CourtSession.session_date),
                Index('idx_court_sessions_type', CourtSession.session_type),
                Index('idx_court_sessions_status', CourtSession.status),
                Index('idx_court_sessions_judge', CourtSession.judge_name),
                Index('idx_court_sessions_date_status', CourtSession.session_date, CourtSession.status),
                
                # Outcomes indexes
                Index('idx_outcomes_case_id', Outcome.case_id),
                Index('idx_outcomes_date', Outcome.outcome_date),
                Index('idx_outcomes_type', Outcome.outcome_type),
                Index('idx_outcomes_verdict', Outcome.verdict),
            ]
            
            # Device and forensics indexes
            device_indexes = [
                # Seizures indexes
                Index('idx_seizures_case_id', Seizure.case_id),
                Index('idx_seizures_seized_date', Seizure.seized_at),
                Index('idx_seizures_officer_id', Seizure.officer_id),
                Index('idx_seizures_location', Seizure.location),
                Index('idx_seizures_case_date_combo', Seizure.case_id, Seizure.seized_at),
                
                # Devices indexes
                Index('idx_devices_seizure_id', Device.seizure_id),
                Index('idx_devices_type', Device.device_type),
                Index('idx_devices_imaging_status', Device.imaging_status),
                Index('idx_devices_imaged', Device.imaged),
                Index('idx_devices_technician_id', Device.imaging_technician_id),
                Index('idx_devices_imaging_date', Device.imaging_completed_at),
                Index('idx_devices_type_status_combo', Device.device_type, Device.imaging_status),
                
                # Artifacts indexes
                Index('idx_artifacts_device_id', Artefact.device_id),
                Index('idx_artifacts_type', Artefact.artefact_type),
                Index('idx_artifacts_source_tool', Artefact.source_tool),
                Index('idx_artifacts_created_date', Artefact.created_at),
            ]
            
            # Core system indexes (enhanced)
            core_indexes = [
                # Cases indexes (enhanced)
                Index('idx_cases_status', Case.status),
                Index('idx_cases_priority', Case.priority),
                Index('idx_cases_created_date', Case.created_at),
                Index('idx_cases_updated_date', Case.updated_at),
                Index('idx_cases_assigned_officer', Case.assigned_officer_id),
                Index('idx_cases_case_type', Case.case_type_id),
                Index('idx_cases_status_priority_combo', Case.status, Case.priority),
                Index('idx_cases_assigned_status_combo', Case.assigned_officer_id, Case.status),
                
                # Evidence indexes (enhanced)
                Index('idx_evidence_case_id', EvidenceItem.case_id),
                Index('idx_evidence_type', EvidenceItem.evidence_type),
                Index('idx_evidence_custody_status', EvidenceItem.custody_status),
                Index('idx_evidence_collected_date', EvidenceItem.date_collected),
                Index('idx_evidence_custodian', EvidenceItem.current_custodian_id),
                Index('idx_evidence_case_type_combo', EvidenceItem.case_id, EvidenceItem.evidence_type),
                
                # Chain of custody indexes
                Index('idx_custody_evidence_id', ChainOfCustody.evidence_item_id),
                Index('idx_custody_transfer_date', ChainOfCustody.transferred_at),
                Index('idx_custody_custodian', ChainOfCustody.new_custodian_id),
                Index('idx_custody_action', ChainOfCustody.action),
                
                # Audit log indexes (enhanced)
                Index('idx_audit_user_id', AuditLog.user_id),
                Index('idx_audit_action', AuditLog.action),
                Index('idx_audit_entity', AuditLog.entity),
                Index('idx_audit_timestamp', AuditLog.timestamp),
                Index('idx_audit_level', AuditLog.level),
                Index('idx_audit_entity_id', AuditLog.entity_id),
                Index('idx_audit_user_timestamp_combo', AuditLog.user_id, AuditLog.timestamp),
                Index('idx_audit_entity_action_combo', AuditLog.entity, AuditLog.action),
                
                # Users indexes
                Index('idx_users_email', User.email),
                Index('idx_users_role', User.role),
                Index('idx_users_active', User.is_active),
                Index('idx_users_organization', User.organization),
                
                # Parties indexes
                Index('idx_parties_email', Party.email_address),
                Index('idx_parties_phone', Party.phone_number),
                Index('idx_parties_id_number', Party.id_number),
                Index('idx_parties_passport', Party.passport_number),
                Index('idx_parties_created_date', Party.created_at),
                
                # Legal instruments indexes
                Index('idx_legal_instruments_case_id', LegalInstrument.case_id),
                Index('idx_legal_instruments_type', LegalInstrument.instrument_type),
                Index('idx_legal_instruments_status', LegalInstrument.status),
                Index('idx_legal_instruments_issued_date', LegalInstrument.date_issued),
                Index('idx_legal_instruments_expiry_date', LegalInstrument.expiry_date),
            ]
            
            # Create all indexes
            all_indexes = prosecution_indexes + device_indexes + core_indexes
            
            for index in all_indexes:
                try:
                    # Check if index already exists
                    index_exists = db.execute(text(
                        f"SELECT 1 FROM pg_indexes WHERE indexname = '{index.name}'"
                    )).fetchone()
                    
                    if not index_exists:
                        index.create(bind=db.bind, checkfirst=True)
                        results[index.name] = True
                        logger.info(f"Created index: {index.name}")
                    else:
                        results[index.name] = False
                        logger.info(f"Index already exists: {index.name}")
                        
                except Exception as e:
                    results[index.name] = f"Error: {str(e)}"
                    logger.error(f"Failed to create index {index.name}: {str(e)}")
            
            db.commit()
            logger.info(f"Database index optimization completed. {len([r for r in results.values() if r is True])} new indexes created.")
            
        except Exception as e:
            logger.error(f"Database index optimization failed: {str(e)}")
            db.rollback()
            results['error'] = str(e)
        
        return results
    
    def configure_connection_pool(self) -> Dict[str, Any]:
        """
        Configure optimized database connection pooling.
        
        Returns:
            Connection pool configuration details
        """
        pool_config = {
            'pool_size': 20,  # Base number of connections in the pool
            'max_overflow': 30,  # Additional connections beyond pool_size
            'pool_timeout': 30,  # Seconds to wait for connection
            'pool_recycle': 3600,  # Recycle connections after 1 hour
            'pool_pre_ping': True,  # Verify connections before use
        }
        
        # Apply connection pool settings
        if hasattr(self.engine, 'pool'):
            self.engine.pool.size = pool_config['pool_size']
            self.engine.pool.timeout = pool_config['pool_timeout']
            self.engine.pool.recycle = pool_config['pool_recycle']
            
        logger.info(f"Database connection pool configured: {pool_config}")
        return pool_config
    
    def analyze_query_performance(self, db: Session) -> Dict[str, Any]:
        """
        Analyze database query performance and identify slow queries.
        
        Returns:
            Query performance analysis results
        """
        try:
            # Enable PostgreSQL query statistics (if available)
            db.execute(text("SELECT pg_stat_statements_reset();"))
            
            # Get current query statistics
            slow_queries = db.execute(text("""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows,
                    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                FROM pg_stat_statements 
                WHERE mean_time > 100  -- Queries taking more than 100ms on average
                ORDER BY mean_time DESC 
                LIMIT 10
            """)).fetchall()
            
            # Get table statistics
            table_stats = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC
            """)).fetchall()
            
            # Get index usage statistics
            index_stats = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes 
                ORDER BY idx_tup_read DESC 
                LIMIT 20
            """)).fetchall()
            
            analysis = {
                'timestamp': datetime.utcnow(),
                'slow_queries': [dict(row) for row in slow_queries],
                'table_statistics': [dict(row) for row in table_stats],
                'index_usage': [dict(row) for row in index_stats],
                'recommendations': self._generate_performance_recommendations(slow_queries, table_stats)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Query performance analysis failed: {str(e)}")
            return {'error': str(e)}
    
    def _generate_performance_recommendations(self, slow_queries, table_stats) -> List[str]:
        """
        Generate performance optimization recommendations based on analysis.
        """
        recommendations = []
        
        # Check for slow queries
        if slow_queries and len(slow_queries) > 0:
            recommendations.append("Consider optimizing slow queries with mean_time > 100ms")
            recommendations.append("Review and add appropriate indexes for frequent WHERE clauses")
        
        # Check for tables with high dead tuple counts
        for row in table_stats:
            dead_ratio = row.dead_tuples / (row.live_tuples + 1)  # Avoid division by zero
            if dead_ratio > 0.1:  # More than 10% dead tuples
                recommendations.append(f"Consider VACUUM for table {row.tablename} (high dead tuple ratio)")
        
        # General recommendations
        recommendations.extend([
            "Enable pg_stat_statements extension for better query monitoring",
            "Consider implementing query result caching for frequently accessed data",
            "Monitor connection pool usage and adjust pool size if needed",
            "Set up regular ANALYZE and VACUUM operations for optimal performance"
        ])
        
        return recommendations
    
    def get_database_health_metrics(self, db: Session) -> Dict[str, Any]:
        """
        Get comprehensive database health and performance metrics.
        
        Returns:
            Database health metrics
        """
        try:
            # Connection statistics
            connection_stats = db.execute(text("""
                SELECT 
                    state,
                    COUNT(*) as count
                FROM pg_stat_activity 
                WHERE datname = current_database()
                GROUP BY state
            """)).fetchall()
            
            # Database size
            db_size = db.execute(text("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """)).scalar()
            
            # Cache hit ratio
            cache_hit_ratio = db.execute(text("""
                SELECT 
                    100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) as cache_hit_ratio
                FROM pg_stat_database 
                WHERE datname = current_database()
            """)).scalar()
            
            # Lock statistics
            lock_stats = db.execute(text("""
                SELECT 
                    mode,
                    COUNT(*) as count
                FROM pg_locks 
                GROUP BY mode
            """)).fetchall()
            
            # Recent query activity
            recent_activity = db.execute(text("""
                SELECT 
                    COUNT(*) as total_queries,
                    COUNT(*) FILTER (WHERE state = 'active') as active_queries,
                    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """)).fetchone()
            
            metrics = {
                'timestamp': datetime.utcnow(),
                'database_size': db_size,
                'cache_hit_ratio': float(cache_hit_ratio) if cache_hit_ratio else 0.0,
                'connection_stats': [{'state': row.state, 'count': row.count} for row in connection_stats],
                'lock_stats': [{'mode': row.mode, 'count': row.count} for row in lock_stats],
                'query_activity': {
                    'total_queries': recent_activity.total_queries,
                    'active_queries': recent_activity.active_queries,
                    'idle_connections': recent_activity.idle_connections
                },
                'health_status': 'healthy' if float(cache_hit_ratio or 0) > 95 else 'needs_attention'
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Database health metrics collection failed: {str(e)}")
            return {'error': str(e), 'health_status': 'error'}


def optimize_database_performance(engine: Engine) -> Dict[str, Any]:
    """
    Run complete database performance optimization.
    
    Args:
        engine: SQLAlchemy database engine
        
    Returns:
        Optimization results
    """
    optimizer = DatabasePerformanceOptimizer(engine)
    results = {}
    
    # Configure connection pooling
    results['connection_pool'] = optimizer.configure_connection_pool()
    
    # Create optimized indexes
    with Session(engine) as db:
        results['indexes'] = optimizer.create_optimized_indexes(db)
        
        # Analyze query performance
        results['performance_analysis'] = optimizer.analyze_query_performance(db)
        
        # Get health metrics
        results['health_metrics'] = optimizer.get_database_health_metrics(db)
    
    return results


def monitor_query_execution_time(func):
    """
    Decorator to monitor query execution time.
    
    Usage:
        @monitor_query_execution_time
        def my_database_function(db: Session):
            return db.query(Model).all()
    """
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        if execution_time > 1.0:  # Log queries taking more than 1 second
            logger.warning(f"Slow query detected: {func.__name__} took {execution_time:.2f} seconds")
        
        return result
    
    return wrapper


# Optimized query functions for frequently used operations

@monitor_query_execution_time
def get_user_cases_optimized(db: Session, user_id: int, limit: int = 50) -> List[Case]:
    """
    Optimized query to get user's assigned cases.
    """
    return db.query(Case).filter(
        Case.assigned_officer_id == user_id
    ).order_by(desc(Case.updated_at)).limit(limit).all()


@monitor_query_execution_time
def get_case_evidence_optimized(db: Session, case_id: int, limit: int = 100) -> List[EvidenceItem]:
    """
    Optimized query to get case evidence with custody info.
    """
    return db.query(EvidenceItem).filter(
        EvidenceItem.case_id == case_id
    ).order_by(desc(EvidenceItem.date_collected)).limit(limit).all()


@monitor_query_execution_time
def get_prosecution_dashboard_data(db: Session, prosecutor_id: int) -> Dict[str, Any]:
    """
    Optimized query for prosecution dashboard data.
    """
    # Get charges statistics
    charges_stats = db.query(
        Charge.status,
        func.count(Charge.id).label('count')
    ).filter(
        Charge.prosecutor_id == prosecutor_id
    ).group_by(Charge.status).all()
    
    # Get upcoming court sessions
    upcoming_sessions = db.query(CourtSession).filter(
        CourtSession.session_date >= datetime.utcnow(),
        CourtSession.status == 'SCHEDULED'
    ).order_by(CourtSession.session_date).limit(10).all()
    
    # Get recent outcomes
    recent_outcomes = db.query(Outcome).order_by(
        desc(Outcome.outcome_date)
    ).limit(5).all()
    
    return {
        'charges_statistics': [{'status': stat.status, 'count': stat.count} for stat in charges_stats],
        'upcoming_sessions': upcoming_sessions,
        'recent_outcomes': recent_outcomes,
        'generated_at': datetime.utcnow()
    }


@monitor_query_execution_time
def get_forensic_workload_optimized(db: Session, technician_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Optimized query for forensic workload statistics.
    """
    query = db.query(Device)
    
    if technician_id:
        query = query.filter(Device.imaging_technician_id == technician_id)
    
    # Get device statistics by imaging status
    device_stats = query.with_entities(
        Device.imaging_status,
        func.count(Device.id).label('count')
    ).group_by(Device.imaging_status).all()
    
    # Get devices by type
    type_stats = query.with_entities(
        Device.device_type,
        func.count(Device.id).label('count')
    ).group_by(Device.device_type).all()
    
    return {
        'imaging_status_breakdown': [{'status': stat.imaging_status, 'count': stat.count} for stat in device_stats],
        'device_type_breakdown': [{'type': stat.device_type, 'count': stat.count} for stat in type_stats],
        'generated_at': datetime.utcnow()
    }