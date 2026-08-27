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
 await waitServer(); let x=await json('/api/health');assert(x.r.status===200&&x.data.ok,'health failed');
 x=await json('/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'smokeadmin',display_name:'Admin',password:'SmokePass123'})});assert(x.r.status===200,'setup failed');
 const admin=await login('smokeadmin','SmokePass123');
 x=await json('/api/users',auth(admin,'POST',{username:'editor1',display_name:'Editor',password:'EditorPass123',role:'editor'}));assert(x.r.status===200,'create editor failed');
 x=await json('/api/users',auth(admin,'POST',{username:'viewer1',display_name:'Viewer',password:'ViewerPass123',role:'viewer'}));assert(x.r.status===200,'create viewer failed');
 const editor=await login('editor1','EditorPass123'), viewer=await login('viewer1','ViewerPass123');
 const report={report_date:'2099-01-15',weather:'صحو',temperature:22,start_time:'04:00',end_time:'19:00',total_trucks:10,total_waste_tons:123.5,total_diesel:45,notes:'roles',crews:[],operations:[],stations:[],equipment:[]};
 x=await json('/api/reports',auth(viewer,'POST',report));assert(x.r.status===403,'viewer must not create');
 x=await json('/api/reports',auth(editor,'POST',report));assert(x.r.status===200,'editor create failed');const id=x.data.report.id;
 x=await json(`/api/reports/${id}`,auth(viewer));assert(x.r.status===200,'viewer must read');
 const file=Buffer.from('Minya attachment smoke test').toString('base64');
 x=await json(`/api/reports/${id}/attachments`,auth(editor,'POST',{name:'test.txt',mime_type:'text/plain',data_base64:file}));assert(x.r.status===200,'editor attachment failed');const aid=x.data.id;
 x=await json(`/api/reports/${id}/attachments`,auth(viewer));assert(x.r.status===200&&x.data.attachments.some(a=>a.id===aid),'viewer attachment list failed');
 x=await json(`/api/attachments/${aid}`,auth(viewer,'DELETE'));assert(x.r.status===403,'viewer must not delete attachment');
 x=await json(`/api/reports/${id}/submit`,auth(editor,'POST',{}));assert(x.r.status===200,'editor submit failed');
 x=await json(`/api/reports/${id}/approve`,auth(editor,'POST',{}));assert(x.r.status===403,'editor must not approve');
 x=await json('/api/reviews/pending',auth(viewer));assert(x.r.status===403,'viewer must not access reviews');
 x=await json('/api/reviews/pending',auth(admin));assert(x.r.status===200&&x.data.reports.some(r=>r.id===id),'admin reviews failed');
 x=await json(`/api/reports/${id}/approve`,auth(admin,'POST',{}));assert(x.r.status===200,'admin approve failed');
 x=await json(`/api/reports/${id}/attachments`,auth(editor,'POST',{name:'locked.txt',mime_type:'text/plain',data_base64:file}));assert(x.r.status===423,'approved attachment add must lock');
 x=await json(`/api/attachments/${aid}`,auth(editor,'DELETE'));assert(x.r.status===423,'approved attachment delete must lock');
 x=await json(`/api/reports/${id}/reopen`,auth(admin,'POST',{reason:'roles test'}));assert(x.r.status===200,'admin reopen failed');
 x=await json(`/api/attachments/${aid}`,auth(editor,'DELETE'));assert(x.r.status===200,'editor delete attachment after reopen failed');
 x=await json(`/api/reports/${id}`,auth(editor,'DELETE'));assert(x.r.status===403,'editor must not delete report');
 x=await json(`/api/reports/${id}`,auth(admin,'DELETE'));assert(x.r.status===200,'admin delete draft failed');
 console.log('Runtime smoke test passed: roles + workflow + attachments.');
}catch(e){console.error(e.stack||e.message);console.error(output);process.exitCode=1}finally{child.kill('SIGTERM')}})();
