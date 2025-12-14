"""
Case access control utilities for ABAC (Attribute-Based Access Control).

This module provides middleware and dependencies to enforce case-level
access controls based on sensitivity classifications.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.base import get_db
from app.models.case import Case, SensitivityLevel, CaseAssignment
from app.models.user import User, UserRole
from app.utils.dependencies import get_current_active_user


async def check_case_access(
    case: Case,
    user: User,
    action: str = "VIEW"
) -> bool:
    """
    Check if user has access to a specific case based on ABAC rules.
    
    Access Logic:
    - ADMIN: Full access to all cases
    - SUPERVISOR: Access all except TOP_SECRET without explicit approval
    - NORMAL sensitivity: Role-based access (all authenticated users)
    - RESTRICTED: Must be assigned to case
    - CONFIDENTIAL: Must be in access_restrictions.allowed_users or allowed_roles
    - TOP_SECRET: Must be in access_restrictions.allowed_users AND supervisor approved
    
    Args:
        case: The case to check access for
        user: The user requesting access
        action: The action being performed (VIEW, EDIT, DELETE)
    
    Returns:
        bool: True if access is granted, False otherwise
    """
    # Admin has full access
    if user.role == UserRole.ADMIN:
        return True
    
    # Non-sensitive cases - role-based access
    if not case.is_sensitive or case.sensitivity_level == SensitivityLevel.NORMAL:
        return True
    
    # RESTRICTED - must be assigned to case or supervisor
    if case.sensitivity_level == SensitivityLevel.RESTRICTED:
        if user.role == UserRole.SUPERVISOR:
            return True
        # Check if user is assigned to this case
        return _is_user_assigned(case, user)
    
    # CONFIDENTIAL - check access restrictions
    if case.sensitivity_level == SensitivityLevel.CONFIDENTIAL:
        if user.role == UserRole.SUPERVISOR:
            return True
        return _check_access_restrictions(case, user)
    
    # TOP_SECRET - must be explicitly in allowed_users
    if case.sensitivity_level == SensitivityLevel.TOP_SECRET:
        restrictions = case.access_restrictions or {}
        allowed_users = restrictions.get("allowed_users", [])
        # Convert UUIDs to strings for comparison
        user_id_str = str(user.id)
        return user_id_str in [str(u) for u in allowed_users]
    
    return False


def _is_user_assigned(case: Case, user: User) -> bool:
    """Check if user is assigned to the case."""
    if not case.assignments:
        return False
    for assignment in case.assignments:
        if assignment.user_id == user.id:
            return True
    # Also check lead investigator
    if case.lead_investigator == user.id:
        return True
    # Also check creator
    if case.created_by == user.id:
        return True
    return False


def _check_access_restrictions(case: Case, user: User) -> bool:
    """Check if user is in access restrictions list."""
    restrictions = case.access_restrictions or {}
    
    # Check allowed_users
    allowed_users = restrictions.get("allowed_users", [])
    user_id_str = str(user.id)
    if user_id_str in [str(u) for u in allowed_users]:
        return True
    
    # Check allowed_roles
    allowed_roles = restrictions.get("allowed_roles", [])
    if user.role.value in allowed_roles:
        return True
    
    # Check if user is assigned
    return _is_user_assigned(case, user)


class RequireCaseAccess:
    """
    FastAPI dependency class for case access verification.
    
    Usage:
        @router.get("/cases/{case_id}")
        async def get_case(
            case_id: UUID,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_active_user),
            _access = Depends(RequireCaseAccess(action="VIEW"))
        ):
    """
    
    def __init__(self, action: str = "VIEW"):
        self.action = action
    
    async def __call__(
        self,
        case_id: UUID,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
    ) -> Case:
        """Verify access and return the case if access is granted."""
        # Fetch the case
        result = await db.execute(
            select(Case).filter(Case.id == case_id)
        )
        case = result.scalar_one_or_none()
        
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found"
            )
        
        # Check access
        has_access = await check_case_access(case, current_user, self.action)
        
        if not has_access:
            # Log access denial
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: insufficient permissions for {case.sensitivity_level.value} case"
            )
        
        return case


async def update_case_sensitivity(
    case: Case,
    sensitivity_level: SensitivityLevel,
    reason: str,
    allowed_users: Optional[List[UUID]] = None,
    allowed_roles: Optional[List[str]] = None,
    user: User = None,
    db: Session = None
) -> Case:
    """
    Update case sensitivity classification.
    
    Only SUPERVISOR or ADMIN can modify sensitivity settings.
    """
    if user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Supervisors and Admins can modify case sensitivity"
        )
    
    from datetime import datetime
    
    case.is_sensitive = sensitivity_level != SensitivityLevel.NORMAL
    case.sensitivity_level = sensitivity_level
    case.sensitivity_reason = reason
    case.marked_sensitive_by = user.id
    case.marked_sensitive_at = datetime.utcnow()
    
    # Build access restrictions
    restrictions = {}
    if allowed_users:
        restrictions["allowed_users"] = [str(u) for u in allowed_users]
    if allowed_roles:
        restrictions["allowed_roles"] = allowed_roles
    restrictions["reason"] = reason
    
    case.access_restrictions = restrictions
    
    if db:
        await db.commit()
        await db.refresh(case)
    
    return case


def get_user_accessible_cases_filter(user: User):
    """
    Return SQLAlchemy filter for cases accessible to user.
    
    Used for listing cases with proper access control.
    """
    from sqlalchemy import or_, and_, text
    
    # Admin sees all
    if user.role == UserRole.ADMIN:
        return True  # No filter needed
    
    # Supervisor sees all except TOP_SECRET without explicit access
    if user.role == UserRole.SUPERVISOR:
        return or_(
            Case.is_sensitive == False,
            Case.sensitivity_level != SensitivityLevel.TOP_SECRET,
            Case.access_restrictions['allowed_users'].astext.contains(str(user.id))
        )
    
    # Regular users - see non-sensitive or where assigned/allowed
    user_id_str = str(user.id)
    return or_(
        Case.is_sensitive == False,
        Case.sensitivity_level == SensitivityLevel.NORMAL,
        Case.lead_investigator == user.id,
        Case.created_by == user.id,
        Case.access_restrictions['allowed_users'].astext.contains(user_id_str),
        Case.access_restrictions['allowed_roles'].astext.contains(user.role.value)
    )
