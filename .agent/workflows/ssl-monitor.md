---
description: Monitor SSL certificates and domain health
---

# SSL & Domain Monitoring Workflow

Check SSL certificate status, expiry, and domain health.

---

## Quick SSL Check

// turbo-all

### Check API SSL Certificate
```bash
curl -vI https://api.jctc.ng 2>&1 | grep -E "expire date|issuer|subject"
```

### Check Frontend SSL Certificate
```bash
curl -vI https://jctc.ng 2>&1 | grep -E "expire date|issuer|subject"
```

---

## SSL Certificate Details

### View Full Certificate Info
```bash
echo | openssl s_client -servername api.jctc.ng -connect api.jctc.ng:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

### Check Certificate Expiry Date
```bash
echo | openssl s_client -servername jctc.ng -connect jctc.ng:443 2>/dev/null | openssl x509 -noout -enddate
```

### Days Until Expiry
```bash
echo | openssl s_client -servername jctc.ng -connect jctc.ng:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2 | xargs -I {} date -d {} +%s | xargs -I {} echo $(( ({} - $(date +%s)) / 86400 )) days
```

---

## Traefik Certificate Management

Traefik automatically manages Let's Encrypt certificates. To check:

### View Traefik Logs for Certificate Issues
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker logs jctc_traefik 2>&1 | grep -iE 'certificate|acme|letsencrypt' | tail -20"
```

### Check Traefik Certificate Store
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker exec jctc_traefik cat /letsencrypt/acme.json | head -100"
```

### Force Certificate Renewal
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "docker restart jctc_traefik"
```

---

## Domain Health Checks

### DNS Resolution Check
```bash
nslookup jctc.ng
nslookup api.jctc.ng
```

### A Record Check
```bash
dig +short jctc.ng A
dig +short api.jctc.ng A
```

### Check DNS Propagation
```bash
curl -s "https://dns.google/resolve?name=jctc.ng&type=A" | python -m json.tool
```

---

## HTTP/HTTPS Redirect Check

### Verify HTTP Redirects to HTTPS
```bash
curl -I http://jctc.ng 2>&1 | grep -E "HTTP|Location"
curl -I http://api.jctc.ng 2>&1 | grep -E "HTTP|Location"
```

---

## SSL Security Rating

### Test with SSL Labs API
```bash
curl -s "https://api.ssllabs.com/api/v3/analyze?host=jctc.ng&publish=off" | python -m json.tool | grep -E "grade|status"
```

---

## Set Up SSL Monitoring Script

### Create Monitoring Script on Production
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "cat > /home/ubuntu/scripts/check_ssl.sh << 'EOF'
#!/bin/bash
DOMAIN=\"jctc.ng\"
DAYS_WARN=14

# Get expiry date
EXPIRY_DATE=\$(echo | openssl s_client -servername \$DOMAIN -connect \$DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=\$(date -d \"\$EXPIRY_DATE\" +%s)
NOW_EPOCH=\$(date +%s)
DAYS_LEFT=\$(( (\$EXPIRY_EPOCH - \$NOW_EPOCH) / 86400 ))

echo \"\$(date): SSL Certificate for \$DOMAIN expires in \$DAYS_LEFT days (\$EXPIRY_DATE)\"

if [ \$DAYS_LEFT -lt \$DAYS_WARN ]; then
    echo \"⚠️ WARNING: SSL certificate expires in \$DAYS_LEFT days!\"
    # Add notification here (email, Slack, etc.)
fi
EOF
chmod +x /home/ubuntu/scripts/check_ssl.sh"
```

### Add Daily SSL Check to Cron
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "(crontab -l 2>/dev/null; echo '0 9 * * * /home/ubuntu/scripts/check_ssl.sh >> /home/ubuntu/logs/ssl.log 2>&1') | crontab -"
```

---

## Troubleshooting SSL Issues

### Certificate Not Updating
1. Check Traefik logs for ACME errors
2. Ensure port 80 is open for HTTP challenge
3. Verify DNS points to correct IP
4. Restart Traefik container

### Mixed Content Warnings
Check for HTTP resources in frontend:
```bash
ssh -i lightsail_key.pem ubuntu@3.11.113.109 "grep -r 'http://' /home/ubuntu/jctc-app/frontend/ --include='*.tsx' --include='*.ts' | grep -v node_modules"
```

### SSL Handshake Failures
```bash
curl -v https://api.jctc.ng 2>&1 | grep -iE "ssl|tls|handshake|error"
```
