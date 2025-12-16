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
    "## ⚠️ DEBUG Mode Enabled`n" | Add-Content $ReportFile
    $debugMode | ForEach-Object { "- $($_.Path):$($_.LineNumber)`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No DEBUG=True found" -ForegroundColor Green
}

# Check 5: Hardcoded secrets patterns
Write-Host "[5/8] Checking for hardcoded secrets..." -ForegroundColor Yellow
$secrets = Get-ChildItem -Recurse -Include "*.py","*.ts","*.tsx" -Path "backend","frontend" -Exclude "node_modules" |
    Select-String -Pattern "password\s*=\s*['\`"][^'\`"]{8,}['\`"]|secret\s*=\s*['\`"][^'\`"]{8,}['\`"]|api_key\s*=\s*['\`"][^'\`"]{8,}['\`"]" -CaseSensitive:$false
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
    "## ❌ CRITICAL: AWS Access Key ID Found`n" | Add-Content $ReportFile
    $awsCreds | ForEach-Object { "- $($_.Path):$($_.LineNumber)`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No AWS credentials in code" -ForegroundColor Green
}

# Check 7: Local file paths
Write-Host "[7/8] Checking for local file paths..." -ForegroundColor Yellow
$localPaths = Get-ChildItem -Recurse -Include "*.py","*.ts","*.tsx" -Path "backend","frontend" -Exclude "node_modules" |
    Select-String -Pattern "C:\\\\Users\\\\|D:\\\\work\\\\|/Users/|/home/" -CaseSensitive:$false
if ($localPaths) {
    Write-Host "  ⚠️ WARNING: Local paths found" -ForegroundColor Yellow
    $WarningCount++
    "## ⚠️ Local File Paths Found`n" | Add-Content $ReportFile
    $localPaths | ForEach-Object { "- $($_.Path):$($_.LineNumber): $($_.Line.Trim())`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No local paths found" -ForegroundColor Green
}

# Check 8: SSH/PEM files
Write-Host "[8/8] Checking for SSH keys in repo..." -ForegroundColor Yellow
$sshKeys = git ls-files | Select-String "\.pem|\.key|id_rsa"
if ($sshKeys) {
    Write-Host "  ❌ CRITICAL: SSH keys committed!" -ForegroundColor Red
    $ErrorCount++
    "## ❌ CRITICAL: SSH Keys in Repository`n" | Add-Content $ReportFile
    $sshKeys | ForEach-Object { "- $_`n" | Add-Content $ReportFile }
} else {
    Write-Host "  ✓ No SSH keys in repo" -ForegroundColor Green
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
