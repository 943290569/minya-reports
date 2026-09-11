module.exports=function installFleetEnvironment(app,{db,requireAuth,requireRole,audit}){
  db.exec(`
    CREATE TABLE IF NOT EXISTS fleet_vehicles(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_no TEXT NOT NULL UNIQUE,
      vehicle_name TEXT NOT NULL,
      vehicle_type TEXT DEFAULT '',
      driver_name TEXT DEFAULT '',
      driver_license_no TEXT DEFAULT '',
      driver_license_expiry TEXT DEFAULT '',
      vehicle_license_expiry TEXT DEFAULT '',
      insurance_expiry TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_fleet_driver ON fleet_vehicles(driver_name);
    CREATE TABLE IF NOT EXISTS environmental_logs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date TEXT NOT NULL UNIQUE,
      leachate_m3 REAL DEFAULT 0,
      tanker_trips REAL DEFAULT 0,
      cover_trips REAL DEFAULT 0,
      cover_quantity REAL DEFAULT 0,
      cover_unit TEXT DEFAULT 'نقلة',
      notes TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_environmental_date ON environmental_logs(log_date);
  `);
  const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
  const dateOk=v=>!v||/^\d{4}-\d{2}-\d{2}$/.test(String(v));
  const daysUntil=v=>{if(!v||!dateOk(v))return null;const t=new Date(`${v}T00:00:00Z`).getTime();return Number.isFinite(t)?Math.ceil((t-Date.now())/86400000):null};
  app.get('/api/ops/fleet',requireAuth,(req,res)=>{const q=clean(req.query.q,100);let sql='SELECT * FROM fleet_vehicles WHERE 1=1',p=[];if(q){const like=`%${q}%`;sql+=' AND (plate_no LIKE ? OR vehicle_name LIKE ? OR vehicle_type LIKE ? OR driver_name LIKE ? OR driver_license_no LIKE ?)';p=[like,like,like,like,like]}sql+=' ORDER BY is_active DESC,vehicle_name,plate_no';const vehicles=db.prepare(sql).all(...p).map(v=>({...v,driver_license_days:daysUntil(v.driver_license_expiry),vehicle_license_days:daysUntil(v.vehicle_license_expiry),insurance_days:daysUntil(v.insurance_expiry)}));res.json({ok:true,vehicles})});
  app.post('/api/ops/fleet',requireRole('admin','editor'),(req,res)=>{try{const b=req.body||{};if(!clean(b.plate_no,50)||!clean(b.vehicle_name,120))return res.status(400).json({ok:false,message:'رقم المركبة واسمها مطلوبان'});for(const k of ['driver_license_expiry','vehicle_license_expiry','insurance_expiry'])if(!dateOk(b[k]))return res.status(400).json({ok:false,message:'صيغة تاريخ غير صحيحة'});const r=db.prepare(`INSERT INTO fleet_vehicles(plate_no,vehicle_name,vehicle_type,driver_name,driver_license_no,driver_license_expiry,vehicle_license_expiry,insurance_expiry,notes,is_active,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(clean(b.plate_no,50),clean(b.vehicle_name,120),clean(b.vehicle_type,80),clean(b.driver_name,120),clean(b.driver_license_no,80),clean(b.driver_license_expiry,10),clean(b.vehicle_license_expiry,10),clean(b.insurance_expiry,10),clean(b.notes,1000),b.is_active===false?0:1,req.user.id);audit(req.user,'CREATE_FLEET_VEHICLE','fleet_vehicle',r.lastInsertRowid,clean(b.plate_no,50));res.json({ok:true,id:r.lastInsertRowid})}catch(e){res.status(400).json({ok:false,message:String(e.message||'').includes('UNIQUE')?'رقم المركبة موجود مسبقًا':'تعذر حفظ المركبة'})}});
  app.put('/api/ops/fleet/:id',requireRole('admin','editor'),(req,res)=>{try{const id=Number(req.params.id),old=db.prepare('SELECT * FROM fleet_vehicles WHERE id=?').get(id);if(!old)return res.status(404).json({ok:false,message:'المركبة غير موجودة'});const b={...old,...(req.body||{})};for(const k of ['driver_license_expiry','vehicle_license_expiry','insurance_expiry'])if(!dateOk(b[k]))return res.status(400).json({ok:false,message:'صيغة تاريخ غير صحيحة'});db.prepare(`UPDATE fleet_vehicles SET plate_no=?,vehicle_name=?,vehicle_type=?,driver_name=?,driver_license_no=?,driver_license_expiry=?,vehicle_license_expiry=?,insurance_expiry=?,notes=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(clean(b.plate_no,50),clean(b.vehicle_name,120),clean(b.vehicle_type,80),clean(b.driver_name,120),clean(b.driver_license_no,80),clean(b.driver_license_expiry,10),clean(b.vehicle_license_expiry,10),clean(b.insurance_expiry,10),clean(b.notes,1000),Number(b.is_active)!==0?1:0,id);audit(req.user,'UPDATE_FLEET_VEHICLE','fleet_vehicle',id,clean(b.plate_no,50));res.json({ok:true})}catch(e){res.status(400).json({ok:false,message:'تعذر تحديث المركبة'})}});
  app.delete('/api/ops/fleet/:id',requireRole('admin'),(req,res)=>{const id=Number(req.params.id),row=db.prepare('SELECT plate_no FROM fleet_vehicles WHERE id=?').get(id);if(!row)return res.status(404).json({ok:false,message:'المركبة غير موجودة'});db.prepare('DELETE FROM fleet_vehicles WHERE id=?').run(id);audit(req.user,'DELETE_FLEET_VEHICLE','fleet_vehicle',id,row.plate_no);res.json({ok:true})});
  app.get('/api/ops/environment',requireAuth,(req,res)=>{const from=clean(req.query.from,10),to=clean(req.query.to,10);let sql='SELECT * FROM environmental_logs WHERE 1=1',p=[];if(from&&dateOk(from)){sql+=' AND log_date>=?';p.push(from)}if(to&&dateOk(to)){sql+=' AND log_date<=?';p.push(to)}sql+=' ORDER BY log_date DESC';const rows=db.prepare(sql).all(...p);const totals=rows.reduce((a,r)=>({days:a.days+1,leachate_m3:a.leachate_m3+Number(r.leachate_m3||0),tanker_trips:a.tanker_trips+Number(r.tanker_trips||0),cover_trips:a.cover_trips+Number(r.cover_trips||0),cover_quantity:a.cover_quantity+Number(r.cover_quantity||0)}),{days:0,leachate_m3:0,tanker_trips:0,cover_trips:0,cover_quantity:0});res.json({ok:true,rows,totals})});
  app.post('/api/ops/environment',requireRole('admin','editor'),(req,res)=>{const b=req.body||{};if(!b.log_date||!dateOk(b.log_date))return res.status(400).json({ok:false,message:'التاريخ مطلوب'});db.prepare(`INSERT INTO environmental_logs(log_date,leachate_m3,tanker_trips,cover_trips,cover_quantity,cover_unit,notes,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(log_date) DO UPDATE SET leachate_m3=excluded.leachate_m3,tanker_trips=excluded.tanker_trips,cover_trips=excluded.cover_trips,cover_quantity=excluded.cover_quantity,cover_unit=excluded.cover_unit,notes=excluded.notes,created_by=excluded.created_by,updated_at=CURRENT_TIMESTAMP`).run(clean(b.log_date,10),Number(b.leachate_m3||0),Number(b.tanker_trips||0),Number(b.cover_trips||0),Number(b.cover_quantity||0),clean(b.cover_unit,30)||'نقلة',clean(b.notes,1500),req.user.id);audit(req.user,'UPSERT_ENVIRONMENT_LOG','environment',b.log_date);res.json({ok:true})});
  app.delete('/api/ops/environment/:date',requireRole('admin'),(req,res)=>{const d=clean(req.params.date,10),r=db.prepare('DELETE FROM environmental_logs WHERE log_date=?').run(d);if(!r.changes)return res.status(404).json({ok:false,message:'السجل غير موجود'});audit(req.user,'DELETE_ENVIRONMENT_LOG','environment',d);res.json({ok:true})});
};