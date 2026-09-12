const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');
const pkg = require('../package.json');

const port = 5100;
const base = `http://127.0.0.1:${port}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minya-runtime-smoke-'));
const testPassword = `T-${crypto.randomBytes(8).toString('hex')}-9a`;
const nextPassword = `N-${crypto.randomBytes(8).toString('hex')}-8b`;

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
function reportPayload(overrides={}){
  return {
    report_date:'2099-12-28',weather:'صحو',temperature:20,start_time:'04:00',end_time:'19:00',
    total_trucks:1,total_waste_tons:1,total_diesel:1,notes:'runtime payload validation',
    crews:[],
    operations:[{operation_name:'مكب نفايات المنيا',vehicle_count:1,quantity:1,unit:'طن',notes:''}],
    stations:[],
    equipment:[{equipment_name:'مدحلة 36 طن',operating_status:'يعمل',working_hours:0,diesel_liters:1,notes:''}],
    ...overrides
  };
}
function wordPreviewPayload(){
  const zip=new AdmZip();
  zip.addFile('[Content_Types].xml',Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`));
  const lines=[
    'كشف تعبئة السولار لشركة اختبار Word شهر 8/2099',
    'التاريخ\tاسم السائق\tرقم المركبة\tالكمية (لتر)\tرقم الوصل\tملاحظات',
    '01/08/2099\tسائق تجريبي\t0248\t200\tW-1\t',
    '\t200\t',
    'توقيع مسؤول تعبئة السولار'
  ];
  const paragraphs=lines.map(line=>`<w:p><w:r>${line.split('\t').map((part,index)=>`${index?'<w:tab/>':''}<w:t xml:space="preserve">${part}</w:t>`).join('')}</w:r></w:p>`).join('');
  zip.addFile('word/document.xml',Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`));
  return {filename:'runtime-word-register.docx',data_base64:zip.toBuffer().toString('base64')};
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
    let editorCookie=await login('runtimeeditor',testPassword);

    x=await json('/api/users',auth(adminCookie,'POST',{username:'runtimeviewer',display_name:'Runtime Viewer',password:testPassword,role:'viewer'}));
    expectStatus(x,200,'runtime viewer creation failed');
    const viewerCookie=await login('runtimeviewer',testPassword);

    x=await json('/api/reports',auth(viewerCookie));
    expectStatus(x,200,'viewer could not read reports');
    x=await json('/api/reports',auth(viewerCookie,'POST',reportPayload({report_date:'2099-12-29',notes:'viewer must not create',total_trucks:999})));
    expectStatus(x,403,'viewer was allowed to create a report');

    x=await json('/api/external-diesel?source=Runtime%20Supplier&month=2099-08',auth(viewerCookie));
    expectStatus(x,200,'viewer could not read external diesel');
    x=await json('/api/external-diesel/parse-word',auth(viewerCookie,'POST',wordPreviewPayload()));
    expectStatus(x,403,'viewer was allowed to parse an external diesel Word register');
    x=await json('/api/external-diesel/parse-word',auth(editorCookie,'POST',wordPreviewPayload()));
    expectStatus(x,200,'editor could not preview an external diesel Word register');
    if(x.data?.source_name!=='شركة اختبار Word'||x.data?.month!=='2099-08'||Number(x.data?.rows_count)!==1||x.data?.entries?.[0]?.vehicle_number!=='0248') throw new Error('external diesel Word preview parsing is incorrect');
    x=await json('/api/external-diesel',auth(viewerCookie,'POST',{source_name:'Runtime Supplier',entry_date:'2099-08-01',driver_name:'Viewer Driver',vehicle_number:'0001',quantity_liters:100,receipt_number:'R-0'}));
    expectStatus(x,403,'viewer was allowed to create external diesel');
    x=await json('/api/external-diesel',auth(editorCookie,'POST',{source_name:'Runtime Supplier',entry_date:'2099-08-01',driver_name:'Driver One',vehicle_number:'0248',quantity_liters:200,receipt_number:'R-1',notes:'runtime external diesel'}));
    expectStatus(x,200,'editor could not create external diesel');
    const externalDieselId=Number(x.data?.id||0);
    if(!externalDieselId) throw new Error('external diesel id missing');
    x=await json('/api/external-diesel',auth(editorCookie,'POST',{source_name:'Runtime Supplier',entry_date:'2099-08-02',driver_name:'Driver Two',vehicle_number:'6034',quantity_liters:150,receipt_number:'R-1'}));
    expectStatus(x,409,'duplicate external diesel receipt was accepted');
    x=await json('/api/external-diesel/import',auth(adminCookie,'POST',{entries:[
      {source_name:'Runtime Supplier',entry_date:'2099-08-01',driver_name:'Driver One',vehicle_number:'0248',quantity_liters:200,receipt_number:'R-1'},
      {source_name:'Runtime Supplier',entry_date:'2099-08-02',driver_name:'Driver Two',vehicle_number:'6034',quantity_liters:150,receipt_number:'R-2'}
    ]}));
    expectStatus(x,200,'external diesel batch import failed');
    if(Number(x.data?.created)!==1||Number(x.data?.skipped)!==1) throw new Error('external diesel import duplicate handling is incorrect');
    x=await json('/api/external-diesel?source=Runtime%20Supplier&month=2099-08',auth(viewerCookie));
    expectStatus(x,200,'external diesel filtered listing failed');
    if(Number(x.data?.summary?.entries_count)!==2||Number(x.data?.summary?.days_count)!==2||Number(x.data?.summary?.total_liters)!==350) throw new Error('external diesel summary is incorrect');
    x=await json('/api/external-diesel/suggestions',auth(viewerCookie));
    expectStatus(x,200,'viewer could not read external diesel suggestions');
    if(!x.data?.pairs?.some((pair)=>pair.source_name==='Runtime Supplier'&&pair.driver_name==='Driver One'&&pair.vehicle_number==='0248')) throw new Error('external diesel driver and vehicle suggestions are incorrect');
    x=await json(`/api/external-diesel/${externalDieselId}`,auth(editorCookie,'PUT',{source_name:'Runtime Supplier',entry_date:'2099-08-01',driver_name:'Driver One',vehicle_number:'0248',quantity_liters:220,receipt_number:'R-1'}));
    expectStatus(x,200,'editor could not update external diesel');
    x=await json(`/api/external-diesel/${externalDieselId}`,auth(editorCookie,'DELETE'));
    expectStatus(x,403,'editor was allowed to delete external diesel');
    x=await json(`/api/external-diesel/${externalDieselId}`,auth(adminCookie,'DELETE'));
    expectStatus(x,200,'admin could not delete external diesel');

    x=await json('/api/reports',auth(adminCookie,'POST',reportPayload({report_date:'2099-02-31'})));
    expectStatus(x,400,'impossible report date was accepted');
    x=await json('/api/reports',auth(adminCookie,'POST',reportPayload({report_date:'2099-12-27',total_trucks:1.5})));
    expectStatus(x,400,'fractional truck total was accepted');
    x=await json('/api/reports',auth(adminCookie,'POST',reportPayload({report_date:'2099-12-26',total_waste_tons:'abc'})));
    expectStatus(x,400,'non-numeric waste total was accepted');
    x=await json('/api/reports',auth(adminCookie,'POST',reportPayload({report_date:'2099-12-25',total_diesel:-1})));
    expectStatus(x,400,'negative diesel total was accepted');
    x=await json('/api/reports',auth(adminCookie,'POST',reportPayload({report_date:'2099-12-24',total_trucks:2})));
    expectStatus(x,400,'mismatched canonical truck total was accepted');
    if(Number(x.data?.expected_totals?.total_trucks)!==1) throw new Error('canonical mismatch response did not expose expected truck total');

    x=await json('/api/reports',auth(adminCookie,'POST',reportPayload({
      report_date:'2099-12-31',notes:'runtime attachment smoke'
    })));
    expectStatus(x,200,'runtime report creation failed');
    const reportId=Number(x.data?.report?.id||0);
    if(!reportId) throw new Error('runtime report id missing');

    x=await json(`/api/reports/${reportId}`,auth(adminCookie,'PUT',reportPayload({
      report_date:'2099-12-31',total_diesel:-5,notes:'invalid update must fail'
    })));
    expectStatus(x,400,'invalid report update was accepted');

    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'bad.txt',mime_type:'text/plain',data_base64:'%%%='}));
    expectStatus(x,400,'invalid Base64 attachment was not rejected');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'bad.txt',mime_type:'bad mime',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,400,'invalid MIME attachment was not rejected');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'folder/bad.txt',mime_type:'text/plain',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,400,'unsafe attachment file name was not rejected');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'ok.txt',mime_type:'text/plain',data_base64:Buffer.from('ok').toString('base64')}));
    expectStatus(x,200,'valid attachment was rejected');

    const htmlPayload=Buffer.from('<script>document.body.textContent="unsafe"</script>').toString('base64');
    x=await json(`/api/reports/${reportId}/attachments`,auth(adminCookie,'POST',{name:'page.html',mime_type:'text/html',data_base64:htmlPayload}));
    expectStatus(x,200,'HTML attachment upload should be stored for download');
    const htmlAttachmentId=Number(x.data?.id||0);
    if(!htmlAttachmentId) throw new Error('HTML attachment id missing');
    const htmlDownload=await fetch(`${base}/api/attachments/${htmlAttachmentId}/download`,{headers:{cookie:adminCookie}});
    if(htmlDownload.status!==200) throw new Error(`HTML attachment download failed: ${htmlDownload.status}`);
    const contentType=String(htmlDownload.headers.get('content-type')||'').toLowerCase();
    const disposition=String(htmlDownload.headers.get('content-disposition')||'').toLowerCase();
    if(!contentType.startsWith('application/octet-stream')) throw new Error(`active attachment was not forced to binary MIME: ${contentType}`);
    if(!disposition.startsWith('attachment;')) throw new Error(`active attachment was not forced to download: ${disposition}`);

    x=await json('/api/reports',auth(editorCookie,'POST',reportPayload({
      report_date:'2099-12-30',temperature:19,notes:'runtime return smoke'
    })));
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

    x=await json(`/api/reports/${returnedReportId}/approve`,auth(editorCookie,'POST',{}));
    expectStatus(x,403,'editor was allowed to approve a report');
    x=await json(`/api/reports/${returnedReportId}/approve`,auth(adminCookie,'POST',{}));
    expectStatus(x,200,'admin could not approve a pending report');
    if(x.data?.workflow_status!=='approved') throw new Error('admin approval did not set approved status');

    x=await json('/api/auth/logout',auth(viewerCookie,'POST',{}));
    expectStatus(x,200,'viewer logout failed');
    x=await json('/api/reports',auth(viewerCookie));
    expectStatus(x,401,'viewer session remained valid after logout');

    x=await json(`/api/users/${editorId}`,auth(adminCookie,'PUT',{password:nextPassword}));
    expectStatus(x,200,'admin could not change editor password');
    x=await json('/api/reports',auth(editorCookie));
    expectStatus(x,401,'old editor session remained valid after password change');
    editorCookie=await login('runtimeeditor',nextPassword);
    x=await json('/api/reports',auth(editorCookie));
    expectStatus(x,200,'editor could not use a new session after password change');

    console.log(`Production runtime smoke passed: V${pkg.version} + SQLite integrity + canonical report totals + role permissions + session invalidation + safe attachments + returned-report workflow ok.`);
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
