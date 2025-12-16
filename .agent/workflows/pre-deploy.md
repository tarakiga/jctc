---
description: Run pre-deployment checks - lint, type-check, tests before deploying
---

# Pre-Deploy Checks Workflow

Validate code quality and correctness before deploying to production.

---

## When to Use

- Before any production deployment
- After major refactoring
- Before merging feature branches
- As part of CI/CD pipeline

---

## Quick Pre-Deploy Check

// turbo-all

### 1. Check Git Status (No Uncommitted Changes)
```bash
git status --porcelain
```
> Should return empty if clean

### 2. Ensure on Main Branch
```bash
git branch --show-current
```
> Should return `main`

---

## Backend Checks

### Navigate to Backend
```bash
cd backend
```

### 1. Python Syntax Check
```bash
python -m py_compile app/main.py
```

### 2. Import Check (Verify All Modules Load)
```bash
python -c "from app.main import app; print('✓ Backend imports OK')"
```

### 3. Run Tests (If Available)
```bash
python -m pytest tests/ -v --tb=short
```

### 4. Check Alembic Migrations
```bash
python -m alembic check
```
> Should show no pending migrations or confirm current state

### 5. Verify Environment Variables
```bash
python -c "from app.core.config import settings; print('✓ Config loads OK')"
```

---

## Frontend Checks

### Navigate to Frontend
```bash
cd frontend
```

### 1. TypeScript Type Check
```bash
pnpm run type-check
```
Or:
```bash
npx tsc --noEmit
```

### 2. ESLint Check
```bash
pnpm run lint
```

### 3. Build Check (Catches Compile Errors)
```bash
pnpm run build
```

### 4. Check for Unused Dependencies
```bash
npx depcheck
```

---

## Full Pre-Deploy Script

Create a local script to run all checks:

### Windows (PowerShell)
```powershell
# pre-deploy-check.ps1
Write-Host "=== Pre-Deploy Checks ===" -ForegroundColor Cyan

Write-Host "`n[1/6] Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "ERROR: Uncommitted changes found!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Git clean" -ForegroundColor Green

Write-Host "`n[2/6] Checking branch..." -ForegroundColor Yellow
$branch = git branch --show-current
if ($branch -ne "main") {
    Write-Host "WARNING: Not on main branch (on: $branch)" -ForegroundColor Yellow
}
Write-Host "✓ On branch: $branch" -ForegroundColor Green

Write-Host "`n[3/6] Backend import check..." -ForegroundColor Yellow
cd backend
python -c "from app.main import app; print('✓ Backend OK')"
cd ..

Write-Host "`n[4/6] Frontend type check..." -ForegroundColor Yellow
cd frontend
pnpm run type-check
cd ..

Write-Host "`n[5/6] Frontend build..." -ForegroundColor Yellow
cd frontend
pnpm run build
cd ..

Write-Host "`n=== All Checks Passed ===" -ForegroundColor Green
```

---

## CI/CD Integration

Add to GitHub Actions (`.github/workflows/pre-deploy.yml`):

```yaml
name: Pre-Deploy Checks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Import check
        run: |
          cd backend
          python -c "from app.main import app"

  frontend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: |
          cd frontend
          pnpm install
      - name: Type check
        run: |
          cd frontend
          pnpm run type-check
      - name: Build
        run: |
          cd frontend
          pnpm run build
```

---

## Checklist Before Deploy

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings (or acceptable ones)
- [ ] Build succeeds locally
- [ ] No uncommitted changes
- [ ] On main branch
- [ ] Latest changes pulled from remote
- [ ] Database migrations created (if needed)
- [ ] Environment variables updated (if needed)
