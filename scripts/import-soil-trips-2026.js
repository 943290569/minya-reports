#!/usr/bin/env node
"use strict";
/*
 * Import soil hauling trip counts into existing daily report operation rows.
 * Default: dry run. Writes require --apply-acknowledge-unverified.
 * Example (on the production VM, after backup):
 *   MINYA_DATA_DIR=/path/to/data node scripts/import-soil-trips-2026.js --apply-acknowledge-unverified
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");
const csvFile = path.join(root, "data/pending-review/soil-trips-2026-08-09.csv");
const lines = fs.readFileSync(csvFile, "utf8").trim().split(/\r?\n/);
const expected = "date,equipment_no,trips,verification_status,source_photo";
if (lines.shift() !== expected) throw new Error("Unexpected CSV columns");
const rows = lines.map((line, i) => {
  const fields = line.split(",");
  if (fields.length !== 5) throw new Error("Bad row " + (i + 2));
  const [date,equipment,tripsText,status,photo] = fields;
  const trips = Number(tripsText);
  if (!/^2026-(08|09)-\d{2}$/.test(date) || !["1851","2245"].includes(equipment) || !Number.isSafeInteger(trips) || trips < 0 || status !== "needs_original_review") throw new Error("Invalid source row " + (i + 2));
  if (new Date(date + "T00:00:00Z").toISOString().slice(0,10) !== date) throw new Error("Invalid date");
  return {date,equipment,trips,photo};
});
const keys = new Set();
for (const r of rows) {
  const key = r.date + "|" + r.equipment;
  if (keys.has(key)) throw new Error("Duplicate source key: " + key);
  keys.add(key);
}
const dataDir = process.env.MINYA_DATA_DIR ? path.resolve(process.env.MINYA_DATA_DIR) : (process.env.RAILWAY_ENVIRONMENT ? "/data" : root);
const dbPath = path.join(dataDir, "database.db");
if (!fs.existsSync(dbPath)) throw new Error("Database does not exist at " + dbPath + "; refusing to create one");
const db = new Database(dbPath, { readonly: !process.argv.includes("--apply-acknowledge-unverified"), fileMustExist:true });
try {
  const apply = process.argv.includes("--apply-acknowledge-unverified");
  const selectReport = db.prepare("SELECT id, report_date FROM daily_reports WHERE report_date=?");
  const existing = db.prepare("SELECT id, operation_name, quantity, notes FROM operations WHERE report_id=? AND operation_name=?");
  const insert = apply ? db.prepare("INSERT INTO operations (report_id,operation_name,start_time,end_time,vehicle_count,quantity,unit,notes) VALUES (?,?, '', '',0,?,'نقلة',?)") : null;
  const summary = {mode:apply?"APPLY":"DRY_RUN",source_rows:rows.length,source_trips:rows.reduce((s,r)=>s+r.trips,0),inserted:0,already_present:0,conflicts:[],missing_reports:[]};
  const run = db.transaction(() => {
    for (const r of rows) {
      const daily = selectReport.get(r.date);
      if (!daily) { summary.missing_reports.push(r.date + " / " + r.equipment); continue; }
      const label = "نقل الطمم - قلاب " + r.equipment;
      const note = "[soil-trip-import-2026-08-09:" + r.date + ":" + r.equipment + "] مصدر: " + r.photo + "؛ قراءة أولية بحاجة للتدقيق";
      const matches = existing.all(daily.id, label);
      if (matches.length) {
        if (matches.length === 1 && Number(matches[0].quantity) === r.trips && String(matches[0].notes||"").includes("[soil-trip-import-2026-08-09:")) summary.already_present++;
        else summary.conflicts.push(r.date + " / " + r.equipment);
        continue;
      }
      if (apply) insert.run(daily.id, label, r.trips, note);
      summary.inserted++;
    }
    if (apply && summary.conflicts.length) throw new Error("Conflict detected; transaction rolled back: " + summary.conflicts.join(", "));
  });
  run();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.missing_reports.length) console.log("Missing daily reports were NOT created. Create them normally and rerun this idempotent importer.");
} finally { db.close(); }
