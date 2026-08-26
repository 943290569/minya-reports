from pathlib import Path
p=Path('server.js')
s=p.read_text()
anchor='app.get("/api/audit", requireRole("admin"), (req,res)=>{ const limit=Math.min(Number(req.query.limit||200),1000); res.json({ok:true,logs:db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`).all(limit)}); });'
insert='''app.get("/api/audit", requireRole("admin"), (req,res)=>{ const limit=Math.min(Number(req.query.limit||200),1000); res.json({ok:true,logs:db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`).all(limit)}); });

function directorySize(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).reduce((sum, name) => {
    try { const st=fs.statSync(path.join(dir,name)); return sum + (st.isFile()?st.size:0); } catch { return sum; }
  }, 0);
}
function listBackupFiles() {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir).filter(name=>name.endsWith(".json")).map(name=>{
    const st=fs.statSync(path.join(backupsDir,name));
    return {name,size_bytes:st.size,created_at:st.mtime.toISOString()};
  }).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}
app.get("/api/system/storage", requireRole("admin"), (req,res)=>{
  const database_bytes=fs.existsSync(dbPath)?fs.statSync(dbPath).size:0;
  const uploads_bytes=directorySize(uploadsDir);
  const backups_bytes=directorySize(backupsDir);
  const total_bytes=database_bytes+uploads_bytes+backups_bytes;
  const reference_limit_bytes=512*1024*1024;
  const usage_percent=(total_bytes/reference_limit_bytes)*100;
  const level=usage_percent>=85?"danger":usage_percent>=70?"warning":"ok";
  res.json({ok:true,database_bytes,uploads_bytes,backups_bytes,total_bytes,reference_limit_bytes,usage_percent,level,attachments_count:db.prepare(`SELECT COUNT(*) AS c FROM attachments`).get().c,backups_count:listBackupFiles().length});
});
app.get("/api/backups", requireRole("admin"), (req,res)=>res.json({ok:true,backups:listBackupFiles().slice(0,20)}));
app.get("/api/backups/:name/download", requireRole("admin"), (req,res)=>{
  const name=path.basename(String(req.params.name||""));
  if(!/^minya-.*\\.json$/.test(name)) return res.status(400).json({ok:false,message:"اسم النسخة غير صالح"});
  const file=path.join(backupsDir,name);
  if(!fs.existsSync(file)) return res.status(404).json({ok:false,message:"النسخة غير موجودة"});
  audit(req.user,"DOWNLOAD_SAVED_BACKUP","system","backup",name);
  res.download(file,name);
});'''
assert anchor in s, 'audit anchor not found'
s=s.replace(anchor,insert,1)
p.write_text(s)
