# AEGIS V2.0 Deployment Files — Complete Index

## Overview

This directory contains a complete, production-ready deployment solution for AEGIS V2.0 on Yandex Cloud (Ubuntu 24.04 LTS).

---

## Files at a Glance

| File | Size | Purpose | Status |
|------|------|---------|--------|
| `setup-vm.sh` | 8KB | VM initialization (Docker, V2Ray, Nginx) | Ready |
| `docker-compose.yml` | 6KB | Service orchestration (app, Redis, Nginx) | Ready |
| `nginx.conf` | 8KB | Web server & reverse proxy config | Ready |
| `cloudflare-worker-proxy.js` | 10KB | Free API relay (Cloudflare Worker) | Ready |
| `deploy.sh` | 12KB | Automated deployment script | Ready |
| `.env.example` | 5KB | Environment configuration template | Ready |
| `README.md` | 20KB | Full deployment documentation | Ready |
| `QUICKSTART.md` | 3KB | 30-minute quick start guide | Ready |
| `ARCHITECTURE.md` | 15KB | Technical architecture deep-dive | Ready |
| `Makefile` | 6KB | Convenient command shortcuts | Ready |
| `INDEX.md` | This file | Complete file reference | Ready |

**Total:** ~93KB of deployment code and documentation

---

## Quick Navigation

### Getting Started (First Time)

1. **Read:** [QUICKSTART.md](QUICKSTART.md) (5 min read)
   - 30-minute end-to-end deployment
   - Step-by-step instructions
   - Common commands reference

2. **Run:**
   ```bash
   ./deploy.sh deploy
   ```
   - Full automated deployment
   - ~10 minutes total

3. **Configure:**
   ```bash
   ./deploy.sh ssh
   nano /opt/aegis/.env
   ```
   - Add API keys
   - Restart app

### Understanding the System

1. **Read:** [ARCHITECTURE.md](ARCHITECTURE.md) (20 min read)
   - System diagrams
   - Container architecture
   - Data flow
   - Security model

2. **Reference:** [README.md](README.md) (30 min read)
   - Detailed documentation
   - Component descriptions
   - Configuration options
   - Troubleshooting guide

### Daily Operations

- **View logs:** `make logs`
- **SSH to VM:** `make ssh`
- **Check status:** `make status`
- **Restart services:** `make restart`
- **Full help:** `make help`

---

## File Descriptions

### 1. `setup-vm.sh`

**What it does:**
- Ubuntu 24.04 initial setup
- Installs Docker & Docker Compose
- Installs Nginx & Certbot
- Installs V2Ray (official script)
- Creates directories
- Configures firewall

**When to run:**
- First time deployment (automatic via deploy.sh)
- After VM reset
- For fresh OS installation

**How to run:**
```bash
sudo bash setup-vm.sh
```

**Output:**
- All prerequisites installed
- V2Ray SOCKS5 running on port 10808
- Nginx ready for configuration
- Docker daemon running

**Key configurations:**
- V2Ray: `/etc/v2ray/config.json`
- Nginx: `/etc/nginx/nginx.conf`
- Docker: `/etc/docker/daemon.json`

---

### 2. `docker-compose.yml`

**What it defines:**
- `aegis` service (Next.js application)
- `redis` service (cache & session store)
- `nginx` service (reverse proxy & SSL)
- Internal network topology
- Volume mounts
- Environment variables
- Health checks

**Key components:**
```yaml
Services:
  - aegis:3000 (app container)
  - redis:6379 (cache)
  - nginx:80,443 (proxy)

Network: aegis (172.25.0.0/16)
Volumes:
  - redis-data/
  - nginx-cache/
  - nginx-logs/
  - app-logs/
```

**Usage:**
```bash
# From /opt/aegis on VM:
docker compose up -d          # Start all
docker compose restart        # Restart all
docker compose logs -f        # View logs
docker compose down           # Stop all
```

**Environment variables:**
- All defined with placeholders
- `.env` file overrides at runtime
- Supports Docker Compose substitution

---

### 3. `nginx.conf`

**What it configures:**
- HTTPS listener (port 443, TLS 1.2+)
- HTTP redirect (port 80 → 443)
- Reverse proxy to app (port 3000)
- Static asset caching (30 days)
- Security headers (HSTS, CSP, etc.)
- WebSocket support
- Gzip compression
- Error handling

**Key sections:**
```nginx
http {
  # Performance tuning
  # Caching configuration
  upstream aegis_backend { ... }

  server { port 80 → HTTPS redirect }
  server {
    port 443 (SSL)
    location / (app)
    location /api/ (APIs)
    location /_next/static/ (cache)
  }
}
```

**Certificates:**
- Default: Self-signed localhost
- Production: Let's Encrypt (/etc/letsencrypt/)
- Auto-renewal via certbot

**Logs:**
- Access: `/var/log/nginx/access.log`
- Error: `/var/log/nginx/error.log`

---

### 4. `cloudflare-worker-proxy.js`

