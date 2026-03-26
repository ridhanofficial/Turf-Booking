# Viswa Sports Backend — EC2 Deployment Guide (Docker Compose)

> **Instance:** `i-0701813eed05d8724` · t3.micro · Ubuntu 24.04 LTS · eu-north-1  
> **Public IP:** `13.60.220.125`  
> **Stack:** Postgres 16 + Redis 7 + FastAPI + Nginx (all on Docker Compose)

---

## Architecture Overview

```
Internet (80/443)
      │
   [Nginx]  ← SSL termination, rate limiting, static files
      │
   [backend:8000]  ← FastAPI + Gunicorn (internal only)
    ├──[postgres:5432]  ← PostgreSQL (internal only)
    └──[redis:6379]     ← Redis (internal only)
```
Ports `5432`, `6379`, and `8000` are **never exposed publicly** — only Nginx faces the internet.

---

## Prerequisites — EC2 Security Group

Open these inbound ports in `EC2 → Security Groups → Inbound rules`:

| Type  | Port | Source |
|-------|------|--------|
| SSH   | 22   | Your IP only |
| HTTP  | 80   | 0.0.0.0/0 |
| HTTPS | 443  | 0.0.0.0/0 |

---

## Step 1 — SSH into EC2

```bash
chmod 400 turf-key.pem
ssh -i turf-key.pem ubuntu@13.60.220.125
```

---

## Step 2 — Upload Code to EC2

**Option A — Git (recommended):**
```bash
# On EC2
git clone https://github.com/sampath-raj/Turf-project.git ~/Viswa-Sports-Turf
```

**Option B — SCP from Windows (Git Bash / WSL):**
```bash
# From your LOCAL machine, project root
scp -i turf-key.pem -r . ubuntu@13.60.220.125:/home/ubuntu/Viswa-Sports-Turf/
```

---

## Step 3 — Create Production Environment File

```bash
cd ~/Viswa-Sports-Turf

# Copy template
cp backend/deploy/env.production.example .env.prod

# Edit — fill every CHANGE_ME value
nano .env.prod
```

**Generate secure JWT keys:**
```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
# Run twice — JWT_SECRET_KEY and ADMIN_JWT_SECRET_KEY must be different
```

**Secure the file:**
```bash
chmod 600 .env.prod
```

> ⚠️ Never commit `.env.prod` to git. It's already in `.gitignore`.

---

## Step 4 — Run the Deploy Script

```bash
chmod +x ~/Viswa-Sports-Turf/backend/deploy/deploy.sh
sudo bash ~/Viswa-Sports-Turf/backend/deploy/deploy.sh
```

The script will:
1. Install Docker (with Compose v2 plugin) + UFW firewall
2. Validate `.env.prod` (rejects any `CHANGE_ME` values)
3. Build all Docker images
4. Start: Postgres → Redis → Backend (with `alembic upgrade head`) → Nginx
5. Poll for health check

**Verify:**
```bash
curl http://13.60.220.125/health
# {"status":"ok","service":"Viswa Sports API",...}
```

---

## Step 5 — SSL Certificate (HTTPS)

> Do this only after pointing your domain's DNS A record → `13.60.220.125`

```bash
# Install certbot (if not already)
sudo apt-get install -y certbot

# Stop nginx temporarily (certbot needs port 80)
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file .env.prod \
    stop nginx

# Get certificate (replace YOUR_DOMAIN)
sudo certbot certonly --standalone -d YOUR_DOMAIN

# Update nginx config with your domain
sudo sed -i 's/YOUR_DOMAIN/YOUR_DOMAIN_HERE/g' \
    ~/Viswa-Sports-Turf/nginx/nginx.conf

# Restart nginx
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file .env.prod \
    up -d nginx

# Update CORS and restart backend
nano ~/Viswa-Sports-Turf/.env.prod
# CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN

docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file .env.prod \
    restart backend
```

**Auto-renew via cron:**
```bash
sudo crontab -e
# Add:
0 3 * * * certbot renew --quiet --pre-hook "docker stop viswa-sports-turf-nginx-1" --post-hook "docker start viswa-sports-turf-nginx-1"
```

---

## Upgrading (Subsequent Deploys)

```bash
cd ~/Viswa-Sports-Turf

# Pull latest code
git pull

# Rebuild backend image only
docker compose -f docker-compose.prod.yml --env-file .env.prod build backend

# Apply migrations
docker compose -f docker-compose.prod.yml --env-file .env.prod \
    run --rm backend alembic upgrade head

# Rolling restart (zero downtime for other services)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
    up -d --no-deps backend

# Verify
curl http://localhost/health
```

---

## Useful Commands

```bash
# Service status
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod ps

# Live logs (all services)
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod logs -f

# Backend logs only
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod logs -f backend

# Restart a single service
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod restart backend

# Stop everything
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod down

# Stop + remove volumes (⚠️ deletes all DB data)
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod down -v

# Connect to Postgres REPL
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod \
    exec postgres psql -U viswa_user -d viswa_sports

# Free disk space (old images)
docker image prune -f

# Check open ports
sudo ss -tlnp | grep -E '80|443'
```

---

## Backup PostgreSQL

```bash
# Dump database
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod \
    exec postgres pg_dump -U viswa_user viswa_sports > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260326.sql | docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml \
    --env-file ~/Viswa-Sports-Turf/.env.prod \
    exec -T postgres psql -U viswa_user -d viswa_sports
```

---

## Rollback

```bash
# Tag before each upgrade (add this before the build step)
docker tag viswa-sports-turf-backend:latest viswa-sports-turf-backend:previous

# Rollback
docker tag viswa-sports-turf-backend:previous viswa-sports-turf-backend:latest
docker compose -f ~/Viswa-Sports-Turf/docker-compose.prod.yml --env-file ~/Viswa-Sports-Turf/.env.prod \
    up -d --no-deps backend
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | Strong DB password (no special chars like `@`) |
| `REDIS_PASSWORD` | ✅ | Strong Redis password |
| `JWT_SECRET_KEY` | ✅ | 64+ char hex (`secrets.token_hex(64)`) |
| `ADMIN_JWT_SECRET_KEY` | ✅ | 64+ char hex, different from above |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | Admin login credentials |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | ✅ | Use `rzp_live_*` for production |
| `TWILIO_VERIFY_SERVICE_SID` | ✅ | Required when `OTP_MOCK_MODE=false` |
| `SMTP_USER` / `SMTP_PASSWORD` | ✅ | Gmail + App Password |
| `CORS_ORIGINS` | ✅ | Frontend domain(s), comma-separated |
| `WEB_CONCURRENCY` | optional | Gunicorn workers (default: 2 for t3.micro) |
