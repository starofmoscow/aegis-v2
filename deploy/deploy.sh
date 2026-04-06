#!/bin/bash
# ============================================================
# EE AEGIS V2.0 — Deployment Script
# Yandex Cloud VM Deployment
#
# This script:
# 1. Validates the environment
# 2. Builds the Docker image
# 3. Deploys to the VM via SSH and Docker Compose
# 4. Performs health checks
# ============================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# ============================================================
# Configuration
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$SCRIPT_DIR"

# VM Configuration
VM_IP="${VM_IP:-158.160.172.77}"
VM_USER="${VM_USER:-aegis}"
VM_SSH_KEY="${VM_SSH_KEY:-/sessions/wonderful-blissful-babbage/aegis-yc-key}"
VM_APP_PATH="${VM_APP_PATH:-/opt/aegis}"
VM_PORT="${VM_PORT:-3000}"

# Docker Configuration
DOCKER_IMAGE_NAME="aegis-v2"
DOCKER_IMAGE_TAG="latest"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"  # Leave empty for local Docker daemon

# Deployment options
ACTION="${1:-deploy}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_SETUP="${SKIP_SETUP:-false}"
DRY_RUN="${DRY_RUN:-false}"

# ============================================================
# Validation
# ============================================================

validate_environment() {
    log_step "Validating environment..."

    # Check SSH key
    if [ ! -f "$VM_SSH_KEY" ]; then
        log_error "SSH key not found: $VM_SSH_KEY"
        exit 1
    fi
    chmod 600 "$VM_SSH_KEY"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check required files
    local required_files=(
        "$DEPLOY_DIR/docker-compose.yml"
        "$DEPLOY_DIR/nginx.conf"
        "$DEPLOY_DIR/setup-vm.sh"
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/package.json"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file not found: $file"
            exit 1
        fi
    done

    log_info "Environment validation passed"
}

# ============================================================
# Build Docker Image Locally
# ============================================================

build_docker_image() {
    log_step "Building Docker image..."

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would build Docker image"
        return
    fi

    docker build \
        --tag "${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}" \
        --file Dockerfile \
        .

    log_info "Docker image built successfully"
}

# ============================================================
# Save Docker Image for Transfer
# ============================================================

save_docker_image() {
    log_step "Saving Docker image for transfer..."

    local image_file="${DEPLOY_DIR}/aegis-v2-image.tar.gz"

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would save Docker image"
        return
    fi

    docker save "${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}" | \
        gzip > "$image_file"

    local size=$(du -h "$image_file" | cut -f1)
    log_info "Docker image saved: $image_file ($size)"
}

# ============================================================
# VM SSH Helper
# ============================================================

ssh_run() {
    local cmd="$1"
    local ignore_error="${2:-false}"

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would SSH execute: $cmd"
        return 0
    fi

    if [ "$ignore_error" = "true" ]; then
        ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
            "${VM_USER}@${VM_IP}" "$cmd" || return 0
    else
        ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
            "${VM_USER}@${VM_IP}" "$cmd"
    fi
}

scp_push() {
    local src="$1"
    local dst="$2"

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would SCP $src → $dst"
        return 0
    fi

    scp -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        "$src" "${VM_USER}@${VM_IP}:${dst}"
}

scp_pull() {
    local src="$1"
    local dst="$2"

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would SCP $src ← $dst"
        return 0
    fi

    scp -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        "${VM_USER}@${VM_IP}:${src}" "$dst"
}

# ============================================================
# Step 1: Setup VM (if needed)
# ============================================================

setup_vm() {
    log_step "Setting up Yandex Cloud VM..."

    if [ "$SKIP_SETUP" = "true" ]; then
        log_warn "Skipping VM setup"
        return
    fi

    # Check if already set up (V2Ray running)
    if ssh_run "systemctl is-active --quiet v2ray && echo setup-complete" 2>/dev/null | grep -q "setup-complete"; then
        log_info "VM already setup with V2Ray running"
        return
    fi

    log_info "Running setup script on VM..."

    # Copy setup script
    scp_push "$DEPLOY_DIR/setup-vm.sh" "/tmp/setup-vm.sh"

    # Make executable and run
    ssh_run "chmod +x /tmp/setup-vm.sh && sudo /tmp/setup-vm.sh"

    log_info "VM setup completed"
}

# ============================================================
# Step 2: Load Docker Image on VM
# ============================================================

load_docker_image() {
    log_step "Loading Docker image on VM..."

    local image_file="${DEPLOY_DIR}/aegis-v2-image.tar.gz"

    if [ ! -f "$image_file" ]; then
        log_warn "Docker image file not found, skipping load (will build on VM)"
        return
    fi

    log_info "Transferring Docker image ($( du -h "$image_file" | cut -f1))..."
    scp_push "$image_file" "/tmp/aegis-v2-image.tar.gz"

    log_info "Loading image on VM..."
    ssh_run "docker load < /tmp/aegis-v2-image.tar.gz"

    log_info "Docker image loaded successfully"
}

# ============================================================
# Step 3: Copy Deployment Files
# ============================================================

copy_deployment_files() {
    log_step "Copying deployment files to VM..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would copy deployment files"
        return
    fi

    # Create app directory
    ssh_run "sudo mkdir -p $VM_APP_PATH && sudo chown $VM_USER:$VM_USER $VM_APP_PATH"

    # Copy docker-compose.yml
    scp_push "$DEPLOY_DIR/docker-compose.yml" "$VM_APP_PATH/"

    # Copy nginx.conf
    mkdir -p "$VM_APP_PATH" || true
    scp_push "$DEPLOY_DIR/nginx.conf" "$VM_APP_PATH/"

    # Copy Dockerfile
    scp_push "$PROJECT_ROOT/Dockerfile" "$VM_APP_PATH/"

    # Copy app source
    log_info "Copying application source code..."
    rsync -avz -e "ssh -i $VM_SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='.env.local' \
        --exclude='.git' \
        "$PROJECT_ROOT/" \
        "${VM_USER}@${VM_IP}:${VM_APP_PATH}/app/"

    log_info "Deployment files copied"
}

# ============================================================
# Step 4: Configure Environment
# ============================================================

configure_environment() {
    log_step "Configuring environment variables..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would configure environment"
        return
    fi

    # Create .env file on VM if it doesn't exist
    ssh_run "
    cat > $VM_APP_PATH/.env <<'EOL'
# Core Configuration
NODE_ENV=production
PORT=3000

# Supabase (copy from local .env.local)
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}

# App URL
NEXT_PUBLIC_APP_URL=https://${VM_IP}:443

# AI API Keys (CONFIGURE THESE!)
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY:-}
XAI_API_KEY=${XAI_API_KEY:-}
GROQ_API_KEY=${GROQ_API_KEY:-}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
YANDEX_API_KEY=${YANDEX_API_KEY:-}
YANDEX_FOLDER_ID=${YANDEX_FOLDER_ID:-}

