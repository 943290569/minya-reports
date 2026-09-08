const assert=require('assert');
const install=require('../report-totals-guard');

const routes=new Map();
const app={
  locals:{},
  post(path,...handlers){routes.set(`POST ${path}`,handlers);return this;},
  put(path,...handlers){routes.set(`PUT ${path}`,handlers);return this;}
};
install(app);

const allow=(req,res,next)=>next();
const deny=(req,res)=>res.status(403).json({ok:false,message:'لا توجد صلاحية كافية'});
const endpoint=(req,res)=>res.json({ok:true,saved:req.body});
app.post('/api/reports',allow,endpoint);
app.put('/api/reports/:id',allow,endpoint);
app.post('/api/reports-forbidden-test',deny,endpoint);

assert.strictEqual(routes.get('POST /api/reports').length,3,'create route must be auth -> totals guard -> handler');
assert.strictEqual(routes.get('PUT /api/reports/:id').length,3,'update route must be auth -> totals guard -> handler');
assert.strictEqual(routes.get('POST /api/reports-forbidden-test').length,2,'unrelated routes must not be modified');

function execute(method,registeredPath,requestPath,body,handlersOverride=null){
  let statusCode=200,payload=null;
  const req={method,path:requestPath,body:JSON.parse(JSON.stringify(body||{}))};
  const res={status(code){statusCode=code;return this;},json(value){payload=value;return this;}};
  const handlers=handlersOverride||routes.get(`${method} ${registeredPath}`)||[];
  let index=0;
  const next=()=>{const fn=handlers[index++];if(fn)fn(req,res,next);};
  next();
  return {req,statusCode,payload};
}

const details={
  operations:[
    {operation_name:'مكب نفايات المنيا',vehicle_count:90,quantity:1200.25},
    {operation_name:'مواد التغطية (طمم)',vehicle_count:3,quantity:40},
    {operation_name:'كميات المياه للتعقيم والترطيب',vehicle_count:2,quantity:12},
    {operation_name:'كميات العصارة المرحلة',vehicle_count:5,quantity:20}
  ],
  stations:[
    {station_name:'محطة ترحيل الخليل',truck_count:7,waste_tons:80},
    {station_name:'محطة ترحيل يطا',truck_count:10,waste_tons:90.02}
  ],
  equipment:[
    {equipment_name:'مدحلة 36 طن',diesel_liters:55.5},
    {equipment_name:'جرافة جنزير 2023',diesel_liters:44.5}
  ]
};
const expected={total_trucks:107,total_waste_tons:1370.27,total_diesel:100};

const ok=execute('POST','/api/reports','/api/reports',{...details,...expected});
assert.strictEqual(ok.statusCode,200,'matching totals must pass');
assert.strictEqual(ok.payload?.ok,true);
assert.deepStrictEqual({
  total_trucks:ok.req.body.total_trucks,
  total_waste_tons:ok.req.body.total_waste_tons,
  total_diesel:ok.req.body.total_diesel
},expected,'support-operation vehicles/quantities must be excluded from canonical totals');

const missing=execute('POST','/api/reports','/api/reports',details);
assert.strictEqual(missing.statusCode,200,'missing top-level totals must be normalized from details');
assert.deepStrictEqual({
  total_trucks:missing.req.body.total_trucks,
  total_waste_tons:missing.req.body.total_waste_tons,
  total_diesel:missing.req.body.total_diesel
},expected);

const bad=execute('PUT','/api/reports/:id','/api/reports/42',{...details,...expected,total_trucks:110});
assert.strictEqual(bad.statusCode,400,'mismatched totals must be blocked');
assert.strictEqual(bad.payload?.ok,false);
assert.ok(String(bad.payload?.message||'').includes('لا تطابق التفاصيل'));
assert.strictEqual(bad.payload?.expected_totals?.total_trucks,107);

const createHandlers=routes.get('POST /api/reports');
const viewer=execute('POST','/api/reports','/api/reports',{...details,...expected,total_trucks:999},[deny,...createHandlers.slice(1)]);
assert.strictEqual(viewer.statusCode,403,'authorization must run before totals validation');
assert.strictEqual(viewer.payload?.message,'لا توجد صلاحية كافية');

console.log('Report totals guard regression test passed.');
