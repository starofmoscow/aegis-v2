# AEGIS V2.0 — Deployment Architecture

## System Overview

AEGIS V2.0 is deployed on a Yandex Cloud VM (Ubuntu 24.04) with a complete containerized infrastructure for reliable, scalable AI-powered engineering assistance.

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER / BROWSER CLIENT                         │
│                   (Any location, any device)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (TLS 1.2+)
                         │ Port 443
        ┌────────────────▼─────────────────┐
        │      Yandex Cloud Public IP      │
        │        158.160.172.77            │
        └────────────────┬─────────────────┘
                         │
        ┌────────────────▼──────────────────────────┐
        │     NGINX (Alpine Container)              │
        │     - Reverse proxy                       │
        │     - SSL/TLS termination                 │
        │     - Security headers                    │
        │     - Caching (static, API)               │
        │     - WebSocket upgrade                   │
        │     - Load balancing (if scaled)          │
        └────────────────┬──────────────────────────┘
                         │ HTTP/1.1 Keepalive
                         │ Port 3000 (internal)
        ┌────────────────▼──────────────────────────┐
        │   AEGIS Next.js App Container             │
        │   - Node.js 20 Alpine runtime              │
        │   - Streaming API support                  │
        │   - Redis caching client                   │
        │   - Multi-provider AI orchestration        │
        │   - Environment: Production mode           │
        └────────────────┬──────────────────────────┘
         ┌──────────────┴──────────────┐
         │                             │
    HTTP_PROXY                    Redis Client
    HTTPS_PROXY                    (port 6379)
    ALL_PROXY                      (internal)
    SOCKS5                             │
         │                             │
         │                   ┌─────────▼─────────┐
         │                   │ Redis Container   │
         │                   │ - Data store      │
         │                   │ - Cache backend   │
         │                   │ - Sessions        │
         │                   │ - Rate limiting   │
         │                   └───────────────────┘
         │
         ├─────────────────────────────────────────────┐
         │                                             │
    OPTION A: V2Ray SOCKS5              OPTION B: Cloudflare
    (Preferred, Local)                   (Fallback, External)
         │                                             │
    ┌────▼──────────────────┐         ┌──────────────▼───────┐
    │  V2Ray SOCKS5 Proxy   │         │  Cloudflare Worker   │
    │  - Port 10808         │         │  (Free tier)         │
    │  - Direct routing     │         │  - Global network    │
    │  - Low latency        │         │  - 100k req/day      │
    │  - Full control       │         │  - API relay         │
    └────┬──────────────────┘         └──────────────┬───────┘
         │                                             │
         └─────────────────┬───────────────────────────┘
                           │
        ┌──────────────────▼──────────────────────┐
        │    Upstream AI APIs (via proxy)         │
        │ ┌─────────────────────────────────────┐ │
        │ │ Anthropic (Claude)                  │ │
        │ │ - api.anthropic.com                 │ │
        │ │ - Stream + non-stream support       │ │
        │ └─────────────────────────────────────┘ │
        │ ┌─────────────────────────────────────┐ │
        │ │ OpenAI                              │ │
        │ │ - api.openai.com                    │ │
        │ │ - GPT-4, GPT-4o, o1                 │ │
        │ └─────────────────────────────────────┘ │
        │ ┌─────────────────────────────────────┐ │
        │ │ Google Generative AI                │ │
        │ │ - generativelanguage.googleapis.com │ │
        │ │ - Gemini models                     │ │
        │ └─────────────────────────────────────┘ │
        │ ┌─────────────────────────────────────┐ │
        │ │ xAI (Grok)                          │ │
        │ │ - api.x.ai                          │ │
        │ │ - Grok models                       │ │
        │ └─────────────────────────────────────┘ │
        │ ┌─────────────────────────────────────┐ │
        │ │ DeepSeek                            │ │
        │ │ - api.deepseek.com                  │ │
        │ │ - Reasoning models                  │ │
        │ └─────────────────────────────────────┘ │
        │ ┌─────────────────────────────────────┐ │
        │ │ Groq                                │ │
        │ │ - api.groq.com                      │ │
        │ │ - Ultra-fast inference              │ │
        │ └─────────────────────────────────────┘ │
        └─────────────────────────────────────────┘