**What it does:**
- Acts as free API relay
- Routes to Claude, OpenAI, Google, xAI, DeepSeek
- Supports streaming responses
- Rate limiting (60 req/min per IP)
- Authentication via X-Proxy-Key header
- CORS handling

**Deployment:**
1. Create Cloudflare Worker
2. Paste this code
3. Set environment variables:
   - `PROXY_AUTH_KEY`: Secret key
   - `ALLOWED_ORIGINS`: CORS origins
   - `LOG_REQUESTS`: Enable logging
   - `RATE_LIMIT_REQUESTS`: Per-minute limit

4. Deploy to Workers

**Usage from AEGIS:**
```bash
curl -X POST https://your-worker.workers.dev/api/anthropic/messages \
  -H "X-Proxy-Key: your-secret-key" \
  -H "X-Anthropic-Api-Key: sk-ant-..." \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1024}'
```

**Cost:**
- FREE (Cloudflare free tier: 100,000 requests/day)

**Use case:**
- Fallback if V2Ray unavailable
- Geographic routing
- Load distribution

---

### 5. `deploy.sh`

**What it does:**
- Complete deployment automation
- Validates environment
- Builds Docker image
- Transfers files to VM via SCP/rsync
- Configures environment
- Starts services
- Health checks

**Usage:**
```bash
./deploy.sh deploy          # Full deployment
./deploy.sh setup-only      # VM setup only
./deploy.sh build-only      # Build image only
./deploy.sh ssh             # SSH to VM
./deploy.sh logs            # View logs
./deploy.sh status          # Check status
./deploy.sh restart         # Restart services
./deploy.sh stop            # Stop services
```

**Configuration (env vars):**
```bash
VM_IP=158.160.172.77                    # Target VM
VM_USER=aegis                           # SSH user
VM_SSH_KEY=/path/to/key                 # SSH key path
VM_APP_PATH=/opt/aegis                  # App directory
SKIP_BUILD=false                        # Skip Docker build
SKIP_SETUP=false                        # Skip VM setup
DRY_RUN=false                           # Dry run mode
```

**Steps:**
1. Validate environment & files
2. Build Docker image locally
3. Save image as tarball
4. SSH to VM & run setup-vm.sh
5. Upload image & files
6. Configure environment
7. Start Docker Compose
8. Health checks
9. Print summary

**Output:**
- Docker image: `aegis-v2-image.tar.gz`
- Logs: stdout + deployment logs
- Summary: Setup instructions

---

### 6. `.env.example`

**What it contains:**
- All configurable variables
- Placeholder values
- Detailed comments
- Get links for each API key

**Sections:**
- Core configuration
- Supabase credentials
- AI API keys (Anthropic, OpenAI, Google, xAI, DeepSeek, Groq, Yandex)
- Proxy configuration
- SSL/TLS settings
- Performance tuning
- Logging config
- Advanced settings

**Usage:**
```bash
cp .env.example /opt/aegis/.env
nano /opt/aegis/.env
# Fill in your actual values
docker compose restart
```

**Required keys:**
- At least one AI API key (not all required)
- Supabase credentials
- App URL

**Optional keys:**
- Yandex API (for Russian compliance)
- Groq, DeepSeek
- Cloudflare Worker settings

---

### 7. `README.md`

**Full Table of Contents:**
- Overview
- Architecture diagram
- File descriptions (detailed)
- Quick start (5 steps)
- API routing options (V2Ray vs Cloudflare)
- Environment variables reference
- Monitoring & maintenance
- Troubleshooting guide
- Security best practices
- Performance tuning
- Backup & recovery
- Deployment checklist

**Length:** ~20KB, comprehensive reference

**When to use:**
- First deployment
- Troubleshooting issues
- Configuration questions
- Understanding architecture

---

### 8. `QUICKSTART.md`

**30-Minute Deployment:**
1. Prepare SSH key (1 min)
2. Deploy everything (10 min)
3. Configure API keys (5 min)
4. Restart app (2 min)
5. Test (2 min)

**Includes:**
- Common commands
- API key sources table
- Troubleshooting quick fixes
- VM access info
- Port reference
- Useful file locations
- Next steps

**Length:** ~3KB, concise and focused

**When to use:**
- First-time deployment
- Quick reference during setup
- Troubleshooting common issues

---

### 9. `ARCHITECTURE.md`

**Deep-Dive Technical Documentation:**
- System overview with diagrams
- Container architecture
- Data flow diagrams
- Security model
- Performance characteristics
- Failover & recovery
- Monitoring & observability
- Deployment environments
- Compliance features
- Disaster recovery runbook

**Length:** ~15KB, highly detailed

**When to use:**
- Understanding system design
- Planning scaling
- Security review
- Performance optimization
- Disaster recovery planning

---

### 10. `Makefile`

**Convenient Command Shortcuts:**

