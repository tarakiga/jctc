# JCTC Deployment Runbook — Phase 2C

This runbook describes how to deploy, verify, and rollback the JCTC backend using the provided production stack.

## Prerequisites

- Host: Linux server with Docker and Docker Compose installed
- Network access for `api.jctc.gov.ng` (Traefik/SSL), Grafana, Prometheus
- Environment variables configured (via `.env.production` or host-level):
  - `DB_PASSWORD` — PostgreSQL password
  - `SECRET_KEY` — Application secret key
  - `REDIS_PASSWORD` — Redis password
  - `ACME_EMAIL` — Email for Traefik Let’s Encrypt
  - `GRAFANA_USER`, `GRAFANA_PASSWORD` — Grafana admin credentials
  - Optional: `ALLOWED_ORIGINS`, other app configs

## Stack Overview

Defined in `docker-compose.prod.yml`:

- `app` — FastAPI app with Traefik TLS routing
- `db` — PostgreSQL 15 (health checks enabled)
- `redis` — Redis 7 with AOF and auth
- `nginx` — Reverse proxy and static handling
- `traefik` — Routing, TLS, and dashboard
- `prometheus`, `grafana` — Metrics and dashboards
- `backup` — On-demand backup job (used by scheduled task)

## Deployment Steps

1. Clone repository on the target server
   - `git clone https://github.com/tarakiga/jctc.git && cd jctc`

2. Configure environment
   - Create/verify `.env.production` and host secrets
   - Ensure DNS for `api.jctc.gov.ng` points to this server

3. Run deployment script
   - `./scripts/deploy.sh`
   - Script performs: image pulls/builds, migrations, health checks, monitoring setup, log rotation, systemd service, backups

4. Verify services
   - App: `curl -f https://api.jctc.gov.ng/health`
   - Traefik: `http://localhost:8080` (dashboard)
   - Grafana: `http://localhost:3000` (use `GRAFANA_USER` / `GRAFANA_PASSWORD`)
   - Prometheus: `http://localhost:9090`

5. Backups
   - Nightly job configured at `02:00 UTC`:
     - `(crontab -l) → docker-compose -f docker-compose.prod.yml run --rm backup`
   - Verify backups in `postgres_backups` volume; archives pruned after 30 days

## Rollback

- The deploy script includes a `rollback` function
- If deployment fails:
  1. Review logs: `docker-compose -f docker-compose.prod.yml logs --tail=200`
  2. Invoke rollback: `./scripts/deploy.sh rollback`
  3. Verify services return to previous working state

## Troubleshooting

- Database connection errors:
  - Confirm `DB_PASSWORD` and `POSTGRES_USER` match
  - Check `db` health: `docker exec jctc_db pg_isready -U jctc_user -d jctc_db`

- TLS / certificates:
  - Ensure `ACME_EMAIL` set and ports `80/443` open
  - Verify Traefik logs for certificate issuance

- App failing health check:
  - Check app logs: `docker logs jctc_app --tail=200`
  - Confirm env vars: `SECRET_KEY`, `ALLOWED_ORIGINS`

## Post-Deployment Checks

- API endpoints reachable and documented at `/docs`
- Authentication works across 7 roles
- Evidence upload and chain-of-custody flows function end-to-end
- Compliance and audit endpoints return expected data
- Monitoring dashboards show healthy metrics and low error rates