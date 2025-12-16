from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from app.database.base import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserResponse, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.auth import verify_password, create_access_token
from app.utils.dependencies import get_current_active_user

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return access token."""
    # Get user by email
    result = await db.execute(select(User).filter(User.email == login_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(days=7))
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_active_user)):
    """Refresh access token."""
    access_token = create_access_token(data={"sub": current_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout the current user.
    
    Since we're using stateless JWT tokens, the actual token invalidation
    happens on the client side by removing the token from storage.
    This endpoint confirms the logout action and can be extended to
    implement token blacklisting if needed.
    """
    return {"message": "Successfully logged out", "user_id": str(current_user.id)}


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request a password reset email.
    
    Always returns success to prevent email enumeration attacks.
    """
    import uuid
    import hashlib
    from datetime import datetime, timezone, timedelta
    from app.models.user import PasswordResetToken
    from app.services.email_service import EmailService
    
    # Find user by email
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if user and user.is_active:
        # Generate secure token
        raw_token = str(uuid.uuid4())
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Create reset token (30 min expiry)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        db.add(reset_token)
        await db.commit()
        
        # Send email
        try:
            email_service = EmailService(db)
            
            # Build reset URL (frontend will handle this page)
            reset_url = f"https://jctc.ng/reset-password?token={raw_token}"
            
            await email_service.send_templated_email(
                to_emails=[user.email],
                template_key="password_reset",
                variables={
                    "full_name": user.full_name or user.email,
                    "reset_url": reset_url,
                    "expiry_minutes": "30"
                }
            )
        except Exception as e:
            print(f"Failed to send password reset email: {str(e)}")
    
    # Always return success (security: don't reveal if email exists)
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password using a valid token.
    """
    import hashlib
    from datetime import datetime, timezone
    from app.models.user import PasswordResetToken
    from app.utils.auth import get_password_hash
    
    # Hash the provided token to find it in DB
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    
    # Find the token
    result = await db.execute(
        select(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash)
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    if not reset_token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired or has already been used"
        )
    
    # Get the user
    user_result = await db.execute(select(User).filter(User.id == reset_token.user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    
    # Mark token as used
    reset_token.used_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}
