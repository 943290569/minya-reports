const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.db");
const backupDir = path.join(process.env.HOME, "minya-db-backups");

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `database-${stamp}.db`);

const db = new Database(dbPath);

db.backup(backupPath)
  .then(() => {
    db.close();

    const files = fs.readdirSync(backupDir)
      .filter(name => /^database-.*\.db$/.test(name))
      .map(name => ({
        name,
        time: fs.statSync(path.join(backupDir, name)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    for (const file of files.slice(14)) {
      fs.unlinkSync(path.join(backupDir, file.name));
    }

    console.log("Backup OK:", backupPath);
  })
  .catch(error => {
    console.error("Backup FAILED:", error);
    try { db.close(); } catch {}
    process.exit(1);
  });
