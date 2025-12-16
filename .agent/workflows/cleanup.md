---
description: Clean up old Docker images, logs, and disk space on production
---

# Cleanup Workflow

Remove unused Docker resources, old logs, and free up disk space.

---

## When to Use

- Disk space running low
- After multiple deployments
- Monthly maintenance
- Before major deployments

---

## Quick Cleanup

// turbo-all

### Check Disk Usage
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "df -h"
```

### Docker Disk Usage
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker system df"
```

---

## Docker Cleanup

### Remove Unused Docker Resources (Safe)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker system prune -f"
```

### Remove Dangling Images
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker image prune -f"
```

### Remove All Unused Images (Aggressive)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker image prune -a -f"
```
> ⚠️ This removes all images not used by running containers

### Remove Unused Volumes
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker volume prune -f"
```

### Remove Build Cache
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker builder prune -f"
```

### Full Docker Cleanup (All Unused)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker system prune -a --volumes -f"
```
> ⚠️ DANGER: Removes all unused images, containers, networks, and volumes

---

## Log Cleanup

### View Log Sizes
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "sudo du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail -10"
```

### Truncate Docker Container Logs
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log"
```

### Clear System Journal Logs (Keep 7 days)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "sudo journalctl --vacuum-time=7d"
```

### Clear Old Package Cache
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "sudo apt-get clean && sudo apt-get autoremove -y"
```

---

## Backup Cleanup

### Remove Backups Older Than 7 Days
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "find /home/ubuntu/backups -name '*.sql*' -mtime +7 -delete"
```

### List and Check Backups
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "ls -lh /home/ubuntu/backups/"
```

---

## Temp Files

### Clear Temp Directory
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "sudo rm -rf /tmp/*"
```

### Clear Old Uploads (if applicable)
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "find /home/ubuntu/jctc-app/uploads -mtime +30 -type f -delete"
```

---

## Set Up Automatic Cleanup

### Create Cleanup Script
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cat > /home/ubuntu/scripts/cleanup.sh << 'EOF'
#!/bin/bash
echo \"$(date): Starting cleanup...\"

# Docker cleanup
docker system prune -f
docker image prune -f

# Log cleanup
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
sudo journalctl --vacuum-time=7d

# Old backups
find /home/ubuntu/backups -name '*.sql*' -mtime +7 -delete

# Temp files
sudo rm -rf /tmp/*

echo \"$(date): Cleanup completed\"
df -h
EOF
chmod +x /home/ubuntu/scripts/cleanup.sh"
```

### Add Weekly Cron Job
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "(crontab -l 2>/dev/null; echo '0 4 * * 0 /home/ubuntu/scripts/cleanup.sh >> /home/ubuntu/logs/cleanup.log 2>&1') | crontab -"
```

---

## Disk Space Alerts

### Check Available Space
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "df -h / | awk 'NR==2 {print \"Used: \" \$5 \" Available: \" \$4}'"
```

### Alert if Disk > 80% Full
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "df -h / | awk 'NR==2 {gsub(/%/,\"\",\$5); if (\$5 > 80) print \"⚠️ WARNING: Disk \" \$5 \"% full!\"; else print \"✓ Disk usage OK: \" \$5 \"%\"}'"
```

---

## Expected Disk Space Savings

| Resource | Expected Savings |
|----------|-----------------|
| Dangling images | 1-5 GB |
| Unused volumes | 500 MB - 2 GB |
| Docker logs | 200 MB - 1 GB |
| System journals | 100 MB - 500 MB |
| Build cache | 1-3 GB |
| Old backups | 500 MB - 2 GB |

---

## Before/After Comparison

Run before cleanup:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "df -h / && docker system df"
```

Run after cleanup:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker system prune -a -f && df -h /"
```