# Proxy Configuration
HTTP_PROXY=socks5://host.docker.internal:10808
HTTPS_PROXY=socks5://host.docker.internal:10808
ALL_PROXY=socks5://host.docker.internal:10808
EOL
    "

    log_warn "Environment file created. Please update API keys at: $VM_APP_PATH/.env"
}

# ============================================================
# Step 5: Start Docker Compose
# ============================================================

start_services() {
    log_step "Starting Docker Compose services..."

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Would start Docker Compose"
        return
    fi

    ssh_run "
    cd $VM_APP_PATH && \
    docker compose pull 2>/dev/null || true && \
    docker compose up -d --build
    "

    log_info "Docker Compose services started"
}

# ============================================================
# Step 6: Health Checks
# ============================================================

health_check() {
    log_step "Performing health checks..."

    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 5

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        # Check if V2Ray is running
        if ssh_run "systemctl is-active --quiet v2ray" 2>/dev/null; then
            log_info "V2Ray service: OK"
        else
            log_warn "V2Ray service: Not running yet"
        fi

        # Check if Docker containers are running
        if ssh_run "docker ps | grep -q aegis-app" 2>/dev/null; then
            log_info "Docker containers: OK"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            log_error "Health checks failed"
            log_info "Check VM logs:"
            ssh_run "cd $VM_APP_PATH && docker compose logs" || true
            return 1
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    echo ""
    log_info "Health checks passed"
}

