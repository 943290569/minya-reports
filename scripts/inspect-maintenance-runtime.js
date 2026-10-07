const {execSync}=require('child_process');
const path=require('path');
const Database=require('better-sqlite3');
const rows=JSON.parse(execSync('pm2 jlist',{encoding:'utf8'}));
const app=rows.find(r=>String(r.name||r.pm2_env?.name||'').includes('minya'))||rows[0];
const env={...(app?.pm2_env?.env||{}),...(app?.pm2_env||{})};
const dataDir=String(env.MINYA_DATA_DIR||process.cwd());
const dbPath=path.join(dataDir,'database.db');
const db=new Database(dbPath,{readonly:true});
const one=(sql,...a)=>db.prepare(sql).get(...a);
const all=(sql,...a)=>db.prepare(sql).all(...a);
const has=t=>one("SELECT name FROM sqlite_master WHERE type='table' AND name=?",t);
console.log('DB',dbPath);
for(const t of ['equipment_assets','maintenance_logs','equipment_maintenance_records','cloud_files','cloud_file_links']){
  if(!has(t)){console.log(t,'MISSING');continue;}
  console.log(t,'COUNT',one('SELECT COUNT(*) c FROM '+t).c);
  console.log(t,'COLS',db.pragma('table_info('+t+')').map(x=>x.name).join(','));
}
if(has('maintenance_logs')){
  console.log('MAINT_SAMPLE',JSON.stringify(all('SELECT * FROM maintenance_logs ORDER BY id DESC LIMIT 5')));
}
if(has('equipment_assets')){
  console.log('ASSET_SAMPLE',JSON.stringify(all('SELECT id,name,current_meter FROM equipment_assets ORDER BY id LIMIT 10')));
}
if(has('equipment_maintenance_records')){
  console.log('FIN_YEARS',JSON.stringify(all("SELECT substr(service_date,1,4) year,COUNT(*) c FROM equipment_maintenance_records GROUP BY substr(service_date,1,4) ORDER BY year DESC")));
  console.log('FIN_SAMPLE',JSON.stringify(all('SELECT id,asset_id,service_date,description,other_cost,legacy_source,legacy_id FROM equipment_maintenance_records ORDER BY id DESC LIMIT 10')));
}
db.close();