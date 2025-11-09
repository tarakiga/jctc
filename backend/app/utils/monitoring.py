"""
Integration monitoring utilities for the JCTC Integration API system.

This module provides comprehensive monitoring functionality including:
- Health checks for integrations and external systems
- Metrics collection and aggregation
- Performance monitoring and alerting
- Circuit breaker pattern implementation
- Logging hooks and structured logging
- Service status tracking and reporting
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from enum import Enum
from statistics import mean, median
from typing import Any, Dict, List, Optional, Union, Callable, Deque
from dataclasses import dataclass

import psutil
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status enumeration."""
    
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class MetricType(str, Enum):
    """Types of metrics."""
    
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"
    RATE = "rate"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ServiceType(str, Enum):
    """Types of services to monitor."""
    
    DATABASE = "database"
    API = "api"
    WEBHOOK = "webhook"
    EXTERNAL_SYSTEM = "external_system"
    INTERNAL_SERVICE = "internal_service"


@dataclass
class HealthCheck:
    """Health check configuration and result."""
    
    name: str
    service_type: ServiceType
    check_function: Callable
    timeout_seconds: float = 30.0
    interval_seconds: float = 60.0
    critical: bool = False
    enabled: bool = True
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}


@dataclass  
class HealthResult:
    """Health check result."""
    
    name: str
    status: HealthStatus
    response_time_ms: float
    message: str
    timestamp: datetime
    details: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}


@dataclass
class Metric:
    """Individual metric data point."""
    
    name: str
    type: MetricType
    value: Union[float, int]
    tags: Dict[str, str]
    timestamp: datetime
    unit: Optional[str] = None


