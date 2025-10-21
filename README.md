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
├── 📁 frontend/                  # Frontend Application (Future)
│   └── (React/Vue/Angular app)
├── 📁 docs/                     # Project documentation
├── 📁 scripts/                  # Deployment scripts
├── docker-compose.prod.yml      # Production deployment
├── Dockerfile                   # Docker configuration
├── .env.production              # Production environment
└── README.md                    # This file
```

## 🚀 Quick Start

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
- [ ] Phase 1B — Evidence Management System (1 week): Digital Evidence, Chain of Custody, File Handling
- [ ] Phase 1C — Advanced Platform Features (1 week): Analytics, Notifications, Reporting, Mobile
- [ ] Phase 2A — Integration & Connectivity (1 week): External System Integration, Webhooks, Data Exchange, APIs
- [ ] Phase 2B — Audit & Compliance System (1 week): Comprehensive Audit Trails, Compliance Reporting
- [ ] Phase 2C — Testing, Deployment (1 week): Production Deployment, Documentation

Repository: https://github.com/tarakiga/jctc.git
Cadence: Weekly commits when prompted; only include code within the scope of the active phase.

## 🧪 Phase Test Reports

- [Phase 1 test report](tests/phase1.md)

## 📚 Documentation

- **[Complete System Documentation](handoff.md)** - Comprehensive technical documentation
- **[API Documentation](http://localhost:8000/docs)** - Interactive API documentation (when running)
- **[Performance Optimization Summary](PERFORMANCE_OPTIMIZATION_SUMMARY.md)** - Performance enhancements
- **[System Audit Report](FINAL_SYSTEM_AUDIT_REPORT.md)** - Complete system audit

## 🎯 Features

### Core Functionality

- ✅ **User Management & Authentication** (7 role-based access levels)
- ✅ **Case Management System** with assignments and tracking
- ✅ **Evidence Management** with chain of custody
- ✅ **Prosecution Workflow** (21 endpoints)
- ✅ **Device & Forensics Management** (18 endpoints)
- ✅ **Integration APIs** (43 endpoints for external systems)
- ✅ **Audit & Compliance** (26 endpoints with GDPR/SOX/HIPAA support)

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

### Infrastructure

- **Docker** - Containerization
- **Nginx** - Reverse proxy and static file serving
- **Traefik** - Load balancing and SSL automation
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards

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

**Current Status:** ✅ **100% Complete and Production-Ready**

- **API Endpoints:** 170+ endpoints implemented
- **Database Tables:** 20+ tables with full relationships
- **Test Coverage:** Comprehensive unit, integration, and load testing
- **Documentation:** Complete technical and user documentation
- **Deployment:** One-command production deployment ready

## 🎯 Future Development

The system is ready for frontend development. The backend provides:

- RESTful APIs with OpenAPI/Swagger documentation
- Mobile-optimized endpoints
- Real-time capabilities through WebSocket support
- Comprehensive error handling and validation

## 📞 Support

For technical support or questions about the JCTC Management System:

- Review the [Complete System Documentation](handoff.md)
- Check the [API Documentation](http://localhost:8000/docs) for endpoint details
- Refer to the [System Audit Report](FINAL_SYSTEM_AUDIT_REPORT.md) for implementation details

## 📄 License

This project is developed for the Joint Case Team on Cybercrimes (JCTC) of Nigeria.
