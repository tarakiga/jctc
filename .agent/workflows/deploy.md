---
description: Deploy JCTC to production on AWS Lightsail
---

# Production Deployment Workflow

Coordinates full-stack deployment including frontend, backend, and dependencies.

---

## Prerequisites

- SSH key `lightsail_key.pem` in project root
- Access to production server (3.11.113.109)
- Changes committed and pushed to `main` branch
- Run `/sync-code` workflow first

---

## Deployment Options

Choose the appropriate deployment type:

| Type | When to Use |
|------|-------------|
| Full Deploy | Major releases, schema changes |
| Backend Only | API changes, no frontend updates |
| Frontend Only | UI changes, no backend updates |
| Hot Reload | Minor config changes |

---

## Full Stack Deploy

// turbo-all

### 1. Pull Latest Code
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git pull origin main"
```

### 2. Apply Database Migrations
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head"
```

### 3. Seed Lookup Values (if needed)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml run --rm app python -m scripts.seed_lookup_values"
```

### 4. Rebuild Backend
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml build --no-cache app"
```

### 5. Rebuild Frontend
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml build --no-cache web"
```

### 6. Restart All Services
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml up -d"
```

### 7. Verify Deployment
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker ps && curl -s https://api.jctc.ng/health"
```

---

## Backend Only Deploy

// turbo-all

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git pull origin main && docker-compose -f docker-compose.prod.yml build --no-cache app && docker-compose -f docker-compose.prod.yml up -d app"
```

---

## Frontend Only Deploy

// turbo-all

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git pull origin main && docker-compose -f docker-compose.prod.yml build --no-cache web && docker-compose -f docker-compose.prod.yml up -d web"
```

---

## One-Line Full Deploy (Quick)

// turbo
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && git pull origin main && docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head && docker-compose -f docker-compose.prod.yml build --no-cache && docker-compose -f docker-compose.prod.yml up -d"
```

---

## Container Management

### View Running Containers
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker ps"
```

### Restart Specific Container
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker restart jctc_app"
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker restart jctc_web"
```

### Stop All JCTC Containers
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml down"
```

### Start All JCTC Containers
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml up -d"
```

### Force Rebuild from Scratch
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cd jctc-app && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d --build"
```

---

## Environment Variables

### Check Current Env Vars
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_app printenv | grep -E 'DATABASE|S3|SECRET|AWS'"
```

### Update Env Vars
Edit the `.env.production` file on the server, then restart containers.

---

## Post-Deploy Checklist

- [ ] Run `/verify` workflow to check health
- [ ] Check frontend loads at https://jctc.ng
- [ ] Check API responds at https://api.jctc.ng/health
- [ ] Verify key features work (login, main pages)
- [ ] Monitor logs for first few minutes

---

## Production Environment

| Resource | Value |
|----------|-------|
| Backend IP | 3.11.113.109 |
| Backend URL | https://api.jctc.ng |
| Frontend URL | https://jctc.ng |
| S3 Bucket | jctc-files-production2 |
| Database | PostgreSQL (jctc_db container) |
| Cache | Redis (jctc_redis container) |
