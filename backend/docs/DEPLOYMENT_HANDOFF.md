# JCTC Deployment & Database Migration Handoff Guide

> **Purpose**: Ensure local development changes are correctly mirrored in production to prevent schema mismatches, missing columns, and failed deployments.

---

## Table of Contents

1. [Overview of Issues We Encountered](#overview-of-issues-we-encountered)
2. [Database Migration Workflow](#database-migration-workflow)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Procedure](#deployment-procedure)
5. [Schema Sync Commands](#schema-sync-commands)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [Quick Reference Commands](#quick-reference-commands)

---

## Overview of Issues We Encountered

During deployment, we faced multiple **500 errors** caused by:

| Issue | Root Cause | Solution |
|-------|------------|----------|
| Missing columns in `reports` table | Alembic migration not run on production | Run migrations before deploying code |
| Missing columns in `charges` table | Schema drift between local and production | Use `alembic revision --autogenerate` |
| Missing `forensic_reports` table | Table never created during initial deployment | Create missing tables or run full migration |
| S3 presigned URL signature mismatch | Secret key with `+` character corrupted | Use quotes in docker-compose for special chars |
| CORS errors after deployment | Container restarted without Traefik labels | Always use docker-compose, not docker run |

---

## Database Migration Workflow

### Golden Rules

> [!IMPORTANT]
> 1. **ALWAYS** generate migrations locally BEFORE pushing code
> 2. **NEVER** manually edit database schema on production without a migration file
> 3. **ALWAYS** test migrations locally before production
> 4. **KEEP** migration files in version control

### Step-by-Step: Making Schema Changes

#### 1. Modify Your Model (Local)

```python
# backend/app/models/your_model.py
class YourModel(BaseModel):
    __tablename__ = "your_table"
    
    # Add new column
    new_field = Column(String(100))  # <-- New column
```

#### 2. Generate Alembic Migration

```bash
cd backend
alembic revision --autogenerate -m "add new_field to your_table"
```

This creates a file like: `alembic/versions/abc123_add_new_field_to_your_table.py`

#### 3. Review Generated Migration

```python
# Always verify the generated migration!
def upgrade():
    op.add_column('your_table', sa.Column('new_field', sa.String(100)))

def downgrade():
    op.drop_column('your_table', 'new_field')
```

#### 4. Apply Migration Locally

```bash
alembic upgrade head
```

#### 5. Test Locally

- Verify the endpoint works
- Check the database has the new column
- Run any affected tests

#### 6. Commit Migration File

```bash
git add alembic/versions/abc123_add_new_field_to_your_table.py
git commit -m "Add migration for new_field column"
git push origin main
```

---

## Pre-Deployment Checklist

Before deploying to production, verify:

### Code Verification
- [ ] All changes committed to `main` branch
- [ ] No uncommitted local changes
- [ ] All tests pass locally

### Database Migration Verification
- [ ] `alembic revision --autogenerate -m "verify"` shows NO changes (if it does, you have uncommitted schema changes)
- [ ] All migration files are committed
- [ ] Migration tested on a fresh local database

### Environment Verification
- [ ] All required environment variables documented
- [ ] No hardcoded secrets in code
- [ ] Docker images build successfully locally

### S3/External Services
- [ ] S3 bucket exists and credentials are valid
- [ ] Any new environment variables added to `docker-compose.prod.yml`

---

## Deployment Procedure

### Step 1: Pull Latest Code on Production

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109
cd jctc-app
git pull origin main
```

### Step 2: Run Database Migrations FIRST

> [!CAUTION]
> Always run migrations BEFORE rebuilding containers!

```bash
# Stop the app container (keep DB running)
docker-compose -f docker-compose.prod.yml stop app

# Run migrations with a temporary container
docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head
```

### Step 3: Rebuild and Deploy

```bash
# Rebuild with no cache to ensure latest code
docker-compose -f docker-compose.prod.yml build --no-cache app

# Start the updated container
docker-compose -f docker-compose.prod.yml up -d app
```

### Step 4: Verify Deployment

```bash
# Check container is running
docker ps | grep jctc_app

# Check health endpoint
curl https://api.jctc.ng/health

# Check logs for errors
docker logs jctc_app --tail=20
```

---

## Schema Sync Commands

### Verify Schema Matches Model

Run inside the container to check for schema drift:

```bash
docker exec -it jctc_app python -c "
from app.models.base import Base
from app.db.session import engine
import sqlalchemy as sa

# Get model tables
model_tables = set(Base.metadata.tables.keys())
print(f'Model defines {len(model_tables)} tables')

# Get database tables
inspector = sa.inspect(engine)
db_tables = set(inspector.get_table_names())
print(f'Database has {len(db_tables)} tables')

# Find discrepancies
missing_in_db = model_tables - db_tables
extra_in_db = db_tables - model_tables

if missing_in_db:
    print(f'\\nMISSING TABLES in DB: {missing_in_db}')
if extra_in_db:
    print(f'\\nEXTRA TABLES in DB: {extra_in_db}')
if not missing_in_db and not extra_in_db:
    print('\\n✅ All tables match!')
"
```

### Force Create All Tables (Emergency Only)

> [!WARNING]
> Only use this if migrations are hopelessly broken and you need a fresh start

```bash
docker exec -it jctc_app python -c "
from app.models.base import Base
from app.db.session import engine
Base.metadata.create_all(bind=engine)
print('All tables created')
"
```

### Check Migration Status

```bash
docker exec -it jctc_app alembic current
docker exec -it jctc_app alembic history --verbose
```

---

## Troubleshooting Common Issues

### Issue: "Column X does not exist"

**Cause**: Migration not run on production

**Fix**:
```bash
# Run pending migrations
docker exec -it jctc_app alembic upgrade head

# If that doesn't work, manually add column
docker exec jctc_db psql -U jctc_user jctc_db -c \
  "ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;"
```

### Issue: "Relation X does not exist"

**Cause**: Table never created

**Fix**:
```bash
# Check if table exists
docker exec jctc_db psql -U jctc_user jctc_db -c "\\dt table_name"

# If missing, create it (get schema from model file)
docker exec jctc_db psql -U jctc_user jctc_db -c \
  "CREATE TABLE IF NOT EXISTS table_name (...);"
```

### Issue: CORS Errors After Deploy

**Cause**: Container started without proper docker-compose labels

**Fix**:
```bash
# Always use docker-compose, not docker run
docker-compose -f docker-compose.prod.yml up -d app
```

### Issue: S3 Signature Mismatch

**Cause**: Special characters in S3_SECRET_KEY not properly escaped

**Fix**: In `docker-compose.prod.yml`, quote the value:
```yaml
environment:
  - 'S3_SECRET_KEY=your+key/with+special+chars'
```

### Issue: Container Exited Immediately

**Check logs**:
```bash
docker logs jctc_app --tail=50
```

Common causes:
- Database not ready (use `depends_on` with healthcheck)
- Missing environment variable
- Python syntax error in code

---

## Quick Reference Commands

### SSH to Production
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109
```

### Docker Commands
```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs jctc_app --tail=50 --follow

# Restart container
docker restart jctc_app

# Execute command in container
docker exec -it jctc_app bash
```

### Database Commands
```bash
# Access PostgreSQL
docker exec -it jctc_db psql -U jctc_user jctc_db

# List tables
\dt

# Describe table
\d table_name

# Run SQL
docker exec jctc_db psql -U jctc_user jctc_db -c "SELECT * FROM users LIMIT 5;"
```

### Alembic Commands
```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View current migration
alembic current

# View history
alembic history --verbose
```

### Full Deployment (One Command)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && \
  git pull origin main && \
  docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head && \
  docker-compose -f docker-compose.prod.yml build --no-cache app && \
  docker-compose -f docker-compose.prod.yml up -d app"
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT secret key |
| `DEBUG` | No | Set to `false` for production |
| `S3_ENABLED` | Yes | Enable S3 storage |
| `S3_ACCESS_KEY` | Yes | AWS access key |
| `S3_SECRET_KEY` | Yes | AWS secret key (quote if special chars) |
| `S3_REGION` | Yes | AWS region (e.g., `eu-west-2`) |
| `S3_BUCKET_NAME` | Yes | S3 bucket name |

---

## Contact & Support

- **AWS Lightsail Console**: https://lightsail.aws.amazon.com
- **GitHub Repository**: https://github.com/tarakiga/jctc
- **Production URL**: https://jctc.ng
- **API URL**: https://api.jctc.ng

---

*Last Updated: December 2025*
