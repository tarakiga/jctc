from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from app.database.base import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserResponse, LoginResponse
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
