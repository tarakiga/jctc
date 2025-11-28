from fastapi import APIRouter
# Phase 1 scope only (extended to include device management for frontend flows)
from app.api.v1.endpoints import auth, users, cases, evidence, devices, audit, prosecution
from app.api import team_activity

api_router = APIRouter()

# Core Platform Foundation (Phase 1)
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
# Include device management endpoints under /api/v1/devices/devices/...
api_router.include_router(devices.router, prefix="/devices", tags=["device-management"])
# Team Activity Management
api_router.include_router(team_activity.router, prefix="/team-activities", tags=["team-activities"], include_in_schema=True)

# Audit and Compliance (Phase 2)
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])

# Prosecution Workflow (Phase 2)
api_router.include_router(prosecution.router, tags=["prosecution"])
