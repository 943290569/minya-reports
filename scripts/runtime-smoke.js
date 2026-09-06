const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const pkg = require('../package.json');

const port = 5100;
const base = `http://127.0.0.1:${port}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minya-runtime-smoke-'));
const testPassword = `T-${crypto.randomBytes(8).toString('hex')}-9a`;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return response.json();
    } catch (_) {}
    await sleep(150);
  }
  throw new Error('Production runtime did not become healthy');
}
async function json(url, options={}) {
  const response=await fetch(base+url,options);
  const data=await response.json().catch(()=>({}));
  return {response,data};
}
function auth(cookie,method='GET',body){
  const headers={cookie};
  if(body!==undefined) headers['content-type']='application/json';
  return {method,headers,body:body===undefined?undefined:JSON.stringify(body)};
}
function expectStatus(result,status,message){
  if(result.response.status!==status) throw new Error(`${message}: expected ${status}, got ${result.response.status} ${result.data?.message||''}`);
}
async function login(username,password){
  const result=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});
  expectStatus(result,200,`login failed for ${username}`);
  const cookie=(result.response.headers.get('set-cookie')||'').split(';')[0];
  if(!cookie) throw new Error(`login did not return a session cookie for ${username}`);
  return cookie;
}

(async () => {
  const child = spawn(process.execPath, ['scripts/start-server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      RAILWAY_ENVIRONMENT: '',
      MINYA_DATA_DIR: tmp,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });

  try {
    const health = await waitForHealth();
    if (!health?.ok) throw new Error('Health endpoint returned not ok');
    if (health.version !== pkg.version) throw new Error(`Runtime version mismatch: expected ${pkg.version}, got ${health.version}`);
    if (health.integrity !== 'ok') throw new Error(`SQLite integrity check failed: ${health.integrity}`);

    let x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'runtimeadmin',display_name:'Runtime Admin',password:testPassword})});
    expectStatus(x,200,'runtime admin setup failed');
    const adminCookie=await login('runtimeadmin',testPassword);

    x=await json('/api/users',auth(adminCookie,'POST',{username:'runtimeeditor',display_name:'Runtime Editor',mobile:'0591234567',password:testPassword,role:'editor'}));
    expectStatus(x,200,'runtime editor creation failed');
    const editorId=Number(x.data?.id||0);
    if(!editorId) throw new Error('runtime editor id missing');
    const editorCookie=await login('runtimeeditor',testPassword);

    x=await json('/api/reports',auth(adminCookie,'POST',{
      report_date:'2099-12-31',weather:'صحو',temperature:20,start_time:'04:00',end_time:'19:00',
      total_trucks:1,total_waste_tons:1,total_diesel:1,notes:'runtime attachment smoke',
      crews:[],operations:[],stations:[],equipment:[]
    }));
    expectStatus(x,200,'runtime report creation failed');
    const reportId=Number(x.data?.report?.id||0);
    if(!reportId) throw new Error('runtime report id missing');

    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'bad.txt',mime_type:'text/plain',data_base64:'%%%='}));
    expectStatus(x,400,'invalid Base64 attachment was not rejected');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'bad.txt',mime_type:'bad mime',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,400,'invalid MIME attachment was not rejected');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'folder/bad.txt',mime_type:'text/plain',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,400,'unsafe attachment file name was not rejected');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'ok.txt',mime_type:'text/plain',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,200,'valid attachment was rejected');

    x=await json('/api/reports',auth(editorCookie,'POST',{
      report_date:'2099-12-30',weather:'صحو',temperature:19,start_time:'04:00',end_time:'19:00',
      total_trucks:2,total_waste_tons:2,total_diesel:2,notes:'runtime return smoke',
      crews:[],operations:[],stations:[],equipment:[]
    }));
    expectStatus(x,200,'editor report creation failed');
    const returnedReportId=Number(x.data?.report?.id||0);
    if(!returnedReportId) throw new Error('editor report id missing');
    if(x.data?.report?.workflow_status!=='draft') throw new Error('editor report was not created as draft');

    x=await json(`/api/reports/${returnedReportId}/submit`,auth(editorCookie,'POST',{}));
    expectStatus(x,200,'editor report submit failed');
    if(x.data?.workflow_status!=='pending') throw new Error('submitted report is not pending');

    const returnReason='نقص بيانات المعدات - اختبار الإنتاج';
    x=await json(`/api/reports/${returnedReportId}/reopen`,auth(adminCookie,'POST',{reason:returnReason}));
    expectStatus(x,200,'admin return-to-editor failed');
    if(x.data?.workflow_status!=='draft') throw new Error('returned report did not become draft');

    x=await json(`/api/reports/${returnedReportId}`,auth(editorCookie));
    expectStatus(x,200,'editor could not read returned report');
    const returned=x.data?.report||{};
    if(returned.returned_reason!==returnReason) throw new Error(`returned reason mismatch: ${returned.returned_reason||'<empty>'}`);
    if(Number(returned.returned_to)!==editorId) throw new Error(`returned_to mismatch: expected ${editorId}, got ${returned.returned_to}`);
    if(!returned.returned_at) throw new Error('returned_at was not stored');
    if(!returned.returned_by) throw new Error('returned_by was not stored');

    x=await json(`/api/reports/${returnedReportId}/submit`,auth(editorCookie,'POST',{}));
    expectStatus(x,200,'resubmission of returned report failed');
    x=await json(`/api/reports/${returnedReportId}`,auth(editorCookie));
    expectStatus(x,200,'editor could not read resubmitted report');
    const resubmitted=x.data?.report||{};
    if(resubmitted.returned_reason||resubmitted.returned_at||resubmitted.returned_by||resubmitted.returned_to) throw new Error('old returned-report metadata was not cleared on resubmission');

    console.log(`Production runtime smoke passed: V${pkg.version} + SQLite integrity + strict attachments + returned-report workflow ok.`);
  } catch (error) {
    console.error(output);
    throw error;
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
