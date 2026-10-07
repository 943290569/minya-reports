const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const fields = new Map();
const field = id => {
  if (!fields.has(id)) fields.set(id, {value:'', innerHTML:'', textContent:''});
  return fields.get(id);
};
let fetcher = async () => ({ok:true, json:async()=>({ok:true,files:[{id:12,original_name:'فاتورة 12.pdf'}]})});
const context = {
  document:{getElementById:field,addEventListener(){},querySelector(){return {scrollIntoView(){}};}},
  fetch:(...args)=>fetcher(...args),scrollTo(){},URLSearchParams,Intl,Date
};
vm.createContext(context);
const client = fs.readFileSync(path.join(__dirname,'../public/js/app-equipment-maintenance-finance.js'),'utf8');
vm.runInContext(client.replace(/\}\)\(\);\s*$/, `globalThis.test={suggestFromName,applySuggestions,draftFromArchive,clear,body,loadVendorFiles,setVendors:v=>vendors=v,setEditing:v=>editing=v,getEditing:()=>editing};})();`),context);
const t = context.test;
(async()=>{
  t.setVendors([{name:'شركة الأمل',folder_id:4}]);
  let s=t.suggestFromName('شركة الأمل فاتورة رقم ١٢٥ زيوت 2026_10_07.pdf');
  assert.equal(s.date,'2026-10-07');assert.equal(s.invoice,'125');assert.equal(s.vendor,'شركة الأمل');assert.equal(s.type,'زيوت وفلاتر');
  assert.equal(t.suggestFromName('invoice 2026-10-07.pdf').invoice,'');
  assert.equal(t.suggestFromName('invoice 1.pdf').invoice,'1');
  assert.equal(t.suggestFromName('31-02-2026.pdf').date,'');
  assert.equal(t.suggestFromName('29-02-2024.pdf').date,'2024-02-29');
  field('mfParts').value='1850';field('mfLabor').value='300';field('mfStatus').value='مدفوعة';t.setEditing(99);
  t.draftFromArchive({dataset:{draft:'55',asset:'2',name:'فحص.pdf',date:'2026-10-07'}});
  assert.equal(t.getEditing(),0);assert.equal(t.body().parts_cost,'');assert.equal(t.body().labor_cost,'');assert.equal(t.body().service_date,'');assert.equal(t.body().source_file_id,55);assert.equal(t.body().invoice_status,'غير مدفوعة');
  field('mfVendor').value='شركة الأمل';
  await t.loadVendorFiles({selectedId:12,fileName:'فاتورة 12.pdf'});
  assert.equal(t.body().invoice_file_id,12);assert.equal(field('mfInvoiceFile').value,'12');
  let complete;
  fetcher=()=>new Promise(resolve=>complete=resolve);
  const pending=t.loadVendorFiles({selectedId:12,fileName:'فاتورة 12.pdf'});
  t.clear();complete({ok:true,json:async()=>({ok:true,files:[{id:12,original_name:'قديم.pdf'}]})});await pending;
  assert.equal(t.body().invoice_file_id,null);assert.equal(field('mfInvoiceFile').innerHTML.includes('قديم'),false);
  console.log('Maintenance filename, fresh draft, invoice preservation and stale-response checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
// Exercise the real route handlers against an in-memory SQLite database.
const {DatabaseSync}=require('node:sqlite');
const sqlite=new DatabaseSync(':memory:');
const db={exec:sql=>sqlite.exec(sql),prepare:sql=>sqlite.prepare(sql),pragma:sql=>sqlite.prepare('PRAGMA '+sql).all(),transaction:fn=>(...args)=>{sqlite.exec('BEGIN');try{const result=fn(...args);sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
db.exec(`CREATE TABLE equipment_assets(id INTEGER PRIMARY KEY,name TEXT,current_meter REAL,updated_at TEXT);
CREATE TABLE equipment_work_orders(id INTEGER PRIMARY KEY,order_number TEXT);
CREATE TABLE cloud_files(id INTEGER PRIMARY KEY,status TEXT,original_name TEXT);
CREATE TABLE cloud_file_links(file_id INTEGER,entity_type TEXT,entity_id INTEGER,created_by INTEGER,UNIQUE(file_id,entity_type,entity_id));
INSERT INTO equipment_assets VALUES(1,'CAT 950H',0,NULL);
INSERT INTO cloud_files VALUES(12,'ready','فاتورة 12.pdf'),(13,'ready','فاتورة 13.pdf');`);
const routes=new Map();
const app=Object.fromEntries(['get','post','put','delete'].map(method=>[method,(url,...handlers)=>routes.set(method+' '+url,handlers.at(-1))]));
require('../equipment-maintenance-finance')(app,{db,requireAuth(){},requireRole:()=>()=>{},audit(){}});
function request(method,url,body,id){let code=200,result;const res={status(n){code=n;return this;},json(value){result=value;return this;}};routes.get(method+' '+url)({body,params:{id},user:{id:1,role:'admin'}},res);return{code,result};}
const created=request('post','/api/equipment-maintenance/records',{asset_id:1,service_date:'2026-10-07',invoice_file_id:12});
assert.equal(created.code,200);
const recordId=Number(created.result.id);
assert.equal(request('put','/api/equipment-maintenance/records/:id',{invoice_file_id:999},recordId).code,400);
assert.equal(db.prepare('SELECT invoice_file_id FROM equipment_maintenance_records WHERE id=?').get(recordId).invoice_file_id,12);
request('put','/api/equipment-maintenance/records/:id',{invoice_file_id:13},recordId);
assert.equal(db.prepare('SELECT COUNT(*) c FROM cloud_file_links WHERE file_id=12').get().c,0);
request('put','/api/equipment-maintenance/records/:id',{invoice_file_id:null},recordId);
assert.equal(db.prepare('SELECT invoice_file_id FROM equipment_maintenance_records WHERE id=?').get(recordId).invoice_file_id,null);
assert.equal(db.prepare('SELECT COUNT(*) c FROM cloud_file_links').get().c,0);
sqlite.close();
console.log('Maintenance invoice validation, replacement and removal checks passed.');
