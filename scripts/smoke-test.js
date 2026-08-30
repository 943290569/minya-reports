const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn}=require('child_process');

const port=5099;
const base=`http://127.0.0.1:${port}`;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'minya-v32-final-'));
const uploadsDir=path.join(tmp,'uploads');
const child=spawn(process.execPath,['server.js'],{
  cwd:process.cwd(),
  env:{...process.env,PORT:String(port),RAILWAY_ENVIRONMENT:'',MINYA_DATA_DIR:tmp},
  stdio:['ignore','pipe','pipe']
});
let output='';
child.stdout.on('data',d=>output+=d);
child.stderr.on('data',d=>output+=d);

function assert(c,m){if(!c)throw new Error(m)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function waitServer(){for(let i=0;i<50;i++){try{const r=await fetch(`${base}/api/health`);if(r.ok)return}catch{}await sleep(120)}throw new Error('Server did not start')}
async function json(url,opts={}){const r=await fetch(base+url,opts);let data={};try{data=await r.json()}catch{}return{r,data}}
function auth(cookie,method='GET',body){const h={cookie};if(body!==undefined)h['content-type']='application/json';return{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}}
async function login(username,password){const x=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});assert(x.r.status===200,`login failed ${username}: ${x.data.message||''}`);return(x.r.headers.get('set-cookie')||'').split(';')[0]}
function uploadFiles(){return fs.existsSync(uploadsDir)?fs.readdirSync(uploadsDir).filter(n=>fs.statSync(path.join(uploadsDir,n)).isFile()):[]}

