const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Database=require('better-sqlite3');
const db=new Database(':memory:');
db.exec("CREATE TABLE incident_logs(id INTEGER PRIMARY KEY);INSERT INTO incident_logs VALUES(1);CREATE TABLE daily_reports(id INTEGER PRIMARY KEY,report_date TEXT,report_no TEXT,notes TEXT,total_waste_tons REAL,total_trucks INTEGER,total_diesel REAL,workflow_status TEXT);CREATE TABLE equipment(report_id INTEGER,equipment_name TEXT,status_description TEXT,operating_status TEXT);");
const routes=new Map(), middleware=new Map();
const app={};
for(const method of ['get','post','put','delete','use'])app[method]=(path,...handlers)=>(method==='use'?middleware:routes).set(method+' '+path,handlers.at(-1));
const noop=()=>{};
const role=()=>noop;
require('../incident-files')(app,{db,requireAuth:noop,requireRole:role,audit:noop});
require('../monthly-close')(app,{db,requireRole:role,audit:noop});
function response(){return {code:200,headers:{},status(code){this.code=code;return this;},json(data){this.data=data;return this;},type(type){this.mime=type;return this;},setHeader(k,v){this.headers[k]=v;},send(data){this.data=data;},end(){}};}
for(const [mime,inline] of [['text/html',false],['image/svg+xml',false],['application/pdf',true],['image/png',true]]){
 const info=db.prepare('INSERT INTO incident_files(incident_id,file_name,mime_type,data) VALUES(1,?,?,?)').run('test-file',mime,Buffer.from('test'));
 const res=response();routes.get('get /api/incident-files/:id')({params:{id:info.lastInsertRowid}},res);
 assert.equal(res.headers['X-Content-Type-Options'],'nosniff');
 assert.equal(res.headers['Content-Disposition'].startsWith('inline;'),inline);
 if(!inline)assert.equal(res.mime,'application/octet-stream');
}
db.prepare("INSERT INTO monthly_closures(month_key,status,approved_by) VALUES('2025-01','approved',1)").run();
db.prepare("INSERT INTO daily_reports(id,report_date) VALUES(1,'2025-01-10')").run();
let res=response();
routes.get('put /api/monthly-close/:month')({params:{month:'2025-01'},body:{status:'completed'},user:{id:2,role:'editor'}},res);
assert.equal(res.code,403);assert.equal(db.prepare('SELECT status FROM monthly_closures').get().status,'approved');
for(const [id,date] of [[1,'2025-02-10'],[2,'2025-01-11']]){
 res=response();let passed=false;
 middleware.get('use /api/reports')({method:'PUT',originalUrl:'/api/reports/'+id,body:{report_date:date},user:{role:'editor'}},res,()=>{passed=true;});
 assert.equal(res.code,423);assert.equal(passed,false);
}
require('../monthly-entry')(app,{db,requireAuth:noop,audit:noop});
for(const endpoint of ['put /api/monthly-entry','post /api/monthly-entry/commit']){
 res=response();routes.get(endpoint)({body:{month:'2025-01',rows:[],existing_action:'replace'},user:{id:2,role:'editor'}},res);
 assert.equal(res.code,423,'Write handler must enforce the lock independently of middleware mount order');
}
res=response();routes.get('put /api/monthly-close/:month')({params:{month:'2025-01'},body:{status:'open'},user:{id:1,role:'admin'}},res);assert.equal(res.code,200);
// Execute the actual search route against 547 records, including joined duplicates.
db.exec('DELETE FROM daily_reports');
const insert=db.prepare('INSERT INTO daily_reports(id,report_date,report_no,notes,total_waste_tons,total_trucks,total_diesel) VALUES(?,?,?,?,?,?,?)');
for(let i=1;i<=547;i++)insert.run(i,new Date(Date.UTC(2025,0,i)).toISOString().slice(0,10),'MINYA-'+i,'fixture',i,1,1);
db.exec("INSERT INTO equipment VALUES(1,'a','','');INSERT INTO equipment VALUES(1,'b','','');");
const source=fs.readFileSync('server.js','utf8');
const search=source.split('\n').find(line=>line.startsWith('app.get("/api/search"'));
vm.runInNewContext(search,{app,db,requireAuth:noop});
let ids=[];
for(let offset=0;offset<547;offset+=100){
 res=response();routes.get('get /api/search')({query:{limit:'100',offset:String(offset)}},res);
 assert.equal(res.data.total,547);ids.push(...res.data.reports.map(r=>r.id));
 assert.equal(res.data.has_more,offset+res.data.reports.length<547);
}
assert.equal(new Set(ids).size,547);assert.equal(ids.length,547);
res=response();routes.get('get /api/search')({query:{from:'2025-01-01',to:'2025-01-31'}},res);assert.equal(res.data.total,31);
// Keep report identifiers intact while formatting standalone dates.
const datePattern=/(?<![\w-])(\d{4})-(\d{2})-(\d{2})(?![\w-])/g;
assert.equal('MINYA-2026-06-30'.replace(datePattern,(_,y,m,d)=>d+'/'+m+'/'+y),'MINYA-2026-06-30');
assert.equal('2026-06-30'.replace(datePattern,(_,y,m,d)=>d+'/'+m+'/'+y),'30/06/2026');
const workdaySource=fs.readFileSync('public/workday-ui.js','utf8');
const filterSource=workdaySource.slice(workdaySource.indexOf('  function periodFilter('),workdaySource.indexOf('  async function renderPeriodSummary'));
const filters={annualYearFilter:{value:'2026'},archiveMonthFilter:{value:'2025-01'}};
const context={location:{pathname:'/annual'},$:id=>filters[id]};vm.createContext(context);vm.runInContext(filterSource,context);
const dates=[{report_date:'2025-01-01'},{report_date:'2026-01-01'},{report_date:'2026-02-01'}];
assert.equal(context.periodFilter(dates).length,2);filters.annualYearFilter.value='2025';assert.equal(context.periodFilter(dates).length,1);
assert.ok(fs.readFileSync('public/js/app-review-polish.js','utf8').includes(datePattern.source));
const elements=Object.fromEntries(['annualSummarySection','annualSummaryCards','annualComparisonSection','annualYearFilter','annualComparisonTitle','annualComparisonGrid','annualComparisonEmpty'].map(id=>[id,{style:{},value:'2026',textContent:'',innerHTML:''}]));
const comparison={console,document:{getElementById:id=>elements[id]},formatNumber:String,window:{annualPreviousReports:{year:'2025',reports:[{report_date:'2025-01-01',total_waste_tons:1},{report_date:'2025-01-02',total_waste_tons:100},{report_date:'2025-01-03',total_waste_tons:2}]}},archiveReports:[{report_date:'2026-01-01',total_waste_tons:10},{report_date:'2026-01-03',total_waste_tons:20}]};
vm.createContext(comparison);vm.runInContext(fs.readFileSync('public/js/app-annual-comparison.js','utf8'),comparison);
comparison.renderAnnualComparison().then(()=>{assert.ok(elements.annualComparisonGrid.innerHTML.includes('2025: 3 طن'));assert.ok(!elements.annualComparisonGrid.innerHTML.includes('2025: 103 طن'));console.log('Annual filters and matched-date comparison passed.');}).catch(error=>{console.error(error);process.exitCode=1;});
db.close();console.log('Review regression tests passed: safe attachments, locked months, complete pagination and report identifiers.');
