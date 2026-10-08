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
// Aggregate the two machines into one operation per date.
const grouped = new Map();
for (const r of rows) {
  const day = grouped.get(r.date) || {date:r.date,trips:0,parts:[]};
  day.trips += r.trips;
  day.parts.push(r.equipment + "=" + r.trips);
  grouped.set(r.date,day);
}
const dataDir = process.env.MINYA_DATA_DIR ? path.resolve(process.env.MINYA_DATA_DIR) : (process.env.RAILWAY_ENVIRONMENT ? "/data" : root);
const dbPath = path.join(dataDir, "database.db");
if (!fs.existsSync(dbPath)) throw new Error("Database does not exist at " + dbPath + "; refusing to create one");
const apply = process.argv.includes("--apply-acknowledge-unverified");
const db = new Database(dbPath,{readonly:!apply,fileMustExist:true});
try {
  const getReport = db.prepare("SELECT id FROM daily_reports WHERE report_date=?");
  const findOperations = db.prepare("SELECT operation_name, quantity, notes FROM operations WHERE report_id=? AND (operation_name=? OR operation_name LIKE ?)");
  const insert = apply ? db.prepare("INSERT INTO operations (report_id,operation_name,start_time,end_time,vehicle_count,quantity,unit,notes) VALUES (?,?, '', '',0,?,'نقلة',?)") : null;
  const summary = {mode:apply?"APPLY":"DRY_RUN",source_rows:rows.length,days:grouped.size,source_trips:rows.reduce((s,r)=>s+r.trips,0),inserted_days:0,already_present:0,conflicts:[],missing_reports:[]};
  const marker="[soil-trip-import-2026-08-09:";
  const run=db.transaction(()=>{
    for(const day of grouped.values()){
      const report=getReport.get(day.date);
      if(!report){summary.missing_reports.push(day.date);continue;}
      const operationName="نقل الطمم";
      // Detect old per-machine imports as conflicts to prevent double counting.
      const matches=findOperations.all(report.id,operationName,"نقل الطمم - قلاب %");
      if(matches.length){
        if(matches.length===1 && matches[0].operation_name===operationName && Number(matches[0].quantity)===day.trips && String(matches[0].notes||"").includes(marker+day.date+":daily]")){
          summary.already_present++;
        }else{
          summary.conflicts.push(day.date);
        }
        continue;
      }
      const note=marker+day.date+":daily] "+day.parts.join("، ")+"؛ قراءات أولية بحاجة للتدقيق";
      if(apply) insert.run(report.id,operationName,day.trips,note);
      summary.inserted_days++;
    }
    if(apply && summary.conflicts.length) throw new Error("Existing transport rows conflict: "+summary.conflicts.join(", "));
  });
  run();
  console.log(JSON.stringify(summary,null,2));
  if(summary.missing_reports.length) console.log("Missing daily reports were NOT created.");
} finally {db.close();}
