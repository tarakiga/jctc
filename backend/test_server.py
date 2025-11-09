#!/usr/bin/env python3
"""
Simple test server for Locust performance testing.
This bypasses database and complex dependencies for basic load testing.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import random
import time
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="JCTC Test Server",
    description="Test server for Locust performance testing",
    version="1.0.0"
)

# Simple auth
security = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CaseCreate(BaseModel):
    title: str
    description: str
    case_type_id: int = 1
    priority: str
    source: str

class CaseResponse(BaseModel):
    id: int
    title: str
    description: str
    case_type_id: int
    priority: str
    source: str
    status: str = "OPEN"
    created_at: datetime

class ChargeCreate(BaseModel):
    case_id: int
    charge_description: str
    statute: str
    severity: str
    status: str = "PENDING"

class ChargeResponse(BaseModel):
    id: int
    case_id: int
    charge_description: str
    statute: str
    severity: str
    status: str

class SessionCreate(BaseModel):
    case_id: int
    session_date: str
    session_type: str
    court_name: str
    judge_name: str
    location: str

class SessionResponse(BaseModel):
    id: int
    case_id: int
    session_date: str
    session_type: str
    court_name: str
    judge_name: str
    location: str

class DashboardResponse(BaseModel):
    total_cases: int
    open_cases: int
    closed_cases: int
    pending_charges: int
    upcoming_sessions: int

class StatisticsResponse(BaseModel):
    metric_name: str
    value: int
    percentage_change: float

# Mock data storage
cases_db = []
charges_db = []
sessions_db = []
case_id_counter = 1
charge_id_counter = 1
session_id_counter = 1

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mock authentication - accepts any bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"email": "test@jctc.gov.ng", "role": "ADMIN"}

# Add some artificial delay to simulate database operations
def simulate_db_delay():
    time.sleep(random.uniform(0.01, 0.05))  # 10-50ms delay

@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Mock login endpoint."""
    simulate_db_delay()
    
    # Accept any login credentials for testing
    return LoginResponse(
        access_token=f"mock_token_{random.randint(10000, 99999)}",
        token_type="bearer"
    )