```

---

## Container Architecture

### Docker Network: `aegis` (172.25.0.0/16)

All containers communicate internally via Docker bridge network. The network is isolated from the host and external networks except for explicitly exposed ports.

```
┌─────────────────────────────────────────┐
│       Docker Bridge Network: aegis      │
│            (172.25.0.0/16)              │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐ │
│  │ aegis:3000  │  │ redis:6379      │ │
│  │ (app)       │  │ (cache backend) │ │
│  └────┬────────┘  └────┬────────────┘ │
│       │                │               │
│  ┌────▼────────────────▼────────────┐  │
│  │   nginx:443 (reverse proxy)      │  │
│  │   172.25.0.3                     │  │
│  └────┬─────────────────────────────┘  │
│       │                                 │
└───────┼─────────────────────────────────┘
        │
        ├─ Port 80 (host) → Nginx port 80
        ├─ Port 443 (host) → Nginx port 443
        └─ Port 3000 (exposed for debugging)
```

### Container Definitions

#### 1. `aegis` (Next.js Application)

**Image:** Built from project `Dockerfile` (multi-stage Node Alpine)

**Configuration:**
```yaml
Port: 3000 (internal)
User: nextjs (non-root)
Memory: Configurable (default: 2GB via NODE_OPTIONS)
Restart: unless-stopped
Network: aegis
```

**Environment:**
- `NODE_ENV=production` (optimized builds)
- `PORT=3000`
- Supabase credentials
- AI API keys
- Proxy settings (HTTP_PROXY, HTTPS_PROXY)

**Health Check:**
- Endpoint: `/api/health`
- Interval: 30s
- Timeout: 10s
- Retries: 3
- Start period: 40s

**Volumes:**
- Logs: `./volumes/app-logs` (for audit trail)
- No persistent data (stateless design)

**Networking:**
- Access V2Ray via: `host.docker.internal:10808` (special Docker DNS)
- Access Redis via: `redis:6379` (Docker DNS)
- Cannot access host directly (isolated)

---

#### 2. `redis` (Cache & Session Store)

**Image:** `redis:7-alpine` (official, minimal)

**Configuration:**
```yaml
Port: 6379 (internal, not exposed)
Memory: Configurable
Restart: unless-stopped
Network: aegis
Persistence: AOF (append-only file)
```

**Purpose:**
- Cache layer for frequent API responses
- Session storage
- Rate limiting counters
- Real-time data (scores, counters)

**Data:**
- Stored in: `./volumes/redis-data/`
- Survives container restarts
- Backup/restore via `BGSAVE` command

**Health Check:**
- Command: `redis-cli ping`
- Interval: 10s
- Timeout: 5s
- Retries: 5

---

#### 3. `nginx` (Reverse Proxy & SSL)

**Image:** `nginx:alpine` (official, minimal)

**Configuration:**
```yaml
Ports:
  - 80:80 (HTTP, redirects to HTTPS)
  - 443:443 (HTTPS, TLS 1.2+)
