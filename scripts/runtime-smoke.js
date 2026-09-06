const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const pkg = require('../package.json');

const port = 5100;
const base = `http://127.0.0.1:${port}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minya-runtime-smoke-'));

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
    if (health.version !== pkg.version) {
      throw new Error(`Runtime version mismatch: expected ${pkg.version}, got ${health.version}`);
    }
    if (health.integrity !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${health.integrity}`);
    }

    let x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'runtimeadmin',display_name:'Runtime Admin',password:'RuntimePass123'})});
    expectStatus(x,200,'runtime admin setup failed');
    x=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'runtimeadmin',password:'RuntimePass123'})});
    expectStatus(x,200,'runtime admin login failed');
    const cookie=(x.response.headers.get('set-cookie')||'').split(';')[0];
    if(!cookie) throw new Error('runtime login did not return a session cookie');

    x=await json('/api/reports',auth(cookie,'POST',{
      report_date:'2099-12-31',weather:'صحو',temperature:20,start_time:'04:00',end_time:'19:00',
      total_trucks:1,total_waste_tons:1,total_diesel:1,notes:'runtime smoke',
      crews:[],operations:[],stations:[],equipment:[]
    }));
    expectStatus(x,200,'runtime report creation failed');
    const reportId=Number(x.data?.report?.id||0);
    if(!reportId) throw new Error('runtime report id missing');

    x=await json(`/api/reports/${reportId}/attachments`,auth(cookie,'POST',{name:'bad.txt',mime_type:'text/plain',data_base64:'%%%='}));
    expectStatus(x,400,'invalid Base64 attachment was not rejected');

    x=await json(`/api/reports/${reportId}/attachments`,auth(cookie,'POST',{name:'bad.txt',mime_type:'bad mime',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,400,'invalid MIME attachment was not rejected');

    x=await json(`/api/reports/${reportId}/attachments`,auth(cookie,'POST',{name:'ok.txt',mime_type:'text/plain',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,200,'valid attachment was rejected');

    console.log(`Production runtime smoke passed: V${pkg.version} + SQLite integrity + strict attachments ok.`);
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
