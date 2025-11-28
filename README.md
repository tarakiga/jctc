# JCTC Management System

Joint Case Team on Cybercrimes (JCTC) Management System - A comprehensive case management platform for cybercrime investigations.

## 🏗️ Project Structure

This project is organized into separate directories for backend and frontend development:

```
JCTC/
├── 📁 backend/                    # FastAPI Backend Application
│   ├── 📁 app/                   # Main application code
│   ├── 📁 tests/                 # All test files
│   ├── 📁 alembic/              # Database migrations
│   ├── 📁 scripts/              # Utility scripts
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment variables template
│   └── run.py                   # Application entry point
├── 📁 frontend/                  # Next.js Frontend Application (95% Complete)
│   ├── 📁 apps/
│   │   └── 📁 web/              # Main web application
│   │       ├── 📁 app/          # Next.js App Router pages
│   │       ├── 📁 components/   # React components
│   │       ├── 📁 lib/          # Utilities and hooks
│   │       └── package.json     # Frontend dependencies
│   ├── 📁 packages/             # Shared packages
│   ├── turbo.json              # Turborepo configuration
│   └── package.json            # Workspace dependencies
├── 📁 docs/                     # Project documentation
├── 📁 scripts/                  # Deployment scripts
├── docker-compose.prod.yml      # Production deployment
├── Dockerfile                   # Docker configuration
├── .env.production              # Production environment
└── README.md                    # This file
```

## 🚀 Quick Start

### Full Stack Launch

To run both backend and frontend together:

1. **Terminal 1 - Start Backend:**
   ```bash
   cd backend
   uv pip install -r requirements.txt
   cp .env.example .env  # Configure on first run
   python run.py
   ```
   Backend will run at: http://localhost:8000

2. **Terminal 2 - Start Frontend:**
   ```bash
   cd frontend/apps/web
   npm install  # or pnpm install, yarn install
   npm run dev
   ```
   Frontend will run at: http://localhost:3000

### Backend Development

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   uv pip install -r requirements.txt
   ```

3. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application:**

   ```bash
   python run.py
   ```

5. **Access the API:**
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Frontend Development

1. **Navigate to frontend web app directory:**

   ```bash
   cd frontend/apps/web
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or: pnpm install, yarn install
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Web Application: http://localhost:3000

### Test Login Credentials

