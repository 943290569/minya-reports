'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert'),{spawnSync}=require('child_process'),Database=require('better-sqlite3');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'minya-soil-cover-'));
const db=new Database(path.join(dir,'database.db'));
db.exec(`CREATE TABLE daily_reports(id INTEGER PRIMARY KEY,report_date TEXT UNIQUE,total_waste_tons REAL,total_trucks INTEGER);CREATE TABLE operations(id INTEGER PRIMARY KEY,report_id INTEGER,operation_name TEXT,start_time TEXT,end_time TEXT,vehicle_count REAL,quantity REAL,unit TEXT,notes TEXT);`);
const days=new Map();for(const line of fs.readFileSync(path.join(root,'data/pending-review/soil-trips-2026-08-09.csv'),'utf8').trim().split(/\r?\n/).slice(1)){const [date,,trips]=line.split(',');days.set(date,(days.get(date)||0)+Number(trips));}
const addReport=db.prepare('INSERT INTO daily_reports(report_date,total_waste_tons,total_trucks) VALUES(?,100,10)'),addOp=db.prepare("INSERT INTO operations(report_id,operation_name,start_time,end_time,vehicle_count,quantity,unit,notes) VALUES(?,?,'04:00','19:00',?,?,?,?)");
for(const [date,trips] of days){const id=addReport.run(date).lastInsertRowid;addOp.run(id,'مواد التغطية (طمم)',0,0,'كوب','سابق');addOp.run(id,'نقل الطمم',0,trips,'نقلة','[soil-trip-import-2026-08-09:'+date+':daily]');addOp.run(id,'مكب نفايات المنيا',10,100,'طن','نفايات');}
const unrelated=db.prepare("SELECT * FROM operations WHERE operation_name='مكب نفايات المنيا'").all(),reports=db.prepare('SELECT * FROM daily_reports').all();
function run(apply){const p=spawnSync(process.execPath,[path.join(root,'scripts/import-soil-trips-2026.js'),...(apply?['--apply-acknowledge-unverified']:[])],{env:{...process.env,MINYA_DATA_DIR:dir},encoding:'utf8'});if(p.status!==0)throw Error(p.stderr);return JSON.parse(p.stdout);}
try{
let out=run(false);assert.equal(out.inserted_days,50);assert.equal(out.source_trips,959);assert.equal(out.source_volume,14385);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM operations WHERE operation_name='نقل الطمم'").get().n,50);
out=run(true);assert.equal(out.inserted_days,50);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM operations WHERE operation_name='نقل الطمم'").get().n,0);
for(const [date,trips] of days){const r=db.prepare("SELECT o.* FROM operations o JOIN daily_reports r ON r.id=o.report_id WHERE r.report_date=? AND o.operation_name='مواد التغطية (طمم)'").get(date);assert.equal(r.vehicle_count,trips);assert.equal(r.quantity,trips*15);assert.equal(r.unit,'كوب');assert.equal(r.start_time,'04:00');assert(r.notes.includes('سابق'));}
assert.deepEqual(db.prepare('SELECT * FROM daily_reports').all(),reports);assert.deepEqual(db.prepare("SELECT * FROM operations WHERE operation_name='مكب نفايات المنيا'").all(),unrelated);out=run(true);assert.equal(out.inserted_days,0);assert.equal(out.already_present,50);
db.prepare("UPDATE operations SET quantity=999 WHERE operation_name='مواد التغطية (طمم)' AND report_id=1").run();const before=db.prepare('SELECT * FROM operations').all();assert.throws(()=>run(true),/conflict/);assert.deepEqual(db.prepare('SELECT * FROM operations').all(),before);
console.log('PASS: 50 days, 959 trips, 14385 cubic metres; canonical row consolidation; idempotency; conflict rollback; unchanged waste and report data.');
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