```makefile
make help              # Show all commands
make deploy            # Full deployment
make setup             # VM setup only
make build             # Docker build only
make ssh               # SSH to VM
make logs              # View logs
make status            # Check status
make restart           # Restart services
make stop              # Stop services
make env               # Environment info
make health            # Health checks
make clean             # Clean artifacts
```

**Advanced commands:**
```makefile
make shell             # App container shell
make logs-app          # App logs only
make logs-nginx        # Nginx logs only
make logs-v2ray        # V2Ray logs only
make stats             # Resource usage
make db-backup         # Backup Redis
make db-info           # Redis info
make test-proxy        # Test V2Ray
make test-api          # Test API connectivity
make ssl-status        # Check SSL cert
```

**Usage:**
```bash
make help              # Show all options
make deploy            # Run full deployment
make logs | tail -50   # View last 50 log lines
VM_IP=192.168.1.1 make ssh  # SSH to custom IP
```

---

### 11. `INDEX.md`

**This file** — Complete file reference and navigation guide.

---

## Deployment Workflow

### Step 1: Preparation
```bash
chmod 600 /sessions/wonderful-blissful-babbage/aegis-yc-key
cd /sessions/wonderful-blissful-babbage/aegis-v2/deploy
```

### Step 2: Full Deployment
```bash
./deploy.sh deploy
# Automatically:
# - Builds Docker image
# - Connects to VM (158.160.172.77)
# - Runs VM setup
# - Deploys app & services
# - Runs health checks
# Takes ~10-15 minutes
```

### Step 3: Configuration
```bash
./deploy.sh ssh
# In VM:
nano /opt/aegis/.env
# Add API keys
cd /opt/aegis
docker compose restart
```

### Step 4: Verification
```bash
make logs
# Watch for: "Server running on port 3000"
# Press Ctrl+C to exit
```

### Step 5: Continued Operations
```bash
make status          # Check health
make logs            # View logs
make restart         # Restart on updates
make stop            # Shutdown
```

---

## Common Use Cases

### "Deploy for the first time"
1. Read: `QUICKSTART.md`
2. Run: `./deploy.sh deploy`
3. Configure: `./deploy.sh ssh` → edit `.env`
4. Test: `make health`

### "I need to update API keys"
```bash
make ssh
nano /opt/aegis/.env
# Edit keys
make restart
```

### "App is crashing, I need to debug"
```bash
make logs
# Check error messages
make shell
# Run commands in container to diagnose
```

### "I want to understand how this works"
1. Read: `ARCHITECTURE.md`
2. Review: `docker-compose.yml`
3. Inspect: `nginx.conf`
4. Check: `setup-vm.sh`

### "Production SSL setup"
```bash
make ssh
sudo certbot certonly --standalone -d your-domain.com
# Update nginx.conf with domain paths
# docker exec aegis-nginx nginx -s reload
```

### "Performance tuning"
```bash
make stats
# Monitor resource usage
# Edit docker-compose.yml
# Adjust NODE_OPTIONS max-old-space-size
make restart
```

### "Backup & restore"
```bash
make db-backup
# Copy backup from VM
ssh-i KEY aegis@IP "cp volumes/redis-data/dump.rdb /backup/"
```

---

## File Organization

```
deploy/
├── setup-vm.sh               # VM initialization
├── docker-compose.yml        # Service orchestration
├── nginx.conf                # Web server config
├── cloudflare-worker-proxy.js # Free API relay
├── deploy.sh                 # Deployment script
├── Makefile                  # Command shortcuts
├── .env.example              # Config template
├── README.md                 # Full documentation
├── QUICKSTART.md             # Quick start guide
├── ARCHITECTURE.md           # Technical deep-dive
├── INDEX.md                  # This file
└── volumes/                  # (Created at runtime)
    ├── redis-data/
    ├── nginx-cache/
    ├── nginx-logs/
    └── app-logs/
```

---

## Version & Maintenance

**Version:** 1.0 (AEGIS V2.0, 2026-04-06)

**Maintained by:** Energy & Engineering LLC

**Last Updated:** 2026-04-06

**Status:** Production Ready

---

## Support & Documentation

| Topic | Resource |
|-------|----------|
| Quick setup | `QUICKSTART.md` |
| Full guide | `README.md` |
| Architecture | `ARCHITECTURE.md` |
| Configuration | `.env.example` |
| Commands | `Makefile` or `make help` |
| V2Ray | https://www.v2fly.org/ |
| Docker | https://docs.docker.com/ |
| Nginx | https://nginx.org/ |

---

## Next Steps

1. **Read** `QUICKSTART.md` (5 minutes)
2. **Run** `./deploy.sh deploy` (10 minutes)
3. **Configure** API keys (5 minutes)
4. **Test** with `make health` (2 minutes)
5. **Deploy SSL** with Let's Encrypt
6. **Monitor** with `make logs` and `make stats`

**You're ready to go!**

---

*For questions, issues, or improvements, refer to the full documentation in `README.md` and `ARCHITECTURE.md`.*
