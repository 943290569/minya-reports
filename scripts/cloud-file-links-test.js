const assert = require('node:assert/strict');
const fs = require('node:fs');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch { DatabaseSync = require('better-sqlite3'); }
const express = require('express');
const install = require('../cloud-file-links');

async function main() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE cloud_files(id INTEGER PRIMARY KEY,original_name TEXT,mime_type TEXT,size_bytes INTEGER,status TEXT,created_at TEXT); CREATE TABLE feature_permissions(user_id INTEGER,feature TEXT,can_view INTEGER,can_edit INTEGER);');
  const fixtures = [
    ['report','server.js','daily_reports',{report_date:'2026-10-03',report_no:'MINYA-2026-10-03'}],
    ['equipment','equipment-management.js','equipment_assets',{name:'Bomag'}],
    ['driver','driver-licenses.js','driver_licenses',{name_ar:'سائق اختبار'}],
    ['vehicle','driver-licenses.js','movement_vehicles',{plate_number:'TEST-1',vehicle_type:'سيارة'}],
    ['maintenance','server.js','maintenance_logs',{log_date:'2026-10-03',equipment_name:'Bomag',description:'اختبار'}],
    ['work_order','equipment-management.js','equipment_work_orders',{asset_id:1,order_number:'TEST-WO',reported_date:'2026-10-03',description:'اختبار'}],
    ['incident','maintenance-incidents.js','incident_logs',{asset_name:'Bomag',incident_date:'2026-10-03',description:'اختبار'}],
    ['task','operations-management.js','operation_tasks',{title:'مهمة اختبار'}],
    ['contract','operations-management.js','contractor_contracts',{contractor_name:'اختبار',contract_title:'عقد اختبار'}],
    ['cell','operations-management.js','landfill_cells',{cell_name:'خلية اختبار'}],
    ['diesel','external-diesel.js','external_diesel_entries',{entry_date:'2026-10-03',source_name:'اختبار',driver_name:'اختبار',vehicle_number:'TEST',quantity_liters:1}]
  ];
  for (const [,file,table,values] of fixtures) {
    const source=fs.readFileSync(file,'utf8');
    const match=source.match(new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\s*\\([\\s\\S]*?\\);'));
    assert.ok(match,table+' schema found');
    db.exec(match[0]);
    const keys=Object.keys(values);
    db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(values));
  }
  db.exec("INSERT INTO cloud_files VALUES(1,'test.pdf','application/pdf',20,'ready',CURRENT_TIMESTAMP),(2,'pending.pdf','application/pdf',20,'pending',CURRENT_TIMESTAMP);");
  const app=express();app.use(express.json());
  const auth=(req,res,next)=>{const role=req.headers['x-test-role'];if(!role)return res.status(401).json({ok:false});req.user={id:1,role};next();};
  const roles=(...allowed)=>(req,res,next)=>auth(req,res,()=>allowed.includes(req.user.role)?next():res.status(403).json({ok:false}));
  const events=[];
  install(app,{db,requireAuth:auth,requireRole:roles,audit:(...args)=>events.push(args)});
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(path,{role='admin',method='GET',body}={}){
    const r=await fetch(base+path,{method,headers:{'x-test-role':role,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    return {status:r.status,...await r.json()};
  }
  try {
    assert.equal((await call('/api/cloud-files/link-types')).types.length,11);
    for(const [type] of fixtures){
      assert.equal((await call('/api/cloud-files/link-targets?type='+type)).targets[0].id,1);
      assert.equal((await call('/api/cloud-files/1/links',{method:'POST',body:{entity_type:type,entity_id:1}})).status,200);
      assert.equal((await call('/api/cloud-files/linked?type='+type+'&id=1')).files[0].id,1);
    }
    assert.equal(events.length,11);
    await call('/api/cloud-files/1/links',{method:'POST',body:{entity_type:'report',entity_id:1}});
    assert.equal(events.length,11,'duplicate links do not duplicate audit or relation');
    assert.equal((await call('/api/cloud-files/1/links',{role:'viewer',method:'POST',body:{entity_type:'report',entity_id:1}})).status,403);
    assert.equal((await call('/api/cloud-files/1/links',{method:'POST',body:{entity_type:'report',entity_id:999}})).status,404);
    assert.equal((await call('/api/cloud-files/2/links',{method:'POST',body:{entity_type:'report',entity_id:1}})).status,404);
    assert.equal((await call('/api/cloud-files/1/links',{method:'POST',body:{entity_type:'report',entity_id:'1 OR 1=1'}})).status,400);
    assert.equal((await call('/api/cloud-files/link-targets?type=sqlite_master')).status,400);
    assert.equal((await call('/api/cloud-files/link-targets?type=report&q=%27%20OR%201%3D1--')).targets.length,0);
    db.exec("INSERT INTO feature_permissions VALUES(1,'tasks',0,0);");
    assert.equal((await call('/api/cloud-files/linked?type=task&id=1',{role:'editor'})).status,403);
    assert.equal((await call('/api/cloud-files/1/links',{role:'editor'})).links.some(x=>x.entity_type==='task'),false);
    db.exec("UPDATE feature_permissions SET can_view=1,can_edit=0;");
    assert.equal((await call('/api/cloud-files/1/links/task/1',{role:'editor',method:'DELETE'})).status,403);
    assert.equal((await call('/api/cloud-files/1/links/report/1',{method:'DELETE'})).status,200);
    assert.equal((await call('/api/cloud-files/linked?type=report&id=1')).files.length,0);
    assert.ok(db.prepare('SELECT id FROM cloud_files WHERE id=1').get(),'unlink preserves file');
    db.exec('DELETE FROM operation_tasks WHERE id=1;');
    assert.equal((await call('/api/cloud-files/1/links')).links.some(x=>x.entity_type==='task'),false,'deleted records hidden');
    db.exec('DELETE FROM cloud_files WHERE id=1;');
    assert.equal(db.prepare('SELECT count(*) n FROM cloud_file_links').get().n,0,'file deletion cleans associations');
    console.log('Cloud file linking tests passed: 11 sections, search, duplicates, permissions, validation, unlink and cascade.');
  } finally {server.close();db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
