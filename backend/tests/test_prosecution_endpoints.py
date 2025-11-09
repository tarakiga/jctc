"""
Comprehensive Test Suite for Court & Prosecution Workflow APIs.

Tests all 21 prosecution endpoints for functionality, security, and edge cases.
"""

import pytest
import asyncio
from datetime import datetime, date, timedelta
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import User, Case, Charge, CourtSession, Outcome
from app.core.security import create_access_token
from tests.conftest import TestingSessionLocal, create_test_user, create_test_case


client = TestClient(app)


class TestProsecutionDashboard:
    """Test prosecution dashboard endpoints."""
    
    def test_get_prosecution_dashboard_success(self, test_db: Session, prosecutor_user: User):
        """Test successful prosecution dashboard retrieval."""
        # Create test data
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        # Create test charge
        charge = Charge(
            case_id=case.id,
            prosecutor_id=prosecutor_user.id,
            charge_description="Test cyber fraud charge",
            statute="Criminal Code Section 419",
            status="PENDING",
            filed_date=datetime.utcnow(),
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(charge)
        test_db.commit()
        
        # Test dashboard endpoint
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.get(
            "/api/v1/prosecution/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "charges_statistics" in data
        assert "upcoming_sessions" in data
        assert "recent_outcomes" in data
        assert "case_metrics" in data
        assert "performance_stats" in data
        
        # Verify charges statistics
        assert len(data["charges_statistics"]) > 0
        assert data["charges_statistics"][0]["status"] == "PENDING"
        assert data["charges_statistics"][0]["count"] >= 1
    
    def test_get_prosecution_dashboard_empty_data(self, test_db: Session, prosecutor_user: User):
        """Test dashboard with no prosecution data."""
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.get(
            "/api/v1/prosecution/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return empty structures
        assert data["charges_statistics"] == []
        assert data["upcoming_sessions"] == []
        assert data["recent_outcomes"] == []
    
    def test_get_prosecution_dashboard_unauthorized(self, test_db: Session):
        """Test dashboard access without authentication."""
        response = client.get("/api/v1/prosecution/dashboard")
        assert response.status_code == 401
    
    def test_get_prosecution_dashboard_wrong_role(self, test_db: Session, investigator_user: User):
        """Test dashboard access with wrong role."""
        token = create_access_token(data={"sub": investigator_user.email})
        response = client.get(
            "/api/v1/prosecution/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403


class TestChargeManagement:
    """Test charge management endpoints."""
    
    def test_create_charge_success(self, test_db: Session, prosecutor_user: User):
        """Test successful charge creation."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        charge_data = {
            "case_id": str(case.id),
            "charge_description": "Advanced Fee Fraud under Section 419",
            "statute": "Criminal Code Act, Section 419",
            "severity": "FELONY",
            "penalty_description": "7 years imprisonment or fine",
            "status": "PENDING"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/charges",
            json=charge_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["charge_description"] == charge_data["charge_description"]
        assert data["statute"] == charge_data["statute"]
        assert data["status"] == "PENDING"
        assert data["prosecutor_id"] == str(prosecutor_user.id)
        assert "filed_date" in data
    
    def test_create_charge_invalid_case(self, test_db: Session, prosecutor_user: User):
        """Test charge creation with invalid case ID."""
        charge_data = {
            "case_id": str(uuid4()),  # Non-existent case
            "charge_description": "Test charge",
            "statute": "Test statute",
            "severity": "MISDEMEANOR",
            "status": "PENDING"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/charges",
            json=charge_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
    
    def test_create_charge_validation_error(self, test_db: Session, prosecutor_user: User):
        """Test charge creation with invalid data."""
        charge_data = {
            "case_id": "invalid-uuid",
            "charge_description": "",  # Empty description
            "statute": "",  # Empty statute
            "status": "INVALID_STATUS"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/charges",
            json=charge_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422
    
    def test_list_charges_with_filters(self, test_db: Session, prosecutor_user: User):
        """Test listing charges with various filters."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        # Create multiple charges
        charges = [
            Charge(
                case_id=case.id,
                prosecutor_id=prosecutor_user.id,
                charge_description=f"Test charge {i}",
                statute=f"Section {i}",
                status="PENDING" if i % 2 == 0 else "FILED",
                severity="FELONY" if i % 3 == 0 else "MISDEMEANOR",
                filed_date=datetime.utcnow(),
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            for i in range(1, 6)
        ]
        
        for charge in charges:
            test_db.add(charge)
        test_db.commit()
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        
        # Test filter by status
        response = client.get(
            "/api/v1/prosecution/charges?status=PENDING",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["charges"]) == 3  # 3 pending charges
        
        # Test filter by severity
        response = client.get(
            "/api/v1/prosecution/charges?severity=FELONY",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["charges"]) == 2  # 2 felony charges
        
        # Test filter by case_id
        response = client.get(
            f"/api/v1/prosecution/charges?case_id={case.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["charges"]) == 5  # All charges for this case
    
    def test_get_charge_details(self, test_db: Session, prosecutor_user: User):
        """Test getting detailed charge information."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        charge = Charge(
            case_id=case.id,
            prosecutor_id=prosecutor_user.id,
            charge_description="Detailed test charge",
            statute="Test Statute Section 1",
            status="FILED",
            severity="FELONY",
            penalty_description="Up to 10 years imprisonment",
            filed_date=datetime.utcnow(),
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(charge)
        test_db.commit()
        test_db.refresh(charge)
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.get(
            f"/api/v1/prosecution/charges/{charge.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == str(charge.id)
        assert data["charge_description"] == "Detailed test charge"
        assert data["status"] == "FILED"
        assert data["severity"] == "FELONY"
        assert data["penalty_description"] == "Up to 10 years imprisonment"
    
    def test_update_charge_status(self, test_db: Session, prosecutor_user: User):
        """Test updating charge status."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        charge = Charge(
            case_id=case.id,
            prosecutor_id=prosecutor_user.id,
            charge_description="Charge to update",
            statute="Test Statute",
            status="PENDING",
            filed_date=datetime.utcnow(),
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(charge)
        test_db.commit()
        test_db.refresh(charge)
        
        update_data = {
            "status": "FILED",
            "notes": "Charge has been officially filed with the court"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.put(
            f"/api/v1/prosecution/charges/{charge.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "FILED"
        assert data["notes"] == "Charge has been officially filed with the court"
    
    def test_withdraw_charge(self, test_db: Session, prosecutor_user: User):
        """Test withdrawing a charge."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        charge = Charge(
            case_id=case.id,
            prosecutor_id=prosecutor_user.id,
            charge_description="Charge to withdraw",
            statute="Test Statute",
            status="FILED",
            filed_date=datetime.utcnow(),
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(charge)
        test_db.commit()
        test_db.refresh(charge)
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.delete(
            f"/api/v1/prosecution/charges/{charge.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Charge withdrawn successfully"
        
        # Verify charge status is updated
        test_db.refresh(charge)
        assert charge.status == "WITHDRAWN"
    
    def test_bulk_charge_operations(self, test_db: Session, prosecutor_user: User):
        """Test bulk charge operations."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        # Create multiple charges
        charges = []
        for i in range(3):
            charge = Charge(
                case_id=case.id,
                prosecutor_id=prosecutor_user.id,
                charge_description=f"Bulk charge {i}",
                statute=f"Section {i}",
                status="PENDING",
                filed_date=datetime.utcnow(),
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            test_db.add(charge)
            charges.append(charge)
        
        test_db.commit()
        
        # Test bulk status update
        bulk_update = {
            "charge_ids": [str(charge.id) for charge in charges],
            "updates": {
                "status": "FILED",
                "notes": "Bulk filed charges"
            }
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/charges/bulk",
            json=bulk_update,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_updated"] == 3
        assert data["successful_updates"] == 3
        assert data["failed_updates"] == 0


class TestCourtSessionManagement:
    """Test court session management endpoints."""
    
    def test_create_court_session_success(self, test_db: Session, prosecutor_user: User):
        """Test successful court session creation."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        session_data = {
            "case_id": str(case.id),
            "session_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "session_type": "ARRAIGNMENT",
            "court_name": "Federal High Court Abuja",
            "judge_name": "Hon. Justice A. B. Muhammad",
            "location": "Court Room 5, Federal High Court Abuja",
            "notes": "Initial arraignment session"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/court-sessions",
            json=session_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["session_type"] == "ARRAIGNMENT"
        assert data["court_name"] == "Federal High Court Abuja"
        assert data["judge_name"] == "Hon. Justice A. B. Muhammad"
        assert data["status"] == "SCHEDULED"
    
    def test_create_court_session_past_date(self, test_db: Session, prosecutor_user: User):
        """Test court session creation with past date."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        session_data = {
            "case_id": str(case.id),
            "session_date": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "session_type": "TRIAL",
            "court_name": "Test Court",
            "judge_name": "Test Judge"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/court-sessions",
            json=session_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "past date" in response.json()["detail"]
    
    def test_list_court_sessions_with_filters(self, test_db: Session, prosecutor_user: User):
        """Test listing court sessions with various filters."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        # Create multiple court sessions
        sessions = []
        session_types = ["ARRAIGNMENT", "TRIAL", "SENTENCING"]
        
        for i, session_type in enumerate(session_types):
            session = CourtSession(
                case_id=case.id,
                session_date=datetime.utcnow() + timedelta(days=i * 10),
                session_type=session_type,
                court_name=f"Court {i}",
                judge_name=f"Judge {i}",
                status="SCHEDULED",
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            test_db.add(session)
            sessions.append(session)
        
        test_db.commit()
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        
        # Test filter by session type
        response = client.get(
            "/api/v1/prosecution/court-sessions?session_type=TRIAL",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["session_type"] == "TRIAL"
        
        # Test filter by date range
        start_date = datetime.utcnow().date()
        end_date = (datetime.utcnow() + timedelta(days=15)).date()
        
        response = client.get(
            f"/api/v1/prosecution/court-sessions?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 2  # First two sessions within range
    
    def test_get_court_session_details(self, test_db: Session, prosecutor_user: User):
        """Test getting detailed court session information."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        session = CourtSession(
            case_id=case.id,
            session_date=datetime.utcnow() + timedelta(days=15),
            session_type="TRIAL",
            court_name="Federal High Court Lagos",
            judge_name="Hon. Justice C. D. Adebayo",
            location="Court Room 3",
            status="SCHEDULED",
            notes="Main trial session",
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(session)
        test_db.commit()
        test_db.refresh(session)
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.get(
            f"/api/v1/prosecution/court-sessions/{session.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_type"] == "TRIAL"
        assert data["court_name"] == "Federal High Court Lagos"
        assert data["judge_name"] == "Hon. Justice C. D. Adebayo"
        assert data["notes"] == "Main trial session"
    
    def test_update_court_session(self, test_db: Session, prosecutor_user: User):
        """Test updating court session details."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        session = CourtSession(
            case_id=case.id,
            session_date=datetime.utcnow() + timedelta(days=20),
            session_type="TRIAL",
            court_name="Original Court",
            judge_name="Original Judge",
            status="SCHEDULED",
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(session)
        test_db.commit()
        test_db.refresh(session)
        
        update_data = {
            "session_date": (datetime.utcnow() + timedelta(days=25)).isoformat(),
            "court_name": "Updated Court Name",
            "notes": "Session postponed due to schedule conflict"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.put(
            f"/api/v1/prosecution/court-sessions/{session.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["court_name"] == "Updated Court Name"
        assert data["notes"] == "Session postponed due to schedule conflict"
    
    def test_cancel_court_session(self, test_db: Session, prosecutor_user: User):
        """Test canceling a court session."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        session = CourtSession(
            case_id=case.id,
            session_date=datetime.utcnow() + timedelta(days=10),
            session_type="TRIAL",
            court_name="Test Court",
            judge_name="Test Judge",
            status="SCHEDULED",
            created_by=prosecutor_user.id,
            updated_by=prosecutor_user.id
        )
        test_db.add(session)
        test_db.commit()
        test_db.refresh(session)
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.delete(
            f"/api/v1/prosecution/court-sessions/{session.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Court session cancelled successfully"
        
        # Verify session status is updated
        test_db.refresh(session)
        assert session.status == "CANCELLED"
    
    def test_get_court_calendar(self, test_db: Session, prosecutor_user: User):
        """Test getting court calendar view."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        # Create sessions for different dates
        today = datetime.utcnow()
        sessions_data = [
            (today + timedelta(days=5), "ARRAIGNMENT"),
            (today + timedelta(days=15), "TRIAL"),
            (today + timedelta(days=30), "SENTENCING")
        ]
        
        for session_date, session_type in sessions_data:
            session = CourtSession(
                case_id=case.id,
                session_date=session_date,
                session_type=session_type,
                court_name="Test Court",
                judge_name="Test Judge",
                status="SCHEDULED",
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            test_db.add(session)
        
        test_db.commit()
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.get(
            "/api/v1/prosecution/court-sessions/calendar",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "calendar_events" in data
        assert len(data["calendar_events"]) == 3
        
        # Verify events are properly formatted
        for event in data["calendar_events"]:
            assert "date" in event
            assert "session_type" in event
            assert "court_name" in event
            assert "case_title" in event


class TestCaseOutcomeManagement:
    """Test case outcome management endpoints."""
    
    def test_record_case_outcome_success(self, test_db: Session, prosecutor_user: User):
        """Test successful case outcome recording."""
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        outcome_data = {
            "case_id": str(case.id),
            "outcome_date": datetime.utcnow().date().isoformat(),
            "outcome_type": "CONVICTION",
            "verdict": "GUILTY",
            "sentence": "5 years imprisonment with fine of N2,000,000",
            "judge_name": "Hon. Justice E. F. Okafor",
            "court_name": "Federal High Court Abuja",
            "notes": "Defendant found guilty on all counts of cybercrime"
        }
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.post(
            "/api/v1/prosecution/outcomes",
            json=outcome_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["outcome_type"] == "CONVICTION"
        assert data["verdict"] == "GUILTY"
        assert data["sentence"] == "5 years imprisonment with fine of N2,000,000"
        assert data["judge_name"] == "Hon. Justice E. F. Okafor"
    
    def test_list_case_outcomes_with_filters(self, test_db: Session, prosecutor_user: User):
        """Test listing case outcomes with filters."""
        # Create multiple cases and outcomes
        outcomes_data = [
            ("CONVICTION", "GUILTY"),
            ("ACQUITTAL", "NOT_GUILTY"),
            ("DISMISSAL", "DISMISSED")
        ]
        
        for outcome_type, verdict in outcomes_data:
            case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
            outcome = Outcome(
                case_id=case.id,
                outcome_date=datetime.utcnow().date(),
                outcome_type=outcome_type,
                verdict=verdict,
                judge_name="Test Judge",
                court_name="Test Court",
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            test_db.add(outcome)
        
        test_db.commit()
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        
        # Test filter by outcome type
        response = client.get(
            "/api/v1/prosecution/outcomes?outcome_type=CONVICTION",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 1
        assert data["outcomes"][0]["outcome_type"] == "CONVICTION"
        
        # Test filter by verdict
        response = client.get(
            "/api/v1/prosecution/outcomes?verdict=GUILTY",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["outcomes"]) == 1
        assert data["outcomes"][0]["verdict"] == "GUILTY"
    
    def test_get_outcome_statistics(self, test_db: Session, prosecutor_user: User):
        """Test getting prosecution outcome statistics."""
        # Create multiple outcomes for statistics
        outcomes_data = [
            ("CONVICTION", "GUILTY"),
            ("CONVICTION", "GUILTY"),
            ("ACQUITTAL", "NOT_GUILTY"),
            ("DISMISSAL", "DISMISSED")
        ]
        
        for outcome_type, verdict in outcomes_data:
            case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
            outcome = Outcome(
                case_id=case.id,
                outcome_date=datetime.utcnow().date(),
                outcome_type=outcome_type,
                verdict=verdict,
                judge_name="Test Judge",
                court_name="Test Court",
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            test_db.add(outcome)
        
        test_db.commit()
        
        token = create_access_token(data={"sub": prosecutor_user.email})
        response = client.get(
            "/api/v1/prosecution/outcomes/statistics",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "conviction_rate" in data
        assert "total_outcomes" in data
        assert "outcome_breakdown" in data
        
        assert data["total_outcomes"] == 4
        assert data["conviction_rate"] == 50.0  # 2 out of 4 convictions


# Pytest fixtures
@pytest.fixture
def prosecutor_user(test_db: Session) -> User:
    """Create a test prosecutor user."""
    return create_test_user(test_db, role="PROSECUTOR", email="prosecutor@test.com")


@pytest.fixture
def investigator_user(test_db: Session) -> User:
    """Create a test investigator user."""
    return create_test_user(test_db, role="INVESTIGATOR", email="investigator@test.com")


# Performance and load testing
class TestProsecutionEndpointsPerformance:
    """Test performance characteristics of prosecution endpoints."""
    
    @pytest.mark.performance
    def test_dashboard_performance(self, test_db: Session, prosecutor_user: User):
        """Test dashboard performance with large dataset."""
        import time
        
        # Create large dataset
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        
        # Create 100 charges
        charges = []
        for i in range(100):
            charge = Charge(
                case_id=case.id,
                prosecutor_id=prosecutor_user.id,
                charge_description=f"Performance test charge {i}",
                statute=f"Section {i}",
                status="FILED" if i % 2 == 0 else "PENDING",
                filed_date=datetime.utcnow(),
                created_by=prosecutor_user.id,
                updated_by=prosecutor_user.id
            )
            charges.append(charge)
        
        test_db.bulk_save_objects(charges)
        test_db.commit()
        
        # Test dashboard performance
        token = create_access_token(data={"sub": prosecutor_user.email})
        
        start_time = time.time()
        response = client.get(
            "/api/v1/prosecution/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert end_time - start_time < 2.0  # Should complete within 2 seconds
    
    @pytest.mark.load_test
    def test_concurrent_charge_creation(self, test_db: Session, prosecutor_user: User):
        """Test concurrent charge creation."""
        import concurrent.futures
        import threading
        
        case = create_test_case(test_db, assigned_officer_id=prosecutor_user.id)
        token = create_access_token(data={"sub": prosecutor_user.email})
        
        def create_charge(index):
            """Create a single charge."""
            charge_data = {
                "case_id": str(case.id),
                "charge_description": f"Concurrent charge {index}",
                "statute": f"Section {index}",
                "severity": "MISDEMEANOR",
                "status": "PENDING"
            }
            
            response = client.post(
                "/api/v1/prosecution/charges",
                json=charge_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            return response.status_code == 201
        
        # Execute 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_charge, i) for i in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        assert all(results)
        assert sum(results) == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])