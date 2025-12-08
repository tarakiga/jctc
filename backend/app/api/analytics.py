from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import calendar

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.party import Party
from app.models.legal import LegalInstrument
from app.models.chain_of_custody import ChainOfCustodyEntry
from app.models.user import User
from app.schemas.analytics import (
    DashboardOverview,
    CaseStatistics,
    EvidenceMetrics,
    PerformanceMetrics,
    TrendAnalysis,
    UserActivityStats,
    ComplianceMetrics,
    TimeSeriesData,
    GeographicDistribution
)
from app.utils.auth import get_current_user
from app.schemas.user import User as UserSchema

router = APIRouter()

@router.get("/dashboard", response_model=DashboardOverview)
async def get_dashboard_overview(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get comprehensive dashboard overview with key metrics"""
    
    # Calculate date range
    end_date = datetime.now()
    if period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)
    
    # Total cases
    total_cases = db.query(Case).count()
    active_cases = db.query(Case).filter(Case.status == "ACTIVE").count()
    closed_cases = db.query(Case).filter(Case.status == "CLOSED").count()
    
    # Cases created in period
    new_cases = db.query(Case).filter(
        Case.created_at >= start_date,
        Case.created_at <= end_date
    ).count()
    
    # Evidence metrics
    total_evidence = db.query(Evidence).count()
    evidence_this_period = db.query(Evidence).filter(
        Evidence.created_at >= start_date,
        Evidence.created_at <= end_date
    ).count()
    
    # Party metrics
    total_suspects = db.query(Party).filter(Party.type == "SUSPECT").count()
    total_victims = db.query(Party).filter(Party.type == "VICTIM").count()
    total_witnesses = db.query(Party).filter(Party.type == "WITNESS").count()
    
    # Legal instruments
    active_warrants = db.query(LegalInstrument).filter(
        LegalInstrument.type.in_(["SEARCH_WARRANT", "ARREST_WARRANT", "PRODUCTION_ORDER"]),
        LegalInstrument.status == "ACTIVE"
    ).count()
    
    pending_mlats = db.query(LegalInstrument).filter(
        LegalInstrument.type.in_(["MLAT_REQUEST", "MLAT_INCOMING", "MLAT_OUTGOING"]),
        LegalInstrument.status == "PENDING"
    ).count()
    
    # Performance metrics
    avg_case_resolution_time = db.query(
        func.avg(
            func.extract('epoch', Case.updated_at - Case.created_at) / 86400
        )
    ).filter(Case.status == "CLOSED").scalar() or 0
    
    return DashboardOverview(
        period=period,
        total_cases=total_cases,
        active_cases=active_cases,
        closed_cases=closed_cases,
        new_cases_period=new_cases,
        total_evidence=total_evidence,
        evidence_period=evidence_this_period,
        total_suspects=total_suspects,
        total_victims=total_victims,
        total_witnesses=total_witnesses,
        active_warrants=active_warrants,
        pending_mlats=pending_mlats,
        avg_case_resolution_days=round(avg_case_resolution_time, 1),
        last_updated=datetime.now()
    )

@router.get("/cases/statistics", response_model=CaseStatistics)
async def get_case_statistics(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get detailed case statistics and breakdowns"""
    
    # Calculate date range
    end_date = datetime.now()
    if period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)
    
    # Case counts by status
    status_counts = db.query(
        Case.status,
        func.count(Case.id).label('count')
    ).group_by(Case.status).all()
    
    status_distribution = {item.status: item.count for item in status_counts}
    
    # Cases by priority
    priority_counts = db.query(
        Case.priority,
        func.count(Case.id).label('count')
    ).group_by(Case.priority).all()
    
    priority_distribution = {item.priority: item.count for item in priority_counts}
    
    # Cases by type
    type_counts = db.query(
        Case.case_type,
        func.count(Case.id).label('count')
    ).group_by(Case.case_type).all()
    
    type_distribution = {item.case_type: item.count for item in type_counts}
    
    # Cases by investigator
    investigator_counts = db.query(
        User.first_name + " " + User.last_name,
        func.count(Case.id).label('count')
    ).join(User, Case.lead_investigator_id == User.id)\
     .group_by(User.id, User.first_name, User.last_name)\
     .order_by(func.count(Case.id).desc())\
     .limit(10).all()
    
    top_investigators = [
        {"name": item[0], "case_count": item[1]} 
        for item in investigator_counts
    ]
    
    # Monthly trends
    monthly_cases = db.query(
        extract('year', Case.created_at).label('year'),
        extract('month', Case.created_at).label('month'),
        func.count(Case.id).label('count')
    ).filter(
        Case.created_at >= start_date
    ).group_by(
        extract('year', Case.created_at),
        extract('month', Case.created_at)
    ).order_by('year', 'month').all()
    
    monthly_trend = [
        {
            "month": f"{int(item.year)}-{int(item.month):02d}",
            "count": item.count
        }
        for item in monthly_cases
    ]
    
    # Resolution time analysis
    resolution_times = db.query(
        func.extract('epoch', Case.updated_at - Case.created_at) / 86400
    ).filter(Case.status == "CLOSED").all()
    
    resolution_stats = {
        "avg_days": 0,
        "median_days": 0,
        "min_days": 0,
        "max_days": 0
    }
    
    if resolution_times:
        times = [float(t[0]) for t in resolution_times if t[0] is not None]
        if times:
            times.sort()
            resolution_stats = {
                "avg_days": round(sum(times) / len(times), 1),
                "median_days": round(times[len(times) // 2], 1),
                "min_days": round(min(times), 1),
                "max_days": round(max(times), 1)
            }
    
    return CaseStatistics(
        period=period,
        total_cases=sum(status_distribution.values()),
        status_distribution=status_distribution,
        priority_distribution=priority_distribution,
        type_distribution=type_distribution,
        top_investigators=top_investigators,
        monthly_trend=monthly_trend,
        resolution_time_stats=resolution_stats
    )

@router.get("/evidence/metrics", response_model=EvidenceMetrics)
async def get_evidence_metrics(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get comprehensive evidence metrics and analysis"""
    
    # Calculate date range
    end_date = datetime.now()
    if period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)
    
    # Evidence by status
    status_counts = db.query(
        Evidence.status,
        func.count(Evidence.id).label('count')
    ).group_by(Evidence.status).all()
    
    evidence_by_status = {item.status: item.count for item in status_counts}
    
    # Evidence by type
    type_counts = db.query(
        Evidence.type,
        func.count(Evidence.id).label('count')
    ).group_by(Evidence.type).all()
    
    evidence_by_type = {item.type: item.count for item in type_counts}
    
    # File attachments analysis
    from app.models.evidence import EvidenceFileAttachment
    
    total_files = db.query(EvidenceFileAttachment).count()
    total_file_size = db.query(
        func.sum(EvidenceFileAttachment.file_size)
    ).scalar() or 0
    
    # Chain of custody metrics
    custody_entries = db.query(ChainOfCustodyEntry).count()
    custody_transfers = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.action == "TRANSFER"
    ).count()
    
    # Evidence collection trend
    monthly_evidence = db.query(
        extract('year', Evidence.created_at).label('year'),
        extract('month', Evidence.created_at).label('month'),
        func.count(Evidence.id).label('count')
    ).filter(
        Evidence.created_at >= start_date
    ).group_by(
        extract('year', Evidence.created_at),
        extract('month', Evidence.created_at)
    ).order_by('year', 'month').all()
    
    collection_trend = [
        {
            "month": f"{int(item.year)}-{int(item.month):02d}",
            "count": item.count
        }
        for item in monthly_evidence
    ]
    
    # Retention policy distribution
    retention_counts = db.query(
        Evidence.retention_policy,
        func.count(Evidence.id).label('count')
    ).group_by(Evidence.retention_policy).all()
    
    retention_distribution = {item.retention_policy: item.count for item in retention_counts}
    
    return EvidenceMetrics(
        period=period,
        total_evidence=sum(evidence_by_status.values()),
        evidence_by_status=evidence_by_status,
        evidence_by_type=evidence_by_type,
        total_file_attachments=total_files,
        total_storage_bytes=total_file_size,
        chain_of_custody_entries=custody_entries,
        custody_transfers=custody_transfers,
        collection_trend=collection_trend,
        retention_policy_distribution=retention_distribution
    )

@router.get("/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get system performance and efficiency metrics"""
    
    # Calculate date range
    end_date = datetime.now()
    if period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)
    
    # User activity metrics
    active_users = db.query(User).filter(User.is_active == True).count()
    total_users = db.query(User).count()
    
    # Case processing efficiency
    cases_opened = db.query(Case).filter(
        Case.created_at >= start_date,
        Case.created_at <= end_date
    ).count()
    
    cases_closed = db.query(Case).filter(
        Case.updated_at >= start_date,
        Case.updated_at <= end_date,
        Case.status == "CLOSED"
    ).count()
    
    case_closure_rate = (cases_closed / cases_opened * 100) if cases_opened > 0 else 0
    
    # Evidence processing efficiency
    evidence_collected = db.query(Evidence).filter(
        Evidence.created_at >= start_date,
        Evidence.created_at <= end_date
    ).count()
    
    evidence_analyzed = db.query(Evidence).filter(
        Evidence.updated_at >= start_date,
        Evidence.updated_at <= end_date,
        Evidence.status == "ANALYZED"
    ).count()
    
    evidence_analysis_rate = (evidence_analyzed / evidence_collected * 100) if evidence_collected > 0 else 0
    
    # Legal instrument efficiency
    instruments_issued = db.query(LegalInstrument).filter(
        LegalInstrument.created_at >= start_date,
        LegalInstrument.created_at <= end_date
    ).count()
    
    instruments_executed = db.query(LegalInstrument).filter(
        LegalInstrument.updated_at >= start_date,
        LegalInstrument.updated_at <= end_date,
        LegalInstrument.status == "EXECUTED"
    ).count()
    
    instrument_execution_rate = (instruments_executed / instruments_issued * 100) if instruments_issued > 0 else 0
    
    # Average processing times
    avg_case_processing = db.query(
        func.avg(
            func.extract('epoch', Case.updated_at - Case.created_at) / 86400
        )
    ).filter(
        Case.status == "CLOSED",
        Case.updated_at >= start_date
    ).scalar() or 0
    
    avg_evidence_processing = db.query(
        func.avg(
            func.extract('epoch', Evidence.updated_at - Evidence.created_at) / 86400
        )
    ).filter(
        Evidence.status == "ANALYZED",
        Evidence.updated_at >= start_date
    ).scalar() or 0
    
    # Workload distribution
    case_assignments = db.query(
        User.role,
        func.count(Case.id).label('case_count')
    ).join(Case, User.id == Case.lead_investigator_id)\
     .group_by(User.role).all()
    
    workload_by_role = {item.role: item.case_count for item in case_assignments}
    
    return PerformanceMetrics(
        period=period,
        active_users=active_users,
        total_users=total_users,
        case_closure_rate=round(case_closure_rate, 1),
        evidence_analysis_rate=round(evidence_analysis_rate, 1),
        instrument_execution_rate=round(instrument_execution_rate, 1),
        avg_case_processing_days=round(avg_case_processing, 1),
        avg_evidence_processing_days=round(avg_evidence_processing, 1),
        workload_by_role=workload_by_role,
        cases_opened_period=cases_opened,
        cases_closed_period=cases_closed,
        evidence_collected_period=evidence_collected,
        evidence_analyzed_period=evidence_analyzed
    )

@router.get("/trends", response_model=TrendAnalysis)
async def get_trend_analysis(
    metric: str = Query("cases", description="Metric to analyze: cases, evidence, parties, instruments"),
    period: str = Query("90d", description="Time period: 30d, 90d, 6m, 1y"),
    granularity: str = Query("daily", description="Granularity: daily, weekly, monthly"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get trend analysis for various metrics"""
    
    # Calculate date range
    end_date = datetime.now()
    if period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    elif period == "6m":
        start_date = end_date - timedelta(days=180)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=90)
    
    # Choose the model based on metric
    if metric == "cases":
        model = Case
    elif metric == "evidence":
        model = Evidence
    elif metric == "parties":
        model = Party
    elif metric == "instruments":
        model = LegalInstrument
    else:
        model = Case
    
    # Choose the time grouping based on granularity
    if granularity == "daily":
        time_group = func.date(model.created_at)
        date_format = "%Y-%m-%d"
    elif granularity == "weekly":
        time_group = func.date_trunc('week', model.created_at)
        date_format = "%Y-W%U"
    else:  # monthly
        time_group = func.date_trunc('month', model.created_at)
        date_format = "%Y-%m"
    
    # Get trend data
    trend_data = db.query(
        time_group.label('time_period'),
        func.count(model.id).label('count')
    ).filter(
        model.created_at >= start_date,
        model.created_at <= end_date
    ).group_by(time_group).order_by(time_group).all()
    
    # Format trend data
    data_points = []
    for item in trend_data:
        if item.time_period:
            data_points.append({
                "date": item.time_period.strftime(date_format),
                "value": item.count
            })
    
    # Calculate trend statistics
    values = [point["value"] for point in data_points]
    trend_direction = "stable"
    change_percentage = 0.0
    
    if len(values) >= 2:
        # Simple linear trend calculation
        first_half = sum(values[:len(values)//2]) / (len(values)//2) if values else 0
        second_half = sum(values[len(values)//2:]) / (len(values) - len(values)//2) if values else 0
        
        if second_half > first_half * 1.1:
            trend_direction = "increasing"
            change_percentage = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0
        elif second_half < first_half * 0.9:
            trend_direction = "decreasing"
            change_percentage = ((first_half - second_half) / first_half * 100) if first_half > 0 else 0
    
    return TrendAnalysis(
        metric=metric,
        period=period,
        granularity=granularity,
        data_points=data_points,
        trend_direction=trend_direction,
        change_percentage=round(change_percentage, 1),
        total_count=sum(values),
        average_per_period=round(sum(values) / len(values), 1) if values else 0
    )

@router.get("/compliance", response_model=ComplianceMetrics)
async def get_compliance_metrics(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get compliance and audit metrics"""
    
    # Chain of custody compliance
    total_evidence = db.query(Evidence).count()
    evidence_with_custody = db.query(Evidence.id).join(ChainOfCustodyEntry).distinct().count()
    custody_compliance_rate = (evidence_with_custody / total_evidence * 100) if total_evidence > 0 else 0
    
    # Legal instrument expiration tracking
    total_instruments = db.query(LegalInstrument).filter(
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).count()
    
    expiring_soon = db.query(LegalInstrument).filter(
        LegalInstrument.expiry_date <= date.today() + timedelta(days=30),
        LegalInstrument.expiry_date >= date.today(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).count()
    
    overdue_instruments = db.query(LegalInstrument).filter(
        LegalInstrument.execution_deadline < date.today(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).count()
    
    # Evidence retention compliance
    retention_violations = db.query(Evidence).filter(
        Evidence.retention_policy.is_(None),
        Evidence.status != "DELETED"
    ).count()
    
    # Data integrity checks
    evidence_without_hash = db.query(Evidence).outerjoin(
        Evidence.file_attachments
    ).filter(
        Evidence.file_attachments == None,
        Evidence.status != "DELETED"
    ).count()
    
    return ComplianceMetrics(
        custody_compliance_rate=round(custody_compliance_rate, 1),
        total_evidence_items=total_evidence,
        evidence_with_custody=evidence_with_custody,
        legal_instruments_expiring_soon=expiring_soon,
        overdue_legal_instruments=overdue_instruments,
        retention_policy_violations=retention_violations,
        evidence_without_integrity_hash=evidence_without_hash,
        compliance_score=round((custody_compliance_rate + 
                               (100 - (retention_violations / total_evidence * 100) if total_evidence > 0 else 100)) / 2, 1)
    )

@router.get("/geographic")
async def get_geographic_distribution(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get geographic distribution of cases and parties"""
    
    # Cases by location (if location field exists)
    case_locations = []  # Placeholder for future location tracking
    
    # Parties by country
    party_countries = db.query(
        Party.country,
        func.count(Party.id).label('count')
    ).filter(
        Party.country.isnot(None)
    ).group_by(Party.country).all()
    
    countries = [
        {"country": item.country, "count": item.count}
        for item in party_countries
    ]
    
    # Legal instruments by jurisdiction
    instrument_countries = db.query(
        LegalInstrument.issuing_country,
        func.count(LegalInstrument.id).label('count')
    ).filter(
        LegalInstrument.issuing_country.isnot(None)
    ).group_by(LegalInstrument.issuing_country).all()
    
    jurisdictions = [
        {"country": item.issuing_country, "count": item.count}
        for item in instrument_countries
    ]
    
    return {
        "parties_by_country": countries,
        "instruments_by_jurisdiction": jurisdictions,
        "total_countries": len(countries),
        "total_jurisdictions": len(jurisdictions)
    }

@router.get("/export/{report_type}")
async def export_analytics_report(
    report_type: str,
    format: str = Query("json", description="Export format: json, csv"),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Export analytics report in various formats"""
    
    if report_type not in ["dashboard", "cases", "evidence", "performance", "compliance"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type"
        )
    
    # Get the appropriate data based on report type
    if report_type == "dashboard":
        data = await get_dashboard_overview(period, db, current_user)
    elif report_type == "cases":
        data = await get_case_statistics(period, db, current_user)
    elif report_type == "evidence":
        data = await get_evidence_metrics(period, db, current_user)
    elif report_type == "performance":
        data = await get_performance_metrics(period, db, current_user)
    elif report_type == "compliance":
        data = await get_compliance_metrics(db, current_user)
    
    # For now, return JSON format
    # In a full implementation, you'd add CSV, PDF, Excel export capabilities
    return {
        "report_type": report_type,
        "format": format,
        "period": period,
        "generated_at": datetime.now(),
        "data": data.dict() if hasattr(data, 'dict') else data
    }