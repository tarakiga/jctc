---
title: JCTC Management System Documentation
description: Comprehensive documentation for the Joint Case Team on Cybercrimes Management System
---

# JCTC Management System Documentation

Welcome to the JCTC Management System (CMS) documentation. This system is designed to handle the complete lifecycle of cybercrime cases from intake to prosecution and closure.

## What is JCTC CMS?

The Joint Case Team on Cybercrimes Management System is an end-to-end platform that enables:

- **Case Management**: Complete case lifecycle from intake to closure
- **Evidence Handling**: Digital and physical evidence with chain of custody
- **International Cooperation**: Cross-border case collaboration
- **Role-Based Access**: Seven distinct user roles with appropriate permissions
- **Audit Trail**: Comprehensive logging of all system actions

## Quick Navigation

- [Getting Started](getting-started.md) - Setup and installation guide
- [Architecture](architecture.md) - System design and structure
- [API Reference](api.md) - Complete API documentation
- [Integration APIs](integration-apis.md) - External system integration guide
- [Webhook Configuration](webhook-configuration.md) - Webhook setup and management
- [Mobile API](mobile-api.md) - Mobile optimization features
- [Reporting System](reporting-system.md) - Automated report generation
- [Task Management](task-management.md) - Advanced task workflows
- [User Roles](user-roles.md) - Roles and permissions matrix
- [Case Management](case-management.md) - Case handling workflows
- [Security](security.md) - Authentication and authorization
- [Deployment](deployment.md) - Production deployment guide

## Delivery Phases & Commit Plan

The documentation and codebase will be published to GitHub in weekly, phase-scoped commits.

- [x] Phase 1 — Core Platform Foundation (1 week): Authentication, User Management, Case Management
- [x] Phase 1A — Evidence Management System (1 week): Digital Evidence, Chain of Custody, File Handling
- [x] Phase 1B — Advanced Platform Features (1 week): Analytics, Notifications, Reporting, Mobile
- [ ] Phase 2 — Integration & Connectivity (1 week): External System Integration, Webhooks, Data Exchange, APIs
- [ ] Phase 2A — Audit & Compliance System (1 week): Comprehensive Audit Trails, Compliance Reporting
- [ ] Phase 2B — Testing, Deployment (1 week): Production Deployment, Documentation

Repository: https://github.com/tarakiga/jctc.git
Cadence: Weekly, when prompted.

## System Overview

The JCTC CMS is built with modern technologies to ensure scalability, security, and reliability:

- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Authentication**: JWT with RBAC
- **Documentation**: OpenAPI/Swagger

## Key Features

### Case Lifecycle Management

- Intake and triage
- Investigation workflow
- Evidence management
- Prosecution tracking
- Case closure and reporting

### Evidence Management

- Chain of custody tracking
- Digital evidence handling
- Physical evidence logging
- SHA-256 hash verification
- Secure storage management

### User Management

- Seven distinct user roles
- Granular permissions
- Multi-organization support
- Active Directory integration ready

### International Cooperation

- MLAT request handling
- Cross-border case tracking
- Partner agency collaboration
- 24/7 network integration

### Integration Platform

- External forensic tool connectivity (EnCase, Cellebrite, X-Ways)
- Database integration (INTERPOL, national databases)
- Webhook system with HMAC signature verification
- API key management with role-based permissions
- Data transformation and mapping engine
- Real-time monitoring and health checks

### Advanced Analytics

- Automated report generation
- Performance metrics and KPIs
- Task workflow automation
- Mobile optimization
- Search and filtering capabilities

## Getting Help

- Check the [API Documentation](api.md) for endpoint details
- Review [Troubleshooting](troubleshooting.md) for common issues
- Examine the source code structure in the [Architecture](architecture.md) guide

## Version Information

- **Current Version**: 1.0.0
- **API Version**: v1
- **Database Schema Version**: Initial Migration
- **Documentation Last Updated**: {{ "now" | date: "%Y-%m-%d" }}

## Next Steps

1. Start with the [Getting Started](getting-started.md) guide
2. Review the [Architecture](architecture.md) overview
3. Explore the [API Reference](api.md) documentation
4. Understand [User Roles](user-roles.md) and permissions
