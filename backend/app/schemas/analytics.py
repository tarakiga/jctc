from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime, date

class TimeSeriesData(BaseModel):
    """Time series data point"""
    date: str
    value: int

class DashboardOverview(BaseModel):
    """Comprehensive dashboard overview"""
    period: str
    total_cases: int
    active_cases: int
    closed_cases: int
    new_cases_period: int
    total_evidence: int
    evidence_period: int
    total_suspects: int
    total_victims: int
    total_witnesses: int
    active_warrants: int
    pending_mlats: int
    avg_case_resolution_days: float
    last_updated: datetime

    class Config:
        from_attributes = True

class CaseStatistics(BaseModel):
    """Detailed case statistics and breakdowns"""
    period: str
    total_cases: int
    status_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    type_distribution: Dict[str, int]
    top_investigators: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
    resolution_time_stats: Dict[str, float]

    class Config:
        from_attributes = True

class EvidenceMetrics(BaseModel):
    """Comprehensive evidence metrics"""
    period: str
    total_evidence: int
    evidence_by_status: Dict[str, int]
    evidence_by_type: Dict[str, int]
    total_file_attachments: int
    total_storage_bytes: int
    chain_of_custody_entries: int
    custody_transfers: int
    collection_trend: List[Dict[str, Any]]
    retention_policy_distribution: Dict[str, int]

    class Config:
        from_attributes = True

class PerformanceMetrics(BaseModel):
    """System performance and efficiency metrics"""
    period: str
    active_users: int
    total_users: int
    case_closure_rate: float
    evidence_analysis_rate: float
    instrument_execution_rate: float
    avg_case_processing_days: float
    avg_evidence_processing_days: float
    workload_by_role: Dict[str, int]
    cases_opened_period: int
    cases_closed_period: int
    evidence_collected_period: int
    evidence_analyzed_period: int

    class Config:
        from_attributes = True

class TrendAnalysis(BaseModel):
    """Trend analysis for various metrics"""
    metric: str
    period: str
    granularity: str
    data_points: List[Dict[str, Any]]
    trend_direction: str  # "increasing", "decreasing", "stable"
    change_percentage: float
    total_count: int
    average_per_period: float

    class Config:
        from_attributes = True

class UserActivityStats(BaseModel):
    """User activity statistics"""
    user_id: str
    username: str
    role: str
    cases_handled: int
    evidence_processed: int
    last_activity: Optional[datetime]
    activity_score: float

    class Config:
        from_attributes = True

class ComplianceMetrics(BaseModel):
    """Compliance and audit metrics"""
    custody_compliance_rate: float
    total_evidence_items: int
    evidence_with_custody: int
    legal_instruments_expiring_soon: int
    overdue_legal_instruments: int
    retention_policy_violations: int
    evidence_without_integrity_hash: int
    compliance_score: float

    class Config:
        from_attributes = True

class GeographicDistribution(BaseModel):
    """Geographic distribution data"""
    parties_by_country: List[Dict[str, Any]]
    instruments_by_jurisdiction: List[Dict[str, Any]]
    total_countries: int
    total_jurisdictions: int

    class Config:
        from_attributes = True

class AnalyticsExportRequest(BaseModel):
    """Request for analytics report export"""
    report_type: str = Field(..., description="Type of report: dashboard, cases, evidence, performance, compliance")
    format: str = Field("json", description="Export format: json, csv, pdf, excel")
    period: str = Field("30d", description="Time period: 7d, 30d, 90d, 1y")
    filters: Optional[Dict[str, Any]] = None
    include_raw_data: bool = False

class AnalyticsExportResponse(BaseModel):
    """Response for analytics report export"""
    report_type: str
    format: str
    period: str
    generated_at: datetime
    download_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    file_size: Optional[int] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class KPIMetric(BaseModel):
    """Key Performance Indicator metric"""
    name: str
    value: float
    target: Optional[float] = None
    unit: str
    trend: str  # "up", "down", "stable"
    change_percentage: float
    period: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class AlertMetric(BaseModel):
    """Alert-worthy metric"""
    metric_name: str
    current_value: float
    threshold_value: float
    severity: str  # "low", "medium", "high", "critical"
    message: str
    action_required: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AnalyticsSummary(BaseModel):
    """Analytics summary for quick overview"""
    period: str
    total_metrics: int
    kpis: List[KPIMetric]
    alerts: List[AlertMetric]
    top_insights: List[str]
    last_updated: datetime

    class Config:
        from_attributes = True

class CustomQuery(BaseModel):
    """Custom analytics query"""
    query_name: str
    description: Optional[str]
    query_type: str  # "aggregation", "trend", "comparison"
    entities: List[str]  # "cases", "evidence", "parties", "instruments"
    filters: Dict[str, Any]
    metrics: List[str]
    group_by: Optional[List[str]] = None
    time_range: Dict[str, str]  # {"start": "2023-01-01", "end": "2023-12-31"}

class CustomQueryResult(BaseModel):
    """Custom query result"""
    query_name: str
    executed_at: datetime
    total_records: int
    results: List[Dict[str, Any]]
    execution_time_ms: int
    cache_hit: bool = False

    class Config:
        from_attributes = True

class BenchmarkData(BaseModel):
    """Benchmark data for comparison"""
    metric_name: str
    current_period_value: float
    previous_period_value: float
    industry_benchmark: Optional[float] = None
    best_practice_target: Optional[float] = None
    performance_rating: str  # "excellent", "good", "average", "poor"
    recommendations: List[str]

    class Config:
        from_attributes = True

class PerformanceDashboard(BaseModel):
    """Performance dashboard data"""
    overview: DashboardOverview
    kpis: List[KPIMetric]
    trends: List[TrendAnalysis]
    alerts: List[AlertMetric]
    benchmarks: List[BenchmarkData]
    compliance: ComplianceMetrics
    last_updated: datetime

    class Config:
        from_attributes = True