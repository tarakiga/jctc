---
title: Getting Started
description: Quick start guide for setting up and running the JCTC Management System
---

# Getting Started

This guide will help you set up and run the JCTC Management System locally for development or testing.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11 or higher**
- **PostgreSQL 12 or higher**
- **Git** (for version control)
- **uv** (Python package manager - recommended) or pip

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd JCTC
```

### 2. Set Up Virtual Environment

Using uv (recommended):
```powershell
uv venv venv
venv\Scripts\activate
```

Or using standard Python:
```powershell
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```powershell
uv pip install -r requirements.txt
```

### 4. Configure Environment

1. Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

2. Edit the `.env` file with your settings:
```
DATABASE_URL=postgresql+asyncpg://jctc_user:your_password@localhost:5432/jctc_db
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
```

### 5. Set Up Database

1. Create PostgreSQL database:
```sql
CREATE DATABASE jctc_db;
CREATE USER jctc_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jctc_db TO jctc_user;
```

2. Initialize database migrations:
```powershell
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 6. Create Initial Admin User

Create a script to add an admin user (optional but recommended):

```python
# create_admin.py
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models.user import User, UserRole
from app.utils.auth import get_password_hash
from app.config.settings import settings

async def create_admin():
    engine = create_async_engine(settings.database_url)
    async with AsyncSession(engine) as session:
        admin_user = User(
            email="admin@jctc.gov.ng",
            full_name="System Administrator",
            role=UserRole.ADMIN,
            org_unit="JCTC HQ",
            is_active=True,
            hashed_password=get_password_hash("admin123")
        )
        session.add(admin_user)
        await session.commit()
        print("Admin user created successfully!")

if __name__ == "__main__":
    asyncio.run(create_admin())
```

Run the script:
```powershell
python create_admin.py
```

### 7. Start the Application

```powershell
python run.py
```

Or with uvicorn directly:
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Accessing the Application

Once the application is running, you can access:

- **API Endpoints**: http://localhost:8000/api/v1/
- **Interactive Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## First Steps

### 1. Test Authentication

Use the interactive docs at http://localhost:8000/docs to:

1. Navigate to `/api/v1/auth/login`
2. Use the admin credentials:
   ```json
   {
     "email": "admin@jctc.gov.ng",
     "password": "admin123"
   }
   ```
3. Copy the access token from the response
4. Click "Authorize" button and enter: `Bearer <your-token>`

### 2. Create Case Types

Before creating cases, add some case types:

1. Access `/api/v1/cases/types/` (you'll need this for the database)
2. Manually add case types to the database:

```sql
INSERT INTO lookup_case_type (code, label, description) VALUES 
('TIP_SEXTORTION', 'Online Sextortion', 'Cases involving online sextortion and blackmail'),
('ONLINE_CHILD_EXPLOITATION', 'Online Child Exploitation', 'Cases involving exploitation of minors online'),
('CYBERBULLYING', 'Cyberbullying', 'Online harassment and bullying cases'),
('IDENTITY_THEFT', 'Identity Theft', 'Cases involving stolen personal information'),
('FINANCIAL_FRAUD', 'Financial Fraud', 'Online financial crimes and fraud');
```

### 3. Create Additional Users

Use the admin account to create users with different roles:

1. Navigate to `/api/v1/users/` POST endpoint
2. Create users for each role (INTAKE, INVESTIGATOR, etc.)

### 4. Create Your First Case

1. Use `/api/v1/cases/` POST endpoint
2. Create a sample case with:
   ```json
   {
     "title": "Sample Cybercrime Case",
     "description": "Test case for system validation",
     "severity": 3,
     "local_or_international": "LOCAL",
     "case_type_id": "<case-type-uuid>"
   }
   ```

## Development Workflow

### Making Changes

1. Modify models in `app/models/`
2. Create migration: `alembic revision --autogenerate -m "Description"`
3. Apply migration: `alembic upgrade head`
4. Test changes with the interactive docs

### Project Structure Overview

```
JCTC/
├── app/
│   ├── api/v1/endpoints/     # API route handlers
│   ├── config/               # Configuration settings
│   ├── database/             # Database connection
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Pydantic schemas
│   ├── utils/                # Utilities and dependencies
│   └── main.py              # FastAPI app instance
├── docs/                    # Documentation
├── requirements.txt         # Python dependencies
└── run.py                  # Application startup
```

## Common Issues

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env file
- Ensure database and user exist

### Token Errors
- Check SECRET_KEY is set in .env
- Ensure tokens haven't expired (30min default)
- Verify user is active in database

### Permission Errors
- Check user role assignments
- Verify case access permissions
- Review RBAC logic in endpoints

## Next Steps

- Review the [Architecture](architecture.md) documentation
- Explore the [API Reference](api.md) for all endpoints
- Check [User Roles](user-roles.md) for permission details
- Learn about [Case Management](case-management.md) workflows

## Environment Configuration Reference

Key environment variables for development:

```
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/jctc_db
SECRET_KEY=your-secret-key-here

# Optional (with defaults)
DEBUG=True
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8080"]
LOG_LEVEL=INFO
```