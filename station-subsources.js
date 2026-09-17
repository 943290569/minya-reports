module.exports=function installStationSubsources(app,{db,requireAuth,requireRole,audit}){
  db.exec(`
    CREATE TABLE IF NOT EXISTS station_subsource_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      station_name TEXT NOT NULL,
      source_name TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      quantity_tons REAL NOT NULL DEFAULT 0,
      included_in_station_total INTEGER NOT NULL DEFAULT 1,
      notes TEXT DEFAULT '',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year,month,station_name,source_name)
    );
    CREATE INDEX IF NOT EXISTS idx_station_subsource_period ON station_subsource_monthly(year,month);
    CREATE INDEX IF NOT EXISTS idx_station_subsource_station ON station_subsource_monthly(station_name,source_name);

    CREATE TABLE IF NOT EXISTS station_subsource_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      station_name TEXT NOT NULL,
      source_name TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      quantity_tons REAL NOT NULL DEFAULT 0,
      included_in_station_total INTEGER NOT NULL DEFAULT 1,
      notes TEXT DEFAULT '',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entry_date,station_name,source_name)
    );
    CREATE INDEX IF NOT EXISTS idx_station_subsource_daily_date ON station_subsource_daily(entry_date);
    CREATE INDEX IF NOT EXISTS idx_station_subsource_daily_source ON station_subsource_daily(station_name,source_name,entry_date);
  `);

  const station='محطة ترحيل يطا';
  const source='شركة عبد العزيز السعدي';
  const note='الكمية جزء من إجمالي محطة ترحيل يطا ولا تضاف مرة أخرى إلى الإجمالي العام.';
  const monthlySeed=[
    [2026,1,53,2016.58],[2026,2,29,967.87],[2026,3,37,1300.18],
    [2026,4,30,1058.55],[2026,5,34,1054.59],[2026,6,17,553.32]
  ];
  const monthlySeedStmt=db.prepare(`INSERT OR IGNORE INTO station_subsource_monthly
    (year,month,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes)
    VALUES (?,?,?,?,?,?,1,?)`);
  db.transaction(()=>monthlySeed.forEach(([year,month,count,qty])=>monthlySeedStmt.run(year,month,station,source,count,qty,note)))();

  const dailySeed=[
    ['2026-01-01',4,146.33],['2026-01-03',4,169.11],['2026-01-04',1,38.79],['2026-01-09',1,34.05],['2026-01-12',2,77.44],['2026-01-13',1,35.15],['2026-01-14',4,165.61],['2026-01-15',4,170.42],['2026-01-16',3,131.14],['2026-01-17',3,111.95],['2026-01-18',2,76.09],['2026-01-19',2,82.71],['2026-01-20',2,78.8],['2026-01-21',1,45.29],['2026-01-25',2,71.28],['2026-01-26',4,133.06],['2026-01-27',2,65.38],['2026-01-28',4,132.7],['2026-01-29',2,66.85],['2026-01-30',2,83.69],['2026-01-31',3,100.74],
    ['2026-02-01',4,134.26],['2026-02-02',4,126.77],['2026-02-03',4,127.46],['2026-02-04',1,36.95],['2026-02-05',1,34.83],['2026-02-07',1,32.93],['2026-02-10',1,29.38],['2026-02-12',1,30.83],['2026-02-13',1,33.65],['2026-02-14',1,32.53],['2026-02-15',2,65.36],['2026-02-16',2,63.84],['2026-02-20',3,108.98],['2026-02-22',3,110.1],
    ['2026-03-02',3,113.29],['2026-03-03',4,149.96],['2026-03-04',3,105.1],['2026-03-05',4,139.13],['2026-03-07',4,140.84],['2026-03-08',3,110.91],['2026-03-09',4,134.18],['2026-03-10',4,128.97],['2026-03-18',7,242.43],['2026-03-19',1,35.37],
    ['2026-04-05',3,105.92],['2026-04-06',3,108.21],['2026-04-07',2,67.53],['2026-04-08',3,111.85],['2026-04-09',3,111.12],['2026-04-10',1,39.28],['2026-04-11',2,70.5],['2026-04-12',3,106.2],['2026-04-13',1,36.77],['2026-04-14',3,97.57],['2026-04-15',1,36.47],['2026-04-16',2,68.26],['2026-04-20',3,98.87],
    ['2026-05-02',4,123.35],['2026-05-03',3,90.39],['2026-05-04',3,93.15],['2026-05-05',4,123.86],['2026-05-06',3,89.88],['2026-05-07',2,59.73],['2026-05-09',2,70.45],['2026-05-12',3,96.29],['2026-05-13',1,29.83],['2026-05-14',2,59.38],['2026-05-16',4,132.06],['2026-05-17',2,58.64],['2026-05-26',1,27.58],
    ['2026-06-15',2,63.34],['2026-06-16',3,95.97],['2026-06-17',3,104.23],['2026-06-18',4,128.25],['2026-06-20',2,64.96],['2026-06-24',2,65.19],['2026-06-25',1,31.38]
  ];
  const dailySeedStmt=db.prepare(`INSERT OR IGNORE INTO station_subsource_daily
    (entry_date,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes)
    VALUES (?,?,?,?,?,1,?)`);
  db.transaction(()=>dailySeed.forEach(([date,count,qty])=>dailySeedStmt.run(date,station,source,count,qty,note)))();

  const cleanText=(v,max=160)=>String(v||'').trim().slice(0,max);
  const validYear=v=>Number.isInteger(Number(v))&&Number(v)>=2020&&Number(v)<=2100;
  const validMonth=v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=12;
  const validDate=value=>{
    const text=String(value||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;
    const d=new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===text;
  };
  const cleanNumber=(value,{integer=false}={})=>{
    const n=Number(value);
    if(!Number.isFinite(n)||n<0||(integer&&!Number.isInteger(n)))return null;
    return n;
  };

  function dailyMonthlyRows({year,stationName,sourceName}){
    let sql=`SELECT CAST(substr(entry_date,6,2) AS INTEGER) AS month,
      SUM(record_count) AS record_count,SUM(quantity_tons) AS quantity_tons,
      MIN(included_in_station_total) AS included_in_station_total,
      COUNT(*) AS detail_days
      FROM station_subsource_daily WHERE substr(entry_date,1,4)=?`;
    const params=[String(year)];
    if(stationName){sql+=' AND station_name=?';params.push(stationName);}
    if(sourceName){sql+=' AND source_name=?';params.push(sourceName);}
    sql+=' GROUP BY substr(entry_date,6,2) ORDER BY month';
    return db.prepare(sql).all(...params).map(r=>({...r,record_count:Number(r.record_count||0),quantity_tons:Number(Number(r.quantity_tons||0).toFixed(2)),source:'daily'}));
  }

  app.get('/api/station-subsources',requireAuth,(req,res)=>{
    const year=req.query.year==null?'':Number(req.query.year);
    const stationName=cleanText(req.query.station_name||'');
    const sourceName=cleanText(req.query.source_name||'');
    if(year===''||!validYear(year))return res.status(400).json({ok:false,message:'السنة غير صالحة'});
    let sql='SELECT * FROM station_subsource_monthly WHERE year=?';
    const params=[year];
    if(stationName){sql+=' AND station_name=?';params.push(stationName);}
    if(sourceName){sql+=' AND source_name=?';params.push(sourceName);}
    sql+=' ORDER BY month ASC,station_name,source_name';
    const monthly=db.prepare(sql).all(...params);
    const daily=dailyMonthlyRows({year,stationName,sourceName});
    const merged=new Map(monthly.map(r=>[Number(r.month),{...r,source:'monthly',detail_days:0}]));
    daily.forEach(r=>merged.set(Number(r.month),{
      ...(merged.get(Number(r.month))||{}),month:Number(r.month),year,
      station_name:stationName||station,source_name:sourceName||source,
      record_count:r.record_count,quantity_tons:r.quantity_tons,
      included_in_station_total:r.included_in_station_total,source:'daily',detail_days:r.detail_days
    }));
    const rows=[...merged.values()].sort((a,b)=>Number(a.month)-Number(b.month));
    const summary=rows.reduce((a,r)=>({record_count:a.record_count+Number(r.record_count||0),quantity_tons:a.quantity_tons+Number(r.quantity_tons||0)}),{record_count:0,quantity_tons:0});
    res.json({ok:true,rows,summary:{record_count:summary.record_count,quantity_tons:Number(summary.quantity_tons.toFixed(2))}});
  });

  app.get('/api/station-subsources/daily',requireAuth,(req,res)=>{
    const year=Number(req.query.year);
    if(!validYear(year))return res.status(400).json({ok:false,message:'السنة غير صالحة'});
    const stationName=cleanText(req.query.station_name||station);
    const sourceName=cleanText(req.query.source_name||source);
    const rows=db.prepare(`SELECT * FROM station_subsource_daily
      WHERE entry_date LIKE ? AND station_name=? AND source_name=? ORDER BY entry_date`).all(`${year}-%`,stationName,sourceName);
    const summary=rows.reduce((a,r)=>({record_count:a.record_count+Number(r.record_count||0),quantity_tons:a.quantity_tons+Number(r.quantity_tons||0)}),{record_count:0,quantity_tons:0});
    res.json({ok:true,rows,summary:{days:rows.length,record_count:summary.record_count,quantity_tons:Number(summary.quantity_tons.toFixed(2))}});
  });

  app.post('/api/station-subsources/daily/bulk',requireRole('admin','editor'),(req,res)=>{
    try{
      const year=Number(req.body?.year);
      const stationName=cleanText(req.body?.station_name||station);
      const sourceName=cleanText(req.body?.source_name||source);
      const included=req.body?.included_in_station_total===false||Number(req.body?.included_in_station_total)===0?0:1;
      const notes=cleanText(req.body?.notes||note,500);
      const inputRows=Array.isArray(req.body?.rows)?req.body.rows:[];
      if(!validYear(year))return res.status(400).json({ok:false,message:'السنة غير صالحة'});
      if(!stationName||!sourceName)return res.status(400).json({ok:false,message:'اسم المحطة والجهة مطلوبان'});
      if(!inputRows.length)return res.status(400).json({ok:false,message:'لا توجد صفوف يومية للحفظ'});
      if(inputRows.length>400)return res.status(400).json({ok:false,message:'الحد الأقصى 400 صف في العملية الواحدة'});
      const normalized=[];
      const seen=new Set();
      for(const item of inputRows){
        const entryDate=String(item?.entry_date||'').trim();
        const count=cleanNumber(item?.record_count,{integer:true});
        const qty=cleanNumber(item?.quantity_tons);
        if(!validDate(entryDate)||!entryDate.startsWith(`${year}-`))return res.status(400).json({ok:false,message:`تاريخ غير صالح أو خارج السنة: ${entryDate}`});
        if(count==null||qty==null)return res.status(400).json({ok:false,message:`عدد أو كمية غير صالحة في ${entryDate}`});
        if(seen.has(entryDate))return res.status(400).json({ok:false,message:`التاريخ مكرر في البيانات الملصقة: ${entryDate}`});
        seen.add(entryDate);
        normalized.push({entryDate,count,qty});
      }
      const stmt=db.prepare(`INSERT INTO station_subsource_daily
        (entry_date,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes,created_by,updated_by)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(entry_date,station_name,source_name) DO UPDATE SET
          record_count=excluded.record_count,quantity_tons=excluded.quantity_tons,
          included_in_station_total=excluded.included_in_station_total,notes=excluded.notes,
          updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`);
      const tx=db.transaction(()=>normalized.forEach(r=>stmt.run(r.entryDate,stationName,sourceName,r.count,r.qty,included,notes,req.user.id,req.user.id)));
      tx();
      const summary=normalized.reduce((a,r)=>({record_count:a.record_count+r.count,quantity_tons:a.quantity_tons+r.qty}),{record_count:0,quantity_tons:0});
      audit?.(req.user,'BULK_UPSERT_STATION_SUBSOURCE_DAILY','station_subsource_daily',String(year),`${stationName} | ${sourceName} | days:${normalized.length} | count:${summary.record_count} | tons:${summary.quantity_tons.toFixed(2)}`);
      res.json({ok:true,saved:normalized.length,summary:{record_count:summary.record_count,quantity_tons:Number(summary.quantity_tons.toFixed(2))},message:`تم حفظ ${normalized.length} يومًا بنجاح`});
    }catch(error){res.status(500).json({ok:false,message:'تعذر حفظ البيانات اليومية',error:error.message});}
  });

  app.post('/api/station-subsources',requireRole('admin','editor'),(req,res)=>{
    try{
      const year=Number(req.body?.year),month=Number(req.body?.month);
      if(!validYear(year)||!validMonth(month))return res.status(400).json({ok:false,message:'السنة أو الشهر غير صالح'});
      const stationName=cleanText(req.body?.station_name||station);
      const sourceName=cleanText(req.body?.source_name||source);
      const recordCount=cleanNumber(req.body?.record_count,{integer:true});
      const quantityTons=cleanNumber(req.body?.quantity_tons);
      const included=req.body?.included_in_station_total===false||Number(req.body?.included_in_station_total)===0?0:1;
      const notes=cleanText(req.body?.notes||note,500);
      if(!stationName||!sourceName)return res.status(400).json({ok:false,message:'اسم المحطة والجهة مطلوبان'});
      if(recordCount==null||quantityTons==null)return res.status(400).json({ok:false,message:'العدد أو الكمية غير صالحة'});
      const period=`${year}-${String(month).padStart(2,'0')}-%`;
      const dailyCount=Number(db.prepare(`SELECT COUNT(*) AS c FROM station_subsource_daily WHERE entry_date LIKE ? AND station_name=? AND source_name=?`).get(period,stationName,sourceName)?.c||0);
      if(dailyCount)return res.status(409).json({ok:false,message:`هذا الشهر يحتوي ${dailyCount} يومًا تفصيليًا؛ عدّل التفاصيل اليومية بدل المجموع الشهري.`});
      const stmt=db.prepare(`INSERT INTO station_subsource_monthly
        (year,month,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes,created_by,updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(year,month,station_name,source_name) DO UPDATE SET
          record_count=excluded.record_count,quantity_tons=excluded.quantity_tons,
          included_in_station_total=excluded.included_in_station_total,notes=excluded.notes,
          updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`);
      stmt.run(year,month,stationName,sourceName,recordCount,quantityTons,included,notes,req.user.id,req.user.id);
      audit?.(req.user,'UPSERT_STATION_SUBSOURCE','station_subsource',`${year}-${String(month).padStart(2,'0')}`,`${stationName} | ${sourceName} | ${quantityTons}`);
      res.json({ok:true,message:'تم حفظ بيانات الجهة ضمن المحطة'});
    }catch(error){res.status(500).json({ok:false,message:'تعذر حفظ بيانات الجهة',error:error.message});}
  });

  app.delete('/api/station-subsources/daily/:id',requireRole('admin'),(req,res)=>{
    const id=Number(req.params.id);const row=db.prepare('SELECT * FROM station_subsource_daily WHERE id=?').get(id);
    if(!row)return res.status(404).json({ok:false,message:'السجل اليومي غير موجود'});
    db.prepare('DELETE FROM station_subsource_daily WHERE id=?').run(id);
    audit?.(req.user,'DELETE_STATION_SUBSOURCE_DAILY','station_subsource_daily',id,`${row.entry_date} | ${row.source_name}`);
    res.json({ok:true,message:'تم حذف السجل اليومي'});
  });

  app.delete('/api/station-subsources/:id',requireRole('admin'),(req,res)=>{
    const id=Number(req.params.id);const row=db.prepare('SELECT * FROM station_subsource_monthly WHERE id=?').get(id);
    if(!row)return res.status(404).json({ok:false,message:'السجل غير موجود'});
    db.prepare('DELETE FROM station_subsource_monthly WHERE id=?').run(id);
    audit?.(req.user,'DELETE_STATION_SUBSOURCE','station_subsource',id,`${row.year}-${row.month} | ${row.source_name}`);
    res.json({ok:true,message:'تم حذف السجل'});
  });
};
