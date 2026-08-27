const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minya-smoke-'));
const port = 5099;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), RAILWAY_ENVIRONMENT: '' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', d => output += d.toString());
child.stderr.on('data', d => output += d.toString());

function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function waitServer() {
  for (let i=0;i<40;i++) {
    try { const r=await fetch(`${base}/api/health`); if(r.ok) return; } catch {}
    await new Promise(r=>setTimeout(r,150));
  }
  throw new Error('Server did not start');
}
async function json(url, opts={}) {
  const r=await fetch(base+url, opts); let data={};
  try { data=await r.json(); } catch {}
  return {r,data};
}
(async()=>{
  try {
    await waitServer();
    let x=await json('/api/health'); assert(x.r.status===200 && x.data.ok, 'health failed');
    x=await json('/api/reports'); assert(x.r.status===401, 'reports must require auth');
    x=await json('/api/auth/status'); assert(x.r.status===200 && x.data.setupRequired===true, 'fresh setup status failed');
    x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',display_name:'Smoke Admin',password:'SmokePass123'})}); assert(x.r.status===200 && x.data.ok,'admin setup failed');
    x=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',password:'SmokePass123'})}); assert(x.r.status===200 && x.data.ok,'login failed');
    const cookie=(x.r.headers.get('set-cookie')||'').split(';')[0]; assert(cookie.includes('minya_session='),'session cookie missing');
    x=await json('/api/reports',{headers:{cookie}}); assert(x.r.status===200 && x.data.ok,'authenticated reports failed');
    x=await json('/api/reviews/pending',{headers:{cookie}}); assert(x.r.status===200 && x.data.ok,'reviews queue failed');
    x=await json('/api/auth/logout',{method:'POST',headers:{cookie}}); assert(x.r.status===200 && x.data.ok,'logout failed');
    x=await json('/api/reports',{headers:{cookie}}); assert(x.r.status===401,'logout did not revoke session');
    console.log('Runtime smoke test passed.');
  } catch(e) {
    console.error(e.stack||e.message); console.error(output); process.exitCode=1;
  } finally {
    child.kill('SIGTERM');
  }
})();
