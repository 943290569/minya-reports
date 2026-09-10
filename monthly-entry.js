module.exports = function installMonthlyEntry(app, { db, requireAuth, requireRole, audit }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_entry_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL UNIQUE,
      data_json TEXT NOT NULL DEFAULT '{}',
      updated_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_monthly_entry_date ON monthly_entry_rows(report_date);
  `);

  const defaultCrews = () => [
    { crew_name: 'سائقين جرافات واليات', crew_count: 4, notes: '' },
    { crew_name: 'سائقين شحن(قلابات)', crew_count: 2, notes: '' },
    { crew_name: 'عمال زراعة', crew_count: 1, notes: '' },
    { crew_name: 'استقبال وتوجيه الشاحنات', crew_count: 2, notes: '' },
    { crew_name: 'عمال تنظيف وتطاير داخلي', crew_count: 4, notes: '' },
    { crew_name: 'عمال تنظيف تطاير خارجي', crew_count: 5, notes: '' }
  ];
  const defaultOperations = () => [
    { operation_name: 'مكب نفايات المنيا', vehicle_count: 0, quantity: 0, unit: 'طن', notes: '' },
    { operation_name: 'مواد التغطية (اسلوب)', vehicle_count: 0, quantity: 0, unit: 'نقلة', notes: '' },
    { operation_name: 'مواد التغطية (طمم)', vehicle_count: 0, quantity: 0, unit: 'كوب', notes: '' },
    { operation_name: 'كميات المياه للتعقيم والترطيب', vehicle_count: 0, quantity: 0, unit: 'كوب', notes: '' },
    { operation_name: 'عدد مرات رش المياه', vehicle_count: 0, quantity: 0, unit: 'مرة', notes: '' },
    { operation_name: 'كميات العصارة المرحلة', vehicle_count: 0, quantity: 0, unit: 'كوب', notes: '' },
    { operation_name: 'خط الفرز', vehicle_count: 0, quantity: 0, unit: 'طن', notes: '' },
    { operation_name: 'طمم خارجي', vehicle_count: 0, quantity: 0, unit: 'طن', notes: '' }
  ];
  const defaultStations = () => [
    { station_name: 'محطة ترحيل الخليل', truck_count: 0, waste_tons: 0, unit: 'طن', notes: '' },
    { station_name: 'محطة ترحيل ترقوميا', truck_count: 0, waste_tons: 0, unit: 'طن', notes: '' },
    { station_name: 'محطة ترحيل يطا', truck_count: 0, waste_tons: 0, unit: 'طن', notes: '' }
  ];
  const equipmentNames = ['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'];
  const defaultEquipment = () => equipmentNames.map(equipment_name => ({ equipment_name, operating_status: 'يعمل', status_description: '', working_hours: 0, diesel_liters: 0, notes: '' }));

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
  }
  function normalizeMonth(value) { return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : ''; }
  function isRainy(weather) { return /مطر|ماطر|أمطار|امطار|rain/i.test(String(weather || '')); }
  function defaultWorkday(date) { return new Date(`${date}T00:00:00Z`).getUTCDay() === 5 ? {workday_type:'holiday',workday_reason:'الجمعة - دوام طوارئ',workday_manual:0} : {workday_type:'official',workday_reason:'',workday_manual:0}; }
  function defaultRow(date) {
    return { report_date: date, weather: 'مشمس', temperature: 10, start_time: '04:00', end_time: '19:00', notes: '', crews: defaultCrews(), operations: defaultOperations(), stations: defaultStations(), equipment: defaultEquipment(), ...defaultWorkday(date), auto: { water: true, workday: true } };
  }
  function sanitizeArray(value) { return Array.isArray(value) ? value : []; }
  function normalizeRow(input, date) {
    const base = defaultRow(date);
    const out = { ...base, ...(input && typeof input === 'object' ? input : {}), report_date: date };
    out.crews = sanitizeArray(out.crews).length ? out.crews : base.crews;
    out.operations = sanitizeArray(out.operations).length ? out.operations : base.operations;
    out.stations = sanitizeArray(out.stations).length ? out.stations : base.stations;
    out.equipment = sanitizeArray(out.equipment).length ? out.equipment : base.equipment;
    out.auto = { ...base.auto, ...(out.auto || {}) };
    if (out.auto.workday) Object.assign(out, defaultWorkday(date));
    if (out.auto.water && isRainy(out.weather)) {
      out.operations = out.operations.map(op => {
        if (['كميات المياه للتعقيم والترطيب','عدد مرات رش المياه'].includes(String(op.operation_name || '').trim())) return { ...op, vehicle_count:0, quantity:0 };
        return op;
      });
    }
    return out;
  }
  function canonicalTotals(row) {
    const norm = s => String(s || '').replace(/\s+/g,'');
    const landfill = row.operations.filter(x => norm(x.operation_name).includes('مكبنفاياتالمنيا'));
    const landfillTons = landfill.reduce((s,x)=>s+Number(x.quantity||0),0);
    const landfillTrucks = landfill.reduce((s,x)=>s+Number(x.vehicle_count||0),0);
    const stationTons = row.stations.reduce((s,x)=>s+Number(x.waste_tons||0),0);
    const stationTrucks = row.stations.reduce((s,x)=>s+Number(x.truck_count||0),0);
    const diesel = row.equipment.reduce((s,x)=>s+Number(x.diesel_liters||0),0);
    return { total_waste_tons: landfillTons + stationTons, total_trucks: landfillTrucks + stationTrucks, total_diesel: diesel };
  }
  function insertChildren(reportId,row) {
    const ci=db.prepare(`INSERT INTO crews (report_id,crew_name,crew_count,notes) VALUES (?,?,?,?)`);
    row.crews.forEach(x=>ci.run(reportId,x.crew_name||'',Number(x.crew_count||0),x.notes||''));
    const oi=db.prepare(`INSERT INTO operations (report_id,operation_name,start_time,end_time,vehicle_count,quantity,unit,notes) VALUES (?,?,?,?,?,?,?,?)`);
    row.operations.forEach(x=>oi.run(reportId,x.operation_name||'',x.start_time||'',x.end_time||'',Number(x.vehicle_count||0),Number(x.quantity||0),x.unit||'',x.notes||''));
    const si=db.prepare(`INSERT INTO transfer_stations (report_id,station_name,truck_count,waste_tons,unit,notes) VALUES (?,?,?,?,?,?)`);
    row.stations.forEach(x=>si.run(reportId,x.station_name||'',Number(x.truck_count||0),Number(x.waste_tons||0),x.unit||'طن',x.notes||''));
    const ei=db.prepare(`INSERT INTO equipment (report_id,equipment_name,operating_status,status_description,working_hours,diesel_liters,notes) VALUES (?,?,?,?,?,?,?)`);
    row.equipment.forEach(x=>ei.run(reportId,x.equipment_name||'',x.operating_status||'',x.status_description||'',Number(x.working_hours||0),Number(x.diesel_liters||0),x.notes||''));
  }
  function hasWorkdayColumns() {
    try { return db.prepare(`PRAGMA table_info(daily_reports)`).all().some(x=>x.name==='workday_type'); } catch { return false; }
  }
  function saveAsReport(row, existing, user) {
    const totals = canonicalTotals(row);
    const approvedAt = user.role === 'admin' ? new Date().toISOString() : null;
    const approvedName = user.role === 'admin' ? (user.display_name || user.username) : '';
    let reportId;
    if (existing) {
      reportId = existing.id;
      db.prepare(`UPDATE daily_reports SET report_date=?,report_no=?,weather=?,temperature=?,start_time=?,end_time=?,total_trucks=?,total_waste_tons=?,total_diesel=?,notes=?,workflow_status=?,submitted_at=NULL,submitted_by=NULL,approved_at=?,approved_by=?,approved_by_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(row.report_date,`MINYA-${row.report_date}`,row.weather||'',Number(row.temperature||0),row.start_time||'',row.end_time||'',totals.total_trucks,totals.total_waste_tons,totals.total_diesel,row.notes||'',user.role==='admin'?'approved':'draft',approvedAt,user.role==='admin'?user.id:null,approvedName,reportId);
      ['crews','operations','transfer_stations','equipment'].forEach(t=>db.prepare(`DELETE FROM ${t} WHERE report_id=?`).run(reportId));
    } else {
      const r=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,workflow_status,approved_at,approved_by,approved_by_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(row.report_date,`MINYA-${row.report_date}`,row.weather||'',Number(row.temperature||0),row.start_time||'',row.end_time||'',totals.total_trucks,totals.total_waste_tons,totals.total_diesel,row.notes||'',user.role==='admin'?'approved':'draft',approvedAt,user.role==='admin'?user.id:null,approvedName);
      reportId = Number(r.lastInsertRowid);
    }
    insertChildren(reportId,row);
    if (hasWorkdayColumns()) db.prepare(`UPDATE daily_reports SET workday_type=?,workday_reason=?,workday_manual=? WHERE id=?`).run(row.workday_type||'official',row.workday_reason||'',Number(row.workday_manual||0),reportId);
    return { id: reportId, ...totals };
  }

  app.get('/api/monthly-entry', requireAuth, (req,res)=>{
    const month=normalizeMonth(req.query.month);
    if(!month) return res.status(400).json({ok:false,message:'الشهر غير صالح'});
    const rows=db.prepare(`SELECT report_date,data_json,updated_at FROM monthly_entry_rows WHERE report_date LIKE ? ORDER BY report_date`).all(`${month}-%`).map(x=>({report_date:x.report_date,data:normalizeRow(JSON.parse(x.data_json||'{}'),x.report_date),updated_at:x.updated_at}));
    const existing=db.prepare(`SELECT id,report_date,workflow_status FROM daily_reports WHERE report_date LIKE ? ORDER BY report_date`).all(`${month}-%`);
    res.json({ok:true,month,rows,existing});
  });

  app.put('/api/monthly-entry', requireRole('admin','editor'), (req,res)=>{
    const month=normalizeMonth(req.body?.month); const rows=Array.isArray(req.body?.rows)?req.body.rows:[];
    if(!month) return res.status(400).json({ok:false,message:'الشهر غير صالح'});
    if(rows.length>31) return res.status(400).json({ok:false,message:'الحد الأقصى 31 يومًا'});
    const upsert=db.prepare(`INSERT INTO monthly_entry_rows (report_date,data_json,updated_by,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(report_date) DO UPDATE SET data_json=excluded.data_json,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`);
    const tx=db.transaction(()=>{ for(const item of rows){ const date=String(item.report_date||''); if(!isValidDate(date)||!date.startsWith(`${month}-`)) throw new Error(`تاريخ غير صالح: ${date}`); const data=normalizeRow(item.data||item,date); upsert.run(date,JSON.stringify(data),req.user.id); } });
    try { tx(); audit(req.user,'SAVE_MONTHLY_ENTRY','monthly_entry',month,`${rows.length} rows`); res.json({ok:true,saved:rows.length,message:'تم تحديث بيانات الشهر'}); } catch(error){ res.status(400).json({ok:false,message:error.message}); }
  });

  app.post('/api/monthly-entry/commit', requireRole('admin','editor'), (req,res)=>{
    const month=normalizeMonth(req.body?.month); const existingAction=String(req.body?.existing_action||'cancel');
    if(!month) return res.status(400).json({ok:false,message:'الشهر غير صالح'});
    if(!['ignore','replace','cancel'].includes(existingAction)) return res.status(400).json({ok:false,message:'خيار التقارير الموجودة غير صالح'});
    const staged=db.prepare(`SELECT report_date,data_json FROM monthly_entry_rows WHERE report_date LIKE ? ORDER BY report_date`).all(`${month}-%`);
    if(!staged.length) return res.status(400).json({ok:false,message:'لا توجد بيانات محفوظة لهذا الشهر'});
    const conflicts=staged.map(x=>x.report_date).filter(date=>db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(date));
    if(conflicts.length && existingAction==='cancel') return res.status(409).json({ok:false,conflicts,message:`يوجد ${conflicts.length} تقريرًا محفوظًا. اختر تجاهل أو استبدال.`});
    const result={created:0,replaced:0,ignored:0,dates:[]};
    const tx=db.transaction(()=>{
      for(const item of staged){
        const existing=db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(item.report_date);
        if(existing && existingAction==='ignore'){ result.ignored++; continue; }
        const row=normalizeRow(JSON.parse(item.data_json||'{}'),item.report_date);
        saveAsReport(row,existing,req.user);
        if(existing) result.replaced++; else result.created++;
        result.dates.push(item.report_date);
      }
    });
    try { tx(); audit(req.user,'COMMIT_MONTHLY_ENTRY','monthly_entry',month,JSON.stringify(result)); res.json({ok:true,...result,message:`تم إنشاء ${result.created} واستبدال ${result.replaced} وتجاهل ${result.ignored}`}); } catch(error){ res.status(500).json({ok:false,message:'فشل اعتماد تقارير الشهر',error:error.message}); }
  });
};
