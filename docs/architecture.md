---
title: Architecture Overview
description: High-level architecture and design of the JCTC Management System
---

# Architecture Overview

The JCTC Management System follows a modern microservices-ready architecture with clear separation between frontend and backend.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  App Router │  │  Components │  │  State Management       │  │
│  │  /app/*     │  │  /components│  │  TanStack Query+Zustand │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                    @jctc/api-client                              │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTP/REST + JWT
┌──────────────────────────────┼───────────────────────────────────┐
│                         Backend (FastAPI)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  API Layer  │  │  Services   │  │  Security Layer         │  │
│  │  /api/v1/*  │  │  Business   │  │  JWT, RBAC, Rate Limit  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                    SQLAlchemy ORM (Async)                        │
└──────────────────────────────┼───────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────┴────┐           ┌─────┴─────┐          ┌─────┴────┐
   │PostgreSQL│           │   Redis   │          │  Storage │
   │ Database │           │  Cache    │          │  Files   │
   └──────────┘           └───────────┘          └──────────┘
```

## Backend Architecture

### Layer Organization

**API Layer** (`backend/app/api/`)
- REST endpoints organized by domain (auth, users, cases, evidence, devices)
- Versioned under `/api/v1/`
- Input validation via Pydantic schemas

**Models Layer** (`backend/app/models/`)
- SQLAlchemy ORM models with async support
- 20+ tables covering cases, evidence, users, audit logs
- Relationship mapping for complex queries

**Services Layer** (`backend/app/services/`)
- Business logic separated from endpoints
- Reusable operations across multiple endpoints

**Security Layer** (`backend/app/security/`)
- JWT authentication with token refresh
- Role-based access control (7 roles)
- Rate limiting with sliding window algorithm
- Input sanitization against injection attacks

### Key Data Models

```
User ──┬── Case ──┬── Party (suspects, victims, witnesses)
       │          ├── Evidence ── ChainOfCustody
       │          ├── Device ── Artefact
       │          ├── LegalInstrument (warrants, court orders)
       │          ├── Task
       │          ├── Charge ── CourtSession ── Outcome
       │          └── AuditLog
       │
       └── CaseAssignment (role-based case access)
```

## Frontend Architecture

### Monorepo Structure (Turborepo)

```
frontend/
├── apps/
│   └── web/              # Main Next.js application
└── packages/
    ├── api-client/       # Type-safe API client
    ├── types/            # Shared TypeScript types
    ├── ui/               # Shared UI components
    └── tailwind-config/  # Shared styling config
```

### State Management Strategy

- **Server State**: TanStack Query for API data (caching, refetching, mutations)
- **Client State**: Zustand for UI state (modals, filters, selections)
- **Form State**: React Hook Form with Zod validation

### Component Organization

```
components/
├── cases/           # Case-related components
├── evidence/        # Evidence management
├── legal/           # Legal instruments
├── prosecution/     # Prosecution workflow
├── layout/          # App shell, navigation
└── ui/              # Generic reusable components
```

## Security Architecture

### Authentication Flow

1. User submits credentials to `/api/v1/auth/login`
2. Backend validates and returns JWT access token + refresh token
3. Access token (30min TTL) used for API requests
4. Refresh token (7 days) used to obtain new access tokens
5. Token blacklisting on logout

### Authorization Model

**RBAC (Role-Based)**
- ADMIN: Full system access
- SUPERVISOR: Team and case oversight
- INVESTIGATOR: Case management, evidence handling
- FORENSIC: Evidence analysis and device imaging
- PROSECUTOR: Legal workflow, court documents
- LIAISON: Inter-agency coordination
- INTAKE: Case registration only

**ABAC (Attribute-Based)**
- Case-level access restrictions
- Need-to-know controls for sensitive cases

## Data Integrity

### Evidence Chain of Custody

- All evidence changes create immutable custody entries
- SHA-256 hash verification for digital evidence
- Timestamps and user attribution for audit trail

### Audit Logging

- All significant actions logged to `AuditLog` table
- User, action, timestamp, and change details captured
- Compliance support for GDPR, SOX, HIPAA requirements

## Production Infrastructure

### Docker Services (8-service stack)

1. **app**: FastAPI application
2. **db**: PostgreSQL 15
3. **redis**: Caching and rate limiting
4. **nginx**: Reverse proxy, static files
5. **traefik**: Load balancing, SSL termination
6. **prometheus**: Metrics collection
7. **grafana**: Monitoring dashboards
8. **backup**: Automated database backups

### Performance Optimizations

- Redis caching with 300s TTL
- Database connection pooling (20 base + 30 overflow)
- 50+ optimized database indexes
- Bulk operation support for high-volume data
