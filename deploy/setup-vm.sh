#!/bin/bash
# ============================================================
# EE AEGIS V2.0 — Yandex Cloud VM Setup Script
# Target: Ubuntu 24.04 LTS on 158.160.172.77
#
# Tasks:
# 1. Update system and install Docker
# 2. Install and configure V2Ray for outbound proxy
# 3. Setup Nginx reverse proxy with SSL
# 4. Configure environment for AEGIS app deployment
# ============================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# ============================================================
# STEP 1: System Update and Core Dependencies
# ============================================================

log_info "Step 1/5: Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y \
    curl wget git ca-certificates \
    build-essential software-properties-common \
    apt-transport-https gnupg lsb-release \
    systemctl net-tools htop tmux

# ============================================================
# STEP 2: Install Docker and Docker Compose
# ============================================================

log_info "Step 2/5: Installing Docker and Docker Compose..."

# Remove any existing Docker installation
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update

# Install Docker
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add aegis user to docker group
usermod -aG docker aegis || log_warn "aegis user may not exist yet"

# Enable Docker service
systemctl enable docker
systemctl start docker

log_info "Docker installed: $(docker --version)"
log_info "Docker Compose installed: $(docker compose version)"

# ============================================================
# STEP 3: Install Nginx
# ============================================================

log_info "Step 3/5: Installing Nginx and Certbot..."
apt-get install -y nginx nginx-full certbot python3-certbot-nginx

# Create nginx config directory for AEGIS if not exists
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/snippets

# Enable Nginx
systemctl enable nginx
systemctl start nginx

log_info "Nginx installed: $(nginx -v 2>&1)"

# ============================================================
# STEP 4: Install V2Ray
# ============================================================

log_info "Step 4/5: Installing V2Ray..."

# Create app directories
mkdir -p /opt/v2ray
mkdir -p /etc/v2ray
mkdir -p /var/log/v2ray

# Download and run official V2Ray installer
cd /tmp
curl -L https://github.com/v2fly/fhs-install-v2ray/raw/main/install-release.sh -o install-v2ray.sh
bash install-v2ray.sh

# Verify V2Ray installation
if command -v v2ray &> /dev/null; then
    log_info "V2Ray installed: $(v2ray -version 2>&1 | head -1)"
else
    log_error "V2Ray installation failed"
    exit 1
fi

# ============================================================
# STEP 5: Configure V2Ray for Outbound HTTPS Proxy
# ============================================================

log_info "Step 5/5: Configuring V2Ray as HTTPS/HTTPS-to-SOCKS5 proxy..."

# Create V2Ray configuration
# This configuration creates a SOCKS5 inbound listener on localhost:10808
# Apps can use this as HTTP_PROXY=socks5://localhost:10808
cat > /etc/v2ray/config.json <<'EOF'
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/v2ray/access.log",
    "error": "/var/log/v2ray/error.log"
  },
  "inbounds": [
    {
      "port": 10808,
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true,
        "userLevel": 8
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"],
        "routeOnly": false
      },
      "tag": "socks-inbound"
    },
    {
      "port": 10809,
      "protocol": "http",
      "settings": {
        "userLevel": 8,
        "timeout": 300
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"],
        "routeOnly": false
      },
      "tag": "http-inbound"
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "AsIs"
      },
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "settings": {},
      "tag": "blocked"
    }
  ],
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "domain": ["api.anthropic.com", "api.openai.com", "generativelanguage.googleapis.com", "api.x.ai", "api.deepseek.com", "api.groq.com"],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "ip": ["127.0.0.0/8", "::1/128"],
        "outboundTag": "direct"
      }
    ]
  },
  "policy": {
    "levels": {
      "8": {
        "downlink": -1,
        "uplink": -1
      }
    }
  },
  "dns": {
    "servers": [
      "8.8.8.8",
      "8.8.4.4",
      "1.1.1.1"
    ]
  }
}
EOF

# Set correct permissions
chown -R root:root /etc/v2ray
chmod 644 /etc/v2ray/config.json
mkdir -p /var/log/v2ray
chown -R nobody:nogroup /var/log/v2ray
chmod 755 /var/log/v2ray

# Enable and start V2Ray service
systemctl enable v2ray
systemctl restart v2ray

log_info "V2Ray configured and started"

# ============================================================
# STEP 6: Create Deployment Directories
# ============================================================

log_info "Setting up deployment directories..."

mkdir -p /opt/aegis/app
mkdir -p /opt/aegis/deploy
mkdir -p /opt/aegis/volumes/nginx-cache
mkdir -p /opt/aegis/volumes/letsencrypt

# Set ownership
chown -R aegis:aegis /opt/aegis || log_warn "Could not set aegis ownership"

log_info "Deployment directories created"

# ============================================================
# STEP 7: Setup SSL Certificate Paths
# ============================================================

log_info "Preparing SSL certificate paths..."

# Create directories for Let's Encrypt
mkdir -p /etc/letsencrypt/live
mkdir -p /var/log/letsencrypt

# Create a placeholder self-signed cert for initial Nginx startup
if [ ! -f /etc/letsencrypt/live/localhost/privkey.pem ]; then
    mkdir -p /etc/letsencrypt/live/localhost
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/letsencrypt/live/localhost/privkey.pem \
        -out /etc/letsencrypt/live/localhost/fullchain.pem \
        -subj "/CN=localhost" 2>/dev/null || true
    chmod 644 /etc/letsencrypt/live/localhost/fullchain.pem
    chmod 600 /etc/letsencrypt/live/localhost/privkey.pem
fi

log_info "SSL paths prepared"

# ============================================================
# STEP 8: Configure Firewall (if UFW enabled)
# ============================================================

log_info "Configuring firewall..."

if command -v ufw &> /dev/null; then
    # Allow SSH, HTTP, HTTPS
    ufw --force enable 2>/dev/null || true
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    log_info "UFW firewall rules configured"
else
    log_warn "UFW not found, skipping firewall configuration"
fi

# ============================================================
# STEP 9: Verify Proxy Chain
# ============================================================

log_info "Verifying proxy configuration..."

# Test V2Ray is running
if systemctl is-active --quiet v2ray; then
    log_info "V2Ray service is running"
else
    log_error "V2Ray service failed to start"
    systemctl status v2ray
fi

# Test SOCKS5 port
if nc -zv localhost 10808 2>/dev/null; then
    log_info "V2Ray SOCKS5 port (10808) is listening"
else
    log_warn "V2Ray SOCKS5 port not responding immediately (may still be starting)"
fi

# ============================================================
# Final Steps
# ============================================================

log_info "============================================================"
log_info "AEGIS V2.0 VM Setup Complete!"
log_info "============================================================"
log_info ""
log_info "Key Services Status:"
systemctl status docker --no-pager | grep "Active:"
systemctl status nginx --no-pager | grep "Active:"
systemctl status v2ray --no-pager | grep "Active:"

log_info ""
log_info "Next Steps:"
log_info "1. Copy docker-compose.yml and nginx.conf to /opt/aegis/"
log_info "2. Set environment variables in /opt/aegis/.env"
log_info "3. Run: cd /opt/aegis && docker compose up -d"
log_info "4. For SSL: certbot certonly --standalone -d your-domain.com"
log_info ""
log_info "Proxy Configuration:"
log_info "  SOCKS5: localhost:10808 (for app container)"
log_info "  HTTP:   localhost:10809"
log_info ""
log_info "Logs:"
log_info "  V2Ray:  journalctl -u v2ray -f"
log_info "  Docker: docker compose logs -f"
log_info "  Nginx:  tail -f /var/log/nginx/error.log"
log_info "============================================================"
