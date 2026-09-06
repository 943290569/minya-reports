# Minya Landfill System V3.5 Stable

Operational and management reporting system for Al-Minya Landfill.

## Version

Current stable version: **3.5.0**

## Main features

- Daily operational reports with archive, edit, attachments and official printing.
- Monthly and annual summaries and printing.
- Paginated archive with database-backed quick search.
- Optimized monthly loading for the selected month and comparison month only.
- Optimized annual loading for the selected year only.
- Equipment and maintenance tracking.
- Weekly and managerial reports.
- Advanced report search and CSV export.
- Report workflow: draft → pending review → approved.
- Returned-report workflow with saved return reason, return date and assigned editor.
- Admin review dashboard with pending, overdue, returned and approved-today indicators.
- Daily operational KPI dashboard with waste, trucks, diesel and equipment status.
- Today-versus-yesterday operational comparison.
- Admin system-health dashboard with SQLite integrity, backup age, storage usage and attachment-problem indicators.
- Manual SMS and WhatsApp message preparation for users and review actions.
- User roles: viewer, editor and admin.
- Admin user management, sessions, audit log and security controls.
- Google Drive / Excel source import with canonical V33 Pivot normalization and cache-safe reader versions.
- Full JSON backups including attachment content.
- Automatic backup throttling to avoid redundant rapid backup files.
- Backup validation and safe restore with pre/post restore backups.
- Failed-restore cleanup for attachment files created before a rolled-back database transaction.
- SQLite integrity, storage, missing attachment and orphan-file diagnostics.
- Security response headers and secure session-cookie support in production.

## Run

Requires Node.js 22 or newer.

```bash
npm install
npm start
```

Open `http://localhost:5001`.

## Test

```bash
npm test
```

The automated tests build and validate the frontend, scan JavaScript syntax, run UI regression checks, run V3.4 compatibility checks, run V3.5 system-health regression checks, run an isolated server smoke test, and launch the same production runtime path used by Railway to verify the package version and SQLite integrity without touching production data.

## Project structure

- `server.js` — Express server, API routes, authentication and SQLite initialization.
- `scripts/start-server.js` — production runtime launcher that synchronizes package version, workflow compatibility fields, backup limits and restore safety patches.
- `public/index.html` — main multipage application shell.
- `public/app.js` — application loader and frontend asset version.
- `public/js/` — application modules.
- `public/drive-import.html` — administrator Drive / Excel import page.
- `public/system.html` — system management and diagnostics.
- `public/assets/header.png` — official print header.
- `public/assets/footer.png` — official print footer.
- `scripts/` — JavaScript validation and smoke tests.

## Database and storage

Runtime data is not stored in this repository. The system uses `MINYA_DATA_DIR` when provided; on Railway it uses persistent storage under `/data`. SQLite database files, uploads and backups are excluded from Git.

## Core API areas

- Authentication and users
- Daily reports and workflow
- Attachments
- Equipment and maintenance
- Reviews
- Search and exports
- Backups and restore
- Security sessions and audit logs
- Storage and integrity diagnostics
