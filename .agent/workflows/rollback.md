---
description: Rollback to last known good state in case of deployment failures
---

# Rollback Workflow

Quickly revert to a previous working state when deployments go wrong.

---

## When to Use

- Deployment caused critical errors
- Users reporting widespread issues
- Database migration failed partially
- New features breaking existing functionality

---

## Quick Rollback Decision Tree

```
Is the issue...
│
├─ Code-related? → Git Rollback
│
├─ Database-related? → Migration Rollback
│
├─ Configuration? → Container Restart
│
└─ Unknown? → Full Rollback
```

---

## Git Rollback (Code Changes)

### 1. View Recent Commits on Production
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git log --oneline -10"
```

### 2. Identify the Last Good Commit
Note the commit hash from before the problematic deploy (e.g., `abc1234`)

### 3. Revert to Previous Commit
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git checkout <COMMIT_HASH>"
```

### 4. Rebuild and Restart

For Backend:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml build --no-cache app && docker-compose -f docker-compose.prod.yml up -d app"
```

For Frontend:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml build --no-cache web && docker-compose -f docker-compose.prod.yml up -d web"
```

### 5. Return to Main Branch Later
After fixing the issue:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git checkout main && git pull origin main"
```

---

## Database Migration Rollback

### View Current Migration
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic current"
```

### View Migration History
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic history --verbose"
```

### Rollback One Migration
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade -1"
```

### Rollback to Specific Revision
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade <REVISION_ID>"
```

### Preview Rollback SQL (Dry Run)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade -1 --sql"
```

---

## Container Rollback (Quick Restart)

Sometimes a simple restart fixes issues:

### Restart All JCTC Containers
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml restart"
```

### Restart Specific Container
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker restart jctc_app"
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker restart jctc_web"
```

### Full Container Rebuild
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d --build"
```

---

## Full Rollback Procedure

When everything is broken, follow this complete procedure:

### Step 1: Stop All Services
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml down"
```

### Step 2: Find Last Working Commit
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git log --oneline -20"
```

### Step 3: Checkout Last Working Commit
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git checkout <LAST_GOOD_COMMIT>"
```

### Step 4: Rollback Database if Needed
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic downgrade -1"
```

### Step 5: Rebuild All Containers
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml build --no-cache"
```

### Step 6: Start All Services
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml up -d"
```

### Step 7: Verify
Run `/verify` workflow to confirm everything is working.

---

## Emergency Database Restore

If database is corrupted, restore from backup:

### 1. Stop Backend (Prevent Writes)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker stop jctc_app"
```

### 2. Restore from Backup
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec -i jctc_db psql -U jctc_user -d postgres -c 'DROP DATABASE jctc_db; CREATE DATABASE jctc_db;'"
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec -i jctc_db psql -U jctc_user jctc_db < /path/to/backup.sql"
```

### 3. Restart Backend
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker start jctc_app"
```

---

## After Rollback

1. **Investigate** - Check logs to understand what went wrong
2. **Fix** - Resolve the issue in development
3. **Test** - Thoroughly test the fix locally
4. **Deploy** - Use normal `/deploy` workflow when ready
5. **Document** - Add notes about what caused the issue

---

## Rollback Checklist

- [ ] Identified the issue type (code/database/config)
- [ ] Found the last known good state
- [ ] Stopped affected services
- [ ] Reverted to previous state
- [ ] Restarted services
- [ ] Verified functionality with `/verify`
- [ ] Communicated status to team
- [ ] Documented the incident
