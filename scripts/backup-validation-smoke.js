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
function validReport(overrides={}){return{report_date:'2099-01-31',report_no:'MINYA-2099-01-31',temperature:20,total_trucks:2,total_waste_tons:3,total_diesel:4,...overrides};}

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

    console.log('Backup validation smoke passed: valid backup accepted; invalid dates and totals rejected.');
  }catch(error){console.error(output);throw error;}finally{child.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.stack||error.message||error);process.exit(1);});
