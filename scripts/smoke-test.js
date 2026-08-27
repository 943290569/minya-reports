const { spawn } = require('child_process');
const port=5099, base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),RAILWAY_ENVIRONMENT:''},stdio:['ignore','pipe','pipe']});
let output=''; child.stdout.on('data',d=>output+=d); child.stderr.on('data',d=>output+=d);
function assert(c,m){if(!c)throw new Error(m)}
async function waitServer(){for(let i=0;i<40;i++){try{const r=await fetch(`${base}/api/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,150))}throw new Error('Server did not start')}
async function json(url,opts={}){const r=await fetch(base+url,opts);let data={};try{data=await r.json()}catch{}return{r,data}}
function auth(cookie,method='GET',body){const h={cookie};if(body!==undefined)h['content-type']='application/json';return{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}}
async function login(username,password){const x=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});assert(x.r.status===200,`login failed ${username}`);return(x.r.headers.get('set-cookie')||'').split(';')[0]}
(async()=>{try{
 await waitServer();
 let x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',display_name:'Smoke Admin',password:'SmokePass123'})});assert(x.r.status===200,'setup failed');
 const admin=await login('smokeadmin','SmokePass123');
 const report={report_date:'2099-02-01',weather:'صحو',temperature:21,start_time:'04:00',end_time:'19:00',total_trucks:12,total_waste_tons:150,total_diesel:55,notes:'backup smoke',crews:[{crew_name:'فريق التشغيل',crew_count:3}],operations:[{operation_name:'دمك',quantity:150,unit:'طن'}],stations:[],equipment:[{equipment_name:'Bomag',operating_status:'يعمل',working_hours:6,diesel_liters:55}]};
 x=await json('/api/reports',auth(admin,'POST',report));assert(x.r.status===200,'create report failed');const id=x.data.report.id;
 const payload=Buffer.from('attachment survives backup').toString('base64');
 x=await json(`/api/reports/${id}/attachments`,auth(admin,'POST',{name:'evidence.txt',mime_type:'text/plain',data_base64:payload}));assert(x.r.status===200,'attachment add failed');
 x=await json(`/api/reports/${id}/submit`,auth(admin,'POST',{}));assert(x.r.status===200,'submit failed');
 x=await json(`/api/reports/${id}/approve`,auth(admin,'POST',{}));assert(x.r.status===200,'approve failed');
 const approvedAt=x.data.approved_at;
 const backupRes=await fetch(base+'/api/backup/download',{headers:{cookie:admin}});assert(backupRes.status===200,'backup download failed');const backup=await backupRes.json();
 assert(Array.isArray(backup.reports)&&backup.reports.length===1,'backup report count wrong');
 const backed=backup.reports[0];assert(backed.report.workflow_status==='approved','backup lost workflow status');assert(backed.attachments.length===1&&backed.attachments[0].data_base64,'backup lost attachment bytes');
 x=await json('/api/backup/validate',auth(admin,'POST',backup));assert(x.r.status===200&&x.data.valid,'backup validation failed');
 x=await json(`/api/reports/${id}/reopen`,auth(admin,'POST',{reason:'prepare restore test'}));assert(x.r.status===200,'reopen failed');
 x=await json(`/api/reports/${id}`,auth(admin,'DELETE'));assert(x.r.status===200,'delete before restore failed');
 x=await json('/api/reports',auth(admin));assert(x.data.count===0,'report was not deleted');
 x=await json('/api/backup/restore',auth(admin,'POST',backup));assert(x.r.status===200&&x.data.count===1,'restore failed');
 x=await json('/api/reports',auth(admin));assert(x.r.status===200&&x.data.count===1,'restored report missing');const restored=x.data.reports[0];
 assert(restored.report_date==='2099-02-01','restored date wrong');assert(restored.workflow_status==='approved','restore lost approved status');assert(restored.approved_by_name==='Smoke Admin','restore lost approver name');assert(restored.approved_at===approvedAt,'restore lost approval time');
 x=await json(`/api/reports/${restored.id}/attachments`,auth(admin));assert(x.r.status===200&&x.data.attachments.length===1,'restored attachment missing');const aid=x.data.attachments[0].id;
 const dl=await fetch(base+`/api/attachments/${aid}/download`,{headers:{cookie:admin}});assert(dl.status===200,'restored attachment download failed');assert((await dl.text())==='attachment survives backup','restored attachment content changed');
 x=await json('/api/system/integrity',auth(admin));assert(x.r.status===200,'integrity endpoint failed');assert(x.data.sqlite_integrity==='ok','SQLite integrity failed');assert(x.data.missing_attachments.length===0,'missing attachment after restore');assert(x.data.duplicate_dates.length===0&&x.data.duplicate_numbers.length===0,'duplicates after restore');
 console.log('Runtime smoke test passed: backup + restore + attachments + approval metadata + integrity.');
}catch(e){console.error(e.stack||e.message);console.error(output);process.exitCode=1}finally{child.kill('SIGTERM')}})();
