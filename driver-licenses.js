const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

module.exports=function installDriverLicenses(app,{db,requireAuth,requireRole,audit,uploadsDir}){
  const dir=path.join(uploadsDir,'driver-licenses');
  fs.mkdirSync(dir,{recursive:true});

  db.exec(`CREATE TABLE IF NOT EXISTS driver_licenses(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT DEFAULT '',
    address TEXT DEFAULT '',
    birth_date TEXT DEFAULT '',
    card_issue_date TEXT DEFAULT '',
    first_issue_date TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    license_class TEXT DEFAULT '',
    license_type TEXT DEFAULT '',
    image_name TEXT DEFAULT '',
    image_original TEXT DEFAULT '',
    image_mime TEXT DEFAULT '',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS driver_license_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_date TEXT DEFAULT CURRENT_TIMESTAMP,
    details TEXT DEFAULT '',
    created_by INTEGER,
    FOREIGN KEY(driver_id) REFERENCES driver_licenses(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_driver_license_expiry ON driver_licenses(expiry_date);`);

  const cols=new Set(db.pragma('table_info(driver_licenses)').map(x=>x.name));
  if(!cols.has('identity_number')) db.exec(`ALTER TABLE driver_licenses ADD COLUMN identity_number TEXT DEFAULT ''`);
  if(!cols.has('license_number')) db.exec(`ALTER TABLE driver_licenses ADD COLUMN license_number TEXT DEFAULT ''`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_license_identity_unique ON driver_licenses(identity_number) WHERE identity_number IS NOT NULL AND trim(identity_number)<>''`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_license_number_unique ON driver_licenses(license_number) WHERE license_number IS NOT NULL AND trim(license_number)<>''`);

  const seed=[
    ['إسماعيل الفروخ','ISMAIL ALFROUK','تقوع','1995-12-31','2025-07-17','2019-10-10','2026-10-15','C','شحن ثقيل'],
    ['أحمد ربعي','AHMED RABAAI','يطا','1986-01-22','2021-09-13','2007-09-16','2028-09-15','C1+1','شحن خفيف + تراكتور'],
    ['أمجد جبارين','AMJAD JABARIN','بيت فجار','1980-12-20','2026-08-13','2002-10-15','2028-08-15','B','خصوصي'],
    ['أنس أبو عمر','ANAS ABUOMAR','بيت لحم','1984-01-04','2023-10-05','2008-07-15','2028-07-15','B','خصوصي'],
    ['باسل جرادات','BASEL JARADAT','سعير','1989-11-15','2023-10-01','2016-10-04','2028-10-15','C1','شحن خفيف'],
    ['بلال طروة','BELAL TARAWA','سعير','1988-04-05','2024-05-13','2017-01-25','2029-01-15','C1','شحن خفيف'],
    ['جهاد الكوازبة','JEHAD ALKAWAZBA','تقوع','1994-09-04','2023-06-22','2019-05-09','2028-05-15','C1','شحن خفيف'],
    ['حسن علامه','HASSAN ALAMA','بيت أمر','1982-09-20','2022-12-12','2010-10-03','2027-10-15','B','خصوصي'],
    ['خالد الكوازبة','KHALED ALKAWAZBA','تقوع','1971-08-16','2026-02-08','1993-01-17','2028-01-15','C','شحن ثقيل'],
    ['رامي مطور','RAMI MTOUR','سعير','1985-06-22','2023-06-15','2010-02-11','2027-02-15','B','خصوصي'],
    ['رمزي البربري','RAMZI ALBARBARI','بيت لحم','1985-05-15','2024-01-30','2010-12-20','2028-01-15','B','خصوصي'],
    ['سامي الفروخ','SAMI ALFROUKH','بيت لحم','1984-12-20','2024-06-04','2008-02-15','2029-02-15','C1','شحن خفيف'],
    ['سامي فروخ','SAMI FARROUKH','بيت لحم','1995-03-05','2024-06-11','2022-06-28','2027-06-15','C1','شحن خفيف'],
    ['سعيد ربعي','SAID RABAAI','يطا','1986-02-15','2025-07-13','2013-07-07','2029-07-15','E','قاطرة ومقطورة'],
    ['عادل الفروخ','ADEL ALFROUKH','تقوع','1997-04-06','2026-07-23','2022-07-28','2027-07-15','C1','شحن خفيف'],
    ['عامر شلالدة','AMER SHLALDH','سعير','1993-07-01','2022-03-30','2015-04-09','2027-04-15','C1+1','شحن خفيف + تراكتور'],
    ['عبد الفتاح فروخ','ABDALFATAH FARROUKH','تقوع','1994-01-26','2025-04-27','2018-03-14','2030-03-15','C1','شحن خفيف'],
    ['عدي الكوازبة','ODAY ALKAWAZBA','بيت لحم','1992-01-09','2026-02-08','2015-01-19','2027-01-15','C1','شحن خفيف'],
    ['علاء الفروخ','ALAA FARROUKH','تقوع','1994-11-17','2025-07-08','2018-07-02','2027-07-15','C1','شحن خفيف'],
    ['فادي جبارين','FADI JABAREEN','تقوع','1984-04-30','2022-05-02','2010-03-03','2027-03-15','B','خصوصي'],
    ['قصي جبارين','QOSSAY JABAREN','تقوع','1996-11-19','2022-05-21','2015-06-14','2027-06-15','C1','شحن خفيف'],
    ['محمد جبرين','MOHAMMED JEBREEN','يطا','1992-01-15','2024-11-26','2017-04-07','2029-04-15','B','خصوصي'],
    ['محمود العمور','MAHMOUD ALOMOOR','يطا','1994-12-25','2021-10-21','2014-10-21','2026-10-15','C1','شحن خفيف'],
    ['نادي الفروخ','NADI ALFROKH','تقوع','1997-07-09','2025-12-29','2025-12-29','2028-01-15','C1','شحن خفيف'],
    ['نديم الكوازبة','NADIM ALKAWAZBA','تقوع','1995-09-18','2026-02-08','2017-01-02','2029-01-15','E','قاطرة ومقطورة'],
    ['نضال جبارين','NIDAL JABAREEN','سعير','1977-09-26','2024-11-17','2017-11-02','2029-11-15','B','خصوصي'],
    ['هاني الجنيدي','HANI ALJUNAIDI','الخليل','1983-03-30','2024-07-04','2008-05-15','2029-05-15','C1','شحن خفيف'],
    ['وحيد أبو عياش','WAHEED ABU AYYASH','بيت أمر','1995-06-08','2024-04-04','2022-03-24','2029-03-15','B','خصوصي'],
    ['يزن الكوازبة','YAZAN ALQAWAZBEH','تقوع','2000-03-23','2026-04-15','2024-04-24','2031-04-15','B','خصوصي'],
    ['ينال شلالدة','YANAL SHALALDEH','بيت لحم','1995-07-27','2026-03-11','2019-03-26','2031-03-15','C1','شحن خفيف'],
    ['يوسف ربعي','YOUSEF RABEI','يطا','1981-10-02','2026-01-08','2010-04-19','2028-02-15','E+1','قاطرة ومقطورة + تراكتور'],
    ['صخر عرامين','SAKHER ARAMEEN','حلحول','1994-08-07','2026-07-09','2017-06-22','2027-06-15','B+1 / A+','خصوصي + تراكتور + دراجة نارية']
  ];
  const ins=db.prepare(`INSERT OR IGNORE INTO driver_licenses(name_ar,name_en,address,birth_date,card_issue_date,first_issue_date,expiry_date,license_class,license_type) VALUES(?,?,?,?,?,?,?,?,?)`);
  db.transaction(()=>seed.forEach(x=>ins.run(...x)))();

  const days=e=>e?Math.ceil((new Date(e+'T00:00:00Z')-new Date())/86400000):null;
  const status=d=>d==null?'غير محدد':d<0?'منتهية':d<=60?'تنتهي قريبًا':'سارية';
  const cleanDigits=(v,max=12)=>String(v||'').replace(/\D/g,'').slice(0,max);
  const validIdentity=v=>!v||/^\d{6,12}$/.test(v);
  const validLicenseNo=v=>!v||/^\d{5,12}$/.test(v);
  const trimEvents=id=>db.prepare(`DELETE FROM driver_license_events WHERE driver_id=? AND id NOT IN (SELECT id FROM driver_license_events WHERE driver_id=? ORDER BY id DESC LIMIT 3)`).run(id,id);
  const addEvent=(id,type,details,userId)=>{db.prepare(`INSERT INTO driver_license_events(driver_id,event_type,details,created_by) VALUES(?,?,?,?)`).run(id,type,details,userId);trimEvents(id);};
  const saveImage=(driver,buf,original,mime)=>{
    const ext=mime==='image/png'?'.png':mime==='image/jpeg'?'.jpg':'.webp';
    const stored=`license-${driver.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(dir,stored),buf);
    if(driver.image_name){try{fs.unlinkSync(path.join(dir,path.basename(driver.image_name)));}catch{}}
    db.prepare(`UPDATE driver_licenses SET image_name=?,image_original=?,image_mime=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(stored,String(original||'رخصة'),mime,driver.id);
  };

  app.get('/api/driver-licenses',requireAuth,(req,res)=>{
    const rows=db.prepare('SELECT * FROM driver_licenses ORDER BY name_ar').all().map(x=>({...x,days_remaining:days(x.expiry_date),status:status(days(x.expiry_date)),has_image:Boolean(x.image_name)}));
    res.json({ok:true,rows});
  });

  app.post('/api/driver-licenses',requireRole('admin','editor'),(req,res)=>{
    try{
      const b=req.body||{},nameAr=String(b.name_ar||'').trim(),nameEn=String(b.name_en||'').trim();
      if(!nameAr)return res.status(400).json({ok:false,message:'الاسم العربي مطلوب'});
      if(db.prepare('SELECT id FROM driver_licenses WHERE name_ar=?').get(nameAr))return res.status(409).json({ok:false,message:'يوجد سجل بنفس الاسم العربي'});
      const licenseNo=cleanDigits(b.license_number),identity=cleanDigits(b.identity_number);
      if(!validIdentity(identity))return res.status(400).json({ok:false,message:'رقم الهوية / البند 6 غير صالح'});
      if(!validLicenseNo(licenseNo))return res.status(400).json({ok:false,message:'رقم الرخصة / البند 5 غير صالح'});
      if(identity&&db.prepare('SELECT id FROM driver_licenses WHERE identity_number=?').get(identity))return res.status(409).json({ok:false,message:'رقم الهوية مستخدم لسجل آخر'});
      if(licenseNo&&db.prepare('SELECT id FROM driver_licenses WHERE license_number=?').get(licenseNo))return res.status(409).json({ok:false,message:'رقم الرخصة مستخدم لسجل آخر'});
      const r=db.prepare(`INSERT INTO driver_licenses(name_ar,name_en,address,birth_date,card_issue_date,first_issue_date,expiry_date,license_class,license_type,identity_number,license_number,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(nameAr,nameEn,String(b.address||'').trim(),String(b.birth_date||''),String(b.card_issue_date||''),String(b.first_issue_date||''),String(b.expiry_date||''),String(b.license_class||'').trim(),String(b.license_type||'').trim(),identity,licenseNo);
      addEvent(r.lastInsertRowid,'إضافة سجل','تم إنشاء سجل رخصة جديد',req.user.id);
      audit?.(req.user,'CREATE_DRIVER_LICENSE','driver_license',r.lastInsertRowid,nameAr);
      res.json({ok:true,id:r.lastInsertRowid,message:'تمت إضافة الرخصة الجديدة'});
    }catch(e){res.status(500).json({ok:false,message:'تعذر إضافة الرخصة الجديدة',error:e.message});}
  });

  app.get('/api/driver-licenses/:id',requireAuth,(req,res)=>{
    const x=db.prepare('SELECT * FROM driver_licenses WHERE id=?').get(Number(req.params.id));
    if(!x)return res.status(404).json({ok:false,message:'الموظف غير موجود'});
    const events=db.prepare('SELECT * FROM driver_license_events WHERE driver_id=? ORDER BY id DESC LIMIT 3').all(x.id);
    res.json({ok:true,driver:{...x,days_remaining:days(x.expiry_date),status:status(days(x.expiry_date)),has_image:Boolean(x.image_name)},events});
  });

  app.put('/api/driver-licenses/:id',requireRole('admin','editor'),(req,res)=>{
    try{
      const id=Number(req.params.id),b=req.body||{},old=db.prepare('SELECT * FROM driver_licenses WHERE id=?').get(id);
      if(!old)return res.status(404).json({ok:false,message:'الموظف غير موجود'});
      const identity=cleanDigits(b.identity_number??old.identity_number),licenseNo=cleanDigits(b.license_number??old.license_number);
      if(!validIdentity(identity))return res.status(400).json({ok:false,message:'رقم الهوية / البند 6 غير صالح'});
      if(!validLicenseNo(licenseNo))return res.status(400).json({ok:false,message:'رقم الرخصة / البند 5 غير صالح'});
      const dupI=identity?db.prepare('SELECT id,name_ar FROM driver_licenses WHERE identity_number=? AND id<>?').get(identity,id):null;
      if(dupI)return res.status(409).json({ok:false,message:`رقم الهوية مستخدم لسجل ${dupI.name_ar}`});
      const dupL=licenseNo?db.prepare('SELECT id,name_ar FROM driver_licenses WHERE license_number=? AND id<>?').get(licenseNo,id):null;
      if(dupL)return res.status(409).json({ok:false,message:`رقم الرخصة مستخدم لسجل ${dupL.name_ar}`});
      const vals=['name_ar','name_en','address','birth_date','card_issue_date','first_issue_date','expiry_date','license_class','license_type'].map(k=>String(b[k]??old[k]??'').trim());
      db.prepare(`UPDATE driver_licenses SET name_ar=?,name_en=?,address=?,birth_date=?,card_issue_date=?,first_issue_date=?,expiry_date=?,license_class=?,license_type=?,identity_number=?,license_number=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...vals,identity,licenseNo,id);
      addEvent(id,'تعديل بيانات','تم تحديث بيانات الرخصة',req.user.id);
      audit?.(req.user,'UPDATE_DRIVER_LICENSE','driver_license',id,vals[0]);
      res.json({ok:true});
    }catch(e){res.status(500).json({ok:false,message:'فشل تحديث بيانات الرخصة',error:e.message});}
  });

  app.post('/api/driver-licenses/:id/renew',requireRole('admin','editor'),(req,res)=>{
    try{
      const id=Number(req.params.id),b=req.body||{},old=db.prepare('SELECT * FROM driver_licenses WHERE id=?').get(id);
      if(!old)return res.status(404).json({ok:false,message:'الموظف غير موجود'});
      if(b.image_base64){
        const text=String(b.image_base64).replace(/^data:[^;]+;base64,/,'');
        const buf=Buffer.from(text,'base64');
        if(!buf.length||buf.length>900*1024)return res.status(400).json({ok:false,message:'صورة الرخصة غير صالحة أو كبيرة جدًا'});
        const mime=['image/webp','image/jpeg','image/png'].includes(String(b.image_mime))?String(b.image_mime):'image/webp';
        saveImage(old,buf,b.image_name,mime);
      }
      db.prepare(`UPDATE driver_licenses SET card_issue_date=?,first_issue_date=?,expiry_date=?,license_class=?,license_type=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(String(b.card_issue_date||old.card_issue_date||''),String(b.first_issue_date||old.first_issue_date||''),String(b.expiry_date||old.expiry_date||''),String(b.license_class||old.license_class||''),String(b.license_type||old.license_type||''),id);
      addEvent(id,'تجديد رخصة',`تاريخ الانتهاء الجديد: ${b.expiry_date||old.expiry_date||'-'}`,req.user.id);
      audit?.(req.user,'RENEW_DRIVER_LICENSE','driver_license',id,old.name_ar);
      res.json({ok:true});
    }catch(e){res.status(500).json({ok:false,message:'فشل تجديد الرخصة',error:e.message});}
  });

  app.get('/api/driver-licenses/:id/image',requireAuth,(req,res)=>{
    const x=db.prepare('SELECT image_name,image_mime FROM driver_licenses WHERE id=?').get(Number(req.params.id));
    if(!x?.image_name)return res.status(404).end();
    const f=path.join(dir,path.basename(x.image_name));
    if(!fs.existsSync(f))return res.status(404).end();
    res.type(x.image_mime||'image/jpeg');
    res.sendFile(f);
  });

  app.delete('/api/driver-licenses/:id/image',requireRole('admin','editor'),(req,res)=>{
    const id=Number(req.params.id),x=db.prepare('SELECT * FROM driver_licenses WHERE id=?').get(id);
    if(!x)return res.status(404).json({ok:false,message:'الموظف غير موجود'});
    if(x.image_name){try{fs.unlinkSync(path.join(dir,path.basename(x.image_name)));}catch{}}
    db.prepare(`UPDATE driver_licenses SET image_name='',image_original='',image_mime='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);
    addEvent(id,'حذف مرفق','تم حذف صورة الرخصة',req.user.id);
    res.json({ok:true});
  });
};