For development and testing, use the following default administrator credentials:

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@jctc.gov.ng` |
| Password | `admin123`         |

> ⚠️ **Security Warning:** These credentials are for development/testing only. Change them immediately in production environments.

### Testing

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Run tests:**

   ```bash
   pytest tests/
   ```

3. **Run specific test files:**
   ```bash
   pytest tests/test_prosecution_endpoints.py
   ```

### Production Deployment

1. **Deploy using the automated script:**

   ```bash
   ./scripts/deploy.sh
   ```

2. **Or deploy manually with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🗂️ Delivery Phases & Commit Plan

The project will be pushed to GitHub in weekly, phase-scoped commits. Only the code for the active phase will be included each week. The checklist below mirrors the provided phases.

- [x] Phase 1A — Core Platform Foundation (1 week): Authentication, User Management, Case Management
- [x] Phase 1B — Evidence Management System (1 week): Digital Evidence, Chain of Custody, File Handling
- [x] Phase 1C — Advanced Platform Features (1 week): Analytics, Notifications, Reporting, Mobile
- [x] Phase 2A — Integration & Connectivity (1 week): External System Integration, Webhooks, Data Exchange, APIs
- [x] Phase 2B — Audit & Compliance System (1 week): Comprehensive Audit Trails, Compliance Reporting
- [x] Phase 2C — Testing, Deployment (1 week): Production Deployment, Documentation

Repository: https://github.com/tarakiga/jctc.git
Cadence: Weekly commits when prompted; only include code within the scope of the active phase.

## 🧪 Testing & Reports

Comprehensive test reports for all backend implementation phases:

- **[Phase 1A Test Report](backend/tests/phase1a.md)** - Core Platform Foundation (Authentication, User Management, Case Management)
- **[Phase 1B Test Report](backend/tests/phase1b.md)** - Evidence Management System (Digital Evidence, Chain of Custody, File Handling)
- **[Phase 1C Test Report](backend/tests/phase1c.md)** - Advanced Platform Features (Analytics, Notifications, Reporting, Mobile)
- **[Phase 2A Test Report](backend/tests/phase2a.md)** - Integration & Connectivity (External Systems, Webhooks, Data Exchange, APIs)
- **[Phase 2B Test Report](backend/tests/phase2b.md)** - Audit & Compliance System (Audit Trails, Compliance Reporting)
- **[Phase 2C Test Report](backend/tests/phase2c.md)** - Testing & Deployment (Production Deployment, Documentation)
- **[Deployment Runbook (Phase 2C)](docs/deployment-runbook-phase-2c.md)** - Step-by-step deployment and rollback

## 📚 Documentation

- **[API Documentation](http://localhost:8000/docs)** - Interactive API documentation (when running)
- **[Deployment Runbook](docs/deployment-runbook-phase-2c.md)** - Step-by-step deployment and rollback
- **[Getting Started Guide](docs/getting-started.md)** - Quick start guide
- **[Integration APIs](docs/integration-apis.md)** - External system integration guide
- **[Mobile API](docs/mobile-api.md)** - Mobile application API documentation
- **[Reporting System](docs/reporting-system.md)** - Report generation and scheduling
- **[Task Management](docs/task-management.md)** - Task workflow and assignment
- **[Webhook Configuration](docs/webhook-configuration.md)** - Webhook setup and usage

## 🎯 Features

### Backend Core Functionality

- ✅ **User Management & Authentication** (7 role-based access levels)
- ✅ **Case Management System** with assignments and tracking
- ✅ **Evidence Management** with chain of custody
- ✅ **Prosecution Workflow** (21 endpoints)
- ✅ **Device & Forensics Management** (18 endpoints)
- ✅ **Integration APIs** (43 endpoints for external systems)
- ✅ **Audit & Compliance** (26 endpoints with GDPR/SOX/HIPAA support)

### Frontend Features (95% Complete)

#### Priority 1: Core Case Management (✅ Complete)
- ✅ **Case Dashboard** - Case list with filtering, sorting, and status management
- ✅ **Case Detail Page** - 15-tab comprehensive case view:
  - Overview, Evidence, Parties, Assignments, Tasks, Actions
  - Seizures, Devices, Forensics, Legal, Prosecution
  - International, Attachments, Collaboration, Timeline
- ✅ **Evidence Chain of Custody** - Full audit trail with automatic hash verification
- ✅ **Digital Evidence Viewer** - Multi-format support (images, documents, videos)

#### Priority 2: Evidence & Investigation (✅ Complete)
- ✅ **Evidence Management** - Upload, categorize, and track digital evidence
- ✅ **Chain of Custody Tracking** - Complete audit trail with timestamps and handlers
- ✅ **Evidence Analysis** - Hash verification (MD5, SHA-1, SHA-256)
- ✅ **Timeline Visualization** - Interactive case event timeline

#### Priority 3: Forensic Analysis (✅ Complete)
- ✅ **Forensic Management** - Track forensic examinations and findings
- ✅ **Device Management** - Catalog seized devices with chain of custody
- ✅ **Analysis Tools** - Document forensic procedures and results
- ✅ **Expert Assignment** - Assign forensic examiners to cases

#### Priority 4: Legal & Prosecution (✅ Complete)
- ✅ **Legal Instruments** - Manage warrants, subpoenas, court orders (9 types)
- ✅ **Prosecution Support** - Track charges, hearings, and verdicts
- ✅ **Court Calendar** - Integrated hearing schedule
- ✅ **Document Generation** - Legal document templates

#### Priority 5: Reporting (✅ Complete)
- ✅ **Report Generation** - 4 report types:
  - Monthly Operations Reports
  - Quarterly Prosecution Reports
  - Victim Support Reports
  - Executive Summary Reports
- ✅ **Scheduled Reports** - Automated report generation with email delivery
- ✅ **Export Formats** - CSV, Excel, PDF export support
- ✅ **Report History** - Archive and download past reports

#### Priority 6: Collaboration & Attachments (✅ Complete)
- ✅ **Case Attachments** - Upload with virus scanning and classification:
  - SHA-256 hash verification
  - 4 scan statuses: PENDING, CLEAN, INFECTED, FAILED
  - 3 classification levels: PUBLIC, LE_SENSITIVE, PRIVILEGED
- ✅ **Inter-Agency Collaboration** - 22 partner organizations:
  - Law Enforcement: EFCC, INTERPOL, FBI, EUROPOL, NCA, NPF, DSS, ICPC
  - Regulators: NCC, CBN, NITDA
  - Telecom: MTN, Airtel, Glo, 9mobile
  - Financial: GTB, Zenith, Access, UBA, FirstBank, Others
  - Contact management and information sharing

#### Priority 7: Advanced Features (⏳ 75% Complete)
- ✅ **SLA & Escalation Tracking** - 4 SLA policies with automatic escalation:
  - Initial Response: 24 hours
  - Investigation Completion: 30 days
  - Task Completion: 48 hours
  - High Priority Tasks: 24 hours
  - Color-coded status indicators (ON_TRACK, AT_RISK, BREACHED)
- ✅ **Case Deduplication** - Intelligent duplicate detection:
  - Levenshtein distance algorithm
  - Weighted scoring (Title 50%, Description 30%, Contact 20%)
  - 70% similarity threshold with linking capability
- ✅ **Data Retention & Disposal** - Compliance management:
  - Configurable retention policies by case type
  - Legal hold system to prevent premature disposal
  - 3 disposal methods: Cryptographic Erasure, Physical Destruction, Secure Delete
  - 5-stage disposal workflow with audit trail
- ✅ **Training Sandbox** - Safe environment for training:
  - 4 synthetic data templates (Fraud, Harassment, Workflow, Users)
  - Complete isolation from production data
  - Reset functionality
  - localStorage persistence
- ⏳ **Victim Support Portal** - (Planned)
- ⏳ **Geo-Location Tracking** - (Planned)

#### Priority 8: International Cooperation (⏳ Planned)
- ⏳ **Mutual Legal Assistance (MLA)** - Cross-border legal requests
- ⏳ **INTERPOL Integration** - Red notices and international alerts
- ⏳ **Embassy Liaison** - Diplomatic coordination

### Enterprise Features

- ✅ **Advanced Security** - Rate limiting, input sanitization, JWT blacklisting
- ✅ **Performance Optimization** - Redis caching, connection pooling, bulk operations
- ✅ **Monitoring & Observability** - Prometheus + Grafana integration
- ✅ **Production Deployment** - Docker containerization with 8-service stack
- ✅ **Comprehensive Testing** - Unit, integration, and load testing

## 🔧 Technology Stack

### Backend

- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and rate limiting
- **SQLAlchemy** - ORM and database toolkit
- **Alembic** - Database migrations
- **JWT** - Authentication and authorization
- **Pydantic** - Data validation and serialization

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **React Query (TanStack Query)** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **date-fns** - Date manipulation and formatting
- **Recharts** - Data visualization
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Infrastructure

- **Docker** - Containerization
- **Nginx** - Reverse proxy and static file serving
- **Traefik** - Load balancing and SSL automation
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards
- **Turborepo** - Monorepo build system

## 🛡️ Security

The system implements enterprise-grade security features:

- Advanced rate limiting with sliding window algorithm
- Input sanitization protecting against 15+ threat patterns
- JWT token blacklisting for enhanced security
- IP whitelist/blacklist support
- Comprehensive audit logging
- Role-based access control with 7 distinct roles

## 📈 Performance

Optimized for production use:

- Sub-500ms API response times
- Redis-based response caching (300s TTL)
- Database connection pooling (20 base + 30 overflow)
- 50+ optimized database indexes
- Bulk operation support for high-volume data

## 🚦 System Status

**Backend Status:** ✅ **100% Complete and Production-Ready**

- **API Endpoints:** 170+ endpoints implemented
- **Database Tables:** 20+ tables with full relationships
- **Test Coverage:** Comprehensive unit, integration, and load testing
- **Documentation:** Complete technical and user documentation
- **Deployment:** One-command production deployment ready

**Frontend Status:** ⏳ **95% Complete**

- **Completed Priorities:** 1-6 (Core, Evidence, Forensics, Legal, Reports, Collaboration)
- **Partial Priority:** 7 (Advanced Features - 4/6 tasks complete)
- **Pending Priority:** 8 (International Cooperation)
- **React Components:** 30+ components implemented
- **Custom Hooks:** 15+ hooks for business logic
- **Pages:** 10+ pages with 15-tab case detail view
- **Mock Data:** Fully populated for visual testing

## 🎯 Current Development

The system is in active frontend development (95% complete). Remaining work:

### Priority 7: Advanced Features (25% remaining)
- ⏳ **Victim Support Portal** - Victim communication and resource management
- ⏳ **Geo-Location Tracking** - Geographic data visualization

### Priority 8: International Cooperation (pending)
- ⏳ **MLA Request Management** - Cross-border legal assistance
- ⏳ **INTERPOL Integration** - International alerts and notices
- ⏳ **Embassy Liaison Module** - Diplomatic coordination

### Backend-Frontend Integration
- Replace mock data with live API calls
- Implement WebSocket for real-time updates
- Add authentication flow
- Production build optimization

## 📞 Support

For technical support or questions about the JCTC Management System:

- Check the [API Documentation](http://localhost:8000/docs) for endpoint details
- Review the test reports in [backend/tests/](backend/tests/) for implementation details
- Refer to the documentation in [docs/](docs/) for specific feature guides

## 📄 License

This project is developed for the Joint Case Team on Cybercrimes (JCTC) of Nigeria.
