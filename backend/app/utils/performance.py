"""
API Performance Enhancement utilities for JCTC Management System.

This module provides:
- Response caching mechanisms
- Pagination optimizations
- Bulk operation optimizations
- API response time monitoring
- Performance metrics collection
"""

import functools
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import redis
import logging

from app.models import Case, Evidence, Charge, CourtSession
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CacheManager:
    """
    Redis-based cache manager for API responses.
    """
    
    def __init__(self, redis_url: str = None):
        try:
            import redis
            self.redis_client = redis.from_url(
                redis_url or settings.REDIS_URL or "redis://localhost:6379/0"
            )
            self.enabled = True
            logger.info("Redis cache enabled")
        except Exception as e:
            logger.warning(f"Redis not available, caching disabled: {e}")
            self.redis_client = None
            self.enabled = False
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters."""
        key_data = f"{prefix}:{json.dumps(kwargs, sort_keys=True, default=str)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.enabled:
            return None
        
        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                return json.loads(cached_data.decode())
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        return None
    
    def set(self, key: str, value: Any, expiry: int = 300) -> bool:
        """Set value in cache with expiry in seconds."""
        if not self.enabled:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            self.redis_client.setex(key, expiry, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, pattern: str) -> int:
        """Delete cache keys matching pattern."""
        if not self.enabled:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
        
        return 0
    
    def flush_cache_for_entity(self, entity_type: str, entity_id: str = None):
        """Flush cache for specific entity or entity type."""
        if entity_id:
            pattern = f"*{entity_type}*{entity_id}*"
        else:
            pattern = f"*{entity_type}*"
        
        deleted_keys = self.delete(pattern)
        logger.info(f"Flushed {deleted_keys} cache keys for {entity_type}")


# Global cache manager instance
cache_manager = CacheManager()


def cache_response(expiry: int = 300, key_prefix: str = None):
    """
    Decorator to cache API responses.
    
    Args:
        expiry: Cache expiry time in seconds (default 300 = 5 minutes)
        key_prefix: Optional prefix for cache key
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request parameters for cache key
            cache_params = {}
            
            # Extract common parameters
            for key, value in kwargs.items():
                if key not in ['db', 'current_user', 'request', 'response']:
                    if hasattr(value, 'dict'):  # Pydantic model
                        cache_params[key] = value.dict()
                    else:
                        cache_params[key] = str(value) if value is not None else None
            
            # Generate cache key
            prefix = key_prefix or func.__name__
            cache_key = cache_manager._generate_cache_key(prefix, **cache_params)
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                return JSONResponse(content=cached_result)
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            # Cache the response if it's successful
            if hasattr(result, 'status_code') and result.status_code == 200:
                cache_manager.set(cache_key, result.body.decode() if hasattr(result, 'body') else result, expiry)
                logger.debug(f"Cached result for key: {cache_key}")
            elif isinstance(result, (dict, list)):
                cache_manager.set(cache_key, result, expiry)
                logger.debug(f"Cached result for key: {cache_key}")
            
            return result
        
        return wrapper
    return decorator


