module.exports = function installWorkdayClassification(app,{db,requireAuth,audit}){
  const VALID_TYPES=new Set(['official','holiday']);
  const FIXED_HOLIDAYS={
    '01-01':'رأس السنة الميلادية',
    '01-07':'عيد الميلاد المجيد الشرقي',
    '03-08':'يوم المرأة العالمي',
    '04-12':'عيد الفصح المجيد',
    '05-01':'عيد العمال',
    '11-15':'عيد الاستقلال',
    '12-25':'عيد الميلاد المجيد الغربي'
  };

  const columns=new Set(db.pragma('table_info(daily_reports)').map(c=>c.name));
  if(!columns.has('workday_type')) db.exec("ALTER TABLE daily_reports ADD COLUMN workday_type TEXT NOT NULL DEFAULT 'official'");
  if(!columns.has('workday_reason')) db.exec("ALTER TABLE daily_reports ADD COLUMN workday_reason TEXT DEFAULT ''");
  if(!columns.has('workday_manual')) db.exec("ALTER TABLE daily_reports ADD COLUMN workday_manual INTEGER NOT NULL DEFAULT 0");

  function islamicHoliday(date){
    try{
      const parts=new Intl.DateTimeFormat('en-u-ca-islamic',{month:'numeric',day:'numeric',timeZone:'Asia/Hebron'}).formatToParts(date);
      const month=Number(parts.find(p=>p.type==='month')?.value||0);
      const day=Number(parts.find(p=>p.type==='day')?.value||0);
      if(month===1&&day===1) return 'رأس السنة الهجرية - 1 محرم';
      if(month===3&&day===12) return 'ذكرى المولد النبوي الشريف - 12 ربيع الأول';
      if(month===7&&day===27) return 'ذكرى الإسراء والمعراج - 27 رجب';
    }catch{}
    return '';
  }

  function classify(reportDate){
    const value=String(reportDate||'').trim();
    const match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match) return {type:'official',reason:'دوام رسمي'};
    const date=new Date(`${value}T12:00:00+03:00`);
    if(Number.isNaN(date.getTime())) return {type:'official',reason:'دوام رسمي'};
    if(date.getDay()===5) return {type:'holiday',reason:'يوم الجمعة - عطلة رسمية / دوام طوارئ'};
    const fixed=FIXED_HOLIDAYS[`${match[2]}-${match[3]}`];
    if(fixed) return {type:'holiday',reason:`${fixed} - عطلة رسمية / دوام طوارئ`};
    const hijri=islamicHoliday(date);
    if(hijri) return {type:'holiday',reason:`${hijri} - عطلة رسمية / دوام طوارئ`};
    return {type:'official',reason:'دوام رسمي'};
  }

  function setForDate(reportDate,type=null,manual=false,reason=''){
    const auto=classify(reportDate);
    const chosen=VALID_TYPES.has(type)?type:auto.type;
    const chosenReason=String(reason||'').trim().slice(0,250) || (manual ? (chosen==='holiday'?'محدد يدويًا: عطلة رسمية / دوام طوارئ':'محدد يدويًا: دوام رسمي') : auto.reason);
    db.prepare(`UPDATE daily_reports SET workday_type=?,workday_reason=?,workday_manual=? WHERE report_date=?`)
      .run(chosen,chosenReason,manual?1:0,String(reportDate||''));
  }

  const backfill=db.transaction(()=>{
    const rows=db.prepare(`SELECT report_date FROM daily_reports WHERE COALESCE(workday_manual,0)=0`).all();
    const stmt=db.prepare(`UPDATE daily_reports SET workday_type=?,workday_reason=?,workday_manual=0 WHERE report_date=?`);
    for(const row of rows){const auto=classify(row.report_date);stmt.run(auto.type,auto.reason,row.report_date);}
  });
  backfill();

  app.use((req,res,next)=>{
    const method=String(req.method||'').toUpperCase();
    const isReportWrite=(method==='POST'&&req.path==='/api/reports')||(method==='PUT'&&/^\/api\/reports\/\d+$/.test(req.path));
    if(!isReportWrite) return next();
    const reportDate=String(req.body?.report_date||'').trim();
    const requested=String(req.body?.workday_type||'').trim();
    const manual=VALID_TYPES.has(requested);
    const reason=String(req.body?.workday_reason||'').trim();
    res.on('finish',()=>{
      if(res.statusCode>=200&&res.statusCode<300&&/^\d{4}-\d{2}-\d{2}$/.test(reportDate)){
        try{setForDate(reportDate,manual?requested:null,manual,reason);}catch(error){console.error('workday classification save failed',error);}
      }
    });
    next();
  });

  app.get('/api/workdays',requireAuth,(req,res)=>{
    const rows=db.prepare(`SELECT id,report_date,workday_type,workday_reason,workday_manual FROM daily_reports ORDER BY report_date DESC`).all();
    res.json({ok:true,workdays:rows});
  });

  app.put('/api/workdays/:id',requireAuth,(req,res)=>{
    if(!['admin','editor'].includes(req.user?.role)) return res.status(403).json({ok:false,message:'لا توجد صلاحية للتعديل'});
    const id=Number(req.params.id);const type=String(req.body?.workday_type||'').trim();
    if(!Number.isInteger(id)||id<=0||!VALID_TYPES.has(type)) return res.status(400).json({ok:false,message:'نوع الدوام غير صالح'});
    const row=db.prepare(`SELECT id,report_date FROM daily_reports WHERE id=?`).get(id);
    if(!row) return res.status(404).json({ok:false,message:'التقرير غير موجود'});
    const reason=String(req.body?.workday_reason||'').trim().slice(0,250);
    setForDate(row.report_date,type,true,reason);
    if(audit) audit(req.user,'UPDATE_WORKDAY','report',id,type);
    const updated=db.prepare(`SELECT id,report_date,workday_type,workday_reason,workday_manual FROM daily_reports WHERE id=?`).get(id);
    res.json({ok:true,workday:updated});
  });

  app.post('/api/workdays/recalculate',requireAuth,(req,res)=>{
    if(req.user?.role!=='admin') return res.status(403).json({ok:false,message:'للمدير فقط'});
    backfill();
    const changed=db.prepare(`SELECT COUNT(*) AS count FROM daily_reports WHERE COALESCE(workday_manual,0)=0`).get().count;
    if(audit) audit(req.user,'RECALCULATE_WORKDAYS','system','workdays',String(changed));
    res.json({ok:true,count:changed});
  });

  require('./monthly-entry')(app,{db,requireAuth,audit});
  return {classify};
};
