from fastapi import APIRouter
# Phase 1 scope only (extended to include device management for frontend flows)
from app.api.v1.endpoints import auth, users, cases, evidence, audit, prosecution, lookup_values, artefacts, charges, legal_instruments, international_requests, collaborations, attachments
from app.api import team_activity, reports, parties, chain_of_custody, ndpa_compliance

api_router = APIRouter()

# Core Platform Foundation (Phase 1)
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
api_router.include_router(artefacts.router, prefix="/artefacts", tags=["artefacts"])
api_router.include_router(charges.router, prefix="/charges", tags=["charges"])
api_router.include_router(legal_instruments.router, prefix="/legal-instruments", tags=["legal-instruments"])
api_router.include_router(international_requests.router, prefix="/international-requests", tags=["international-requests"])
api_router.include_router(collaborations.router, prefix="/collaborations", tags=["collaborations"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])
# Chain of Custody - mounted under /evidence prefix for /evidence/{id}/entries, /evidence/{id}/history etc
api_router.include_router(chain_of_custody.router, prefix="/evidence", tags=["chain-of-custody"])
# Include device management endpoints under /api/v1/devices/devices/...
# Devices router deprecated/merged into evidence
# api_router.include_router(devices.router, prefix="/devices", tags=["device-management"])

# Team Activity Management
api_router.include_router(team_activity.router, prefix="/team-activities", tags=["team-activities"], include_in_schema=True)

# Reports Management
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

# Parties Management
api_router.include_router(parties.router, prefix="/parties", tags=["parties"])

# Admin - Lookup Values Management
api_router.include_router(lookup_values.router, prefix="/admin/lookups", tags=["admin-lookups"])

# Audit and Compliance (Phase 2)
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])

# NDPA Compliance
api_router.include_router(ndpa_compliance.router, prefix="/ndpa", tags=["ndpa-compliance"])

# Prosecution Workflow (Phase 2)
api_router.include_router(prosecution.router, tags=["prosecution"])

