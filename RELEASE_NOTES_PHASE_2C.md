# JCTC Management System — Phase 2C Release Notes

Date: November 9, 2025

## Summary

Phase 2C finalizes backend testing, production deployment readiness, and documentation updates. CI artifacts are added, nightly test coverage is scheduled, and a deployment runbook is provided.

## Highlights

- Backend CI workflow runs on push/PR with coverage reporting
- Nightly scheduled backend tests (02:00 UTC) with coverage artifact
- Deployment runbook documents production rollout and rollback steps
- README updated to reflect Phase 2C completion and link artifacts

## Components Impacted

- CI/CD: `.github/workflows/backend-ci.yml`, `.github/workflows/nightly-backend.yml`
- Docs: `backend/tests/phase2c.md`, `docs/deployment-runbook-phase-2c.md`, `README.md`
- Deployment: `docker-compose.prod.yml`, `scripts/deploy.sh` referenced in runbook

## Upgrade Notes

- No database schema changes introduced in Phase 2C
- Ensure required environment variables are set for production (`DB_PASSWORD`, `SECRET_KEY`, `REDIS_PASSWORD`, `ACME_EMAIL`, `GRAFANA_USER`, `GRAFANA_PASSWORD`)
- Confirm TLS certificates or Let’s Encrypt via Traefik are configured

## Verification

- Run backend tests locally: `cd backend && pytest`
- Validate production stack: `docker-compose -f docker-compose.prod.yml up -d`
- Check API health: `GET /health` and open `https://api.jctc.gov.ng`
- Confirm nightly backup job exists (via `crontab -l`) and runs the `backup` profile

## Known Considerations

- `handoff.md` is intentionally excluded from version control; refer to `backend/handoff_old.md` and `docs/` for system documentation.

## Acknowledgements

This phase consolidates stability and operational readiness for the platform. Thank you to all contributors.