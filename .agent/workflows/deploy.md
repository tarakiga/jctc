---
description: Deploy JCTC to production on AWS Lightsail
---

# Production Deployment Workflow

## Prerequisites
- SSH key `lightsail_key.pem` in project root
- Access to production server (3.11.113.109)
- Changes committed and pushed to `main` branch

---

## Quick Deploy (All Steps)

// turbo-all
Run this single command for full deployment:

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git pull origin main && docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head && docker-compose -f docker-compose.prod.yml run --rm app python -m scripts.seed_lookup_values && docker-compose -f docker-compose.prod.yml build --no-cache app && docker-compose -f docker-compose.prod.yml up -d app"
```

---

## Step-by-Step Deployment

### 1. SSH to Production Server
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109
```

### 2. Navigate to Project
```bash
cd jctc-app
```

### 3. Pull Latest Code
```bash
git pull origin main
```

### 4. Run Database Migrations
```bash
docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head
```

### 5. Seed Lookup Values (presets for dropdowns)
```bash
docker-compose -f docker-compose.prod.yml run --rm app python -m scripts.seed_lookup_values
```

### 6. Rebuild Backend Container
```bash
docker-compose -f docker-compose.prod.yml build --no-cache app
```

### 7. Start Updated Container
```bash
docker-compose -f docker-compose.prod.yml up -d app
```

### 8. Verify Deployment
```bash
docker ps | grep jctc_app
curl https://api.jctc.ng/health
docker logs jctc_app --tail=10
```

---

## Troubleshooting Commands

### Check Container Logs
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_app --tail=50"
```

### Restart Container
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker restart jctc_app"
```

### Check Database Tables
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db psql -U jctc_user jctc_db -c '\dt'"
```

### Force Rebuild from Scratch
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d --build"
```

---

## Environment Variables Check
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_app printenv | grep -E 'DATABASE|S3|SECRET'"
```

---

## Rollback (If Needed)

### Revert to Previous Commit
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git log --oneline -5"
# Note the previous commit hash, then:
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git checkout <PREV_COMMIT_HASH> && docker-compose -f docker-compose.prod.yml build --no-cache app && docker-compose -f docker-compose.prod.yml up -d app"
```

### Rollback Database Migration
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_app alembic downgrade -1"
```
