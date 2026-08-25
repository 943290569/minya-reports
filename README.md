# Minya Landfill System V2

Daily and monthly reporting system for Minya Landfill.

## Run

Requires Node.js 22 or newer.

```bash
npm install
npm start
```

Open `http://localhost:5001`.

## Project structure

- `server.js` Express server, API routes, and SQLite initialization.
- `public/index.html` main interface.
- `public/app.js` JavaScript loader.
- `public/js/` application modules.
- `public/assets/header.png` print header.
- `public/assets/footer.png` print footer.

## Database

`database.db` is intentionally not stored in this public repository. On startup, `server.js` creates the SQLite database and required tables when the database file is missing.

## API

- `GET /api/health`
- `GET /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports`
- `PUT /api/reports/:id`
- `DELETE /api/reports/:id`

`node_modules` and runtime database files are excluded by `.gitignore`.