class PaginationOptimizer:
    """
    Optimized pagination utilities for large datasets.
    """
    
    @staticmethod
    def optimize_pagination(query, page: int = 1, per_page: int = 50, max_per_page: int = 100):
        """
        Apply optimized pagination to SQLAlchemy query.
        
        Args:
            query: SQLAlchemy query object
            page: Page number (1-based)
            per_page: Items per page
            max_per_page: Maximum items per page allowed
            
        Returns:
            Tuple of (items, total_count, has_next, has_prev)
        """
        # Validate pagination parameters
        page = max(1, page)
        per_page = min(max_per_page, max(1, per_page))
        
        # Calculate offset
        offset = (page - 1) * per_page
        
        # Get total count efficiently (only if needed)
        total_count = query.count()
        
        # Apply pagination
        items = query.offset(offset).limit(per_page).all()
        
        # Calculate pagination metadata
        has_next = offset + per_page < total_count
        has_prev = page > 1
        
        return items, total_count, has_next, has_prev
    
    @staticmethod
    def cursor_pagination(query, cursor_field, cursor_value=None, limit: int = 50, direction: str = 'next'):
        """
        Implement cursor-based pagination for better performance on large datasets.
        
        Args:
            query: SQLAlchemy query object
            cursor_field: Field to use for cursor (should be indexed)
            cursor_value: Current cursor value
            limit: Number of items to return
            direction: 'next' or 'prev'
            
        Returns:
            Tuple of (items, next_cursor, prev_cursor)
        """
        if cursor_value is not None:
            if direction == 'next':
                query = query.filter(cursor_field > cursor_value)
            else:
                query = query.filter(cursor_field < cursor_value)
        
        # Apply limit + 1 to check if there are more items
        items = query.limit(limit + 1).all()
        
        has_more = len(items) > limit
        if has_more:
            items = items[:limit]
        
        # Generate cursors
        next_cursor = getattr(items[-1], cursor_field.key) if items and has_more else None
        prev_cursor = getattr(items[0], cursor_field.key) if items else None
        
        return items, next_cursor, prev_cursor


class BulkOperationOptimizer:
    """
    Optimize bulk database operations for better performance.
    """
    
    @staticmethod
    def bulk_create(db: Session, model_class, data_list: List[Dict[str, Any]], batch_size: int = 100):
        """
        Efficiently create multiple records in batches.
        
        Args:
            db: Database session
            model_class: SQLAlchemy model class
            data_list: List of dictionaries with model data
            batch_size: Number of records per batch
            
        Returns:
            Number of created records
        """
        created_count = 0
        
        try:
            for i in range(0, len(data_list), batch_size):
                batch = data_list[i:i + batch_size]
                
                # Create model instances
                instances = [model_class(**data) for data in batch]
                
                # Bulk insert
                db.bulk_save_objects(instances)
                created_count += len(instances)
                
                # Commit batch
                db.commit()
                logger.info(f"Bulk created batch: {len(instances)} records")
            
            logger.info(f"Bulk operation completed: {created_count} records created")
            return created_count
            
        except Exception as e:
            logger.error(f"Bulk create failed: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def bulk_update(db: Session, model_class, updates: List[Dict[str, Any]], batch_size: int = 100):
        """
        Efficiently update multiple records in batches.
        
        Args:
            db: Database session
            model_class: SQLAlchemy model class
            updates: List of dictionaries with id and update data
            batch_size: Number of records per batch
            
        Returns:
            Number of updated records
        """
        updated_count = 0
        
        try:
            for i in range(0, len(updates), batch_size):
                batch = updates[i:i + batch_size]
                
                # Bulk update
                db.bulk_update_mappings(model_class, batch)
                updated_count += len(batch)
                
                # Commit batch
                db.commit()
                logger.info(f"Bulk updated batch: {len(batch)} records")
            
            logger.info(f"Bulk operation completed: {updated_count} records updated")
            return updated_count
            
        except Exception as e:
            logger.error(f"Bulk update failed: {e}")
            db.rollback()
            raise


class PerformanceMonitor:
    """
    Monitor API performance and collect metrics.
    """
    
    def __init__(self):
        self.metrics = {}
        self.slow_query_threshold = 1.0  # seconds
        self.slow_queries = []
    
    def record_request_time(self, endpoint: str, execution_time: float, status_code: int = 200):
        """Record API request execution time."""
        if endpoint not in self.metrics:
            self.metrics[endpoint] = {
                'total_requests': 0,
                'total_time': 0.0,
                'min_time': float('inf'),
                'max_time': 0.0,
                'error_count': 0
            }
        
        metrics = self.metrics[endpoint]
        metrics['total_requests'] += 1
        metrics['total_time'] += execution_time
        metrics['min_time'] = min(metrics['min_time'], execution_time)
        metrics['max_time'] = max(metrics['max_time'], execution_time)
        
        if status_code >= 400:
            metrics['error_count'] += 1
        
        # Track slow queries
        if execution_time > self.slow_query_threshold:
            self.slow_queries.append({
                'endpoint': endpoint,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow(),
                'status_code': status_code
            })
            
            # Keep only recent slow queries
            if len(self.slow_queries) > 100:
                self.slow_queries = self.slow_queries[-50:]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary."""
        summary = {}
        
        for endpoint, metrics in self.metrics.items():
            avg_time = metrics['total_time'] / metrics['total_requests']
            error_rate = metrics['error_count'] / metrics['total_requests'] * 100
            
            summary[endpoint] = {
                'total_requests': metrics['total_requests'],
                'average_time': round(avg_time, 3),
                'min_time': round(metrics['min_time'], 3),
                'max_time': round(metrics['max_time'], 3),
                'error_rate': round(error_rate, 2),
                'status': 'healthy' if avg_time < 0.5 and error_rate < 5 else 'needs_attention'
            }
        
        return {
            'endpoints': summary,
            'slow_queries': self.slow_queries[-10:],  # Last 10 slow queries
            'generated_at': datetime.utcnow()
        }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def monitor_performance(func: Callable):
    """
    Decorator to monitor API endpoint performance.
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        status_code = 200
        
        try:
            result = await func(*args, **kwargs)
            
            # Extract status code if available
            if hasattr(result, 'status_code'):
                status_code = result.status_code
            
            return result
            
        except HTTPException as e:
            status_code = e.status_code
            raise
        except Exception as e:
            status_code = 500
            raise
        finally:
            execution_time = time.time() - start_time
            performance_monitor.record_request_time(
                func.__name__, execution_time, status_code
            )
    
    return wrapper


# Optimized query functions for common operations

@monitor_performance
def get_cases_with_pagination(
    db: Session,
    user_id: int = None,
    status: str = None,
    priority: str = None,
    page: int = 1,
    per_page: int = 50
) -> Dict[str, Any]:
    """
    Get cases with optimized pagination and filtering.
    """
    query = db.query(Case)
    
    # Apply filters
    if user_id:
        query = query.filter(Case.assigned_officer_id == user_id)
    if status:
        query = query.filter(Case.status == status)
    if priority:
        query = query.filter(Case.priority == priority)
    
    # Apply ordering
    query = query.order_by(Case.updated_at.desc())
    
    # Apply pagination
    cases, total_count, has_next, has_prev = PaginationOptimizer.optimize_pagination(
        query, page, per_page
    )
    
    return {
        'cases': cases,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page,
            'has_next': has_next,
            'has_prev': has_prev
        }
    }


