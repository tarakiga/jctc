---
description: Manage Alembic database migrations safely in development and production
---

# Apply Migrations Workflow

Safely create and apply database migrations using Alembic.

---

## When to Use

- After modifying SQLAlchemy models
- Before deploying backend changes that require schema updates
- When setting up a new environment

---

## Development (Local) Migrations

### 1. Create a New Migration

After making changes to models in `backend/app/models/`:

```bash
cd backend
python -m alembic revision --autogenerate -m "Description of changes"
```

### 2. Review the Generated Migration

Always review before applying:
```bash
# View the latest migration file
dir alembic\versions\ /O:-D | findstr /R "^[0-9a-f]"
```

Open the file and verify:
- [ ] `upgrade()` contains expected table/column changes
- [ ] `downgrade()` correctly reverses the changes
- [ ] No unintended changes (Alembic sometimes detects drift)

### 3. Apply Migration Locally

```bash
python -m alembic upgrade head
```

### 4. Verify Migration Applied

```bash
python -m alembic current
```

---

## Production Migrations

### Pre-Migration Checklist

- [ ] Migration tested locally first
- [ ] Code is committed and pushed to remote
- [ ] Production code pulled to latest
- [ ] Database backup taken (see /backup workflow)

### 1. SSH to Production
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109
```

### 2. Navigate to Project
```bash
cd jctc-app
```

### 3. Check Current Migration Status
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic current
```

### 4. View Pending Migrations
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic history --verbose
```

### 5. Apply Migrations
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head
```

### 6. Verify Success
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic current
```

---

## Quick Production Migration (Single Command)

// turbo
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head"
```

---

## Rollback Migrations

### Rollback One Step
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade -1
```

### Rollback to Specific Revision
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade <revision_id>
```

### View Downgrade SQL (Dry Run)
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade -1 --sql
```

---

## Troubleshooting

### Migration Fails Due to Existing Objects
If you see "relation already exists":
1. Check if migration was partially applied
2. Consider using `alembic stamp <revision>` to mark as applied
3. Or manually fix the database state

### Clean State Reset (DANGEROUS - Dev Only)
```bash
# Drop all tables and recreate
python -m alembic downgrade base
python -m alembic upgrade head
```

### Check Database Tables
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db psql -U jctc_user jctc_db -c '\dt'"
```

### View Table Schema
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db psql -U jctc_user jctc_db -c '\d+ table_name'"
```

---

## Best Practices

1. **Always test migrations locally first**
2. **Take database backups before production migrations**
3. **Review auto-generated migrations** - Alembic can miss things or add unwanted changes
4. **Use descriptive migration messages** - Future you will thank present you
5. **Keep migrations small and focused** - Easier to debug and rollback
6. **Never edit applied migrations** - Create new ones instead
