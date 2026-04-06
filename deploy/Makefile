# ============================================================
# EE AEGIS V2.0 — Makefile for Deployment Management
# Quick commands for common deployment tasks
# ============================================================

.PHONY: help deploy setup build logs status restart stop ssh env clean

# Color output
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# Configuration
VM_IP ?= 158.160.172.77
VM_USER ?= aegis
VM_SSH_KEY ?= /sessions/wonderful-blissful-babbage/aegis-yc-key
VM_APP_PATH ?= /opt/aegis

DEPLOY_SCRIPT = ./deploy.sh

# ────────────────────────────────────────────────────────────

help:
	@echo "$(BLUE)EE AEGIS V2.0 — Deployment Makefile$(NC)"
	@echo ""
	@echo "$(GREEN)Usage:$(NC)"
	@echo "  make deploy           - Full deployment to VM"
	@echo "  make setup            - VM setup only (pre-install)"
	@echo "  make build            - Build Docker image locally"
	@echo "  make ssh              - SSH into VM"
	@echo "  make logs             - View service logs"
	@echo "  make status           - Check service status"
	@echo "  make restart          - Restart all services"
	@echo "  make stop             - Stop all services"
	@echo "  make env              - View/edit environment"
	@echo "  make health           - Run health checks"
	@echo "  make clean            - Remove build artifacts"
	@echo ""
	@echo "$(YELLOW)Configuration:$(NC)"
	@echo "  VM_IP=$(VM_IP)"
	@echo "  VM_USER=$(VM_USER)"
	@echo "  VM_SSH_KEY=$(VM_SSH_KEY)"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make deploy"
	@echo "  make logs | tail -50"
	@echo "  VM_IP=192.168.1.100 make ssh"

# ────────────────────────────────────────────────────────────

deploy:
	@echo "$(GREEN)Starting full deployment...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) deploy

setup:
	@echo "$(GREEN)Running VM setup...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) setup-only

build:
	@echo "$(GREEN)Building Docker image...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) build-only

ssh:
	@echo "$(GREEN)Connecting to VM...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) ssh

logs:
	@echo "$(GREEN)Showing service logs (Ctrl+C to exit)...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) logs

status:
	@echo "$(GREEN)Checking service status...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) status

restart:
	@echo "$(YELLOW)Restarting services...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) restart

stop:
	@echo "$(YELLOW)Stopping services...$(NC)"
	@chmod +x $(DEPLOY_SCRIPT)
	@$(DEPLOY_SCRIPT) stop

env:
	@echo "$(GREEN)Environment configuration:$(NC)"
	@echo ""
	@echo "To configure API keys:"
	@echo "  1. SSH: $(BLUE)make ssh$(NC)"
	@echo "  2. Edit: $(BLUE)nano $(VM_APP_PATH)/.env$(NC)"
	@echo "  3. Restart: $(BLUE)cd $(VM_APP_PATH) && docker compose restart$(NC)"
	@echo ""
	@echo "Required keys:"
	@echo "  - ANTHROPIC_API_KEY"
	@echo "  - OPENAI_API_KEY"
	@echo "  - GOOGLE_AI_API_KEY"
	@echo "  - XAI_API_KEY"

health:
	@echo "$(GREEN)Running health checks...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"echo '$(GREEN)Docker containers:$(NC)' && docker ps && \
		 echo '' && echo '$(GREEN)V2Ray status:$(NC)' && systemctl status v2ray --no-pager | grep Active && \
		 echo '' && echo '$(GREEN)SOCKS5 port:$(NC)' && nc -zv localhost 10808 && \
		 echo '' && echo '$(GREEN)All checks passed!$(NC)'"

clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -f deploy/aegis-v2-image.tar.gz
	@docker image prune -f --filter "dangling=true"
	@echo "$(GREEN)Cleanup complete$(NC)"

# ────────────────────────────────────────────────────────────
# Advanced targets

shell:
	@echo "$(GREEN)Opening shell in app container...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"cd $(VM_APP_PATH) && docker compose exec aegis sh"

logs-app:
	@echo "$(GREEN)App logs (Ctrl+C to exit)...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"cd $(VM_APP_PATH) && docker compose logs -f aegis"

logs-nginx:
	@echo "$(GREEN)Nginx logs (Ctrl+C to exit)...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"tail -f $(VM_APP_PATH)/volumes/nginx-logs/access.log"

logs-v2ray:
	@echo "$(GREEN)V2Ray logs (Ctrl+C to exit)...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"journalctl -u v2ray -f"

stats:
	@echo "$(GREEN)Resource usage...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"docker stats --no-stream"

db-backup:
	@echo "$(GREEN)Backing up Redis database...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"cd $(VM_APP_PATH) && docker compose exec redis redis-cli BGSAVE"

db-info:
	@echo "$(GREEN)Redis database info...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"cd $(VM_APP_PATH) && docker compose exec redis redis-cli INFO"

test-proxy:
	@echo "$(GREEN)Testing V2Ray SOCKS5 proxy...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"nc -zv localhost 10808 && echo '$(GREEN)SOCKS5 proxy is responding!$(NC)'"

test-api:
	@echo "$(GREEN)Testing API connectivity...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"cd $(VM_APP_PATH) && docker compose exec aegis curl -x socks5://host.docker.internal:10808 https://api.anthropic.com/v1/health"

disk-usage:
	@echo "$(GREEN)Disk usage...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"df -h / && echo '' && du -sh /opt/aegis/*"

ssl-status:
	@echo "$(GREEN)SSL certificate status...$(NC)"
	@ssh -i $(VM_SSH_KEY) -o StrictHostKeyChecking=no $(VM_USER)@$(VM_IP) \
		"sudo openssl x509 -in /etc/letsencrypt/live/localhost/fullchain.pem -noout -dates 2>/dev/null || echo 'Self-signed cert (dev mode)'"

# ────────────────────────────────────────────────────────────
# Documentation targets

docs:
	@echo "$(GREEN)Documentation files:$(NC)"
	@echo "  - README.md       $(BLUE)(Full deployment guide)$(NC)"
	@echo "  - QUICKSTART.md   $(BLUE)(30-minute setup)$(NC)"
	@echo "  - ARCHITECTURE.md $(BLUE)(Technical details)$(NC)"
	@echo "  - .env.example    $(BLUE)(Configuration template)$(NC)"

show-config:
	@echo "$(GREEN)Current configuration:$(NC)"
	@echo "  VM IP:     $(VM_IP)"
	@echo "  VM User:   $(VM_USER)"
	@echo "  SSH Key:   $(VM_SSH_KEY)"
	@echo "  App Path:  $(VM_APP_PATH)"
	@echo ""
	@echo "$(YELLOW)Override with:$(NC)"
	@echo "  make ssh VM_IP=192.168.1.1 VM_USER=root"

# ────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
