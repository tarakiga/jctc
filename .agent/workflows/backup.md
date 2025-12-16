---
description: Create and restore database backups before risky operations
---

# Backup Workflow

Create database backups before migrations, major deployments, or data changes.

---

## When to Use

- Before running database migrations
- Before major deployments
- Before bulk data operations
- As part of regular backup schedule

---

## Create Database Backup

### Quick Backup (Timestamped)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_dump -U jctc_user jctc_db > /home/ubuntu/backups/jctc_db_$(date +%Y%m%d_%H%M%S).sql"
```

### Compressed Backup
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_dump -U jctc_user jctc_db | gzip > /home/ubuntu/backups/jctc_db_$(date +%Y%m%d_%H%M%S).sql.gz"
```

### Schema Only Backup
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_dump -U jctc_user --schema-only jctc_db > /home/ubuntu/backups/jctc_schema_$(date +%Y%m%d).sql"
```

### Data Only Backup
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_dump -U jctc_user --data-only jctc_db > /home/ubuntu/backups/jctc_data_$(date +%Y%m%d).sql"
```

---

## List Available Backups

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "ls -lh /home/ubuntu/backups/ | tail -20"
```

---

## Restore from Backup

### 1. Stop Backend (Prevent Writes)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker stop jctc_app"
```

### 2. Restore Database
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cat /home/ubuntu/backups/jctc_db_YYYYMMDD_HHMMSS.sql | docker exec -i jctc_db psql -U jctc_user jctc_db"
```

### 3. For Compressed Backup
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "gunzip -c /home/ubuntu/backups/jctc_db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i jctc_db psql -U jctc_user jctc_db"
```

### 4. Restart Backend
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker start jctc_app"
```

---

## Download Backup to Local

```bash
scp -i lightsail_key.pem ubuntu@3.11.113.109:/home/ubuntu/backups/jctc_db_YYYYMMDD_HHMMSS.sql ./backups/
```

---

## Upload Backup to S3

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "aws s3 cp /home/ubuntu/backups/jctc_db_$(date +%Y%m%d).sql.gz s3://jctc-backups/database/"
```

---

## Setup Backup Directory

First-time setup:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "mkdir -p /home/ubuntu/backups && chmod 700 /home/ubuntu/backups"
```

---

## Cleanup Old Backups

Keep only last 7 days of backups:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "find /home/ubuntu/backups -name '*.sql*' -mtime +7 -delete"
```

---

## Pre-Migration Backup Script

Run this before any migration:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_db pg_dump -U jctc_user jctc_db | gzip > /home/ubuntu/backups/pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz && echo 'Backup created successfully'"
```
