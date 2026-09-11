module.exports=function installMonthlyClose(app,{db,requireRole,audit}){
  db.exec(`CREATE TABLE IF NOT EXISTS monthly_closures(
    month_key TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT DEFAULT '',
    completed_at TEXT,
    completed_by INTEGER,
    approved_at TEXT,
    approved_by INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`);
  const any=requireRole('admin','editor','viewer');
  const valid=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(m||''));
  const current=()=>new Date().toISOString().slice(0,7);
  const count=(sql,arg)=>{try{return Number(db.prepare(sql).get(arg)?.c||0)}catch{return 0}};
  const get=m=>{
    const r=db.prepare('SELECT * FROM monthly_closures WHERE month_key=?').get(m)||{};
    const status=r.status||'open';
    return {month_key:m,status,status_label:status==='approved'?'معتمد':status==='completed'?'مكتمل':m===current()?'جاري':m<current()?'بانتظار الإغلاق':'قادم',notes:r.notes||'',completed_at:r.completed_at||null,approved_at:r.approved_at||null,reports_count:count("SELECT COUNT(*) c FROM daily_reports WHERE report_date LIKE ?",`${m}-%`),approved_reports_count:count("SELECT COUNT(*) c FROM daily_reports WHERE report_date LIKE ? AND workflow_status='approved'",`${m}-%`),staged_rows_count:count("SELECT COUNT(*) c FROM monthly_entry_rows WHERE report_date LIKE ?",`${m}-%`),locked:status==='approved'};
  };
  const locked=m=>!!db.prepare("SELECT 1 FROM monthly_closures WHERE month_key=? AND status='approved'").get(m);
  app.use('/api/monthly-entry',any,(req,res,next)=>{
    if(['GET','HEAD','OPTIONS'].includes(req.method)||req.user?.role==='admin')return next();
    const m=String(req.body?.month||req.query?.month||'');
    if(valid(m)&&locked(m))return res.status(423).json({ok:false,message:`شهر ${m} معتمد ومقفل. التعديل متاح للمدير فقط.`});
    next();
  });
  app.use('/api/reports',any,(req,res,next)=>{
    if(['GET','HEAD','OPTIONS'].includes(req.method)||req.user?.role==='admin')return next();
    let m=String(req.body?.report_date||'').slice(0,7);
    const hit=String(req.originalUrl||'').match(/^\/api\/reports\/(\d+)/);
    if(!valid(m)&&hit){const row=db.prepare('SELECT report_date FROM daily_reports WHERE id=?').get(Number(hit[1]));m=String(row?.report_date||'').slice(0,7)}
    if(valid(m)&&locked(m))return res.status(423).json({ok:false,message:`شهر ${m} معتمد ومقفل. التعديل متاح للمدير فقط.`});
    next();
  });
  app.get('/api/monthly-close',any,(req,res)=>{
    const year=String(req.query.year||new Date().getUTCFullYear());
    if(!/^\d{4}$/.test(year))return res.status(400).json({ok:false,message:'السنة غير صالحة'});
    res.json({ok:true,year,months:Array.from({length:12},(_,i)=>get(`${year}-${String(i+1).padStart(2,'0')}`))});
  });
  app.get('/api/monthly-close/:month',any,(req,res)=>{
    const m=String(req.params.month||''); if(!valid(m))return res.status(400).json({ok:false,message:'الشهر غير صالح'}); res.json({ok:true,month:get(m)});
  });
  app.put('/api/monthly-close/:month',any,(req,res)=>{
    const m=String(req.params.month||''),status=String(req.body?.status||''),notes=String(req.body?.notes||'').trim().slice(0,1000);
    if(!valid(m)||!['open','completed','approved'].includes(status))return res.status(400).json({ok:false,message:'بيانات الإغلاق غير صالحة'});
    if(m>current())return res.status(400).json({ok:false,message:'لا يمكن إغلاق شهر مستقبلي'});
    if(status==='approved'&&req.user?.role!=='admin')return res.status(403).json({ok:false,message:'اعتماد الشهر متاح للمدير فقط'});
    if(status==='open'&&req.user?.role!=='admin')return res.status(403).json({ok:false,message:'إعادة فتح الشهر متاحة للمدير فقط'});
    if(status==='completed'&&!['admin','editor'].includes(req.user?.role))return res.status(403).json({ok:false,message:'لا توجد صلاحية لإكمال الشهر'});
    const old=db.prepare('SELECT * FROM monthly_closures WHERE month_key=?').get(m)||{};
    const completedAt=status==='open'?null:(old.completed_at||new Date().toISOString());
    const completedBy=status==='open'?null:(old.completed_by||req.user.id);
    const approvedAt=status==='approved'?new Date().toISOString():null;
    const approvedBy=status==='approved'?req.user.id:null;
    db.prepare(`INSERT INTO monthly_closures(month_key,status,notes,completed_at,completed_by,approved_at,approved_by,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(month_key) DO UPDATE SET status=excluded.status,notes=excluded.notes,completed_at=excluded.completed_at,completed_by=excluded.completed_by,approved_at=excluded.approved_at,approved_by=excluded.approved_by,updated_at=CURRENT_TIMESTAMP`).run(m,status,notes,completedAt,completedBy,approvedAt,approvedBy);
    audit?.(req.user,'UPDATE_MONTHLY_CLOSE','monthly_close',m,`${old.status||'open'} -> ${status}`);
    res.json({ok:true,month:get(m)});
  });
};
