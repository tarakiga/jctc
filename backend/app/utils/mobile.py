import json
import gzip
import base64
import hashlib
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from functools import wraps
import asyncio
import logging
from dataclasses import dataclass
from enum import Enum

from ..schemas.mobile import (
    MobileSyncRequest, MobileSyncResponse, OfflineAction,
    CompressedResponse, MobileOptimizationSettings,
    MobileCacheEntry, MobileStorageInfo, MobileContext,
    MobilePerformanceMetrics, MobileError, SyncEntityType
)

logger = logging.getLogger(__name__)

class CacheLevel(str, Enum):
    MEMORY = "memory"
    DISK = "disk"
    SECURE = "secure"

class NetworkType(str, Enum):
    WIFI = "wifi"
    CELLULAR = "cellular"
    OFFLINE = "offline"
    UNKNOWN = "unknown"

@dataclass
class SyncConflict:
    """Represents a sync conflict between client and server"""
    entity_type: str
    entity_id: str
    client_version: int
    server_version: int
    client_data: Dict[str, Any]
    server_data: Dict[str, Any]
    conflict_fields: List[str]
    resolution_strategy: str = "manual"

class MobileCompressionUtils:
    """Utilities for data compression optimized for mobile"""
    
    @staticmethod
    def should_compress(data: Union[str, bytes, Dict], threshold: int = 1024) -> bool:
        """Determine if data should be compressed based on size threshold"""
        if isinstance(data, dict):
            data_size = len(json.dumps(data, default=str).encode('utf-8'))
        elif isinstance(data, str):
            data_size = len(data.encode('utf-8'))
        else:
            data_size = len(data)
        
        return data_size > threshold
    
    @staticmethod
    def compress_data(data: Union[str, Dict[str, Any]], encoding: str = "gzip") -> CompressedResponse:
        """Compress data for mobile transmission"""
        try:
            # Convert to JSON string if dict
            if isinstance(data, dict):
                json_str = json.dumps(data, default=str, separators=(',', ':'))
            else:
                json_str = data
            
            original_data = json_str.encode('utf-8')
            original_size = len(original_data)
            
            if encoding == "gzip":
                compressed_data = gzip.compress(original_data)
            else:
                raise ValueError(f"Unsupported encoding: {encoding}")
            
            compressed_size = len(compressed_data)
            compression_ratio = compressed_size / original_size if original_size > 0 else 1.0
            
            # Encode as base64 for JSON transport
            encoded_data = base64.b64encode(compressed_data).decode('ascii')
            
            return CompressedResponse(
                compressed=True,
                encoding=encoding,
                data=encoded_data,
                original_size=original_size,
                compressed_size=compressed_size,
                compression_ratio=compression_ratio
            )
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            raise
    
    @staticmethod
    def decompress_data(compressed_response: CompressedResponse) -> Dict[str, Any]:
        """Decompress data received from mobile client"""
        try:
            # Decode from base64
            compressed_data = base64.b64decode(compressed_response.data.encode('ascii'))
            
            if compressed_response.encoding == "gzip":
                decompressed_data = gzip.decompress(compressed_data)
            else:
                raise ValueError(f"Unsupported encoding: {compressed_response.encoding}")
            
            json_str = decompressed_data.decode('utf-8')
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"Decompression failed: {e}")
            raise

