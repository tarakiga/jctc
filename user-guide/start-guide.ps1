# Start JCTC User Guide
# Usage: .\start-guide.ps1

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "      JCTC User Guide Launcher" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""


# Change to the script's directory ensures we use the correct venv and requirements
Set-Location $PSScriptRoot

# Check Python
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH."
}

# Create venv if missing
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate venv
if (Test-Path "venv\Scripts\Activate.ps1") {
    . .\venv\Scripts\Activate.ps1
}
else {
    Write-Error "Could not find venv activation script."
}

# Install dependencies
if (Test-Path "requirements.txt") {
    Write-Host "Checking dependencies..." -ForegroundColor Gray
    pip install -r requirements.txt | Out-Null
}

# Start MkDocs on port 8001 to avoid conflict with Backend (8000)
Write-Host "Starting User Guide..." -ForegroundColor Green
Write-Host "Open http://localhost:8001/guide in your browser" -ForegroundColor Cyan
mkdocs serve -a localhost:8001
