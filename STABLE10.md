# Stable 10 — 2026-09-08

Stable reference for the Minya Landfill reporting system after the September 2026 hardening pass.

Protected baseline includes:
- PM2 production port 6000 via `scripts/start-server.js`.
- Jerusalem timezone for current-day/month dashboard logic.
- Stable home dashboard ordering with reduced DOM churn.
- Escaped equipment text on the Today dashboard.
- Web Push runtime integration.
- Drive/Excel import consistency guard before save.
- Post-import verification after save.
- Full backup before replacing existing imported reports.
- Backup validation smoke coverage including restored attachments.
- Stable 10 regression checks included in `npm test`.

Deployment gate:

```bash
npm test
```

Only restart production after all tests pass.
