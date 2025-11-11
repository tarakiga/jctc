from fastapi import APIRouter
# Phase 1 scope only (extended to include device management for frontend flows)
from app.api.v1.endpoints import auth, users, cases, evidence, devices

api_router = APIRouter()

# Core Platform Foundation (Phase 1)
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
# Include device management endpoints under /api/v1/devices/devices/...
api_router.include_router(devices.router, prefix="/devices", tags=["device-management"])
