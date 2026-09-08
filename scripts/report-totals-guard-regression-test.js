const assert=require('assert');
const install=require('../report-totals-guard');

let middleware=null;
const app={locals:{},use(fn){middleware=fn;}};
install(app);
assert.strictEqual(typeof middleware,'function','report totals guard middleware must be installed');

function run(method,path,body){
  let nextCalled=false,statusCode=200,payload=null;
  const req={method,path,body:JSON.parse(JSON.stringify(body||{}))};
  const res={status(code){statusCode=code;return this;},json(value){payload=value;return this;}};
  middleware(req,res,()=>{nextCalled=true;});
  return {req,nextCalled,statusCode,payload};
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

const ok=run('POST','/api/reports',{...details,...expected});
assert.strictEqual(ok.nextCalled,true,'matching totals must pass');
assert.strictEqual(ok.statusCode,200);
assert.deepStrictEqual({
  total_trucks:ok.req.body.total_trucks,
  total_waste_tons:ok.req.body.total_waste_tons,
  total_diesel:ok.req.body.total_diesel
},expected,'support-operation vehicles/quantities must be excluded from canonical totals');

const missing=run('POST','/api/reports',details);
assert.strictEqual(missing.nextCalled,true,'missing top-level totals must be normalized from details');
assert.deepStrictEqual({
  total_trucks:missing.req.body.total_trucks,
  total_waste_tons:missing.req.body.total_waste_tons,
  total_diesel:missing.req.body.total_diesel
},expected);

const bad=run('PUT','/api/reports/42',{...details,...expected,total_trucks:110});
assert.strictEqual(bad.nextCalled,false,'mismatched totals must be blocked');
assert.strictEqual(bad.statusCode,400);
assert.strictEqual(bad.payload?.ok,false);
assert.ok(String(bad.payload?.message||'').includes('لا تطابق التفاصيل'));
assert.strictEqual(bad.payload?.expected_totals?.total_trucks,107);

const unrelated=run('POST','/api/reports/42/submit',{...details,...expected});
assert.strictEqual(unrelated.nextCalled,true,'workflow routes must not be intercepted');

console.log('Report totals guard regression test passed.');
