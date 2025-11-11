#!/bin/bash

# JCTC Management System - Production Deployment Script
# This script handles the complete deployment process for the JCTC backend

set -e  # Exit on any error

# Configuration
PROJECT_NAME="jctc-management-system"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/var/backups/jctc"
LOG_FILE="/var/log/jctc-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    echo "[ERROR] $1" >> "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
    echo "[INFO] $1" >> "$LOG_FILE"
}

# Check if script is run as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
# Check if .env.production file exists
    if [[ ! -f .env.production ]]; then
        error ".env.production file not found. Please create it from .env.production template."
    fi
    
    # Check if backend directory exists
    if [[ ! -d backend ]]; then
        error "backend directory not found. Please ensure the backend code is in the backend/ directory."
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker service."
    fi
    
    log "Prerequisites check passed ✓"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p /var/log/jctc
    sudo mkdir -p /etc/nginx/ssl
    sudo mkdir -p /var/lib/jctc/uploads
    
    # Set proper permissions
    sudo chown -R $(whoami):$(whoami) "$BACKUP_DIR"
    sudo chown -R $(whoami):$(whoami) /var/log/jctc
    sudo chown -R $(whoami):$(whoami) /var/lib/jctc
    
    log "Directories created ✓"
}

# Backup current deployment
backup_current_deployment() {
    if docker ps -q -f name="jctc_" | grep -q .; then
        log "Creating backup of current deployment..."
        
        BACKUP_NAME="jctc_backup_$(date +%Y%m%d_%H%M%S)"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
        
        mkdir -p "$BACKUP_PATH"
        
        # Backup database
        docker exec jctc_db pg_dump -U jctc_user jctc_db > "$BACKUP_PATH/database.sql"
        
        # Backup uploaded files
        docker cp jctc_app:/app/uploads "$BACKUP_PATH/"
        
        # Backup configuration
        cp .env.production "$BACKUP_PATH/"
        cp "$DOCKER_COMPOSE_FILE" "$BACKUP_PATH/"
        
        log "Backup created at: $BACKUP_PATH ✓"
    else
        info "No existing deployment found, skipping backup"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    log "Docker images pulled ✓"
}

# Build application image
build_application() {
    log "Building application image..."
    
    # Build the application image
    docker build -t jctc-app:latest .
    
    log "Application image built ✓"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    timeout 60s bash -c 'until docker exec jctc_db pg_isready -U jctc_user; do sleep 5; done'
    
    # Run migrations
    docker exec jctc_app alembic upgrade head
    
    log "Database migrations completed ✓"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start all services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some services failed to start properly"
    fi
    
    log "Services started ✓"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Check application health
    if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
        error "Application health check failed"
    fi
    
    # Check database connectivity
    if ! docker exec jctc_db pg_isready -U jctc_user > /dev/null 2>&1; then
        error "Database health check failed"
    fi
    
    # Check Redis connectivity
    if ! docker exec jctc_redis redis-cli ping > /dev/null 2>&1; then
        error "Redis health check failed"
    fi
    
    log "Health checks passed ✓"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create Prometheus configuration if it doesn't exist
    if [[ ! -f prometheus.yml ]]; then
        cat > prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'jctc-app'
    static_configs:
      - targets: ['app:8000']
    metrics_path: '/metrics'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['db:5432']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF
    fi
    
    log "Monitoring setup completed ✓"
}

# Configure SSL certificates
configure_ssl() {
    if [[ ! -f /etc/nginx/ssl/jctc.crt ]]; then
        log "Setting up SSL certificates..."
        
        # Generate self-signed certificate for development/testing
        # In production, use Let's Encrypt or provided certificates
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/jctc.key \
            -out /etc/nginx/ssl/jctc.crt \
            -subj "/C=NG/ST=FCT/L=Abuja/O=JCTC/OU=IT Department/CN=api.jctc.gov.ng"
        
        log "SSL certificates configured ✓"
    else
        info "SSL certificates already exist"
    fi
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/jctc > /dev/null << EOF
/var/log/jctc/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 0644 $(whoami) $(whoami)
    postrotate
        docker exec jctc_app pkill -SIGUSR1 -f "uvicorn"
    endscript
}
EOF
    
    log "Log rotation configured ✓"
}

# Setup system service
setup_systemd_service() {
    log "Setting up systemd service..."
    
    sudo tee /etc/systemd/system/jctc.service > /dev/null << EOF
[Unit]
Description=JCTC Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
User=$(whoami)
Group=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose -f $DOCKER_COMPOSE_FILE up -d
ExecStop=/usr/bin/docker-compose -f $DOCKER_COMPOSE_FILE down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable jctc.service
    
    log "Systemd service configured ✓"
}

# Setup automated backups
setup_automated_backups() {
    log "Setting up automated backups..."
    
    # Create backup script
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/jctc_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup database
pg_dump -h db -U jctc_user jctc_db > "$BACKUP_DIR/database.sql"

# Compress backup
cd /backups && tar -czf "jctc_$TIMESTAMP.tar.gz" "jctc_$TIMESTAMP"
rm -rf "jctc_$TIMESTAMP"

# Remove backups older than 30 days
find /backups -name "jctc_*.tar.gz" -mtime +30 -delete
EOF
    
    chmod +x scripts/backup.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && docker-compose -f $DOCKER_COMPOSE_FILE run --rm backup") | crontab -
    
    log "Automated backups configured ✓"
}

# Main deployment function
deploy() {
    log "Starting JCTC Management System deployment..."
    
    check_root
    check_prerequisites
    create_directories
    backup_current_deployment
    configure_ssl
    pull_images
    build_application
    
    # Stop existing services
    if docker ps -q -f name="jctc_" | grep -q .; then
        log "Stopping existing services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
    fi
    
    start_services
    run_migrations
    run_health_checks
    setup_monitoring
    setup_log_rotation
    setup_systemd_service
    setup_automated_backups
    
    log "✅ JCTC Management System deployment completed successfully!"
    info "🚀 Application is running at: https://api.jctc.gov.ng"
    info "📊 Monitoring dashboard: http://localhost:3000 (Grafana)"
    info "📈 Metrics: http://localhost:9090 (Prometheus)"
    info "🔍 Traefik dashboard: http://localhost:8080"
}

# Rollback function
rollback() {
    log "Starting rollback process..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        error "No backup found for rollback"
    fi
    
    BACKUP_PATH="$BACKUP_DIR/$LATEST_BACKUP"
    
    log "Rolling back to backup: $LATEST_BACKUP"
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore database
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d db
    sleep 30
    docker exec -i jctc_db psql -U jctc_user -d jctc_db < "$BACKUP_PATH/database.sql"
    
    # Restore files
    docker cp "$BACKUP_PATH/uploads" jctc_app:/app/
    
    # Restart services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log "Rollback completed ✓"
}

# Script entry point
case "${1:-}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    *)
        echo "Usage: $0 {deploy|rollback}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the JCTC Management System"
        echo "  rollback - Rollback to the previous deployment"
        exit 1
        ;;
esac