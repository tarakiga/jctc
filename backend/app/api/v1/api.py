from fastapi import APIRouter
# Phase 1 scope only
from app.api.v1.endpoints import auth, users, cases

api_router = APIRouter()

# Core Platform Foundation (Phase 1)
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
