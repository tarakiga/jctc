# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

JCTC (Joint Case Team on Cybercrimes) Management System - A comprehensive case management platform for cybercrime investigations. Monorepo with FastAPI backend and Next.js frontend.

## Commands

### Backend (FastAPI)

```powershell
# Install dependencies (from backend/)
uv pip install -r requirements.txt

# Run dev server (from backend/)
python run.py
# API: http://localhost:8000, Docs: http://localhost:8000/docs

# Run all tests
pytest backend/tests/

# Run specific test file
pytest backend/tests/test_prosecution_endpoints.py

# Run tests with coverage
pytest backend/tests/ --cov=app --cov-report=term
```

### Frontend (Next.js + Turborepo)

```powershell
# Install dependencies (from frontend/)
pnpm install

# Run dev server (from frontend/ or frontend/apps/web/)
pnpm dev
# or from apps/web: npm run dev
# App: http://localhost:3000

# Build
pnpm build

# Lint
pnpm lint

# Run unit tests (Vitest)
npm run test              # from frontend/apps/web/
npm run test:watch        # watch mode
npm run test:coverage     # with coverage

# Run E2E tests (Playwright)
npm run test:e2e          # from frontend/apps/web/
npm run test:e2e:headed   # visible browser
```

### Production Deployment

```powershell
# Deploy with script
./scripts/deploy.sh

# Or with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Architecture

### Backend Structure (`backend/app/`)

```
app/
├── api/v1/endpoints/     # REST endpoints (auth, users, cases, evidence, devices)
├── models/               # SQLAlchemy ORM models (20+ tables)
├── schemas/              # Pydantic request/response schemas
├── security/             # Rate limiting, input sanitization, JWT blacklisting
├── database/             # DB config, connection pooling, performance utils
├── services/             # Business logic layer
├── utils/                # Auth helpers, webhooks, audit logging
└── main.py               # FastAPI app initialization
```

**Key Models**: User (7 roles), Case, Party, Evidence, Device, Seizure, Artefact, ChainOfCustody, LegalInstrument, Charge, CourtSession, Task, AuditLog

**User Roles**: INTAKE, INVESTIGATOR, FORENSIC, PROSECUTOR, LIAISON, SUPERVISOR, ADMIN

### Frontend Structure (`frontend/`)

Turborepo monorepo with pnpm workspaces.

```
frontend/
├── apps/web/             # Main Next.js 16 app (App Router)
│   ├── app/              # Routes: /dashboard, /cases, /cases/[id], /evidence, /reports
│   ├── components/       # Feature components (cases/, evidence/, legal/, prosecution/)
│   └── lib/              # Hooks, contexts, services
└── packages/
    ├── api-client/       # Type-safe API client (@jctc/api-client)
    ├── types/            # Shared TypeScript types (@jctc/types)
    ├── ui/               # Shared UI components (@jctc/ui)
    └── tailwind-config/  # Shared Tailwind config
```

**State Management**: TanStack Query (server state), Zustand (client state)
**UI**: Radix UI primitives, Tailwind CSS v4, Recharts for visualization

### Data Flow

1. Frontend uses `@jctc/api-client` for type-safe API calls
2. Backend API at `/api/v1/*` with JWT authentication
3. PostgreSQL with async SQLAlchemy (asyncpg driver)
4. Redis for caching (300s TTL) and rate limiting

## Environment Setup

### Backend `.env` (copy from `.env.example`)
```
DATABASE_URL=postgresql+asyncpg://jctc_user:password@localhost:5432/jctc_db
SECRET_KEY=your-secret-key
DEBUG=True
REDIS_URL=redis://localhost:6379/0
```

### Frontend
Configure `NEXT_PUBLIC_API_URL` to point to backend (defaults to `http://localhost:8000`)

## Important Patterns

- **Authentication**: JWT tokens, refresh token flow, API key auth for external integrations
- **Evidence Chain of Custody**: Immutable audit trail with SHA-256 hash verification
- **Case Lifecycle**: OPEN → SUSPENDED/PROSECUTION → CLOSED with SLA timers
- **RBAC + ABAC**: Role-based access control plus case-level need-to-know restrictions

## Database Migrations

```powershell
# From backend/
alembic upgrade head        # Apply migrations
alembic revision --autogenerate -m "description"  # Generate migration
```

## Docker Services (Production)

8-service stack: app, db (PostgreSQL), redis, nginx, traefik, prometheus, grafana, backup
