# AEGIS V2.0 — Quick Start Guide

## 30-Minute Deployment

### Step 1: Prepare SSH Key (1 min)

```bash
chmod 600 /sessions/wonderful-blissful-babbage/aegis-yc-key
```

### Step 2: Deploy Everything (10 min)

```bash
cd /sessions/wonderful-blissful-babbage/aegis-v2/deploy
./deploy.sh deploy
```

**What happens:**
- ✓ Builds Docker image (~3 min)
- ✓ Connects to VM (158.160.172.77)
- ✓ Installs Docker, V2Ray, Nginx
- ✓ Deploys app and services
- ✓ Runs health checks

### Step 3: Configure API Keys (5 min)

```bash
# SSH into VM
./deploy.sh ssh

# Edit environment
nano /opt/aegis/.env
```

**Find and update these lines:**
```bash
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
GOOGLE_AI_API_KEY=AIzaSy-YOUR_KEY_HERE
XAI_API_KEY=xai-YOUR_KEY_HERE
DEEPSEEK_API_KEY=sk-YOUR_KEY_HERE
```

**Save:** `Ctrl+X`, `Y`, `Enter`

### Step 4: Restart App (2 min)

```bash
cd /opt/aegis
docker compose restart aegis
sleep 10
docker compose logs -f aegis
```

**Watch for:** "Server running on port 3000" or "Ready in XXXms"

### Step 5: Test (2 min)

```bash
# Exit logs: Ctrl+C

# Check V2Ray
systemctl status v2ray

# Test proxy
curl -x socks5://localhost:10808 https://api.anthropic.com/v1/health

# View app status
docker ps
```

**Done!** Your app is running.

---

## Common Commands

```bash
# SSH into VM
./deploy.sh ssh

# View logs (real-time)
./deploy.sh logs

# Restart all services
./deploy.sh restart

# Check status
./deploy.sh status

# Stop services
./deploy.sh stop

# View app status
docker compose ps

# View V2Ray logs
journalctl -u v2ray -f

# Enter app container
docker exec -it aegis-app sh
```

---

## API Keys - Where to Get Them

| Provider | URL | Format |
|----------|-----|--------|
| **Anthropic** | https://console.anthropic.com/settings/keys | `sk-ant-...` |
| **OpenAI** | https://platform.openai.com/api-keys | `sk-proj-...` |
| **Google** | https://aistudio.google.com/app/apikey | `AIzaSy...` |
| **xAI (Grok)** | https://console.x.ai/ | `xai-...` |
| **DeepSeek** | https://platform.deepseek.com/ | `sk-...` |
| **Groq** | https://console.groq.com/ | `gsk_...` |

---

## Troubleshooting

### App not responding

```bash
./deploy.sh ssh
cd /opt/aegis
docker compose logs aegis | tail -50
```

### V2Ray not working

```bash
./deploy.sh ssh
systemctl status v2ray
journalctl -u v2ray -f
nc -zv localhost 10808  # Should work
```

### API calls failing

```bash
# Check proxy connectivity
docker exec aegis-app curl -x socks5://host.docker.internal:10808 https://api.anthropic.com/v1/health

# Check API key
docker exec aegis-app printenv | grep API_KEY
```

### Out of memory

```bash
docker stats
# Edit docker-compose.yml → NODE_OPTIONS → reduce max-old-space-size
docker compose restart
```

---

## VM Access

```bash
# SSH command
ssh -i /sessions/wonderful-blissful-babbage/aegis-yc-key aegis@158.160.172.77

# Or use script
cd /sessions/wonderful-blissful-babbage/aegis-v2/deploy
./deploy.sh ssh
```

**VM Paths:**
- App: `/opt/aegis`
- Config: `/opt/aegis/docker-compose.yml`
- Logs: `/opt/aegis/volumes/nginx-logs/`
- SSL: `/etc/letsencrypt/`
- V2Ray: `/etc/v2ray/config.json`

---

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| **22** | SSH | Remote access (internal only) |
| **80** | HTTP | Redirects to HTTPS |
| **443** | HTTPS | Web app (encrypted) |
| **3000** | App | Next.js (internal, via Nginx) |
| **6379** | Redis | Caching (internal only) |
| **10808** | V2Ray | SOCKS5 proxy (internal only) |

---

## Useful File Locations

```
/opt/aegis/                           # App directory
├── docker-compose.yml                 # Service definitions
├── nginx.conf                         # Web server config
├── .env                               # API keys & config
├── app/                               # Next.js source code
├── volumes/
│   ├── redis-data/                    # Redis database
│   ├── nginx-cache/                   # Nginx caching
│   ├── nginx-logs/                    # Access/error logs
│   └── app-logs/                      # Application logs
├── Dockerfile                         # Docker image definition

/etc/v2ray/
├── config.json                        # V2Ray SOCKS5 config

/etc/letsencrypt/
├── live/{domain}/
│   ├── fullchain.pem                  # SSL certificate
│   └── privkey.pem                    # Private key

/var/log/
├── nginx/                             # Nginx logs
├── v2ray/                             # V2Ray logs
```

---

## Next Steps

1. **Setup SSL domain:**
   ```bash
   # From VM:
   sudo certbot certonly --standalone -d your-domain.com
   # Update nginx.conf with domain paths
   docker exec aegis-nginx nginx -s reload
   ```

2. **Monitor in production:**
   ```bash
   # Set up log rotation
   # Watch resource usage: docker stats
   # Check uptime: docker compose ps
   ```

3. **Configure Cloudflare Worker (optional fallback):**
   - Deploy `cloudflare-worker-proxy.js` to Cloudflare
   - Set as fallback if V2Ray unavailable

4. **Scale if needed:**
   - Increase `NODE_OPTIONS` max heap
   - Add more Redis instances
   - Load balance multiple app replicas

---

## Emergency Access

**If SSH fails:**
```bash
# Use Yandex Cloud console to access VM directly
# Or check: VM serial console in Yandex Cloud dashboard
```

**If app won't start:**
```bash
# From local machine, restart remotely:
ssh -i KEY aegis@IP "cd /opt/aegis && docker compose restart"
```

**If everything breaks:**
```bash
# Rerun setup on clean VM:
./deploy.sh setup-only
# Then redeploy:
./deploy.sh deploy
```

---

## Resources

- **Deployment Issues:** See `README.md`
- **V2Ray Help:** https://www.v2fly.org/
- **Docker Docs:** https://docs.docker.com/
- **AEGIS App Code:** `/sessions/wonderful-blissful-babbage/aegis-v2/`

---

**Questions?** Check the full `README.md` in this directory.