(async()=>{try{
  await waitServer();

  let x=await json('/api/health');
  assert(x.r.status===200&&x.data.ok,'health failed');
  assert(x.data.version==='3.2.0','health version is not 3.2.0');
  assert(x.data.integrity==='ok','initial sqlite integrity failed');

  x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',display_name:'Smoke Admin',password:'SmokePass123'})});
  assert(x.r.status===200,'admin setup failed');
  const admin=await login('smokeadmin','SmokePass123');

  x=await json('/api/users',auth(admin,'POST',{username:'smokeeditor',display_name:'Smoke Editor',password:'EditorPass123',role:'editor'}));
  assert(x.r.status===200,'editor creation failed');
  const editorId=x.data.id;
  x=await json('/api/users',auth(admin,'POST',{username:'smokeviewer',display_name:'Smoke Viewer',password:'ViewerPass123',role:'viewer'}));
  assert(x.r.status===200,'viewer creation failed');
  const viewerId=x.data.id;
  const editor=await login('smokeeditor','EditorPass123');
  const viewer=await login('smokeviewer','ViewerPass123');

  x=await json('/api/appearance-settings',auth(viewer));
  assert(x.r.status===200&&x.data.configured===false,'initial shared appearance state is incorrect');
  const sharedAppearance={loadingSeconds:5,remembranceFontSize:64,siteFontSize:18,theme:'night',color:'blue',fontSize:'normal',navPosition:'right',density:'compact',contrast:'high',motion:'reduced'};
  x=await json('/api/appearance-settings',auth(viewer,'PUT',{settings:sharedAppearance}));
  assert(x.r.status===403,'viewer was allowed to update shared appearance settings');
  x=await json('/api/appearance-settings',auth(admin,'PUT',{settings:sharedAppearance}));
  assert(x.r.status===200&&x.data.settings.remembranceFontSize===64,'admin shared appearance update failed');
  x=await json('/api/appearance-settings',auth(viewer));
  assert(x.r.status===200&&x.data.configured===true&&x.data.settings.siteFontSize===18&&x.data.settings.theme==='night','shared appearance settings are not visible across users');

  const report={
    report_date:'2099-02-01',weather:'صحو',temperature:21,start_time:'04:00',end_time:'19:00',
    total_trucks:12,total_waste_tons:150,total_diesel:55,notes:'V3.2 final smoke',
    crews:[{crew_name:'فريق التشغيل',crew_count:3,notes:''}],
    operations:[{operation_name:'مكب نفايات المنيا',vehicle_count:12,quantity:150,unit:'طن',notes:''}],
    stations:[],
    equipment:[{equipment_name:'Bomag',operating_status:'يعمل',status_description:'',working_hours:6,diesel_liters:55,notes:''}]
  };

  x=await json('/api/reports',auth(viewer,'POST',report));
  assert(x.r.status===403,'viewer was allowed to create a report');
  x=await json('/api/reports',auth(editor,'POST',report));
  assert(x.r.status===200,'editor create report failed');
  assert(x.data.report.workflow_status==='draft','editor report was not saved as draft');
  const id=x.data.report.id;

  x=await json('/api/monthly-summary?month=2099-02',auth(viewer));
  assert(x.r.status===200&&x.data.summary.diesel===55,'monthly summary lost stored diesel total');
  x=await json('/api/annual-summary?year=2099',auth(viewer));
  assert(x.r.status===200&&x.data.summary.diesel===55,'annual summary lost stored diesel total');
  assert(Array.isArray(x.data.previous_reports),'annual summary does not include previous-year reports');

  x=await json(`/api/reports/${id}`,auth(viewer));
  assert(x.r.status===200,'viewer could not read report');
  assert(x.data.operations.length===1,'operation missing');
  assert(x.data.operations[0].start_time===''&&x.data.operations[0].end_time==='','operation times should be empty');

  const payload=Buffer.from('attachment survives V3.2 final backup').toString('base64');
  x=await json(`/api/reports/${id}/attachments`,auth(editor,'POST',{name:'evidence.txt',mime_type:'text/plain',data_base64:payload}));
  assert(x.r.status===200,'editor attachment add failed');
  const attachmentId=x.data.id;
  assert(uploadFiles().length===1,'physical attachment file missing');
  x=await json(`/api/attachments/${attachmentId}`,auth(viewer,'DELETE'));
  assert(x.r.status===403,'viewer was allowed to delete attachment');
  x=await json(`/api/reports/${id}`,auth(editor));
  assert(x.r.status===200&&x.data.attachments.length===1,'normal report attachment metadata missing');
  assert(!('data_base64' in x.data.attachments[0]),'normal report leaked attachment base64');
  assert(!('stored_name' in x.data.attachments[0]),'normal report exposed stored attachment name');

  x=await json('/api/maintenance',auth(viewer,'POST',{equipment_name:'Bomag',log_date:'2099-02-01',status:'صيانة',description:'اختبار صيانة'}));
  assert(x.r.status===403,'viewer was allowed to create maintenance');
  let backupsBefore=(await json('/api/backups',auth(admin))).data.backups.length;
  x=await json('/api/maintenance',auth(editor,'POST',{equipment_name:'Bomag',log_date:'2099-02-01',status:'صيانة',description:'اختبار صيانة',action_taken:'فحص',cost:10}));
  assert(x.r.status===200,'editor maintenance create failed');
  const maintenanceId=x.data.id;
  let backupsAfter=(await json('/api/backups',auth(admin))).data.backups.length;
  assert(backupsAfter>=backupsBefore,'automatic backup count unexpectedly decreased');
  x=await json(`/api/maintenance/${maintenanceId}`,auth(editor,'DELETE'));
  assert(x.r.status===403,'editor was allowed to delete maintenance');
  x=await json(`/api/maintenance/${maintenanceId}`,auth(admin,'DELETE'));
  assert(x.r.status===200,'admin maintenance delete failed');

  x=await json(`/api/reports/${id}/submit`,auth(editor,'POST',{}));
  assert(x.r.status===200,'editor submit failed');
  x=await json(`/api/reports/${id}`,auth(editor,'PUT',report));
  assert(x.r.status===423,'pending report was editable');
  x=await json(`/api/reports/${id}/approve`,auth(editor,'POST',{}));
  assert(x.r.status===403,'editor was allowed to approve');
  x=await json('/api/reviews/pending',auth(viewer));
  assert(x.r.status===403,'viewer was allowed to access pending reviews');
  x=await json('/api/reviews/pending',auth(admin));
  assert(x.r.status===200&&x.data.count===1,'admin pending review queue incorrect');
  x=await json(`/api/reports/${id}/approve`,auth(admin,'POST',{}));
  assert(x.r.status===200,'admin approve failed');
  const approvedAt=x.data.approved_at;

  x=await json(`/api/reports/${id}/attachments`,auth(editor,'POST',{name:'blocked.txt',mime_type:'text/plain',data_base64:payload}));
  assert(x.r.status===423,'approved report allowed attachment add');
  x=await json(`/api/attachments/${attachmentId}`,auth(editor,'DELETE'));
  assert(x.r.status===423,'approved report allowed attachment delete');

  const backupRes=await fetch(base+'/api/backup/download',{headers:{cookie:admin}});
  assert(backupRes.status===200,'backup download failed');
  const backup=await backupRes.json();
  assert(backup.version==='3.2.0','backup version is not 3.2.0');
  assert(Array.isArray(backup.reports)&&backup.reports.length===1,'backup report count wrong');
  const backed=backup.reports[0];
  assert(backed.report.workflow_status==='approved','backup lost workflow status');
  assert(backed.attachments.length===1&&backed.attachments[0].data_base64,'backup lost attachment bytes');
  assert(backed.attachments[0].stored_name,'backup lost stored attachment name');
  assert(backup.appearance_settings&&backup.appearance_settings.remembranceFontSize===64,'backup lost shared appearance settings');
  x=await json('/api/backup/validate',auth(admin,'POST',backup));
  assert(x.r.status===200&&x.data.valid,'backup validation failed');

  x=await json(`/api/reports/${id}/reopen`,auth(admin,'POST',{reason:'V3.2 restore verification'}));
  assert(x.r.status===200,'reopen failed');
  x=await json(`/api/reports/${id}`,auth(admin,'DELETE'));
  assert(x.r.status===200,'delete before restore failed');
  assert(uploadFiles().length===0,'report delete left orphan attachment file');
  fs.writeFileSync(path.join(uploadsDir,'manual-orphan.tmp'),'orphan');
  assert(uploadFiles().includes('manual-orphan.tmp'),'orphan fixture failed');

  x=await json('/api/appearance-settings',auth(admin,'PUT',{settings:{...sharedAppearance,remembranceFontSize:20}}));
  assert(x.r.status===200&&x.data.settings.remembranceFontSize===20,'appearance change before restore failed');

  x=await json('/api/backup/restore',auth(admin,'POST',backup));
  assert(x.r.status===200&&x.data.count===1,'restore failed');
  assert(!uploadFiles().includes('manual-orphan.tmp'),'restore did not clean orphan file');
  x=await json('/api/reports',auth(admin));
  assert(x.r.status===200&&x.data.count===1,'restored report missing');
  const restored=x.data.reports[0];
  assert(restored.workflow_status==='approved','restore lost approved status');
  assert(restored.approved_by_name==='Smoke Admin','restore lost approver name');
  assert(restored.approved_at===approvedAt,'restore lost approval time');

  x=await json(`/api/reports/${restored.id}/attachments`,auth(admin));
  assert(x.r.status===200&&x.data.attachments.length===1,'restored attachment missing');
  const restoredAid=x.data.attachments[0].id;
  const dl=await fetch(base+`/api/attachments/${restoredAid}/download`,{headers:{cookie:admin}});
  assert(dl.status===200,'restored attachment download failed');
  assert((await dl.text())==='attachment survives V3.2 final backup','restored attachment content changed');
  assert(uploadFiles().length===1,'unexpected physical files after restore cleanup');
  x=await json('/api/appearance-settings',auth(viewer));
  assert(x.r.status===200&&x.data.settings.remembranceFontSize===64,'restore lost shared appearance settings');

  const adminReport={...report,report_date:'2099-02-02',notes:'admin auto approval smoke'};
  x=await json('/api/reports',auth(admin,'POST',adminReport));
  assert(x.r.status===200,'admin create report failed');
  assert(x.data.report.workflow_status==='approved','admin-created report was not approved automatically');
  assert(x.data.report.approved_by_name==='Smoke Admin','admin-created report lost approver name');
  const adminReportId=x.data.report.id;
  x=await json(`/api/reports/${adminReportId}`,auth(admin));
  assert(x.r.status===200&&x.data.report.workflow_status==='approved','stored admin report is not approved');
  x=await json(`/api/reports/${adminReportId}/attachments`,auth(admin,'POST',{name:'admin-evidence.txt',mime_type:'text/plain',data_base64:payload}));
  assert(x.r.status===200,'admin could not attach a file to an auto-approved report');
  const adminAttachmentId=x.data.id;
  x=await json(`/api/reports/${adminReportId}`,auth(admin,'PUT',{...adminReport,notes:'updated by admin'}));
  assert(x.r.status===200&&x.data.report.workflow_status==='approved','admin update did not keep the report approved');
  x=await json(`/api/attachments/${adminAttachmentId}`,auth(admin,'DELETE'));
  assert(x.r.status===200,'admin could not delete an attachment from an approved report');
  x=await json(`/api/reports/${adminReportId}/reopen`,auth(admin,'POST',{reason:'smoke cleanup'}));
  assert(x.r.status===200,'admin report cleanup reopen failed');
  x=await json(`/api/reports/${adminReportId}`,auth(admin,'DELETE'));
  assert(x.r.status===200,'admin report cleanup delete failed');
  assert(uploadFiles().length===1,'admin auto-approval test left unexpected attachment files');

  x=await json('/api/security/sessions',auth(admin));
  assert(x.r.status===200&&x.data.summary.admins>=1,'security sessions endpoint failed');
  assert(x.data.users.some(u=>u.id===editorId)&&x.data.users.some(u=>u.id===viewerId),'security users missing');
  x=await json('/api/security/cleanup',auth(admin,'POST',{}));
  assert(x.r.status===200,'security cleanup failed');

  x=await json('/api/audit?limit=500',auth(admin));
  assert(x.r.status===200,'audit endpoint failed');
  const actions=new Set((x.data.logs||[]).map(r=>r.action));
  ['UPDATE_APPEARANCE_SETTINGS','CREATE_REPORT','CREATE_APPROVED_REPORT','UPDATE_APPROVED_REPORT','ADD_ATTACHMENT','CREATE_MAINTENANCE','DELETE_MAINTENANCE','SUBMIT_REPORT','APPROVE_REPORT','REOPEN_REPORT','RESTORE_BACKUP'].forEach(a=>assert(actions.has(a),`audit missing ${a}`));

  x=await json('/api/system/storage',auth(admin));
  assert(x.r.status===200&&x.data.attachment_count===1,'storage endpoint incorrect');
  x=await json('/api/system/integrity',auth(admin));
  assert(x.r.status===200,'integrity endpoint failed');
  assert(x.data.sqlite_integrity==='ok','SQLite integrity failed');
  assert(x.data.missing_attachments.length===0,'missing attachment after restore');
  assert(x.data.orphan_files.length===0,'orphan attachment after restore');
  assert(x.data.duplicate_dates.length===0&&x.data.duplicate_numbers.length===0,'duplicates after restore');

  console.log('V3.2 FINAL smoke test passed: roles + workflow + attachments + maintenance + backups + restore + security + audit + integrity.');
}catch(e){
  console.error(e.stack||e.message);
  console.error(output);
  process.exitCode=1;
}finally{
  child.kill('SIGTERM');
  await sleep(150);
  fs.rmSync(tmp,{recursive:true,force:true});
}})();
