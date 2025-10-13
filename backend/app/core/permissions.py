# Permissions module for JCTC application
from typing import List
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, UserRole
from app.models.case import Case
from app.core.deps import get_current_user, get_db


async def check_case_access(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> bool:
    """Check if user has access to a specific case."""
    # Admins have access to all cases
    if current_user.role == UserRole.ADMIN:
        return True
    
    # Check if case exists and user has access
    result = await db.execute(select(Case).filter(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check if user is assigned to the case or is a supervisor
    if (current_user.role == UserRole.SUPERVISOR or 
        case.assigned_officer_id == current_user.id):
        return True
    
    # Check role-based access
    role_case_access = {
        UserRole.INVESTIGATOR: True,
        UserRole.PROSECUTOR: True,
        UserRole.FORENSIC: True,
        UserRole.INTAKE: True,
        UserRole.LIAISON: True,
    }
    
    return role_case_access.get(current_user.role, False)


def require_roles(*allowed_roles: UserRole):
    """Decorator to require specific user roles."""
    def decorator(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {[role.value for role in allowed_roles]}"
            )
        return current_user
    return decorator


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_supervisor_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require supervisor or admin role."""
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisor or Admin access required"
        )
    return current_user


def require_prosecution_access(current_user: User = Depends(get_current_user)) -> User:
    """Require prosecutor, supervisor, or admin role."""
    if current_user.role not in [UserRole.PROSECUTOR, UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Prosecutor, Supervisor, or Admin access required"
        )
    return current_user


def require_forensic_access(current_user: User = Depends(get_current_user)) -> User:
    """Require forensic, supervisor, or admin role."""
    if current_user.role not in [UserRole.FORENSIC, UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forensic, Supervisor, or Admin access required"
        )
    return current_user