User: nginx (non-root)
Restart: unless-stopped
Network: aegis
```

**Responsibilities:**
1. **SSL/TLS Termination**
   - Decrypts incoming HTTPS traffic
   - Re-encrypts to upstream app if needed
   - Certificates: Let's Encrypt in `/etc/letsencrypt/`

2. **Reverse Proxy**
   - Routes traffic to app container (port 3000)
   - Maintains connection pooling
   - Handles WebSocket upgrades

3. **Static Asset Serving**
   - Serves `/_next/static/*` with 30-day cache
   - Serves images, fonts, stylesheets
   - Sets `Cache-Control` headers

4. **Security Headers**
   - HSTS (HTTP Strict-Transport-Security)
   - CSP (Content-Security-Policy)
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - Removes server version info

5. **Caching**
   - Static cache: 30 days
   - API cache: Disabled (handled by app/Redis)
   - Proper cache keys and invalidation

6. **Logging & Monitoring**
   - Access logs: `./volumes/nginx-logs/access.log`
   - Error logs: `./volumes/nginx-logs/error.log`
   - Formats: Standard and detailed (with timings)

**Volumes:**
- Config: `/etc/nginx/nginx.conf` (read-only)
- Certs: `/etc/letsencrypt/` (read-only)
- Cache: `./volumes/nginx-cache/`
- Logs: `./volumes/nginx-logs/`

---

## Host System Services

### V2Ray SOCKS5 Proxy

**Type:** System service (not containerized for direct access)

**Configuration:**
- Listens on: `localhost:10808` (SOCKS5)
- Listens on: `localhost:10809` (HTTP proxy)
- Configuration file: `/etc/v2ray/config.json`

**Function:**
- Routes API calls from app container to external networks
- Handles domain resolution
- Supports both SOCKS5 and HTTP protocols
- Low-level control over outbound connections

**Routing Rules:**
```
AI API domains → Freedom (direct routing)
Localhost IPs → Direct routing
Blocked domains → Blackhole
```

**Logs:**
- Access: `/var/log/v2ray/access.log`
- Error: `/var/log/v2ray/error.log`
- System: `journalctl -u v2ray -f`

**Accessibility from Docker:**
- Container accesses via: `host.docker.internal:10808`
- Docker automatically resolves to host IP
- Requires `extra_hosts: host.docker.internal:host-gateway` in compose

---

### Nginx System Service

**Type:** System service (runs separately, not via Docker)

**Configuration:**
- Main config: `/etc/nginx/nginx.conf`
- Loaded by Docker volume mount
- Listens on: `0.0.0.0:80` and `0.0.0.0:443`

**Logs:**
- System: `systemctl status nginx`
- Access: `/var/log/nginx/access.log`
- Error: `/var/log/nginx/error.log`

**Management:**
```bash
systemctl status nginx
systemctl restart nginx
systemctl stop nginx
```

---

## Data Flow

### 1. User Request → App

```
Client HTTPS Request (TLS 1.2+)
       ↓
Nginx (Port 443)
  - Decrypts TLS
  - Validates request
  - Adds security headers
       ↓
Docker Network (HTTP/1.1 Keep-Alive)
       ↓
Next.js App (Port 3000)
  - Routes to handler
  - Executes business logic
  - Returns response
```

### 2. App → AI API Request

```
Next.js App (runtime)
       ↓
Checks HTTP_PROXY env var
  "socks5://host.docker.internal:10808"
       ↓
Docker Network Resolution
  host.docker.internal → 172.17.0.1 (host)
       ↓
Host Network (SOCKS5)
       ↓
V2Ray Daemon (Port 10808)
  - Receives SOCKS5 request
  - Resolves domain
  - Routes outbound
       ↓
Internet → Target API
  (api.anthropic.com, api.openai.com, etc.)
```

### 3. Caching Flow

```
Request comes in
       ↓
Nginx checks static cache
  - /_next/static/* → Cache HIT (30 days)
  - API routes → Pass through
       ↓
Next.js checks Redis
  - Cache key: hash(request_params)
  - TTL: 1-3600s (configurable)
  - Cache HIT → Return cached response
  - Cache MISS → Fetch from AI API
       ↓
Response goes back through:
  App → Nginx → Client (with Cache-Control headers)
```

---

## Security Architecture

### Network Isolation

1. **Internal Network (aegis)**
   - Only containers and Docker host
   - No external access except through Nginx
   - DNS isolation for services

2. **External Access**
   - Only ports 80 and 443 exposed to Internet
   - SSH (port 22) restricted by firewall
   - Reverse proxy blocks direct app access

3. **API Keys**
   - Stored in `.env` file (not in code)
   - Mounted as environment variables
   - Not visible in Docker layers (separate stage)
   - Never logged or exposed

### TLS/SSL

- **Version:** TLS 1.2 and 1.3 only
- **Ciphers:** HIGH grade only
- **Certificates:** Let's Encrypt (automated renewal)
- **HSTS:** Max-age 1 year, includes subdomains

### Headers

All responses include:
- `Strict-Transport-Security: max-age=31536000`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'`

### User Isolation

- Each request runs with `nextjs` user (UID 1001)
- No root-level access from app
- No capability escalation
- Read-only filesystem for config/code

---

## Performance Characteristics

### Latency Path

```
User Request
↓ (variable, depends on geography)
Nginx TLS handshake: ~50-100ms
↓
Nginx → Docker routing: ~1-2ms
↓
App logic: ~10-500ms (depends on operation)
↓
Redis cache check: ~1-5ms
↓
If cache miss: API call: 500ms-2s (depends on provider)
↓
Response back through Nginx: ~1-10ms
↓
Total: 550ms - 2500ms (with cache: 100-200ms)
```

### Memory Usage

```
Nginx: ~5-20MB
Next.js App: ~400-800MB (configured 2GB max)
Redis: ~50-200MB (depends on data)
V2Ray: ~30-50MB
Total: ~500MB-1.2GB

Available on VM: ~2GB → Safe operating margin
```

### Disk Usage

```
Docker image (AEGIS): ~400MB (gzipped ~100MB)
Dependencies (node_modules): ~500MB
Build artifacts (.next): ~200MB
Redis data: ~100MB (variable)
Logs: ~500MB/month
Total: ~1.5GB minimum
```

### Concurrent Users

- Single Next.js instance: ~100-200 concurrent users
- Bottleneck: AI API response time (not app)
- Scaling: Add app replicas + load balancer

---

## Failover & Recovery

### Container Restart Policy

All containers have `restart: unless-stopped`:
- Automatic restart if container crashes
- Graceful shutdown on Docker daemon stop
- Manual stop ignored by policy

### Health Checks

**Nginx:** `wget http://localhost/health` every 30s
**Redis:** `redis-cli ping` every 10s
**App:** HTTP endpoint `/api/health` every 30s

If health check fails 3 times → Container marked unhealthy

### Volume Persistence

```
Survives container restarts:
- Redis data: ./volumes/redis-data/
- Nginx cache: ./volumes/nginx-cache/
- Logs: ./volumes/nginx-logs/, app-logs/

Lost on container deletion:
- App runtime (but source code persists)
- Temp files
```

### Backup Strategy

1. **Daily automated:**
   - `docker exec aegis-redis redis-cli BGSAVE`
   - Copy dump.rdb to external storage

2. **Manual backup:**
   ```bash
   docker compose exec redis redis-cli BGSAVE
   cp volumes/redis-data/dump.rdb /backup/redis-$(date +%s).rdb
   ```

3. **Disaster recovery:**
   ```bash
   cp backup.rdb volumes/redis-data/dump.rdb
   docker compose restart redis
   ```

---

## Monitoring & Observability

### Metrics to Track

1. **Application Health**
   - Response time (p50, p99)
   - Error rate (HTTP 5xx)
   - Request volume
   - Active connections

2. **Resource Usage**
   - CPU: `docker stats`
   - Memory: `docker stats`
   - Disk: `df -h`

3. **API Performance**
   - Upstream latency
   - Success/failure rates per provider
   - Cache hit rate

4. **System Health**
   - Disk space remaining
   - Container restart count
   - Log file sizes

### Log Collection

**Centralized logs:**
```bash
# Nginx access logs
tail -f ./volumes/nginx-logs/access.log | grep -o '"[0-9]*"'

# App logs
docker compose logs -f aegis

# V2Ray logs
journalctl -u v2ray -f

# System logs
dmesg | tail -20
```

---

## Deployment Environments

### Development
- Single node deployment
- Self-signed SSL (localhost)
- V2Ray routing enabled
- All logging enabled

### Production
- Single node (can scale to multi-node)
- Valid domain + Let's Encrypt SSL
- V2Ray + Cloudflare Worker fallback
- Structured logging
- Monitoring/alerting configured

### Disaster Recovery
- Automated backups (Redis)
- Docker image export for quick restore
- Infrastructure-as-code (docker-compose.yml)
- Documented runbooks

---

## Upgrade Path

### Non-Breaking Changes
- Update app code: `docker compose build && docker compose restart`
- Update dependencies: Rebuild image
- Nginx config: Update nginx.conf and reload
- SSL certificates: Automatic renewal via certbot

### Breaking Changes
- Major version upgrade: Test in dev first
- Database schema changes: Plan migration
- V2Ray config: Backup before changes
- Test rollback procedure

### Rollback Procedure
```bash
# Keep previous image
docker tag aegis-v2:latest aegis-v2:previous

# Build new version
docker build -t aegis-v2:latest .

# If issues, rollback
docker tag aegis-v2:previous aegis-v2:latest
docker compose restart
```

---

## Compliance & Security

### Data Privacy
- TLS encryption in transit (port 443)
- No persistent user data stored (stateless)
- Redis data can be encrypted at rest (optional)
- Access logs contain IP (can be anonymized)

### Audit Trail
- All API calls logged in `/var/log/nginx/access.log`
- Retention: 30 days (configurable)
- Format: Standard combined log format
- Can be shipped to logging service

### Compliance Features
- ISO 27001 compatible (with proper policies)
- GDPR ready (no user data persisted)
- Russian law compatible (Yandex Cloud hosted)
- SOC 2 compatible infrastructure

---

## Disaster Recovery Runbook

### Scenario 1: App Container Crashes
```bash
# Auto-restart will handle it
docker compose logs aegis | tail -50  # Check why

# If not restarting, force restart
docker compose restart aegis
```

### Scenario 2: Disk Full
```bash
df -h  # Check usage
docker image prune  # Remove unused images
docker system prune  # Deep cleanup
# Or expand disk volume
```

### Scenario 3: Redis Data Corruption
```bash
docker compose stop redis
rm volumes/redis-data/dump.rdb
docker compose start redis
# Or restore from backup
```

### Scenario 4: SSL Certificate Expired
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
# Or reload Nginx container
docker exec aegis-nginx nginx -s reload
```

### Scenario 5: V2Ray Not Responding
```bash
systemctl status v2ray
systemctl restart v2ray
journalctl -u v2ray -f
# Check port: nc -zv localhost 10808
```

---

**Document Version:** 1.0 (2026-04-06)
**Last Updated:** 2026-04-06
**Maintained By:** Energy & Engineering LLC