# ============================================================
# Step 7: Summary
# ============================================================

print_summary() {
    log_step "Deployment Summary"

    echo ""
    echo "============================================================"
    echo "AEGIS V2.0 Deployment Complete!"
    echo "============================================================"
    echo ""
    echo "VM Information:"
    echo "  IP Address:       $VM_IP"
    echo "  SSH User:         $VM_USER"
    echo "  App Path:         $VM_APP_PATH"
    echo ""
    echo "Services:"
    echo "  Application:      http://localhost:3000 (internal)"
    echo "  Nginx Proxy:      https://$VM_IP (reverse proxy)"
    echo "  V2Ray SOCKS5:     localhost:10808 (api routing)"
    echo ""
    echo "Next Steps:"
    echo "1. SSH into VM: ssh -i $VM_SSH_KEY ${VM_USER}@${VM_IP}"
    echo "2. Update .env with API keys: nano $VM_APP_PATH/.env"
    echo "3. Restart app: docker compose -f $VM_APP_PATH/docker-compose.yml restart"
    echo "4. Check logs: docker compose -f $VM_APP_PATH/docker-compose.yml logs -f"
    echo "5. Setup SSL: sudo certbot certonly --standalone -d your-domain.com"
    echo ""
    echo "Helpful Commands:"
    echo "  View logs:        ssh -i $VM_SSH_KEY ${VM_USER}@${VM_IP} 'cd $VM_APP_PATH && docker compose logs -f'"
    echo "  Health status:    ssh -i $VM_SSH_KEY ${VM_USER}@${VM_IP} 'docker ps && systemctl status v2ray'"
    echo "  Restart services: ssh -i $VM_SSH_KEY ${VM_USER}@${VM_IP} 'cd $VM_APP_PATH && docker compose restart'"
    echo ""
    echo "============================================================"
}

# ============================================================
# Main Deployment Flow
# ============================================================

main() {
    log_info "AEGIS V2.0 Deployment Script Starting"
    log_info "Action: $ACTION"
    log_info "VM: $VM_USER@$VM_IP"
    echo ""

    case "$ACTION" in
        deploy)
            validate_environment
            [ "$SKIP_BUILD" = "false" ] && build_docker_image
            [ "$SKIP_BUILD" = "false" ] && save_docker_image
            setup_vm
            load_docker_image
            copy_deployment_files
            configure_environment
            start_services
            health_check
            print_summary
            ;;

        setup-only)
            validate_environment
            setup_vm
            print_summary
            ;;

        build-only)
            validate_environment
            build_docker_image
            save_docker_image
            ;;

        ssh)
            ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
                "${VM_USER}@${VM_IP}"
            ;;

        logs)
            ssh_run "cd $VM_APP_PATH && docker compose logs -f"
            ;;

        status)
            ssh_run "docker ps && echo && systemctl status v2ray"
            ;;

        stop)
            ssh_run "cd $VM_APP_PATH && docker compose down"
            ;;

        restart)
            ssh_run "cd $VM_APP_PATH && docker compose restart"
            ;;

        *)
            log_error "Unknown action: $ACTION"
            echo "Usage: $0 {deploy|setup-only|build-only|ssh|logs|status|stop|restart}"
            exit 1
            ;;
    esac
}

# ============================================================
# Entry Point
# ============================================================

main "$@"
