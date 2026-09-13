const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');
const {configured,signedUrl}=require('../r2-storage');

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
  const db=new Database(path.join(dataDir,'database.db'),{readonly:true});
  const dir=path.join(dataDir,'uploads','driver-licenses');
  const rows=db.prepare(`SELECT id,name_ar,image_name,image_object_key FROM driver_licenses WHERE image_storage='r2' AND trim(COALESCE(image_name,''))<>'' AND trim(COALESCE(image_object_key,''))<>'' ORDER BY id`).all();
  let deleted=0,missing=0,unverified=0;
  for(const row of rows){
    const local=path.join(dir,path.basename(row.image_name));
    if(!fs.existsSync(local)){missing++;continue;}
    const response=await fetch(signedUrl('HEAD',row.image_object_key,300),{method:'HEAD'});
    if(!response.ok){console.log(`KEEP unverified: ${row.name_ar} R2=${response.status}`);unverified++;continue;}
    fs.unlinkSync(local);
    deleted++;
    console.log(`DELETE ${deleted}/${rows.length}: ${row.name_ar}`);
  }
  db.close();
  console.log(JSON.stringify({ok:unverified===0,total:rows.length,deleted,already_missing:missing,unverified,local_directory:dir}));
  if(unverified)process.exitCode=2;
}
main().catch(error=>{console.error(error.message);process.exit(1);});
