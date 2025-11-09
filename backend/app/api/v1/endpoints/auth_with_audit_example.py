"""
Example of authentication endpoints with comprehensive audit logging integrated.

This demonstrates how to integrate the audit system with existing endpoints
using the audit integration utilities.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.session import get_db
from app.models.users import User
from app.schemas.users import LoginRequest, Token, UserResponse
from app.utils.auth import verify_password, create_access_token
from app.utils.dependencies import get_current_active_user
from app.utils.audit_integration import (
    AuditableEndpoint, log_authentication_event, log_user_action
)
from app.schemas.audit import AuditAction, AuditEntity, AuditSeverity


router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=Token)
@AuditableEndpoint(
    action=AuditAction.LOGIN,
    entity=AuditEntity.SESSION,
    description="User login attempt",
    severity=AuditSeverity.MEDIUM,
    capture_request_data=True,  # Will redact password automatically
    sensitive_fields=['password', 'hashed_password']
)
async def login(
    login_data: LoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.
    
    This endpoint now includes comprehensive audit logging for:
    - Login attempts (successful and failed)
    - User account status checks
    - IP address and user agent tracking
    - Detailed security event logging
    """
    user = None
    success = False
    failure_reason = None
    
    try:
        # Get user by email
        result = db.execute(select(User).filter(User.email == login_data.email))
        user = result.scalar_one_or_none()
        
        # Check user existence and password
        if not user:
            failure_reason = "User not found"
        elif not verify_password(login_data.password, user.hashed_password):
            failure_reason = "Invalid password"
        elif not user.is_active:
            failure_reason = "Account inactive"
        else:
            success = True
        
        if not success:
            # Log failed authentication attempt
            await log_authentication_event(
                db=db,
                user_id=user.id if user else None,
                action="FAILED_LOGIN",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("User-Agent"),
                success=False,
                details={
                    "attempted_email": login_data.email,
                    "failure_reason": failure_reason,
                    "timestamp": "datetime.utcnow().isoformat()"
                }
            )
            
            # Generic error message for security
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Generate access token
        access_token = create_access_token(data={"sub": user.email})
        
        # Log successful authentication
        await log_authentication_event(
            db=db,
            user_id=user.id,
            action="LOGIN",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
            success=True,
            details={
                "login_timestamp": "datetime.utcnow().isoformat()",
                "token_generated": True,
                "user_role": user.role.value if user.role else None
            }
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        # Re-raise HTTP exceptions (already logged above)
        raise
    except Exception as e:
        # Log system errors
        await log_authentication_event(
            db=db,
            user_id=user.id if user else None,
            action="LOGIN_ERROR",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
            success=False,
            details={
                "error": str(e),
                "error_type": type(e).__name__
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error"
        )


@router.get("/me", response_model=UserResponse)
@AuditableEndpoint(
    action=AuditAction.READ,
    entity=AuditEntity.USER,
    description="Get current user information",
    severity=AuditSeverity.LOW
)
async def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user information with audit logging.
    
    Logs user profile access for security monitoring.
    """
    # Log user profile access
    await log_user_action(
        db=db,
        acting_user_id=current_user.id,
        target_user_id=str(current_user.id),
        action="READ",
        details={
            "accessed_own_profile": True,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("User-Agent")
        }
    )
    
    return current_user


@router.post("/refresh", response_model=Token)
@AuditableEndpoint(
    action=AuditAction.UPDATE,
    entity=AuditEntity.SESSION,
    description="Refresh access token",
    severity=AuditSeverity.MEDIUM
)
async def refresh_token(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Refresh access token with audit logging.
    
    Logs token refresh events for security monitoring.
    """
    try:
        access_token = create_access_token(data={"sub": current_user.email})
        
        # Log token refresh
        await log_authentication_event(
            db=db,
            user_id=current_user.id,
            action="TOKEN_REFRESH",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
            success=True,
            details={
                "refresh_timestamp": "datetime.utcnow().isoformat()",
                "new_token_generated": True,
                "user_role": current_user.role.value if current_user.role else None
            }
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        # Log token refresh failure
        await log_authentication_event(
            db=db,
            user_id=current_user.id,
            action="TOKEN_REFRESH_ERROR",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
            success=False,
            details={
                "error": str(e),
                "error_type": type(e).__name__
            }
        )
        raise


@router.post("/logout")
@AuditableEndpoint(
    action=AuditAction.LOGOUT,
    entity=AuditEntity.SESSION,
    description="User logout",
    severity=AuditSeverity.LOW
)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    User logout with audit logging.
    
    In a production system, this would typically invalidate the token.
    For now, we just log the logout event.
    """
    # Log logout event
    await log_authentication_event(
        db=db,
        user_id=current_user.id,
        action="LOGOUT",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
        success=True,
        details={
            "logout_timestamp": "datetime.utcnow().isoformat()",
            "session_duration_estimate": "unknown"  # Would calculate based on login time
        }
    )
    
    return {"message": "Successfully logged out"}


# Example of a high-risk endpoint with enhanced audit logging
@router.post("/reset-password")
@AuditableEndpoint(
    action=AuditAction.UPDATE,
    entity=AuditEntity.USER,
    description="Password reset request",
    severity=AuditSeverity.HIGH,
    capture_request_data=True,
    sensitive_fields=['password', 'new_password', 'old_password', 'token']
)
async def request_password_reset(
    email: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Password reset request with comprehensive audit logging.
    
    This is a high-risk operation that requires detailed auditing.
    """
    try:
        # Get user by email
        result = db.execute(select(User).filter(User.email == email))
        user = result.scalar_one_or_none()
        
        # Always log password reset attempts (even for non-existent users)
        await log_authentication_event(
            db=db,
            user_id=user.id if user else None,
            action="PASSWORD_RESET",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
            success=user is not None,
            details={
                "requested_email": email,
                "user_exists": user is not None,
                "reset_initiated": user is not None and user.is_active,
                "timestamp": "datetime.utcnow().isoformat()"
            }
        )
        
        if user and user.is_active:
            # In a real implementation, you'd send a reset email here
            # For now, just log the successful initiation
            await log_user_action(
                db=db,
                acting_user_id=None,  # System-initiated
                target_user_id=str(user.id),
                action="PASSWORD_RESET",
                details={
                    "reset_method": "email",
                    "initiated_by": "user_request",
                    "ip_address": request.client.host if request.client else None
                }
            )
        
        # Always return the same message for security (don't reveal if email exists)
        return {"message": "If the email exists in our system, a password reset link has been sent."}
    
    except Exception as e:
        # Log system errors in password reset
        await log_authentication_event(
            db=db,
            user_id=None,
            action="PASSWORD_RESET_ERROR",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
            success=False,
            details={
                "error": str(e),
                "error_type": type(e).__name__,
                "requested_email": email
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset system error"
        )