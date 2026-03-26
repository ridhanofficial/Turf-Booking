#!/usr/bin/env bash
# =============================================================================
# Viswa Sports — EC2 Full Stack Deploy Script (Docker Compose)
# Stack: Postgres + Redis + FastAPI Backend + Nginx
# OS:    Ubuntu 24.04 LTS  |  t3.micro  |  eu-north-1
#
# Usage:
#   scp -i turf-key.pem -r . ubuntu@13.60.220.125:/home/ubuntu/Viswa-Sports-Turf/
#   ssh -i turf-key.pem ubuntu@13.60.220.125
#   cd ~/Viswa-Sports-Turf && chmod +x backend/deploy/deploy.sh
#   sudo bash backend/deploy/deploy.sh
# =============================================================================
set -euo pipefail

REPO_DIR="/home/ubuntu/Viswa-Sports-Turf"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
ENV_FILE="$REPO_DIR/.env.prod"

echo "════════════════════════════════════════════════"
echo "  Viswa Sports — Docker Compose EC2 Bootstrapper"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "════════════════════════════════════════════════"

# ─── 1. System packages ───────────────────────────────────────────────────────
echo "[1/6] Updating system packages..."
apt-get update -q && apt-get upgrade -y -q
apt-get install -y -q curl git ufw

# ─── 2. Install Docker + Compose plugin ───────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "[2/6] Installing Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -q
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    usermod -aG docker ubuntu
    echo "  ✓ Docker installed."
else
    echo "[2/6] Docker already installed — upgrading compose plugin if needed..."
    apt-get install -y docker-compose-plugin 2>/dev/null || true
fi

# Verify compose v2
docker compose version

# ─── 3. Firewall ─────────────────────────────────────────────────────────────
echo "[3/6] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
echo "  ✓ Firewall: SSH + HTTP + HTTPS open. Ports 5432/6379/8000 blocked externally."

# ─── 4. Check environment file ────────────────────────────────────────────────
echo "[4/6] Checking .env.prod..."
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "  ┌──────────────────────────────────────────────────────────┐"
    echo "  │  ACTION REQUIRED: Create $REPO_DIR/.env.prod │"
    echo "  │  cp backend/deploy/env.production.example .env.prod      │"
    echo "  │  nano .env.prod   →   fill all CHANGE_ME values          │"
    echo "  └──────────────────────────────────────────────────────────┘"
    exit 1
fi
chmod 600 "$ENV_FILE"
echo "  ✓ .env.prod found."

# Sanity: reject placeholder values
if grep -q "CHANGE_ME" "$ENV_FILE"; then
    echo ""
    echo "  ✗ ERROR: .env.prod still contains CHANGE_ME placeholders!"
    echo "    Fill in all values before deploying."
    exit 1
fi

# ─── 5. Build & start the stack ───────────────────────────────────────────────
echo "[5/6] Building Docker images..."
cd "$REPO_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

echo "  Starting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for backend health (alembic runs inside backend entrypoint)
echo "  Waiting for services to become healthy (up to 90s)..."
TRIES=0
until docker compose -f "$COMPOSE_FILE" exec -T backend curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    TRIES=$((TRIES+1))
    if [ "$TRIES" -ge 18 ]; then
        echo "  ✗ Backend health check timed out after 90s."
        echo "    Logs: docker compose -f $COMPOSE_FILE logs backend"
        exit 1
    fi
    sleep 5
done
echo "  ✓ All services healthy."

# ─── 6. SSL — Certbot ─────────────────────────────────────────────────────────
echo "[6/6] Certbot SSL setup..."
if ! command -v certbot &>/dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

echo ""
echo "  To get an SSL certificate, run (AFTER pointing your domain DNS → 13.60.220.125):"
echo ""
echo "    sudo certbot certonly --standalone -d YOUR_DOMAIN"
echo "    # Then update nginx/nginx.conf: replace YOUR_DOMAIN"
echo "    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart nginx"
echo ""

echo "════════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  Health:  curl http://13.60.220.125/health"
echo "  API:     http://13.60.220.125/docs"
echo ""
echo "  Manage:"
echo "    cd $REPO_DIR"
echo "    docker compose -f docker-compose.prod.yml --env-file .env.prod ps"
echo "    docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f"
echo "════════════════════════════════════════════════"
