# EE AEGIS V2.0 — Yandex Cloud Deployment Guide

## Overview

This directory contains production deployment scripts for AEGIS V2.0 on a Yandex Cloud VM (Ubuntu 24.04 LTS).

**Key Components:**
- Docker & Docker Compose for app containerization
- V2Ray as SOCKS5 proxy for API routing
- Cloudflare Workers as free API relay (fallback)
- Nginx for reverse proxy + SSL termination
- Automated setup and health monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User → HTTPS (port 443)                                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼─────────────┐
        │   Nginx Reverse Proxy    │
        │   (SSL termination)      │
        └────────────┬─────────────┘
                     │
        ┌────────────▼──────────────┐
        │  Next.js App Container    │
        │  (port 3000)              │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │  V2Ray SOCKS5 Proxy       │
        │  (localhost:10808)        │
        │  OR Cloudflare Worker     │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────────────────┐
        │  Upstream AI APIs                     │
        │  - Anthropic (Claude)                 │
        │  - OpenAI                             │
        │  - Google Generative AI               │
        │  - xAI (Grok)                         │
        │  - DeepSeek                           │
        │  - Groq                               │
        └───────────────────────────────────────┘
```

## Files

### 1. `setup-vm.sh` — VM Initialization Script

Automates Ubuntu 24.04 setup:
- Updates system packages
- Installs Docker & Docker Compose
- Installs Nginx with SSL support
- Installs and configures V2Ray
- Creates deployment directories
- Sets up firewall rules

**Usage:**
```bash
sudo bash setup-vm.sh
```

**What it does:**
- Enables Docker service
- Creates V2Ray SOCKS5 listener on port 10808
- Prepares Let's Encrypt directories
- Configures UFW firewall

**Output:** Ready-to-use VM with all dependencies installed

---

### 2. `docker-compose.yml` — Service Orchestration

Defines three main services:

#### Service: `aegis`
- **Image:** Built from local `Dockerfile`
- **Port:** 3000 (internal)
- **Environment:**
  - Supabase credentials
  - AI API keys (Anthropic, OpenAI, Google, xAI, DeepSeek)
  - Proxy configuration (V2Ray SOCKS5)
- **Volumes:**
  - Application logs
  - Redis dependency
- **Health Check:** `/api/health` endpoint

#### Service: `redis`
- **Image:** `redis:7-alpine`
- **Port:** 6379 (internal)
- **Purpose:** Caching layer for the app
- **Persistence:** Data stored in `volumes/redis-data`

#### Service: `nginx`
- **Image:** `nginx:alpine`
- **Ports:**
  - 80 (HTTP, redirects to HTTPS)
  - 443 (HTTPS)
- **Volumes:**
  - Config from `nginx.conf`
  - SSL certs from `/etc/letsencrypt`
  - Logs and cache

**Network:**
- Internal Docker network `aegis` (172.25.0.0/16)
- Nginx routes to app container
- App uses V2Ray via `host.docker.internal:10808`

---

### 3. `nginx.conf` — Web Server & SSL Termination

Production-ready Nginx configuration:

**Features:**
- HTTP → HTTPS redirect
- SSL/TLS with TLSv1.2+
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Reverse proxy to Next.js app
- Static asset caching (30 days)
- API caching (1 hour)
- Compression (gzip)
- WebSocket support
- Error page handling

**Endpoints:**
- `/` → Next.js app
- `/api/*` → API routes (no caching)
- `/_next/static/*` → Static assets (30-day cache)
- `/health` → Health check

**SSL/TLS:**
- Configured for Let's Encrypt
- Paths: `/etc/letsencrypt/live/{domain}/`
- Auto-renewal via certbot

---

### 4. `cloudflare-worker-proxy.js` — Free API Relay

A Cloudflare Worker script for routing API calls through Cloudflare's global network.

**Purpose:** Acts as fallback proxy if V2Ray is unavailable or for additional routing options.

**Supported APIs:**
- Anthropic Claude API
- OpenAI API
- Google Generative AI
- xAI/Grok API
- DeepSeek API
- Groq API

**Features:**
- Request forwarding to upstream APIs
- Streaming support (SSE)
- Rate limiting (default: 60 req/min per IP)
- Authentication via `X-Proxy-Key` header
- CORS handling
- Request logging
- Error handling

**Setup:**

1. Create a Cloudflare Worker:
   ```
   dash.cloudflare.com → Workers → Create Worker
   ```

2. Set environment variables:
   - `PROXY_AUTH_KEY`: Your secret key (required)
   - `ALLOWED_ORIGINS`: CORS allowed origins (default: *)
   - `LOG_REQUESTS`: Enable logging (default: true)
   - `RATE_LIMIT_REQUESTS`: Per-minute limit (default: 60)

3. Deploy the script

4. Use from your app:
   ```bash
   curl -X POST https://aegis-proxy.example.workers.dev/api/anthropic/messages \
     -H "X-Proxy-Key: your-secret-key" \
     -H "X-Anthropic-Api-Key: sk-ant-..." \
     -H "Content-Type: application/json" \
     -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1024, ...}'
   ```

**Cost:** FREE (Cloudflare Workers free tier: 100,000 requests/day)

---

### 5. `deploy.sh` — Automated Deployment Script

One-command deployment to the Yandex Cloud VM.

**Prerequisites:**
- SSH key: `/sessions/wonderful-blissful-babbage/aegis-yc-key`
- Docker installed locally
- `rsync` installed

**Configuration (environment variables):**
```bash
export VM_IP="158.160.172.77"
export VM_USER="aegis"
export VM_SSH_KEY="/sessions/wonderful-blissful-babbage/aegis-yc-key"
export VM_APP_PATH="/opt/aegis"
export SKIP_BUILD="false"  # Set to "true" to skip Docker build
export DRY_RUN="false"     # Set to "true" for dry-run
```

**Usage:**

```bash
# Full deployment
./deploy.sh deploy

# Setup VM only (pre-install dependencies)
./deploy.sh setup-only

# Build Docker image only
./deploy.sh build-only

# SSH into VM
./deploy.sh ssh

# View logs
./deploy.sh logs

# Check status
./deploy.sh status

# Restart services
./deploy.sh restart

# Stop services
./deploy.sh stop
```

**What it does:**
1. Validates environment and files
2. Builds Docker image locally
3. Saves image as tarball for transfer
4. SSH connects to VM and runs setup-vm.sh
5. Uploads Docker image and deployment files
6. Copies app source code (rsync)
7. Creates .env file with placeholders
8. Starts Docker Compose services
9. Performs health checks
10. Prints summary with next steps

---

## Quick Start

### 1. Prepare SSH Key

```bash
chmod 600 /sessions/wonderful-blissful-babbage/aegis-yc-key
```

### 2. Run Full Deployment

```bash
cd /sessions/wonderful-blissful-babbage/aegis-v2/deploy
./deploy.sh deploy
```

### 3. Configure API Keys

After deployment, SSH into the VM and edit the environment file:

```bash
# SSH using the deployment script
./deploy.sh ssh

# Edit environment
nano /opt/aegis/.env
```

Update the following API keys:
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_AI_API_KEY=AIzaSy...
XAI_API_KEY=xai-...
DEEPSEEK_API_KEY=sk-...
GROQ_API_KEY=...
```

### 4. Restart with New Keys

```bash
cd /opt/aegis
docker compose restart aegis
```

### 5. Setup SSL Certificate

For a real domain, use Let's Encrypt:

```bash
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf with your domain paths:
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

# Reload nginx
docker exec aegis-nginx nginx -s reload
```

---

## API Routing Options

### Option 1: V2Ray SOCKS5 (Default)

**How it works:**
- V2Ray runs on VM as a system service
- App container connects via `host.docker.internal:10808`
- Supports SOCKS5 protocol
- Direct routing to target APIs

**Pros:**
- No external dependencies
- Full control
- Low latency

**Cons:**
- Requires V2Ray configuration (outbound rules)
- May be blocked by restrictive network policies

**Setup:** Automatic via `setup-vm.sh`

### Option 2: Cloudflare Worker (Recommended for Russia)

**How it works:**
- Deploy Worker script to Cloudflare
- App sends requests to Worker URL
- Worker relays to target APIs
- Returns response to app

**Pros:**
- Free (100,000 requests/day)
- Reliable
- Global distribution
- Easy fallback mechanism

**Cons:**
- External dependency
- Slight latency increase

**Setup:**
1. Deploy `cloudflare-worker-proxy.js` to Cloudflare Worker
2. Set `CLOUDFLARE_PROXY_URL` and `CLOUDFLARE_PROXY_KEY` in app config
3. Or use as fallback if V2Ray fails

### Option 3: Hybrid (V2Ray + Cloudflare Fallback)

Configure app to try V2Ray first, fallback to Cloudflare Worker if unavailable.

---

## Environment Variables

### App Configuration

```bash
# Core
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lxrcmygvglfxltgcycbi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App URL
NEXT_PUBLIC_APP_URL=https://aegis-v2.yc.example.com

# AI API Keys (all optional, app has fallback logic)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_AI_API_KEY=AIzaSy...
XAI_API_KEY=xai-...
GROQ_API_KEY=...
DEEPSEEK_API_KEY=sk-...
YANDEX_API_KEY=... (optional for Russian compliance)
YANDEX_FOLDER_ID=... (required with YANDEX_API_KEY)

# Proxy (routes API calls)
HTTP_PROXY=socks5://host.docker.internal:10808
HTTPS_PROXY=socks5://host.docker.internal:10808
ALL_PROXY=socks5://host.docker.internal:10808
```

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
./deploy.sh logs

# Or SSH and run:
cd /opt/aegis
docker compose logs -f

# Specific service
docker compose logs -f aegis
docker compose logs -f nginx
docker compose logs -f redis
```

### Check Status

```bash
./deploy.sh status

# Or:
docker ps
systemctl status v2ray
systemctl status nginx
systemctl status docker
```

### Restart Services

```bash
./deploy.sh restart

# Or:
cd /opt/aegis
docker compose restart
```

### View Resource Usage

```bash
docker stats
```

### Check V2Ray Connectivity

```bash
# SSH into VM
./deploy.sh ssh

# Test SOCKS5 proxy
nc -zv localhost 10808

# Check V2Ray logs
journalctl -u v2ray -f
```

---

## Troubleshooting

### 1. Docker Build Fails

```bash
# Check Docker daemon
docker ps

# Check logs
docker compose logs

# Rebuild without cache
./deploy.sh build-only --no-cache
```

### 2. V2Ray Not Working

```bash
# Check service status
systemctl status v2ray

# Check logs
journalctl -u v2ray -f

# Restart
sudo systemctl restart v2ray

# Verify SOCKS5 port
sudo netstat -tlnp | grep 10808
```

### 3. API Calls Failing

**Check proxy configuration:**
```bash
# SSH into app container
docker exec -it aegis-app sh

# Test SOCKS5 connectivity
curl -x socks5://host.docker.internal:10808 https://api.anthropic.com/v1/health
```

**Check API key validity:**
- Verify keys in `.env`
- Test keys directly with `curl`
- Check rate limits on provider accounts

### 4. SSL Certificate Issues

```bash
# Check current cert
sudo openssl x509 -in /etc/letsencrypt/live/your-domain/fullchain.pem -noout -dates

# Renew early
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### 5. Out of Memory

```bash
# Check RAM usage
free -h

# Check container limits in docker-compose.yml
docker stats

# Reduce Next.js memory:
# In docker-compose.yml: NODE_OPTIONS=--max-old-space-size=1024
```

---

## Security Best Practices

1. **API Keys:**
   - Never commit to git
   - Use `.env` file (not in repo)
   - Rotate regularly
   - Use least-privilege scopes

2. **SSL/TLS:**
   - Use valid domain with Let's Encrypt
   - Enable HSTS header (already done)
   - Renew before expiration

3. **Firewall:**
   - Only open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Use IP allowlists if possible
   - Monitor logs for suspicious activity

4. **V2Ray:**
   - Don't expose SOCKS5 externally (localhost only)
   - Use authentication if exposing to other hosts
   - Monitor traffic patterns

5. **Docker:**
   - Run as non-root user (already done: `nextjs`)
   - Don't mount sensitive files unnecessarily
   - Keep base images updated

---

## Performance Tuning

### Nginx Caching

Static assets cached 30 days:
```
/_next/static/* → 30-day cache
*.js, *.css, images → 7-day cache
```

API responses not cached by Nginx (handled by Redis).

### Redis Configuration

For better performance:
```bash
# SSH into Redis container
docker exec -it aegis-redis redis-cli

# Check memory
INFO memory

# Monitor operations
MONITOR
```

### Node.js Memory

Default: 2GB (configurable in docker-compose.yml)
```bash
NODE_OPTIONS=--max-old-space-size=2048
```

---

## Backup & Recovery

### Backup Data

```bash
# Backup database and configs
docker compose exec redis redis-cli BGSAVE
docker exec aegis-redis cat /data/dump.rdb > backup-redis.rdb

# Backup app files
rsync -avz /opt/aegis/volumes/ /backup/aegis-volumes/
rsync -avz /opt/aegis/.env /backup/
```

### Restore

```bash
# Restore Redis
docker cp backup-redis.rdb aegis-redis:/data/dump.rdb
docker exec aegis-redis chown redis:redis /data/dump.rdb
docker restart aegis-redis

# Restore configs
cp /backup/.env /opt/aegis/.env
docker compose restart
```

---

## Deployment Checklist

- [ ] SSH key permissions: `chmod 600`
- [ ] VM IP and credentials configured
- [ ] Docker installed locally
- [ ] Run: `./deploy.sh deploy`
- [ ] SSH into VM: `./deploy.sh ssh`
- [ ] Update `.env` with API keys
- [ ] Restart app: `docker compose restart`
- [ ] Test app health: `curl https://localhost/health`
- [ ] Setup SSL domain: `sudo certbot certonly --standalone -d domain.com`
- [ ] Update nginx.conf with domain paths
- [ ] Test API calls (streaming, non-streaming)
- [ ] Monitor logs: `./deploy.sh logs`
- [ ] Verify V2Ray routing: `docker compose exec aegis curl -x socks5://...`

---

## Support & Documentation

For issues related to:

- **AEGIS App:** See `/sessions/wonderful-blissful-babbage/aegis-v2/`
- **V2Ray Configuration:** https://www.v2fly.org/
- **Docker Compose:** https://docs.docker.com/compose/
- **Nginx Configuration:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://certbot.eff.org/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/

---

## Version History

- **v1.0** (2026-04-06): Initial deployment setup for AEGIS V2.0 on Yandex Cloud