@app.get("/api/v1/cases/", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    created_after: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mock case listing endpoint."""
    simulate_db_delay()
    
    # Return mock cases
    mock_cases = []
    for i in range(min(per_page, 10)):  # Return up to 10 cases
        mock_cases.append(CaseResponse(
            id=i + 1 + (page - 1) * per_page,
            title=f"Mock Case {i + 1}",
            description=f"Mock case description {i + 1}",
            case_type_id=1,
            priority=priority or random.choice(["LOW", "MEDIUM", "HIGH", "URGENT"]),
            source="COMPLAINT",
            status=status or "OPEN",
            created_at=datetime.now()
        ))
    
    return mock_cases

@app.post("/api/v1/cases/", response_model=CaseResponse)
async def create_case(
    case_data: CaseCreate,
    current_user: dict = Depends(get_current_user)
):
    """Mock case creation endpoint."""
    global case_id_counter
    simulate_db_delay()
    
    new_case = CaseResponse(
        id=case_id_counter,
        title=case_data.title,
        description=case_data.description,
        case_type_id=case_data.case_type_id,
        priority=case_data.priority,
        source=case_data.source,
        status="OPEN",
        created_at=datetime.now()
    )
    
    cases_db.append(new_case)
    case_id_counter += 1
    
    return new_case

@app.get("/api/v1/prosecution/dashboard", response_model=DashboardResponse)
async def prosecution_dashboard(current_user: dict = Depends(get_current_user)):
    """Mock prosecution dashboard endpoint."""
    simulate_db_delay()
    
    return DashboardResponse(
        total_cases=random.randint(100, 500),
        open_cases=random.randint(50, 200),
        closed_cases=random.randint(30, 150),
        pending_charges=random.randint(20, 100),
        upcoming_sessions=random.randint(10, 50)
    )

@app.post("/api/v1/prosecution/charges", response_model=ChargeResponse)
async def create_charge(
    charge_data: ChargeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Mock charge creation endpoint."""
    global charge_id_counter
    simulate_db_delay()
    
    new_charge = ChargeResponse(
        id=charge_id_counter,
        case_id=charge_data.case_id,
        charge_description=charge_data.charge_description,
        statute=charge_data.statute,
        severity=charge_data.severity,
        status=charge_data.status
    )
    
    charges_db.append(new_charge)
    charge_id_counter += 1
    
    return new_charge

@app.post("/api/v1/prosecution/court-sessions", response_model=SessionResponse)
async def create_court_session(
    session_data: SessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Mock court session creation endpoint."""
    global session_id_counter
    simulate_db_delay()
    
    new_session = SessionResponse(
        id=session_id_counter,
        case_id=session_data.case_id,
        session_date=session_data.session_date,
        session_type=session_data.session_type,
        court_name=session_data.court_name,
        judge_name=session_data.judge_name,
        location=session_data.location
    )
    
    sessions_db.append(new_session)
    session_id_counter += 1
    
    return new_session

@app.get("/api/v1/prosecution/court-sessions/calendar")
async def court_calendar(current_user: dict = Depends(get_current_user)):
    """Mock court calendar endpoint."""
    simulate_db_delay()
    
    return {
        "calendar_events": [
            {
                "date": "2024-12-15",
                "sessions": random.randint(1, 5),
                "court_rooms": [f"Room {i}" for i in range(1, random.randint(2, 6))]
            }
            for _ in range(7)  # 7 days
        ]
    }

@app.get("/api/v1/devices/statistics/forensic-workload", response_model=List[StatisticsResponse])
async def forensic_workload(current_user: dict = Depends(get_current_user)):
    """Mock forensic workload statistics."""
    simulate_db_delay()
    
    return [
        StatisticsResponse(
            metric_name="Active Cases",
            value=random.randint(20, 100),
            percentage_change=random.uniform(-10, 15)
        ),
        StatisticsResponse(
            metric_name="Devices in Queue",
            value=random.randint(5, 50),
            percentage_change=random.uniform(-20, 25)
        )
    ]

@app.get("/api/v1/evidence/")
async def list_evidence(current_user: dict = Depends(get_current_user)):
    """Mock evidence listing."""
    simulate_db_delay()
    
    return [
        {
            "id": i,
            "type": random.choice(["Digital", "Physical", "Document"]),
            "description": f"Evidence item {i}",
            "status": random.choice(["Collected", "Analyzed", "Archived"])
        }
        for i in range(1, random.randint(5, 15))
    ]

@app.get("/api/v1/users/")
async def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    per_page: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Mock user listing."""
    simulate_db_delay()
    
    return [
        {
            "id": i,
            "email": f"user{i}@jctc.gov.ng",
            "full_name": f"User {i}",
            "role": role or random.choice(["INVESTIGATOR", "PROSECUTOR", "FORENSIC", "ADMIN"]),
            "is_active": is_active if is_active is not None else True
        }
        for i in range(1, per_page + 1)
    ]

@app.get("/api/v1/audit/logs/search")
async def search_audit_logs(
    action: Optional[str] = None,
    entity: Optional[str] = None,
    start_date: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Mock audit log search."""
    simulate_db_delay()
    
    return [
        {
            "id": i,
            "action": action or random.choice(["CREATE", "UPDATE", "DELETE", "VIEW"]),
            "entity": entity or random.choice(["CASE", "EVIDENCE", "USER", "CHARGE"]),
            "user": f"user{random.randint(1, 10)}@jctc.gov.ng",
            "timestamp": datetime.now().isoformat(),
            "details": f"Mock audit log entry {i}"
        }
        for i in range(1, min(limit + 1, 20))
    ]

@app.get("/api/v1/prosecution/statistics/performance", response_model=List[StatisticsResponse])
async def prosecution_performance(current_user: dict = Depends(get_current_user)):
    """Mock prosecution performance statistics."""
    simulate_db_delay()
    
    return [
        StatisticsResponse(
            metric_name="Cases Resolved",
            value=random.randint(50, 200),
            percentage_change=random.uniform(0, 25)
        ),
        StatisticsResponse(
            metric_name="Average Resolution Time",
            value=random.randint(30, 120),
            percentage_change=random.uniform(-15, 5)
        )
    ]

@app.get("/api/v1/audit/logs/statistics", response_model=List[StatisticsResponse])
async def audit_statistics(current_user: dict = Depends(get_current_user)):
    """Mock audit statistics."""
    simulate_db_delay()
    
    return [
        StatisticsResponse(
            metric_name="Total Audit Logs",
            value=random.randint(1000, 5000),
            percentage_change=random.uniform(5, 20)
        )
    ]

@app.post("/api/v1/devices/{case_id}/seizures")
async def record_seizure(
    case_id: int,
    seizure_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mock seizure recording."""
    simulate_db_delay()
    
    return {
        "id": random.randint(1, 1000),
        "case_id": case_id,
        "location": seizure_data.get("location", "Unknown"),
        "notes": seizure_data.get("notes", ""),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/prosecution/charges/bulk")
async def bulk_operations(
    bulk_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mock bulk operations."""
    simulate_db_delay()
    
    charge_ids = bulk_data.get("charge_ids", [])
    return {
        "updated_count": len(charge_ids),
        "updated_charges": charge_ids,
        "status": "success"
    }

@app.get("/api/v1/custody/")
async def chain_of_custody(current_user: dict = Depends(get_current_user)):
    """Mock chain of custody."""
    simulate_db_delay()
    
    return [
        {
            "id": i,
            "evidence_id": random.randint(1, 100),
            "custodian": f"Officer {i}",
            "transferred_at": datetime.now().isoformat(),
            "location": f"Storage {random.randint(1, 10)}"
        }
        for i in range(1, random.randint(1, 10))
    ]

@app.post("/api/v1/users/")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mock user creation (admin only)."""
    simulate_db_delay()
    
    return {
        "id": random.randint(1000, 9999),
        "email": user_data["email"],
        "full_name": user_data["full_name"],
        "role": user_data["role"],
        "organization": user_data.get("organization", "JCTC"),
        "is_active": True,
        "created_at": datetime.now().isoformat()
    }

@app.post("/api/v1/audit/logs/verify-integrity")
async def verify_integrity(
    check_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mock audit integrity verification."""
    time.sleep(random.uniform(0.1, 0.3))  # Longer delay for this operation
    
    return {
        "verified_count": check_data.get("sample_size", 100),
        "integrity_status": "VALID",
        "discrepancies": 0,
        "verification_time": datetime.now().isoformat()
    }

# Basic NDPA Compliance Endpoints for Testing
@app.post("/api/v1/ndpa/assess")
async def ndpa_compliance_assessment(current_user: dict = Depends(get_current_user)):
    """Mock NDPA compliance assessment endpoint."""
    simulate_db_delay()
    time.sleep(random.uniform(0.05, 0.15))  # Slightly longer for assessment
    
    return {
        "overall_score": random.uniform(70, 95),
        "status": random.choice(["COMPLIANT", "MINOR_ISSUES", "MAJOR_VIOLATIONS"]),
        "areas": {
            "data_localization": random.uniform(80, 100),
            "consent_management": random.uniform(75, 95),
            "data_subject_rights": random.uniform(85, 100),
            "breach_notification": random.uniform(90, 100),
            "dpia_compliance": random.uniform(70, 90),
            "nitda_registration": random.uniform(85, 100),
            "cross_border_transfers": random.uniform(60, 90),
            "processing_records": random.uniform(80, 95)
        },
        "violations": random.randint(0, 5),
        "recommendations": [
            "Improve data localization controls",
            "Update consent withdrawal mechanisms",
            "Complete pending DPIA assessments"
        ]
    }

@app.get("/api/v1/ndpa/status")
async def ndpa_compliance_status(current_user: dict = Depends(get_current_user)):
    """Mock NDPA compliance status endpoint."""
    simulate_db_delay()
    
    return {
        "overall_score": random.uniform(75, 95),
        "status": random.choice(["COMPLIANT", "MINOR_ISSUES"]),
        "last_assessment": datetime.now().isoformat(),
        "critical_violations": random.randint(0, 2),
        "pending_requests": random.randint(0, 10),
        "nitda_registration_status": "ACTIVE",
        "data_localization_compliance": random.uniform(85, 100)
    }

@app.get("/api/v1/ndpa/dashboard")
async def ndpa_compliance_dashboard(current_user: dict = Depends(get_current_user)):
    """Mock NDPA compliance dashboard."""
    simulate_db_delay()
    
    return {
        "overall_compliance_score": random.uniform(80, 95),
        "status": random.choice(["COMPLIANT", "MINOR_ISSUES"]),
        "metrics": {
            "total_data_subjects": random.randint(1000, 10000),
            "active_consents": random.randint(500, 5000),
            "pending_requests": random.randint(5, 50),
            "overdue_requests": random.randint(0, 10),
            "breach_incidents_ytd": random.randint(0, 5),
            "nitda_notifications_sent": random.randint(0, 3)
        },
        "compliance_areas": {
            "data_localization": {
                "score": random.uniform(85, 100),
                "status": "COMPLIANT",
                "violations": random.randint(0, 2)
            },
            "consent_management": {
                "score": random.uniform(80, 95),
                "status": "MINOR_ISSUES",
                "violations": random.randint(1, 3)
            },
            "data_subject_rights": {
                "score": random.uniform(90, 100),
                "status": "COMPLIANT",
                "violations": random.randint(0, 1)
            }
        },
        "alerts": [
            {
                "type": "WARNING",
                "message": "2 data subject requests approaching deadline",
                "priority": "HIGH"
            },
            {
                "type": "INFO",
                "message": "NITDA registration renewal due in 60 days",
                "priority": "MEDIUM"
            }
        ],
        "last_updated": datetime.now().isoformat()
    }

@app.get("/api/v1/ndpa/violations")
async def list_ndpa_violations(current_user: dict = Depends(get_current_user)):
    """Mock NDPA violations listing."""
    simulate_db_delay()
    
    return [
        {
            "id": i,
            "violation_type": random.choice([
                "NDPA_CONSENT", "NDPA_DATA_LOCALIZATION", "NDPA_CROSS_BORDER_TRANSFER",
                "NDPA_DATA_SUBJECT_RIGHTS", "NDPA_PROCESSING_LAWFULNESS", "NDPA_BREACH_NOTIFICATION"
            ]),
            "severity": random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
            "status": random.choice(["OPEN", "IN_PROGRESS", "RESOLVED"]),
            "description": f"Mock NDPA violation {i}",
            "detected_at": datetime.now().isoformat()
        }
        for i in range(1, random.randint(2, 8))
    ]

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
