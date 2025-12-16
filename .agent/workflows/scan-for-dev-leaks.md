---
description: Scan for development artifacts that must not reach production
---

# Dev Artifact Leak Scanner

Scans the JCTC codebase for dangerous development artifacts before deployment.

---

## When to Use

- Before every production deployment (`/deploy` workflow)
- As part of `/pre-deploy` checks
- After major refactoring
- In CI/CD pipeline before merge to main

---

## Risk Categories

| Severity | Pattern | Impact |
|----------|---------|--------|
| 🔴 CRITICAL | Committed `.env` files | Credential exposure |
| 🔴 CRITICAL | Hardcoded API keys/secrets | Security breach |
| 🟠 HIGH | `localhost`/`127.0.0.1` URLs | Broken API calls in prod |
| 🟠 HIGH | `DEBUG = True` in production config | Security & performance |
| 🟡 MEDIUM | Local filesystem paths | Runtime errors |
| 🟡 MEDIUM | Console.log with sensitive data | Information leakage |
| 🟢 LOW | TODO/FIXME comments | Technical debt |

---

## Quick Scan (All Checks)

// turbo-all

### Run Full Scan from Project Root
```powershell
cd d:\work\Tar\Andy\JCTC
```

---

## Backend Scans (Python/FastAPI)

### 1. Check for Localhost URLs
```powershell
findstr /S /I /N "localhost:" backend\*.py
findstr /S /I /N "127.0.0.1:" backend\*.py
```

### 2. Check for Hardcoded Secrets
```powershell
findstr /S /I /N /R "password.*=.*['\"]" backend\*.py
findstr /S /I /N /R "secret.*=.*['\"]" backend\*.py
findstr /S /I /N /R "api_key.*=.*['\"]" backend\*.py
findstr /S /I /N /R "token.*=.*['\"]" backend\*.py
```

### 3. Check for Debug Mode
```powershell
findstr /S /I /N "DEBUG.*=.*True" backend\*.py
findstr /S /I /N "debug.*=.*true" backend\*.py
```

### 4. Check for Print Statements (Should Use Logging)
```powershell
findstr /S /N "print(" backend\app\*.py
```

### 5. Check for Hardcoded Database URLs
```powershell
findstr /S /I /N "postgresql://" backend\*.py
findstr /S /I /N "postgres://" backend\*.py
```

---

## Frontend Scans (TypeScript/Next.js)

### 1. Check for Localhost URLs
```powershell
findstr /S /I /N "localhost:" frontend\apps\web\*.ts frontend\apps\web\*.tsx
findstr /S /I /N "127.0.0.1:" frontend\apps\web\*.ts frontend\apps\web\*.tsx
```

### 2. Check API Base URL Configuration
```powershell
findstr /S /I /N "http://localhost" frontend\apps\web\lib\*.ts
findstr /S /I /N "baseURL.*localhost" frontend\apps\web\lib\*.ts
```

### 3. Check for Hardcoded Secrets in Frontend
```powershell
findstr /S /I /N /R "apiKey.*=.*['\"]" frontend\apps\web\*.ts frontend\apps\web\*.tsx
findstr /S /I /N /R "secret.*=.*['\"]" frontend\apps\web\*.ts frontend\apps\web\*.tsx
```

### 4. Check for Console.log (Should be Removed in Prod)
```powershell
findstr /S /N "console.log" frontend\apps\web\app\*.tsx frontend\apps\web\components\*.tsx
```

### 5. Check for Exposed Environment Variables
```powershell
findstr /S /N "process.env" frontend\apps\web\*.ts frontend\apps\web\*.tsx | findstr /V "NEXT_PUBLIC"
```
> Frontend should only access `NEXT_PUBLIC_*` env vars

---

## Configuration File Scans

### 1. Check for Committed .env Files
```powershell
git ls-files | findstr /I "\.env"
```
> Should return empty. Any `.env` files should be in `.gitignore`

### 2. Verify .gitignore Includes Sensitive Files
```powershell
findstr /I ".env" .gitignore
findstr /I "*.pem" .gitignore
findstr /I "*.key" .gitignore
```

### 3. Check Docker Compose for Hardcoded Values
```powershell
findstr /I /N "password:" docker-compose*.yml
findstr /I /N "secret:" docker-compose*.yml
```
> Should use `${ENV_VAR}` syntax, not hardcoded values

### 4. Check for SSH Keys in Repo
```powershell
git ls-files | findstr /I "\.pem \.key id_rsa"
```
> Should return empty

---

## Local Path Scans

### 1. Windows Paths
```powershell
findstr /S /I /N "C:\\Users\\" backend\*.py frontend\apps\web\*.ts frontend\apps\web\*.tsx
findstr /S /I /N "D:\\work\\" backend\*.py frontend\apps\web\*.ts frontend\apps\web\*.tsx
```

### 2. macOS/Linux Paths
```powershell
findstr /S /I /N "/Users/" backend\*.py frontend\apps\web\*.ts frontend\apps\web\*.tsx
findstr /S /I /N "/home/" backend\*.py frontend\apps\web\*.ts frontend\apps\web\*.tsx
```

