const { spawn } = require('child_process');

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
  for (let i=0;i<40;i++) { try { const r=await fetch(`${base}/api/health`); if(r.ok) return; } catch {} await new Promise(r=>setTimeout(r,150)); }
  throw new Error('Server did not start');
}
async function json(url, opts={}) { const r=await fetch(base+url, opts); let data={}; try { data=await r.json(); } catch {} return {r,data}; }
function auth(cookie, method='GET', body) { const h={cookie}; if(body!==undefined) h['content-type']='application/json'; return {method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}; }
(async()=>{
  try {
    await waitServer();
    let x=await json('/api/health'); assert(x.r.status===200 && x.data.ok, 'health failed');
    x=await json('/api/reports'); assert(x.r.status===401, 'reports must require auth');
    x=await json('/api/auth/status'); assert(x.r.status===200 && x.data.setupRequired===true, 'fresh setup status failed');
    x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',display_name:'Smoke Admin',password:'SmokePass123'})}); assert(x.r.status===200 && x.data.ok,'admin setup failed');
    x=await json('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',password:'SmokePass123'})}); assert(x.r.status===200 && x.data.ok,'login failed');
    const cookie=(x.r.headers.get('set-cookie')||'').split(';')[0]; assert(cookie.includes('minya_session='),'session cookie missing');

    const report={report_date:'2099-01-15',weather:'صحو',temperature:22,start_time:'04:00',end_time:'19:00',total_trucks:10,total_waste_tons:123.5,total_diesel:45,notes:'smoke',crews:[{crew_name:'فريق',crew_count:2}],operations:[{operation_name:'دمك',quantity:1,unit:'يوم'}],stations:[],equipment:[{equipment_name:'Bomag',operating_status:'يعمل',working_hours:5,diesel_liters:45}]};
    x=await json('/api/reports',auth(cookie,'POST',report)); assert(x.r.status===200 && x.data.ok,'create report failed'); const id=x.data.report.id;
    x=await json(`/api/reports/${id}`,auth(cookie)); assert(x.r.status===200 && x.data.report.workflow_status==='draft','new report must be draft');
    report.notes='smoke updated'; x=await json(`/api/reports/${id}`,auth(cookie,'PUT',report)); assert(x.r.status===200,'draft update failed');
    x=await json(`/api/reports/${id}/submit`,auth(cookie,'POST',{})); assert(x.r.status===200 && x.data.workflow_status==='pending','submit failed');
    x=await json(`/api/reports/${id}`,auth(cookie,'PUT',report)); assert(x.r.status===423,'pending report must be locked');
    x=await json('/api/reviews/pending',auth(cookie)); assert(x.r.status===200 && x.data.reports.some(r=>r.id===id),'pending queue missing report');
    x=await json(`/api/reports/${id}/approve`,auth(cookie,'POST',{})); assert(x.r.status===200 && x.data.workflow_status==='approved','approve failed');
    x=await json(`/api/reports/${id}`,auth(cookie,'PUT',report)); assert(x.r.status===423,'approved report must be locked');
    x=await json(`/api/reports/${id}/reopen`,auth(cookie,'POST',{reason:'اختبار'})); assert(x.r.status===200 && x.data.workflow_status==='draft','reopen failed');
    report.notes='after reopen'; x=await json(`/api/reports/${id}`,auth(cookie,'PUT',report)); assert(x.r.status===200,'update after reopen failed');
    x=await json(`/api/reports/${id}`,auth(cookie,'DELETE')); assert(x.r.status===200,'delete draft failed');

    x=await json('/api/auth/logout',auth(cookie,'POST',{})); assert(x.r.status===200 && x.data.ok,'logout failed');
    x=await json('/api/reports',{headers:{cookie}}); assert(x.r.status===401,'logout did not revoke session');
    console.log('Runtime smoke test passed: auth + full report workflow.');
  } catch(e) { console.error(e.stack||e.message); console.error(output); process.exitCode=1; }
  finally { child.kill('SIGTERM'); }
})();
