---
description: Verify production health, logs, DB connectivity, and run smoke tests
---

# Verify Deployment Workflow

Comprehensive health checks and smoke tests after deployment.

---

## When to Use

- After any deployment
- When users report issues
- As part of regular monitoring
- Before and after maintenance

---

## Quick Health Check

// turbo-all

### 1. Check All Containers Running
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### 2. API Health Endpoint
```bash
curl -s https://api.jctc.ng/health
```

### 3. Frontend Accessible
```bash
curl -s -o /dev/null -w "%{http_code}" https://jctc.ng
```
> Should return `200`

---

## Detailed Health Checks

### Container Health Status
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker ps --format '{{.Names}}: {{.Status}}' | grep -E 'jctc'"
```

### Backend Container Logs (Last 50 lines)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_app --tail=50"
```

### Frontend Container Logs (Last 50 lines)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_web --tail=50"
```

### Follow Logs in Real-time
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs -f jctc_app"
```
> Press Ctrl+C to exit

---

## Database Connectivity

### Check PostgreSQL is Running
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_isready -U jctc_user -d jctc_db"
```
> Should return "accepting connections"

### Test Database Query
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db psql -U jctc_user -d jctc_db -c 'SELECT COUNT(*) FROM users;'"
```

### Check Recent Database Activity
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db psql -U jctc_user -d jctc_db -c 'SELECT datname, numbackends FROM pg_stat_database WHERE datname = '\''jctc_db'\'';'"
```

### List All Tables
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db psql -U jctc_user jctc_db -c '\dt'"
```

---

## Redis Connectivity

### Check Redis is Responding
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_redis redis-cli ping"
```
> Should return "PONG"

### Check Redis Info
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_redis redis-cli info | head -20"
```

---

## API Smoke Tests

### Test Authentication Endpoint
```bash
curl -s -X POST https://api.jctc.ng/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}' | head -c 200
```
> Should return JSON error (not a server error)

### Test Protected Endpoint (should fail without auth)
```bash
curl -s -w "\nHTTP Status: %{http_code}" https://api.jctc.ng/api/v1/users/me
```
> Should return 401 or 403

### Test OpenAPI Docs
```bash
curl -s -o /dev/null -w "%{http_code}" https://api.jctc.ng/docs
```
> Should return 200

---

## Resource Usage

### Container Resource Stats
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' | grep jctc"
```

### Disk Usage
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "df -h | head -5"
```

### Docker Disk Usage
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker system df"
```

---

## Error Detection

### Check for Recent Errors in Backend Logs
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_app --since 10m 2>&1 | grep -iE 'error|exception|traceback|failed'"
```

### Check for 5xx Errors in Traefik Logs
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_traefik --since 10m 2>&1 | grep ' 5[0-9][0-9] '"
```

---

## Full Verification Report

Run all checks in sequence:

// turbo-all

```bash
echo "=== Container Status ===" && ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep jctc"
```

```bash
echo "=== API Health ===" && curl -s https://api.jctc.ng/health
```

```bash
echo "=== Database ===" && ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_isready -U jctc_user -d jctc_db"
```

```bash
echo "=== Redis ===" && ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_redis redis-cli ping"
```

```bash
echo "=== Frontend ===" && curl -s -o /dev/null -w "HTTP %{http_code}" https://jctc.ng && echo ""
```

---

## Troubleshooting

### Container Won't Start
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_app --tail=100"
```

### Database Connection Issues
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_app printenv | grep DATABASE"
```

### Container Keeps Restarting
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker inspect jctc_app --format='{{.State.ExitCode}} - {{.State.Error}}'"
```