---

## AWS/S3 Specific Scans

### 1. Check for Hardcoded AWS Credentials
```powershell
findstr /S /I /N "AKIA" backend\*.py
findstr /S /I /N "aws_access_key_id.*=" backend\*.py
findstr /S /I /N "aws_secret_access_key.*=" backend\*.py
```

### 2. Check for Hardcoded S3 Bucket Names
```powershell
findstr /S /I /N "s3://" backend\*.py
findstr /S /I /N "jctc-files" backend\*.py
```
> S3 bucket names should come from environment variables

---

## Git History Scan

### Check for Accidentally Committed Secrets (Last 10 Commits)
```powershell
git log -p -10 --all -- "*.env" "*.pem" "*secret*" "*password*"
```

### Check for Large Files That Shouldn't Be Committed
```powershell
git rev-list --objects --all | git cat-file --batch-check="%(objecttype) %(objectname) %(objectsize) %(rest)" | findstr "blob" | sort /R
```

---

## Automated Full Scan Script

Create this as `scripts/scan-dev-leaks.ps1`:

```powershell
# Dev Leak Scanner for JCTC
# Run before every deployment

$ErrorCount = 0
$WarningCount = 0
$ReportDate = Get-Date -Format "yyyy-MM-dd_HHmmss"
$ReportFile = ".agent/reports/dev-leaks-$ReportDate.md"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  JCTC Dev Artifact Leak Scanner" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Create report directory
New-Item -ItemType Directory -Force -Path ".agent/reports" | Out-Null

# Start report
"# Dev Leak Scan Report`n" | Out-File $ReportFile
"**Date:** $(Get-Date)`n" | Add-Content $ReportFile
"**Branch:** $(git branch --show-current)`n" | Add-Content $ReportFile
"---`n" | Add-Content $ReportFile

# Check 1: Committed .env files
Write-Host "[1/8] Checking for committed .env files..." -ForegroundColor Yellow
$envFiles = git ls-files | Select-String "\.env"
if ($envFiles) {
    Write-Host "  ❌ CRITICAL: .env files committed!" -ForegroundColor Red
    $ErrorCount++
    "## ❌ CRITICAL: Committed .env Files`n$envFiles`n" | Add-Content $ReportFile
} else {
    Write-Host "  ✓ No .env files in git" -ForegroundColor Green
}

# Check 2: Localhost URLs in backend
Write-Host "[2/8] Checking backend for localhost URLs..." -ForegroundColor Yellow
$localhostBackend = Get-ChildItem -Recurse -Include "*.py" -Path "backend" | 
    Select-String -Pattern "localhost:|127\.0\.0\.1:" -CaseSensitive:$false
