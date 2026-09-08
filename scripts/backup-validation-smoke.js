const fs=require('fs');
const os=require('os');
const path=require('path');
const crypto=require('crypto');
const {spawn}=require('child_process');

const port=5101;
const base=`http://127.0.0.1:${port}`;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'minya-backup-smoke-'));
const testPassword=`B-${crypto.randomBytes(8).toString('hex')}-7z`;

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitServer(){for(let i=0;i<60;i++){try{const r=await fetch(`${base}/api/health`);if(r.ok)return;}catch{}await sleep(150);}throw new Error('backup validation runtime did not start');}
async function json(url,options={}){const response=await fetch(base+url,options);const data=await response.json().catch(()=>({}));return{response,data};}
function auth(cookie,body){return{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)};}
function expectStatus(result,status,label){if(result.response.status!==status)throw new Error(`${label}: expected ${status}, got ${result.response.status} ${result.data?.message||''}`);}
function backup(report){return{system:'Minya Landfill System',version:'test',exported_at:new Date().toISOString(),reports:[{report,crews:[],operations:[],stations:[],equipment:[],attachments:[]}],maintenance:[]};}
function validReport(overrides={}){return{report_date:'2099-01-31',report_no:'MINYA-2099-01-31',weather:'صحو',temperature:20,start_time:'04:00',end_time:'19:00',total_trucks:2,total_waste_tons:3,total_diesel:4,notes:'backup smoke',workflow_status:'draft',...overrides};}

(async()=>{
  const child=spawn(process.execPath,['scripts/start-server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),RAILWAY_ENVIRONMENT:'',MINYA_DATA_DIR:tmp},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  try{
    await waitServer();
    let x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'backupadmin',display_name:'Backup Admin',password:testPassword})});
    expectStatus(x,200,'backup admin setup');
    x=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'backupadmin',password:testPassword})});
    expectStatus(x,200,'backup admin login');
    const cookie=(x.response.headers.get('set-cookie')||'').split(';')[0];
    if(!cookie)throw new Error('backup admin session cookie missing');

    x=await json('/api/backup/validate',auth(cookie,backup(validReport())));
    expectStatus(x,200,'valid backup rejected');
    if(!x.data?.valid)throw new Error('valid backup did not return valid=true');

    x=await json('/api/backup/validate',auth(cookie,backup(validReport({report_date:'2099-02-31',report_no:'MINYA-2099-02-31'}))));
    expectStatus(x,400,'impossible calendar date accepted');

    x=await json('/api/backup/validate',auth(cookie,backup(validReport({total_trucks:1.5}))));
    expectStatus(x,400,'fractional truck total accepted');

    x=await json('/api/backup/validate',auth(cookie,backup(validReport({total_waste_tons:'abc'}))));
    expectStatus(x,400,'non-numeric waste total accepted');

    x=await json('/api/backup/validate',auth(cookie,backup(validReport({total_diesel:-1}))));
    expectStatus(x,400,'negative diesel total accepted');

    const invalidAttachmentBackup=backup(validReport());
    invalidAttachmentBackup.reports[0].attachments=[{original_name:'bad.txt',mime_type:'text/plain',data_base64:'%%%not-base64%%%'}];
    x=await json('/api/backup/validate',auth(cookie,invalidAttachmentBackup));
    expectStatus(x,400,'invalid attachment base64 accepted');

    const returnedReason='اختبار حفظ سبب الإعادة بعد الاستعادة';
    const returnedAt='2099-01-30T10:11:12.000Z';
    const attachmentText='backup attachment restored correctly';
    const restoreBackup=backup(validReport({
      workflow_status:'draft',
      returned_reason:returnedReason,
      returned_at:returnedAt,
      returned_by:41,
      returned_to:42
    }));
    restoreBackup.reports[0].attachments=[{
      original_name:'backup-test.txt',
      mime_type:'text/plain',
      data_base64:Buffer.from(attachmentText,'utf8').toString('base64'),
      created_at:'2099-01-30T10:12:00.000Z'
    }];
    x=await json('/api/backup/restore',auth(cookie,restoreBackup));
    expectStatus(x,200,'backup restore failed');

    x=await json('/api/reports',{headers:{cookie}});
    expectStatus(x,200,'reports read after restore failed');
    const reports=Array.isArray(x.data?.reports)?x.data.reports:Array.isArray(x.data)?x.data:[];
    const restored=reports.find(r=>r.report_date==='2099-01-31');
    if(!restored)throw new Error('restored report was not found');
    if(restored.returned_reason!==returnedReason)throw new Error('returned_reason was lost during restore');
    if(restored.returned_at!==returnedAt)throw new Error('returned_at was lost during restore');
    if(Number(restored.returned_by)!==41)throw new Error('returned_by was lost during restore');
    if(Number(restored.returned_to)!==42)throw new Error('returned_to was lost during restore');

    x=await json(`/api/reports/${restored.id}/attachments`,{headers:{cookie}});
    expectStatus(x,200,'attachments list after restore failed');
    const attachments=Array.isArray(x.data?.attachments)?x.data.attachments:[];
    if(attachments.length!==1)throw new Error(`expected one restored attachment, got ${attachments.length}`);
    if(attachments[0].original_name!=='backup-test.txt')throw new Error('restored attachment name changed');
    const attachmentResponse=await fetch(`${base}/api/attachments/${attachments[0].id}/download`,{headers:{cookie}});
    if(!attachmentResponse.ok)throw new Error(`restored attachment download failed: ${attachmentResponse.status}`);
    const downloadedText=await attachmentResponse.text();
    if(downloadedText!==attachmentText)throw new Error('restored attachment content changed');

    console.log('Backup smoke passed: validation rules enforced, returned-report metadata preserved, invalid attachment rejected, and attachment restore verified.');
  }catch(error){console.error(output);throw error;}finally{child.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.stack||error.message||error);process.exit(1);});
