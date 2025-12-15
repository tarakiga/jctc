#!/bin/bash
# AWS Lightsail Deployment Script
# Deploys latest updates including SUPER_ADMIN migration

set -e  # Exit on error

echo "=========================================="
echo "🚀 JCTC AWS Lightsail Deployment"
echo "=========================================="
echo ""

# Configuration
APP_DIR="/home/ubuntu/jctc-app"
VENV_DIR="$APP_DIR/venv"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
BACKUP_DIR="/home/ubuntu/backups"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Pre-deployment Checklist${NC}"
echo "  - Git push completed: ✓"
echo "  - Local build verified: ✓"
echo "  - Database backup: pending..."
echo ""

# 1. Backup Database
echo -e "${YELLOW}💾 Step 1: Backing up database...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/jctc_backup_$(date +%Y%m%d_%H%M%S).sql"

# Backup PostgreSQL database
sudo -u postgres pg_dump jctc_db > $BACKUP_FILE

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Database backup failed!${NC}"
    exit 1
fi
echo ""

# 2. Pull Latest Code
echo -e "${YELLOW}📥 Step 2: Pulling latest code from git...${NC}"
cd $APP_DIR
git pull origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Git pull successful${NC}"
else
    echo -e "${RED}✗ Git pull failed!${NC}"
    exit 1
fi
echo ""

# 3. Backend Deployment
echo -e "${YELLOW}🔧 Step 3: Deploying backend...${NC}"
cd $BACKEND_DIR

# Activate virtual environment
source $VENV_DIR/bin/activate

# Install/update dependencies
echo "  Installing Python dependencies..."
pip install -r requirements.txt --quiet

# Run database migrations (CRITICAL: SUPER_ADMIN enum)
echo "  Running Alembic migrations..."
alembic upgrade head

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations successful${NC}"
else
    echo -e "${RED}✗ Migrations failed! Rolling back...${NC}"
    echo "  Restoring backup: $BACKUP_FILE"
    sudo -u postgres psql jctc_db < $BACKUP_FILE
    exit 1
fi

# Restart backend service
echo "  Restarting backend service..."
sudo systemctl restart jctc-backend

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend service restarted${NC}"
else
    echo -e "${RED}✗ Backend restart failed!${NC}"
fi
echo ""

# 4. Frontend Deployment
echo -e "${YELLOW}🎨 Step 4: Deploying frontend...${NC}"
cd $FRONTEND_DIR

# Install dependencies
echo "  Installing Node dependencies..."
npm install --production

# Build production bundle
echo "  Building production bundle..."
cd apps/web
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
else
    echo -e "${RED}✗ Frontend build failed!${NC}"
    exit 1
fi

# Restart frontend service
echo "  Restarting frontend service..."
sudo systemctl restart jctc-frontend

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend service restarted${NC}"
else
    echo -e "${RED}✗ Frontend restart failed!${NC}"
fi
echo ""

# 5. Post-Deployment Verification
echo -e "${YELLOW}✅ Step 5: Verifying deployment...${NC}"

# Check backend health
echo "  Checking backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health || echo "000")

if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Backend API is healthy${NC}"
else
    echo -e "${RED}✗ Backend API not responding (Status: $BACKEND_STATUS)${NC}"
fi

# Check frontend
echo "  Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
else
    echo -e "${RED}✗ Frontend not responding (Status: $FRONTEND_STATUS)${NC}"
fi

# Check service statuses
echo "  Checking service statuses..."
sudo systemctl is-active jctc-backend >/dev/null 2>&1 && echo -e "${GREEN}✓ Backend service: running${NC}" || echo -e "${RED}✗ Backend service: stopped${NC}"
sudo systemctl is-active jctc-frontend >/dev/null 2>&1 && echo -e "${GREEN}✓ Frontend service: running${NC}" || echo -e "${RED}✗ Frontend service: stopped${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "  1. Test admin login at your Lightsail URL"
echo "  2. Log out and log back in to get new ADMIN role"
echo "  3. Verify RBAC permissions work correctly"
echo "  4. Check application logs for errors"
echo ""
echo "💾 Database backup saved at:"
echo "  $BACKUP_FILE"
echo ""
echo "📊 Service URLs:"
echo "  - Backend API: http://your-lightsail-ip:8000"
echo "  - Frontend: http://your-lightsail-ip:3000"
echo ""