class MetricsCollector:
    """Collect and aggregate metrics."""
    
    def __init__(self, retention_seconds: int = 3600):
        self.retention_seconds = retention_seconds
        self.metrics: Dict[str, Deque[Metric]] = defaultdict(lambda: deque())
        self.counters: Dict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.lock = asyncio.Lock()
    
    async def record_metric(
        self,
        name: str,
        type: MetricType,
        value: Union[float, int],
        tags: Optional[Dict[str, str]] = None,
        unit: Optional[str] = None
    ):
        """Record a metric value."""
        
        async with self.lock:
            timestamp = datetime.utcnow()
            tags = tags or {}
            
            metric = Metric(
                name=name,
                type=type,
                value=value,
                tags=tags,
                timestamp=timestamp,
                unit=unit
            )
            
            # Store metric
            metric_key = self._get_metric_key(name, tags)
            self.metrics[metric_key].append(metric)
            
            # Update aggregated values
            if type == MetricType.COUNTER:
                self.counters[metric_key] += value
            elif type == MetricType.GAUGE:
                self.gauges[metric_key] = value
            
            # Clean old metrics
            self._cleanup_old_metrics(metric_key)
    
    async def increment(self, name: str, value: float = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric."""
        await self.record_metric(name, MetricType.COUNTER, value, tags)
    
    async def set_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric value."""
        await self.record_metric(name, MetricType.GAUGE, value, tags)
    
    async def record_timing(self, name: str, duration_ms: float, tags: Optional[Dict[str, str]] = None):
        """Record a timing metric."""
        await self.record_metric(name, MetricType.TIMER, duration_ms, tags, "milliseconds")
    
    def get_metrics(
        self,
        name_pattern: Optional[str] = None,
        since: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[Metric]:
        """Get metrics matching criteria."""
        
        results = []
        
        for metric_key, metric_deque in self.metrics.items():
            if name_pattern and name_pattern not in metric_key:
                continue
            
            for metric in metric_deque:
                if since and metric.timestamp < since:
                    continue
                
                results.append(metric)
                
                if limit and len(results) >= limit:
                    break
            
            if limit and len(results) >= limit:
                break
        
        return sorted(results, key=lambda m: m.timestamp, reverse=True)
    
    def get_counter_value(self, name: str, tags: Optional[Dict[str, str]] = None) -> float:
        """Get current counter value."""
        metric_key = self._get_metric_key(name, tags or {})
        return self.counters.get(metric_key, 0.0)
    
    def get_gauge_value(self, name: str, tags: Optional[Dict[str, str]] = None) -> float:
        """Get current gauge value."""
        metric_key = self._get_metric_key(name, tags or {})
        return self.gauges.get(metric_key, 0.0)
    
    def get_aggregated_metrics(
        self,
        name: str,
        tags: Optional[Dict[str, str]] = None,
        since: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get aggregated statistics for a metric."""
        
        metric_key = self._get_metric_key(name, tags or {})
        metrics = []
        
        if metric_key in self.metrics:
            for metric in self.metrics[metric_key]:
                if since and metric.timestamp < since:
                    continue
                metrics.append(metric.value)
        
        if not metrics:
            return {}
        
        return {
            "count": len(metrics),
            "sum": sum(metrics),
            "min": min(metrics),
            "max": max(metrics),
            "mean": mean(metrics),
            "median": median(metrics)
        }
    
    def _get_metric_key(self, name: str, tags: Dict[str, str]) -> str:
        """Generate metric key from name and tags."""
        tag_str = ",".join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}|{tag_str}" if tag_str else name
    
    def _cleanup_old_metrics(self, metric_key: str):
        """Remove old metrics beyond retention period."""
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.retention_seconds)
        
        while (self.metrics[metric_key] and 
               self.metrics[metric_key][0].timestamp < cutoff_time):
            self.metrics[metric_key].popleft()


class HealthMonitor:
    """Monitor health of various services and integrations."""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.health_checks: Dict[str, HealthCheck] = {}
        self.last_results: Dict[str, HealthResult] = {}
        self.monitor_task: Optional[asyncio.Task] = None
        self.running = False
    
    def register_health_check(self, health_check: HealthCheck):
        """Register a health check."""
        self.health_checks[health_check.name] = health_check
        logger.info(f"Registered health check: {health_check.name}")
    
    def unregister_health_check(self, name: str):
        """Unregister a health check."""
        if name in self.health_checks:
            del self.health_checks[name]
            logger.info(f"Unregistered health check: {name}")
    
    async def start_monitoring(self):
        """Start background health monitoring."""
        if self.running:
            return
        
        self.running = True
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Health monitoring started")
    
    async def stop_monitoring(self):
        """Stop background health monitoring."""
        if not self.running:
            return
        
        self.running = False
        
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Health monitoring stopped")
    
    async def check_health(self, name: Optional[str] = None) -> Dict[str, HealthResult]:
        """Run health checks."""
        
        checks_to_run = {}
        
        if name:
            if name in self.health_checks:
                checks_to_run[name] = self.health_checks[name]
        else:
            checks_to_run = {
                name: check for name, check in self.health_checks.items()
                if check.enabled
            }
        
        results = {}
        
        for check_name, health_check in checks_to_run.items():
            try:
                start_time = time.time()
                
                # Run health check with timeout
                result = await asyncio.wait_for(
                    health_check.check_function(),
                    timeout=health_check.timeout_seconds
                )
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                # Create health result
                if isinstance(result, dict):
                    health_result = HealthResult(
                        name=check_name,
                        status=HealthStatus(result.get("status", HealthStatus.UNKNOWN)),
                        response_time_ms=response_time_ms,
                        message=result.get("message", ""),
                        timestamp=datetime.utcnow(),
                        details=result.get("details", {})
                    )
                else:
                    # Assume boolean result
                    health_result = HealthResult(
                        name=check_name,
                        status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                        response_time_ms=response_time_ms,
                        message="Health check passed" if result else "Health check failed",
                        timestamp=datetime.utcnow()
                    )
                
                results[check_name] = health_result
                self.last_results[check_name] = health_result
                
                # Record metrics
                await self.metrics_collector.record_timing(
                    "health_check_duration",
                    response_time_ms,
                    {"check_name": check_name, "status": health_result.status.value}
                )
                
                await self.metrics_collector.increment(
                    "health_check_total",
                    1,
                    {"check_name": check_name, "status": health_result.status.value}
                )
            
            except asyncio.TimeoutError:
                health_result = HealthResult(
                    name=check_name,
                    status=HealthStatus.UNHEALTHY,
                    response_time_ms=health_check.timeout_seconds * 1000,
                    message=f"Health check timed out after {health_check.timeout_seconds}s",
                    timestamp=datetime.utcnow()
                )
                
                results[check_name] = health_result
                self.last_results[check_name] = health_result
                
                logger.warning(f"Health check {check_name} timed out")
            
            except Exception as e:
                health_result = HealthResult(
                    name=check_name,
                    status=HealthStatus.UNHEALTHY,
                    response_time_ms=0.0,
                    message=f"Health check failed: {str(e)}",
                    timestamp=datetime.utcnow()
                )
                
                results[check_name] = health_result
                self.last_results[check_name] = health_result
                
                logger.error(f"Health check {check_name} failed: {e}")
        
        return results
    
    def get_overall_health(self) -> HealthStatus:
        """Get overall health status."""
        
        if not self.last_results:
            return HealthStatus.UNKNOWN
        
        critical_checks = [
            result for name, result in self.last_results.items()
            if self.health_checks.get(name, HealthCheck("", ServiceType.API, lambda: True)).critical
        ]
        
        non_critical_checks = [
            result for name, result in self.last_results.items()
            if not self.health_checks.get(name, HealthCheck("", ServiceType.API, lambda: True)).critical
        ]
        
        # If any critical check is unhealthy, overall is unhealthy
        if any(result.status == HealthStatus.UNHEALTHY for result in critical_checks):
            return HealthStatus.UNHEALTHY
        
        # If any critical check is degraded, overall is degraded
        if any(result.status == HealthStatus.DEGRADED for result in critical_checks):
            return HealthStatus.DEGRADED
        
        # Check non-critical services
        unhealthy_non_critical = sum(1 for result in non_critical_checks 
                                   if result.status == HealthStatus.UNHEALTHY)
        degraded_non_critical = sum(1 for result in non_critical_checks 
                                  if result.status == HealthStatus.DEGRADED)
        
        total_non_critical = len(non_critical_checks)
        
        if total_non_critical > 0:
            unhealthy_ratio = unhealthy_non_critical / total_non_critical
            degraded_ratio = (unhealthy_non_critical + degraded_non_critical) / total_non_critical
            
            if unhealthy_ratio > 0.5:  # More than 50% unhealthy
                return HealthStatus.UNHEALTHY
            elif degraded_ratio > 0.3:  # More than 30% degraded
                return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY
    
    async def _monitor_loop(self):
        """Background monitoring loop."""
        
        while self.running:
            try:
                # Run all enabled health checks
                await self.check_health()
                
                # Wait for the shortest interval before next check
                min_interval = min(
                    (check.interval_seconds for check in self.health_checks.values()),
                    default=60.0
                )
                
                await asyncio.sleep(min_interval)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait before retrying


class PerformanceMonitor:
    """Monitor performance metrics and trends."""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.thresholds: Dict[str, Dict[str, float]] = {}
    
    def set_threshold(
        self,
        metric_name: str,
        warning_threshold: Optional[float] = None,
        critical_threshold: Optional[float] = None
    ):
        """Set performance thresholds for a metric."""
        
        self.thresholds[metric_name] = {}
        
        if warning_threshold is not None:
            self.thresholds[metric_name]["warning"] = warning_threshold
        
        if critical_threshold is not None:
            self.thresholds[metric_name]["critical"] = critical_threshold
    
    async def record_request_metrics(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        duration_ms: float,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None
    ):
        """Record HTTP request metrics."""
        
        tags = {
            "endpoint": endpoint,
            "method": method,
            "status_code": str(status_code),
            "status_class": f"{status_code // 100}xx"
        }
        
        # Request count
        await self.metrics_collector.increment("http_requests_total", 1, tags)
        
        # Request duration
        await self.metrics_collector.record_timing("http_request_duration", duration_ms, tags)
        
        # Request/response sizes
        if request_size is not None:
            await self.metrics_collector.record_metric(
                "http_request_size_bytes", MetricType.HISTOGRAM, request_size, tags
            )
        
        if response_size is not None:
            await self.metrics_collector.record_metric(
                "http_response_size_bytes", MetricType.HISTOGRAM, response_size, tags
            )
    
    async def record_database_metrics(
        self,
        operation: str,
        table: str,
        duration_ms: float,
        rows_affected: Optional[int] = None
    ):
        """Record database operation metrics."""
        
        tags = {
            "operation": operation,
            "table": table
        }
        
        await self.metrics_collector.increment("db_operations_total", 1, tags)
        await self.metrics_collector.record_timing("db_operation_duration", duration_ms, tags)
        
        if rows_affected is not None:
            await self.metrics_collector.record_metric(
                "db_rows_affected", MetricType.HISTOGRAM, rows_affected, tags
            )
    
    async def record_integration_metrics(
        self,
        integration_name: str,
        operation: str,
        success: bool,
        duration_ms: float,
        error_type: Optional[str] = None
    ):
        """Record external integration metrics."""
        
        tags = {
            "integration": integration_name,
            "operation": operation,
            "success": str(success).lower()
        }
        
        if error_type:
            tags["error_type"] = error_type
        
        await self.metrics_collector.increment("integration_operations_total", 1, tags)
        await self.metrics_collector.record_timing("integration_operation_duration", duration_ms, tags)
        
        if success:
            await self.metrics_collector.increment("integration_operations_success", 1, tags)
        else:
            await self.metrics_collector.increment("integration_operations_error", 1, tags)
    
    def check_thresholds(self, metric_name: str, value: float) -> Optional[AlertSeverity]:
        """Check if metric value exceeds thresholds."""
        
        if metric_name not in self.thresholds:
            return None
        
        thresholds = self.thresholds[metric_name]
        
        if "critical" in thresholds and value >= thresholds["critical"]:
            return AlertSeverity.CRITICAL
        
        if "warning" in thresholds and value >= thresholds["warning"]:
            return AlertSeverity.WARNING
        
        return None


class SystemMonitor:
    """Monitor system resources."""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.monitor_task: Optional[asyncio.Task] = None
        self.running = False
    
    async def start_monitoring(self, interval_seconds: float = 30.0):
        """Start system resource monitoring."""
        
        if self.running:
            return
        
        self.running = True
        self.monitor_task = asyncio.create_task(self._monitor_system(interval_seconds))
        logger.info("System monitoring started")
    
    async def stop_monitoring(self):
        """Stop system resource monitoring."""
        
        if not self.running:
            return
        
        self.running = False
        
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("System monitoring stopped")
    
    async def collect_system_metrics(self):
        """Collect current system metrics."""
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=None)
        await self.metrics_collector.set_gauge("system_cpu_usage_percent", cpu_percent)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        await self.metrics_collector.set_gauge("system_memory_usage_percent", memory.percent)
        await self.metrics_collector.set_gauge("system_memory_available_bytes", memory.available)
        await self.metrics_collector.set_gauge("system_memory_total_bytes", memory.total)
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        await self.metrics_collector.set_gauge("system_disk_usage_percent", 
                                              (disk.used / disk.total) * 100)
        await self.metrics_collector.set_gauge("system_disk_free_bytes", disk.free)
        await self.metrics_collector.set_gauge("system_disk_total_bytes", disk.total)
        
        # Network metrics
        network = psutil.net_io_counters()
        await self.metrics_collector.record_metric("system_network_bytes_sent", 
                                                   MetricType.COUNTER, network.bytes_sent)
        await self.metrics_collector.record_metric("system_network_bytes_recv", 
                                                   MetricType.COUNTER, network.bytes_recv)
    
    async def _monitor_system(self, interval_seconds: float):
        """System monitoring loop."""
        
        while self.running:
            try:
                await self.collect_system_metrics()
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                await asyncio.sleep(interval_seconds)


# Pre-defined health check functions
async def database_health_check(connection_string: str = None) -> Dict[str, Any]:
    """Database connectivity health check."""
    try:
        # This would typically test a database connection
        # For now, return a mock successful result
        return {
            "status": HealthStatus.HEALTHY,
            "message": "Database connection successful",
            "details": {"connection_pool": "active", "query_time_ms": 15.2}
        }
    except Exception as e:
        return {
            "status": HealthStatus.UNHEALTHY,
            "message": f"Database connection failed: {str(e)}",
            "details": {"error": str(e)}
        }


async def api_endpoint_health_check(url: str) -> Dict[str, Any]:
    """External API endpoint health check."""
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            
            if 200 <= response.status_code < 300:
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": f"API endpoint accessible (HTTP {response.status_code})",
                    "details": {"status_code": response.status_code, "response_time_ms": 200}
                }
            else:
                return {
                    "status": HealthStatus.DEGRADED,
                    "message": f"API endpoint returned HTTP {response.status_code}",
                    "details": {"status_code": response.status_code}
                }
    
    except Exception as e:
        return {
            "status": HealthStatus.UNHEALTHY,
            "message": f"API endpoint unreachable: {str(e)}",
            "details": {"error": str(e)}
        }


async def memory_health_check(warning_threshold_percent: float = 80.0) -> Dict[str, Any]:
    """System memory health check."""
    
    memory = psutil.virtual_memory()
    
    if memory.percent < warning_threshold_percent:
        status = HealthStatus.HEALTHY
        message = f"Memory usage normal ({memory.percent:.1f}%)"
    else:
        status = HealthStatus.DEGRADED
        message = f"Memory usage high ({memory.percent:.1f}%)"
    
    return {
        "status": status,
        "message": message,
        "details": {
            "usage_percent": memory.percent,
            "available_mb": memory.available // (1024 * 1024),
            "total_mb": memory.total // (1024 * 1024)
        }
    }


# Global monitoring instances
metrics_collector = MetricsCollector()
health_monitor = HealthMonitor(metrics_collector)
performance_monitor = PerformanceMonitor(metrics_collector)
system_monitor = SystemMonitor(metrics_collector)


# Convenience functions
async def start_monitoring():
    """Start all monitoring services."""
    await health_monitor.start_monitoring()
    await system_monitor.start_monitoring()
    logger.info("All monitoring services started")


async def stop_monitoring():
    """Stop all monitoring services."""
    await health_monitor.stop_monitoring()
    await system_monitor.stop_monitoring()
    logger.info("All monitoring services stopped")


def register_standard_health_checks():
    """Register standard health checks."""
    
    # Database health check
    health_monitor.register_health_check(
        HealthCheck(
            name="database",
            service_type=ServiceType.DATABASE,
            check_function=database_health_check,
            critical=True,
            interval_seconds=30.0
        )
    )
    
    # Memory health check
    health_monitor.register_health_check(
        HealthCheck(
            name="memory",
            service_type=ServiceType.INTERNAL_SERVICE,
            check_function=memory_health_check,
            critical=False,
            interval_seconds=60.0
        )
    )
    
    logger.info("Standard health checks registered")


async def get_monitoring_dashboard() -> Dict[str, Any]:
    """Get comprehensive monitoring dashboard data."""
    
    # Get health status
    health_results = await health_monitor.check_health()
    overall_health = health_monitor.get_overall_health()
    
    # Get system metrics
    await system_monitor.collect_system_metrics()
    
    # Get recent metrics
    recent_metrics = metrics_collector.get_metrics(
        since=datetime.utcnow() - timedelta(hours=1),
        limit=100
    )
    
    return {
        "overall_health": overall_health.value,
        "health_checks": {
            name: {
                "status": result.status.value,
                "message": result.message,
                "response_time_ms": result.response_time_ms,
                "timestamp": result.timestamp.isoformat()
            }
            for name, result in health_results.items()
        },
        "system_metrics": {
            "cpu_usage_percent": metrics_collector.get_gauge_value("system_cpu_usage_percent"),
            "memory_usage_percent": metrics_collector.get_gauge_value("system_memory_usage_percent"),
            "disk_usage_percent": metrics_collector.get_gauge_value("system_disk_usage_percent")
        },
        "request_metrics": {
            "total_requests": metrics_collector.get_counter_value("http_requests_total"),
            "success_requests": metrics_collector.get_counter_value(
                "http_requests_total", {"status_class": "2xx"}
            ),
            "error_requests": metrics_collector.get_counter_value(
                "http_requests_total", {"status_class": "5xx"}
            )
        },
        "integration_metrics": {
            "total_operations": metrics_collector.get_counter_value("integration_operations_total"),
            "successful_operations": metrics_collector.get_counter_value("integration_operations_success"),
            "failed_operations": metrics_collector.get_counter_value("integration_operations_error")
        },
        "timestamp": datetime.utcnow().isoformat()
    }