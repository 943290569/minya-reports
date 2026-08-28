# Minya Landfill System V3.2 Stable

Operational and management reporting system for Al-Minya Landfill.

## Version

Current stable version: **3.2.0**

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
- User roles: viewer, editor and admin.
- Admin user management, sessions, audit log and security controls.
- Full JSON backups including attachment content.
- Automatic backup throttling to avoid redundant rapid backup files.
- Backup validation and safe restore with pre/post restore backups.
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

The automated smoke test runs the server with an isolated temporary data directory and verifies roles, report workflow, attachments, maintenance, backups, restore, sessions, audit and integrity checks without touching production data.

## Project structure

- `server.js` — Express server, API routes, authentication and SQLite initialization.
- `public/index.html` — main multipage application shell.
- `public/app.js` — application loader.
- `public/js/` — application modules.
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
