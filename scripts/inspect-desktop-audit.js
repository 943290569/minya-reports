// Read-only production inspection. Never print credentials or signed URLs.
const fs=require('node:fs'),path=require('node:path'),{execSync}=require('node:child_process');
const Database=require('better-sqlite3'),AdmZip=require('adm-zip');
(async()=>{
const apps=JSON.parse(execSync('pm2 jlist',{encoding:'utf8'}));
const app=apps.find(a=>a.name===process.env.DEPLOY_PM2_NAME)||apps.find(a=>a.name==='minya-landfill');
if(!app)throw Error('Production process not found');
const cfg={...(app.pm2_env.env||{}),...app.pm2_env};
const root=path.resolve(cfg.MINYA_DATA_DIR||app.pm2_env.pm_cwd||process.cwd());
for(const key of ['R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'])if(cfg[key])process.env[key]=cfg[key];
const db=new Database(path.join(root,'database.db'),{readonly:true});
const known=new Set(db.prepare('SELECT stored_name FROM attachments').all().map(a=>a.stored_name));
const upload=path.join(root,'uploads');
const orphans=fs.readdirSync(upload).filter(n=>fs.statSync(path.join(upload,n)).isFile()&&!known.has(n));
const backups=fs.readdirSync(path.join(root,'backups')).filter(n=>n.endsWith('.json'));
console.log('ORPHANS',JSON.stringify(orphans.map(name=>{
const matches=[];for(const b of backups){try{const data=JSON.parse(fs.readFileSync(path.join(root,'backups',b),'utf8'));for(const r of data.reports||[])for(const a of r.attachments||[])if(a.stored_name===name)matches.push({backup:b,report_date:r.report.report_date,attachment:a.original_name});}catch{}}
return {name,bytes:fs.statSync(path.join(upload,name)).size,backup_matches:matches};})));
const files=db.prepare("SELECT f.id,f.original_name,f.object_key,f.mime_type,f.size_bytes,GROUP_CONCAT(DISTINCT a.id) assets FROM cloud_files f JOIN cloud_file_links l ON l.file_id=f.id AND l.entity_type='equipment' JOIN equipment_assets a ON a.id=l.entity_id LEFT JOIN equipment_maintenance_records m ON m.source_file_id=f.id WHERE f.status='ready' AND m.id IS NULL GROUP BY f.id ORDER BY f.id").all();
console.log('CANDIDATES',JSON.stringify({total:files.length,types:files.reduce((o,f)=>{const ext=path.extname(f.original_name).toLowerCase();o[ext]=(o[ext]||0)+1;return o;},{})}));
const r2=require('../r2-storage');const reviews=[];
for(const file of files.filter(f=>/\.docx$/i.test(f.original_name))){
try{
const res=await fetch(r2.signedUrl('GET',file.object_key),{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('Download HTTP '+res.status);
const zip=new AdmZip(Buffer.from(await res.arrayBuffer()));
const xml=zip.readAsText('word/document.xml');
const text=xml.replace(/<\/w:p>/g,'\n').replace(/<\/w:tc>/g,' | ').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
reviews.push({file_id:file.id,name:file.original_name,assets:file.assets,text});
}catch(e){reviews.push({file_id:file.id,name:file.original_name,error:String(e.message).replace(/https?:\/\/\S+/g,'[url]')});}
}
const target=path.join(root,'desktop-audit-maintenance-review.json');fs.writeFileSync(target,JSON.stringify(reviews,null,2),{mode:0o600});
console.log('DOCX_REVIEW',JSON.stringify({parsed:reviews.filter(x=>x.text).length,errors:reviews.filter(x=>x.error).length}));
console.log('DOCX_REVIEW_SAVED', 'Private review checkpoint saved on server');
console.log('MAINTENANCE_RECORDS',db.prepare('SELECT COUNT(*) n FROM equipment_maintenance_records').get().n);
console.log('SOIL_MISSING',JSON.stringify(db.prepare("SELECT substr(r.report_date,1,7) month,COUNT(DISTINCT r.id) days,SUM(o.vehicle_count) trips,SUM(o.quantity) volume FROM daily_reports r JOIN operations o ON o.report_id=r.id WHERE r.report_date>='2026-04-01' AND r.report_date<='2026-05-31' AND o.operation_name LIKE '%طمم%' GROUP BY month").all()));
db.close();
})().catch(e=>{console.error(String(e.message).replace(/https?:\/\/\S+/g,'[url]'));process.exitCode=1;});
