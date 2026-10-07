const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');
const root=process.cwd();
const dataDir=String(process.env.MINYA_DATA_DIR||root).trim();
const dbPath=path.join(dataDir,'database.db');
const db=new Database(dbPath,{readonly:true});
const one=(sql,...args)=>db.prepare(sql).get(...args);
const all=(sql,...args)=>db.prepare(sql).all(...args);
console.log('DB_PATH',dbPath);
console.log('READY_FILES',one("select count(*) c from cloud_files where status='ready'").c);
console.log('PENDING_FILES',one("select count(*) c from cloud_files where status='pending'").c);
console.log('FOLDER_COUNT',one("select count(*) c from cloud_folders").c);
console.log('LINK_COUNT',one("select count(*) c from cloud_file_links").c);
const rootRow=one("select id,name from cloud_folders where parent_id is null and name='الصيانة'");
console.log('MAINT_ROOT',JSON.stringify(rootRow||null));
if(rootRow){
  const children=all("select id,name,parent_id from cloud_folders where parent_id=? order by name",rootRow.id);
  console.log('CHILDREN',JSON.stringify(children));
  const machine=one("select id,name from cloud_folders where parent_id=? and lower(name)=lower('all machins and cars')",rootRow.id);
  console.log('MACHINE_ROOT',JSON.stringify(machine||null));
  if(machine){
    const assets=all("select id,name from cloud_folders where parent_id=? order by name",machine.id);
    console.log('ASSET_COUNT',assets.length);
    const childStmt=db.prepare("select id from cloud_folders where parent_id=?");
    const fileCountStmt=db.prepare("select count(*) c from cloud_files where status='ready' and folder_id=?");
    for(const asset of assets){
      const seen=new Set(),q=[asset.id];let count=0;
      while(q.length){
        const id=Number(q.shift());
        if(seen.has(id)) continue;
        seen.add(id);
        count+=fileCountStmt.get(id).c;
        for(const ch of childStmt.all(id)) q.push(ch.id);
      }
      console.log('ASSET',asset.id,JSON.stringify(asset.name),'FILES',count,'FOLDERS',seen.size);
    }
  }
}
console.log('TOP_FILE_FOLDERS');
for(const r of all("select coalesce(folder_id,-1) folder_id,count(*) c from cloud_files where status='ready' group by folder_id order by c desc limit 40")){
  const folder=r.folder_id===-1?null:one("select name,parent_id from cloud_folders where id=?",r.folder_id);
  console.log('FOLDER_FILES',r.folder_id,r.c,JSON.stringify(folder||null));
}
console.log('SAMPLES');
for(const r of all("select id,folder_id,original_name,status from cloud_files order by id desc limit 20")) console.log(JSON.stringify(r));
db.close();