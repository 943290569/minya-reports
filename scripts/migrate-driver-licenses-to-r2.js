const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');
const {configured,putObject}=require('../r2-storage');

function loadPm2Environment(){
  if(configured())return;
  const dumpPath=path.join(process.env.HOME||'', '.pm2', 'dump.pm2');
  if(!fs.existsSync(dumpPath))return;
  const apps=JSON.parse(fs.readFileSync(dumpPath,'utf8'));
  const app=apps.find(item=>item.name==='minya-landfill');
  if(!app)return;
  for(const key of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET','MINYA_DATA_DIR']){
    if(!process.env[key]&&app[key])process.env[key]=String(app[key]);
  }
}

async function main(){
  loadPm2Environment();
  if(!configured())throw new Error('متغيرات R2 غير مكتملة');
  const root=path.resolve(__dirname,'..');
  const dataDir=process.env.MINYA_DATA_DIR?path.resolve(process.env.MINYA_DATA_DIR):root;
  const db=new Database(path.join(dataDir,'database.db'));
  const backupsDir=path.join(dataDir,'backups');
  fs.mkdirSync(backupsDir,{recursive:true});
  const backupPath=path.join(backupsDir,`pre-driver-r2-${new Date().toISOString().replace(/[:.]/g,'-')}.db`);
  await db.backup(backupPath);
  console.log(`BACKUP: ${backupPath}`);
  const dir=path.join(dataDir,'uploads','driver-licenses');
  const cols=new Set(db.pragma('table_info(driver_licenses)').map(x=>x.name));
  if(!cols.has('image_storage'))db.exec(`ALTER TABLE driver_licenses ADD COLUMN image_storage TEXT DEFAULT 'local'`);
  if(!cols.has('image_object_key'))db.exec(`ALTER TABLE driver_licenses ADD COLUMN image_object_key TEXT DEFAULT ''`);
  const rows=db.prepare(`SELECT id,name_ar,image_name,image_mime FROM driver_licenses WHERE trim(COALESCE(image_name,''))<>'' AND trim(COALESCE(image_object_key,''))='' ORDER BY id`).all();
  let migrated=0,skipped=0;
  for(const row of rows){
    const local=path.join(dir,path.basename(row.image_name));
    if(!fs.existsSync(local)){console.log(`SKIP missing: ${row.name_ar}`);skipped++;continue;}
    const objectKey=`driver-licenses/${path.basename(row.image_name)}`;
    await putObject(objectKey,fs.readFileSync(local),row.image_mime||'application/octet-stream');
    db.prepare(`UPDATE driver_licenses SET image_storage='r2',image_object_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(objectKey,row.id);
    migrated++;
    console.log(`OK ${migrated}/${rows.length}: ${row.name_ar}`);
  }
  db.close();
  console.log(JSON.stringify({ok:true,total:rows.length,migrated,skipped,local_backup:dir}));
}
main().catch(error=>{console.error(error.message);process.exit(1);});