class MobileCacheManager:
    """Cache manager optimized for mobile environments"""
    
    def __init__(self, max_memory_size: int = 50 * 1024 * 1024):  # 50MB default
        self.memory_cache: Dict[str, MobileCacheEntry] = {}
        self.max_memory_size = max_memory_size
        self.current_memory_usage = 0
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate a consistent cache key"""
        key_parts = [prefix]
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get data from cache"""
        if key not in self.memory_cache:
            return None
        
        entry = self.memory_cache[key]
        
        # Check if expired
        if entry.expires_at <= datetime.utcnow():
            self.delete(key)
            return None
        
        # Update access stats
        entry.last_accessed = datetime.utcnow()
        entry.access_count += 1
        
        return entry.data
    
    def set(self, key: str, data: Dict[str, Any], ttl_seconds: int = 300) -> bool:
        """Set data in cache with TTL"""
        try:
            # Calculate size
            data_size = len(json.dumps(data, default=str).encode('utf-8'))
            
            # Check if we need to evict entries
            if self.current_memory_usage + data_size > self.max_memory_size:
                self._evict_lru_entries(data_size)
            
            expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            
            entry = MobileCacheEntry(
                key=key,
                data=data,
                expires_at=expires_at,
                size_bytes=data_size,
                last_accessed=datetime.utcnow(),
                access_count=0,
                cache_level=CacheLevel.MEMORY
            )
            
            # Remove old entry if exists
            if key in self.memory_cache:
                old_entry = self.memory_cache[key]
                self.current_memory_usage -= old_entry.size_bytes
            
            self.memory_cache[key] = entry
            self.current_memory_usage += data_size
            
            return True
        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete entry from cache"""
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            self.current_memory_usage -= entry.size_bytes
            del self.memory_cache[key]
            return True
        return False
    
    def _evict_lru_entries(self, needed_space: int) -> None:
        """Evict least recently used entries to free space"""
        # Sort by last_accessed (oldest first)
        sorted_entries = sorted(
            self.memory_cache.items(),
            key=lambda x: x[1].last_accessed
        )
        
        freed_space = 0
        keys_to_delete = []
        
        for key, entry in sorted_entries:
            keys_to_delete.append(key)
            freed_space += entry.size_bytes
            
            if freed_space >= needed_space:
                break
        
        for key in keys_to_delete:
            self.delete(key)
        
        logger.info(f"Evicted {len(keys_to_delete)} cache entries, freed {freed_space} bytes")
    
    def get_storage_info(self) -> MobileStorageInfo:
        """Get current cache storage information"""
        return MobileStorageInfo(
            total_storage=self.max_memory_size,
            used_storage=self.current_memory_usage,
            cache_storage=self.current_memory_usage,
            offline_storage=0,  # Would be calculated separately
            free_storage=self.max_memory_size - self.current_memory_usage,
            storage_limit=self.max_memory_size,
            cleanup_recommended=self.current_memory_usage > (self.max_memory_size * 0.8)
        )

class MobileSyncEngine:
    """Synchronization engine for mobile offline support"""
    
    def __init__(self):
        self.conflict_resolvers = {
            "cases": self._resolve_case_conflict,
            "tasks": self._resolve_task_conflict,
            "evidence": self._resolve_evidence_conflict
        }
    
    async def process_sync_request(
        self, 
        sync_request: MobileSyncRequest, 
        user_id: str
    ) -> MobileSyncResponse:
        """Process a synchronization request from mobile client"""
        try:
            sync_timestamp = datetime.utcnow()
            changes = {}
            conflicts = []
            offline_action_results = []
            
            # Process offline actions first
            if sync_request.offline_actions:
                offline_action_results = await self._process_offline_actions(
                    sync_request.offline_actions, user_id
                )
                
                # Check for conflicts
                conflicts = await self._detect_conflicts(
                    sync_request.offline_actions, user_id
                )
            
            # Get server changes since last sync
            for entity_type in sync_request.sync_entities:
                entity_changes = await self._get_entity_changes(
                    entity_type,
                    sync_request.last_sync_timestamp,
                    sync_request.max_items_per_entity,
                    user_id,
                    sync_request.include_deleted
                )
                changes[entity_type.value] = entity_changes
            
            # Calculate next sync recommendation
            next_sync = sync_timestamp + timedelta(minutes=15)  # 15 min default
            
            return MobileSyncResponse(
                sync_timestamp=sync_timestamp,
                changes=changes,
                conflicts=conflicts,
                offline_action_results=offline_action_results,
                next_sync_recommended=next_sync,
                server_time=sync_timestamp,
                sync_statistics={
                    "total_changes": sum(len(changes.get(et.value, [])) for et in sync_request.sync_entities),
                    "conflicts_detected": len(conflicts),
                    "offline_actions_processed": len(offline_action_results)
                }
            )
        except Exception as e:
            logger.error(f"Sync processing failed: {e}")
            raise
    
    async def _process_offline_actions(
        self, 
        offline_actions: List[OfflineAction], 
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Process offline actions from mobile client"""
        results = []
        
        for action in offline_actions:
            try:
                result = await self._execute_offline_action(action, user_id)
                results.append({
                    "action_id": action.action_id,
                    "success": True,
                    "result": result,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                logger.error(f"Failed to process offline action {action.action_id}: {e}")
                results.append({
                    "action_id": action.action_id,
                    "success": False,
                    "error": str(e),
                    "retry_recommended": action.retry_count < 3,
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        return results
    
    async def _execute_offline_action(
        self, 
        action: OfflineAction, 
        user_id: str
    ) -> Dict[str, Any]:
        """Execute a single offline action"""
        # This would integrate with your actual database operations
        # Placeholder implementation
        
        if action.action_type.value == "create_task":
            # Create new task
            task_data = action.data
            task_data["created_by"] = user_id
            task_data["created_at"] = datetime.utcnow()
            # TODO: Integrate with actual task creation logic
            return {"id": f"task_{action.action_id}", "status": "created"}
        
        elif action.action_type.value == "update_task":
            # Update existing task
            # TODO: Integrate with actual task update logic
            return {"id": action.entity_id, "status": "updated"}
        
        elif action.action_type.value == "add_comment":
            # Add comment to entity
            # TODO: Integrate with actual comment system
            return {"id": f"comment_{action.action_id}", "status": "added"}
        
        else:
            raise ValueError(f"Unsupported offline action: {action.action_type}")
    
    async def _detect_conflicts(
        self, 
        offline_actions: List[OfflineAction], 
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Detect conflicts between offline actions and server state"""
        conflicts = []
        
        for action in offline_actions:
            if action.entity_id and action.action_type.value in ["update_task", "add_comment"]:
                # Check if entity was modified on server since action timestamp
                # This would query your actual database
                server_modified = await self._get_entity_last_modified(
                    action.entity_type, action.entity_id
                )
                
                if server_modified and server_modified > action.timestamp:
                    conflict = {
                        "action_id": action.action_id,
                        "entity_type": action.entity_type,
                        "entity_id": action.entity_id,
                        "conflict_type": "concurrent_modification",
                        "client_timestamp": action.timestamp.isoformat(),
                        "server_timestamp": server_modified.isoformat(),
                        "resolution_options": ["use_client", "use_server", "merge"]
                    }
                    conflicts.append(conflict)
        
        return conflicts
    
    async def _get_entity_changes(
        self, 
        entity_type: SyncEntityType, 
        since_timestamp: Optional[datetime],
        max_items: int,
        user_id: str,
        include_deleted: bool
    ) -> List[Dict[str, Any]]:
        """Get changes for a specific entity type since timestamp"""
        # This would integrate with your actual database queries
        # Placeholder implementation
        
        changes = []
        
        if entity_type == SyncEntityType.CASES:
            # Get case changes since timestamp
            # TODO: Implement actual database query
            pass
        elif entity_type == SyncEntityType.TASKS:
            # Get task changes since timestamp
            # TODO: Implement actual database query
            pass
        elif entity_type == SyncEntityType.EVIDENCE:
            # Get evidence changes since timestamp
            # TODO: Implement actual database query
            pass
        
        return changes[:max_items]
    
    async def _get_entity_last_modified(
        self, 
        entity_type: str, 
        entity_id: str
    ) -> Optional[datetime]:
        """Get the last modified timestamp for an entity"""
        # TODO: Implement actual database query
        return None
    
    def _resolve_case_conflict(self, conflict: SyncConflict) -> Dict[str, Any]:
        """Resolve conflicts for case entities"""
        # Implement case-specific conflict resolution
        return {"resolution": "merged", "data": conflict.server_data}
    
    def _resolve_task_conflict(self, conflict: SyncConflict) -> Dict[str, Any]:
        """Resolve conflicts for task entities"""
        # Implement task-specific conflict resolution
        return {"resolution": "merged", "data": conflict.server_data}
    
    def _resolve_evidence_conflict(self, conflict: SyncConflict) -> Dict[str, Any]:
        """Resolve conflicts for evidence entities"""
        # Implement evidence-specific conflict resolution
        return {"resolution": "merged", "data": conflict.server_data}

class MobileOptimizationUtils:
    """Utilities for mobile performance optimization"""
    
    @staticmethod
    def optimize_for_network(
        data: Dict[str, Any], 
        network_type: NetworkType,
        settings: MobileOptimizationSettings
    ) -> Dict[str, Any]:
        """Optimize data based on network conditions"""
        optimized_data = data.copy()
        
        if network_type == NetworkType.CELLULAR:
            # More aggressive optimization for cellular
            optimized_data = MobileOptimizationUtils._reduce_payload_size(
                optimized_data, reduction_factor=0.7
            )
        elif network_type == NetworkType.WIFI:
            # Less aggressive optimization for WiFi
            optimized_data = MobileOptimizationUtils._reduce_payload_size(
                optimized_data, reduction_factor=0.9
            )
        
        return optimized_data
    
    @staticmethod
    def _reduce_payload_size(data: Dict[str, Any], reduction_factor: float) -> Dict[str, Any]:
        """Reduce payload size by removing or truncating fields"""
        optimized = {}
        
        for key, value in data.items():
            if isinstance(value, str) and len(value) > 200:
                # Truncate long strings
                optimized[key] = value[:int(200 * reduction_factor)] + "..."
            elif isinstance(value, list) and len(value) > 10:
                # Limit list sizes
                optimized[key] = value[:int(10 * reduction_factor)]
            elif isinstance(value, dict):
                # Recursively optimize nested objects
                optimized[key] = MobileOptimizationUtils._reduce_payload_size(
                    value, reduction_factor
                )
            else:
                optimized[key] = value
        
        return optimized
    
    @staticmethod
    def calculate_data_usage(data: Union[str, Dict[str, Any]]) -> int:
        """Calculate approximate data usage in bytes"""
        if isinstance(data, dict):
            json_str = json.dumps(data, default=str)
        else:
            json_str = data
        
        return len(json_str.encode('utf-8'))
    
    @staticmethod
    def should_use_compression(
        data_size: int, 
        network_type: NetworkType,
        settings: MobileOptimizationSettings
    ) -> bool:
        """Determine if compression should be used based on conditions"""
        if not settings.enable_compression:
            return False
        
        if network_type == NetworkType.CELLULAR:
            # Use compression more aggressively on cellular
            return data_size > (settings.compression_threshold // 2)
        else:
            return data_size > settings.compression_threshold

class MobileMetricsCollector:
    """Collect and analyze mobile performance metrics"""
    
    def __init__(self):
        self.metrics_buffer = []
        self.performance_thresholds = {
            "api_response_time": 2000,  # 2 seconds
            "sync_duration": 10000,     # 10 seconds
            "cache_hit_rate": 0.8,      # 80%
            "memory_usage": 100         # 100MB
        }
    
    def record_performance_metric(self, metric: MobilePerformanceMetrics) -> None:
        """Record a performance metric"""
        self.metrics_buffer.append(metric)
        
        # Analyze for performance issues
        issues = self._analyze_performance_issues(metric)
        if issues:
            logger.warning(f"Performance issues detected for device {metric.device_id}: {issues}")
    
    def _analyze_performance_issues(self, metric: MobilePerformanceMetrics) -> List[str]:
        """Analyze metrics for performance issues"""
        issues = []
        
        # Check API response times
        for endpoint, response_time in metric.api_response_times.items():
            if response_time > self.performance_thresholds["api_response_time"]:
                issues.append(f"Slow API response for {endpoint}: {response_time}ms")
        
        # Check sync duration
        if metric.sync_duration > self.performance_thresholds["sync_duration"]:
            issues.append(f"Slow sync duration: {metric.sync_duration}ms")
        
        # Check cache hit rate
        if metric.cache_hit_rate < self.performance_thresholds["cache_hit_rate"]:
            issues.append(f"Low cache hit rate: {metric.cache_hit_rate:.2%}")
        
        # Check memory usage
        if metric.memory_usage and metric.memory_usage > self.performance_thresholds["memory_usage"]:
            issues.append(f"High memory usage: {metric.memory_usage}MB")
        
        return issues
    
    def get_optimization_recommendations(
        self, 
        device_id: str
    ) -> List[Dict[str, str]]:
        """Get optimization recommendations for a device"""
        device_metrics = [m for m in self.metrics_buffer if m.device_id == device_id]
        
        if not device_metrics:
            return []
        
        recommendations = []
        latest_metric = device_metrics[-1]
        
        # Analyze patterns and provide recommendations
        if latest_metric.cache_hit_rate < 0.7:
            recommendations.append({
                "type": "cache",
                "message": "Consider increasing cache duration for frequently accessed data",
                "priority": "medium"
            })
        
        if latest_metric.sync_duration > 8000:
            recommendations.append({
                "type": "sync",
                "message": "Enable data compression and reduce sync batch sizes",
                "priority": "high"
            })
        
        if latest_metric.connection_quality == "poor":
            recommendations.append({
                "type": "network",
                "message": "Enable aggressive data compression and reduce image quality",
                "priority": "high"
            })
        
        return recommendations

# Utility decorators for mobile optimization
def mobile_cache(ttl_seconds: int = 300, key_prefix: str = "mobile"):
    """Decorator to cache mobile API responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get cache manager from app state or create one
            cache_manager = getattr(wrapper, '_cache_manager', MobileCacheManager())
            
            # Generate cache key
            cache_key = cache_manager._generate_cache_key(
                f"{key_prefix}_{func.__name__}", 
                **kwargs
            )
            
            # Try to get from cache
            cached_data = cache_manager.get(cache_key)
            if cached_data is not None:
                return cached_data
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            if isinstance(result, dict):
                cache_manager.set(cache_key, result, ttl_seconds)
            
            return result
        
        wrapper._cache_manager = MobileCacheManager()
        return wrapper
    return decorator

def mobile_compress(threshold: int = 1024):
    """Decorator to automatically compress mobile API responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            if isinstance(result, dict) and MobileCompressionUtils.should_compress(result, threshold):
                return MobileCompressionUtils.compress_data(result)
            
            return result
        return wrapper
    return decorator

def mobile_optimize(network_type: NetworkType = NetworkType.UNKNOWN):
    """Decorator to optimize responses based on mobile context"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            if isinstance(result, dict):
                settings = MobileOptimizationSettings()  # Use defaults
                result = MobileOptimizationUtils.optimize_for_network(
                    result, network_type, settings
                )
            
            return result
        return wrapper
    return decorator

# Global instances (would typically be managed by dependency injection)
mobile_cache_manager = MobileCacheManager()
mobile_sync_engine = MobileSyncEngine()
mobile_metrics_collector = MobileMetricsCollector()
mobile_compression_utils = MobileCompressionUtils()
mobile_optimization_utils = MobileOptimizationUtils()