if ($localhostBackend) {
    Write-Host "  ⚠️ WARNING: localhost URLs found in backend" -ForegroundColor Yellow
    $WarningCount++
    "## ⚠️ Localhost URLs in Backend`n" | Add-Content $ReportFile
    $localhostBackend | ForEach-Object { "- $($_.Path):$($_.LineNumber)`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No localhost URLs in backend" -ForegroundColor Green
}

# Check 3: Localhost URLs in frontend
Write-Host "[3/8] Checking frontend for localhost URLs..." -ForegroundColor Yellow
$localhostFrontend = Get-ChildItem -Recurse -Include "*.ts","*.tsx" -Path "frontend" -Exclude "node_modules" | 
    Select-String -Pattern "localhost:|127\.0\.0\.1:" -CaseSensitive:$false
if ($localhostFrontend) {
    Write-Host "  ⚠️ WARNING: localhost URLs found in frontend" -ForegroundColor Yellow
    $WarningCount++
    "## ⚠️ Localhost URLs in Frontend`n" | Add-Content $ReportFile
    $localhostFrontend | ForEach-Object { "- $($_.Path):$($_.LineNumber)`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No localhost URLs in frontend" -ForegroundColor Green
}

# Check 4: Debug mode
Write-Host "[4/8] Checking for DEBUG mode..." -ForegroundColor Yellow
$debugMode = Get-ChildItem -Recurse -Include "*.py" -Path "backend" |
    Select-String -Pattern "DEBUG\s*=\s*True" -CaseSensitive:$false
if ($debugMode) {
    Write-Host "  ⚠️ WARNING: DEBUG=True found" -ForegroundColor Yellow
    $WarningCount++
}

# Check 5: Hardcoded secrets patterns
Write-Host "[5/8] Checking for hardcoded secrets..." -ForegroundColor Yellow
$secrets = Get-ChildItem -Recurse -Include "*.py","*.ts","*.tsx" -Path "backend","frontend" -Exclude "node_modules" |
    Select-String -Pattern "password\s*=\s*['\"][^'\"]{8,}['\"]|secret\s*=\s*['\"][^'\"]{8,}['\"]|api_key\s*=\s*['\"][^'\"]{8,}['\"]" -CaseSensitive:$false
if ($secrets) {
    Write-Host "  ❌ CRITICAL: Possible hardcoded secrets!" -ForegroundColor Red
    $ErrorCount++
    "## ❌ CRITICAL: Possible Hardcoded Secrets`n" | Add-Content $ReportFile
    $secrets | ForEach-Object { "- $($_.Path):$($_.LineNumber): $($_.Line.Trim())`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No obvious hardcoded secrets" -ForegroundColor Green
}

# Check 6: AWS credentials
Write-Host "[6/8] Checking for AWS credentials..." -ForegroundColor Yellow
$awsCreds = Get-ChildItem -Recurse -Include "*.py","*.ts","*.tsx","*.json" -Path "backend","frontend" -Exclude "node_modules" |
    Select-String -Pattern "AKIA[A-Z0-9]{16}" -CaseSensitive
if ($awsCreds) {
    Write-Host "  ❌ CRITICAL: AWS Access Key ID found!" -ForegroundColor Red
    $ErrorCount++
}

# Check 7: Local file paths
Write-Host "[7/8] Checking for local file paths..." -ForegroundColor Yellow
$localPaths = Get-ChildItem -Recurse -Include "*.py","*.ts","*.tsx" -Path "backend","frontend" -Exclude "node_modules" |
    Select-String -Pattern "C:\\\\Users\\\\|D:\\\\work\\\\|/Users/|/home/" -CaseSensitive:$false
if ($localPaths) {
    Write-Host "  ⚠️ WARNING: Local paths found" -ForegroundColor Yellow
    $WarningCount++
}

# Check 8: SSH/PEM files
Write-Host "[8/8] Checking for SSH keys in repo..." -ForegroundColor Yellow
$sshKeys = git ls-files | Select-String "\.pem|\.key|id_rsa"
if ($sshKeys) {
    Write-Host "  ❌ CRITICAL: SSH keys committed!" -ForegroundColor Red
    $ErrorCount++
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  SCAN COMPLETE" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Errors:   $ErrorCount" -ForegroundColor $(if ($ErrorCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Warnings: $WarningCount" -ForegroundColor $(if ($WarningCount -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Report:   $ReportFile" -ForegroundColor Gray
Write-Host ""

# Add summary to report
"`n---`n## Summary`n- Errors: $ErrorCount`n- Warnings: $WarningCount`n" | Add-Content $ReportFile

if ($ErrorCount -gt 0) {
    Write-Host "❌ DEPLOYMENT BLOCKED - Fix critical issues first!" -ForegroundColor Red
    exit 1
} elseif ($WarningCount -gt 0) {
    Write-Host "⚠️ Deployment allowed but review warnings" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✅ All checks passed - Safe to deploy" -ForegroundColor Green
    exit 0
}
```

---

## Run the Scanner

### From Project Root
```powershell
.\scripts\scan-dev-leaks.ps1
```

### Before Deploy (Integrate with /deploy)
Add to the beginning of `/deploy` workflow:
```powershell
# Run leak scanner first
.\scripts\scan-dev-leaks.ps1
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Deployment aborted due to security issues"
    exit 1 
}
```

---

## CI/CD Integration (GitHub Actions)

Add to `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  dev-leak-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Check for committed .env files
        run: |
          if git ls-files | grep -E '\.env(\.local|\.development)?$'; then
            echo "::error::Committed .env files detected!"
            exit 1
          fi
      
      - name: Check for localhost URLs
        run: |
          if grep -rn "localhost:" --include="*.py" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next"; then
            echo "::warning::localhost URLs detected - verify these are intentional"
          fi
      
      - name: Check for AWS credentials
        run: |
          if grep -rn "AKIA[A-Z0-9]\{16\}" --include="*.py" --include="*.ts" --include="*.json" . | grep -v node_modules; then
            echo "::error::AWS Access Key detected in code!"
            exit 1
          fi
      
      - name: Check for hardcoded secrets
        run: |
          if grep -rn "password.*=.*['\"]" --include="*.py" . | grep -v node_modules | grep -v "password.*=.*settings\|password.*=.*os.getenv\|password.*=.*environ"; then
            echo "::warning::Possible hardcoded passwords detected"
          fi
```

---

## Exceptions & Allowlist

Some patterns are false positives. Create `.agent/leak-allowlist.txt`:

```
# Patterns to ignore in leak scanner
# Format: filepath:pattern

# Test files can have localhost
backend/tests/*:localhost
frontend/**/*.test.ts:localhost

# Documentation examples
*.md:localhost
*.md:password

# Type definitions
frontend/**/types/*:password
```

---

## Quick Reference

| Command | What It Checks |
|---------|----------------|
| `git ls-files \| findstr .env` | Committed env files |
| `findstr /S "localhost:" backend\*.py` | Backend localhost refs |
| `findstr /S "AKIA" backend\*.py` | AWS key leaks |
| `findstr /S "password.*=.*['\"]" backend\*.py` | Hardcoded passwords |
