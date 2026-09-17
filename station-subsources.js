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
  `);

  const station='محطة ترحيل يطا';
  const source='شركة عبد العزيز السعدي';
  const note='الكمية جزء من إجمالي محطة ترحيل يطا ولا تضاف مرة أخرى إلى الإجمالي العام.';
  const seed=[
    [2026,1,53,2016.58],
    [2026,2,29,967.87],
    [2026,3,37,1300.18],
    [2026,4,30,1058.55],
    [2026,5,34,1054.59],
    [2026,6,17,553.32]
  ];
  const seedStmt=db.prepare(`INSERT INTO station_subsource_monthly
    (year,month,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes)
    VALUES (?,?,?,?,?,?,1,?)
    ON CONFLICT(year,month,station_name,source_name) DO UPDATE SET
      record_count=excluded.record_count,
      quantity_tons=excluded.quantity_tons,
      included_in_station_total=1,
      notes=excluded.notes,
      updated_at=CURRENT_TIMESTAMP`);
  const seedTx=db.transaction(()=>seed.forEach(([year,month,count,qty])=>seedStmt.run(year,month,station,source,count,qty,note)));
  seedTx();

  const cleanText=(v,max=160)=>String(v||'').trim().slice(0,max);
  const validYear=v=>Number.isInteger(Number(v))&&Number(v)>=2020&&Number(v)<=2100;
  const validMonth=v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=12;

  app.get('/api/station-subsources',requireAuth,(req,res)=>{
    const year=req.query.year==null?'':Number(req.query.year);
    const stationName=cleanText(req.query.station_name||'');
    const sourceName=cleanText(req.query.source_name||'');
    let sql='SELECT * FROM station_subsource_monthly WHERE 1=1';
    const params=[];
    if(year!==''){if(!validYear(year))return res.status(400).json({ok:false,message:'السنة غير صالحة'});sql+=' AND year=?';params.push(year);}
    if(stationName){sql+=' AND station_name=?';params.push(stationName);}
    if(sourceName){sql+=' AND source_name=?';params.push(sourceName);}
    sql+=' ORDER BY year DESC,month ASC,station_name,source_name';
    const rows=db.prepare(sql).all(...params);
    const summary=rows.reduce((a,r)=>({record_count:a.record_count+Number(r.record_count||0),quantity_tons:a.quantity_tons+Number(r.quantity_tons||0)}),{record_count:0,quantity_tons:0});
    res.json({ok:true,rows,summary:{record_count:summary.record_count,quantity_tons:Number(summary.quantity_tons.toFixed(2))}});
  });

  app.post('/api/station-subsources',requireRole('admin','editor'),(req,res)=>{
    try{
      const year=Number(req.body?.year),month=Number(req.body?.month);
      if(!validYear(year)||!validMonth(month))return res.status(400).json({ok:false,message:'السنة أو الشهر غير صالح'});
      const stationName=cleanText(req.body?.station_name||station);
      const sourceName=cleanText(req.body?.source_name||source);
      const recordCount=Number(req.body?.record_count||0);
      const quantityTons=Number(req.body?.quantity_tons||0);
      const included=req.body?.included_in_station_total===false||Number(req.body?.included_in_station_total)===0?0:1;
      const notes=cleanText(req.body?.notes||note,500);
      if(!stationName||!sourceName)return res.status(400).json({ok:false,message:'اسم المحطة والجهة مطلوبان'});
      if(!Number.isFinite(recordCount)||recordCount<0||!Number.isFinite(quantityTons)||quantityTons<0)return res.status(400).json({ok:false,message:'العدد أو الكمية غير صالحة'});
      const stmt=db.prepare(`INSERT INTO station_subsource_monthly
        (year,month,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes,created_by,updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(year,month,station_name,source_name) DO UPDATE SET
          record_count=excluded.record_count,
          quantity_tons=excluded.quantity_tons,
          included_in_station_total=excluded.included_in_station_total,
          notes=excluded.notes,
          updated_by=excluded.updated_by,
          updated_at=CURRENT_TIMESTAMP`);
      stmt.run(year,month,stationName,sourceName,Math.round(recordCount),quantityTons,included,notes,req.user.id,req.user.id);
      audit?.(req.user,'UPSERT_STATION_SUBSOURCE','station_subsource',`${year}-${String(month).padStart(2,'0')}`,`${stationName} | ${sourceName} | ${quantityTons}`);
      res.json({ok:true,message:'تم حفظ بيانات الجهة ضمن المحطة'});
    }catch(error){res.status(500).json({ok:false,message:'تعذر حفظ بيانات الجهة',error:error.message});}
  });

  app.delete('/api/station-subsources/:id',requireRole('admin'),(req,res)=>{
    const id=Number(req.params.id);const row=db.prepare('SELECT * FROM station_subsource_monthly WHERE id=?').get(id);
    if(!row)return res.status(404).json({ok:false,message:'السجل غير موجود'});
    db.prepare('DELETE FROM station_subsource_monthly WHERE id=?').run(id);
    audit?.(req.user,'DELETE_STATION_SUBSOURCE','station_subsource',id,`${row.year}-${row.month} | ${row.source_name}`);
    res.json({ok:true,message:'تم حذف السجل'});
  });
};