@monitor_performance
def get_evidence_with_cursor_pagination(
    db: Session,
    case_id: int = None,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Get evidence with cursor-based pagination for better performance.
    """
    query = db.query(Evidence)
    
    if case_id:
        query = query.filter(Evidence.case_id == case_id)
    
    query = query.order_by(Evidence.created_at.desc())
    
    # Apply cursor pagination
    evidence, next_cursor, prev_cursor = PaginationOptimizer.cursor_pagination(
        query, Evidence.created_at, cursor, limit
    )
    
    return {
        'evidence': evidence,
        'pagination': {
            'next_cursor': next_cursor,
            'prev_cursor': prev_cursor,
            'limit': limit,
            'count': len(evidence)
        }
    }

def invalidate_cache_on_update(entity_type: str, entity_id: str = None):
    """
    Decorator to invalidate cache when entity is updated.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Invalidate relevant cache entries
            cache_manager.flush_cache_for_entity(entity_type, entity_id)
            
            return result
        
        return wrapper
    return decorator


# Performance optimization middleware

class PerformanceMiddleware:
    """
    Middleware for API performance optimization.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Add performance headers
            start_time = time.time()
            
            # Call the next middleware/app
            response = await self.app(scope, receive, send)
            
            # Calculate request time
            request_time = time.time() - start_time
            
            # Add performance headers to response
            if hasattr(response, 'headers'):
                response.headers["X-Response-Time"] = str(round(request_time * 1000, 2))
                response.headers["X-Cache-Status"] = "MISS"  # Can be updated by cache middleware
            
            return response
        
        return await self.app(scope, receive, send)