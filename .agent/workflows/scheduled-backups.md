---
description: Set up and manage scheduled automatic database backups
---

# Scheduled Backups Workflow

Configure automatic daily/weekly database backups on production.

---

## Setup Cron Jobs on Production

### 1. SSH to Production
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109
```

### 2. Create Backup Directory
```bash
mkdir -p /home/ubuntu/backups
chmod 700 /home/ubuntu/backups
```

### 3. Create Backup Script
```bash
cat > /home/ubuntu/scripts/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jctc_db_$TIMESTAMP.sql.gz"

# Create backup
docker exec jctc_db pg_dump -U jctc_user jctc_db | gzip > "$BACKUP_FILE"

# Log success
echo "$(date): Backup created: $BACKUP_FILE" >> /home/ubuntu/logs/backup.log

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_FILE" s3://jctc-backups/database/

# Keep only last 7 days of local backups
find "$BACKUP_DIR" -name "jctc_db_*.sql.gz" -mtime +7 -delete

echo "$(date): Cleanup completed" >> /home/ubuntu/logs/backup.log
EOF

chmod +x /home/ubuntu/scripts/backup_db.sh
mkdir -p /home/ubuntu/logs
```

### 4. Set Up Cron Job
```bash
crontab -e
```

Add these lines:
```cron
# Daily backup at 2 AM
0 2 * * * /home/ubuntu/scripts/backup_db.sh

# Weekly full backup to S3 on Sundays at 3 AM
0 3 * * 0 /home/ubuntu/scripts/backup_db.sh && aws s3 cp /home/ubuntu/backups/jctc_db_$(date +\%Y\%m\%d)*.sql.gz s3://jctc-backups/weekly/
```

### 5. Verify Cron is Set
```bash
crontab -l
```

---

## One-Line Setup (Remote)

// turbo
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "mkdir -p /home/ubuntu/backups /home/ubuntu/scripts /home/ubuntu/logs && echo '#!/bin/bash
docker exec jctc_db pg_dump -U jctc_user jctc_db | gzip > /home/ubuntu/backups/jctc_db_\$(date +%Y%m%d_%H%M%S).sql.gz
find /home/ubuntu/backups -name \"*.sql.gz\" -mtime +7 -delete' > /home/ubuntu/scripts/backup_db.sh && chmod +x /home/ubuntu/scripts/backup_db.sh"
```

---

## Add to Crontab (Remote)

```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "(crontab -l 2>/dev/null; echo '0 2 * * * /home/ubuntu/scripts/backup_db.sh') | crontab -"
```

---

## Check Backup Status

### View Recent Backups
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "ls -lh /home/ubuntu/backups/ | tail -10"
```

### View Backup Logs
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "tail -20 /home/ubuntu/logs/backup.log"
```

### Test Backup Script Manually
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "/home/ubuntu/scripts/backup_db.sh"
```

---

## Backup Retention Policy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Daily | Every day at 2 AM | 7 days |
| Weekly | Sunday at 3 AM | 30 days (S3) |
| Monthly | 1st of month | 1 year (S3) |

---

## S3 Backup Configuration

### Set Up AWS CLI on Production
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "aws configure"
```

### Create S3 Bucket for Backups
```bash
aws s3 mb s3://jctc-backups --region eu-west-1
```

### Enable Versioning
```bash
aws s3api put-bucket-versioning --bucket jctc-backups --versioning-configuration Status=Enabled
```

### Set Lifecycle Policy (Auto-delete after 90 days)
```bash
aws s3api put-bucket-lifecycle-configuration --bucket jctc-backups --lifecycle-configuration '{
  "Rules": [{
    "ID": "DeleteOldBackups",
    "Status": "Enabled",
    "Filter": {"Prefix": "database/"},
    "Expiration": {"Days": 90}
  }]
}'
```

---

## Disaster Recovery

### Download Latest Backup
```bash
scp -i lightsail_key.pem ubuntu@3.11.113.109:/home/ubuntu/backups/$(ssh -i lightsail_key.pem ubuntu@3.11.113.109 "ls -t /home/ubuntu/backups/*.sql.gz | head -1 | xargs basename") ./
```

### Restore from S3
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "aws s3 cp s3://jctc-backups/weekly/latest.sql.gz /home/ubuntu/backups/ && gunzip -c /home/ubuntu/backups/latest.sql.gz | docker exec -i jctc_db psql -U jctc_user jctc_db"
```
