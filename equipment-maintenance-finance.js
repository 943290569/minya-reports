module.exports=function installEquipmentMaintenanceFinance(app,{db,requireAuth,requireRole,audit}){
  db.exec("CREATE TABLE IF NOT EXISTS equipment_maintenance_records(id INTEGER PRIMARY KEY AUTOINCREMENT,asset_id INTEGER NOT NULL,service_date TEXT NOT NULL,invoice_number TEXT DEFAULT '',vendor_name TEXT DEFAULT '',service_type TEXT DEFAULT 'صيانة',description TEXT DEFAULT '',action_taken TEXT DEFAULT '',meter_reading REAL DEFAULT 0,parts_cost REAL DEFAULT 0,labor_cost REAL DEFAULT 0,other_cost REAL DEFAULT 0,invoice_status TEXT DEFAULT 'غير مدفوعة',work_order_id INTEGER,notes TEXT DEFAULT '',created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(asset_id) REFERENCES equipment_assets(id) ON DELETE CASCADE,FOREIGN KEY(work_order_id) REFERENCES equipment_work_orders(id) ON DELETE SET NULL);CREATE INDEX IF NOT EXISTS idx_emr_asset_date ON equipment_maintenance_records(asset_id,service_date);CREATE INDEX IF NOT EXISTS idx_emr_vendor_date ON equipment_maintenance_records(vendor_name,service_date);CREATE INDEX IF NOT EXISTS idx_emr_invoice ON equipment_maintenance_records(invoice_number);");
  const emrColumns=new Set(db.pragma("table_info(equipment_maintenance_records)").map(x=>x.name));
  if(!emrColumns.has('legacy_source'))db.exec("ALTER TABLE equipment_maintenance_records ADD COLUMN legacy_source TEXT DEFAULT ''");
  if(!emrColumns.has('legacy_id'))db.exec("ALTER TABLE equipment_maintenance_records ADD COLUMN legacy_id INTEGER");
  if(!emrColumns.has('source_file_id'))db.exec("ALTER TABLE equipment_maintenance_records ADD COLUMN source_file_id INTEGER");
  if(!emrColumns.has('invoice_file_id'))db.exec("ALTER TABLE equipment_maintenance_records ADD COLUMN invoice_file_id INTEGER");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_emr_legacy_source_id ON equipment_maintenance_records(legacy_source,legacy_id) WHERE legacy_source<>'' AND legacy_id IS NOT NULL");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_emr_source_file ON equipment_maintenance_records(source_file_id) WHERE source_file_id IS NOT NULL");
  const normName=v=>String(v||'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,'');
  function ensureAssetByLegacyName(name){
    const raw=String(name||'').trim(); if(!raw)return null;
    const wanted=normName(raw);
    let rows=[]; try{rows=db.prepare('SELECT id,name FROM equipment_assets ORDER BY id').all();}catch{return null;}
    let found=rows.find(x=>normName(x.name)===wanted)||rows.find(x=>{const n=normName(x.name);return n&&wanted&&(n.includes(wanted)||wanted.includes(n));});
    if(found)return found;
    try{
      const r=db.prepare("INSERT INTO equipment_assets(name,equipment_type,status,notes) VALUES(?,?,'تعمل',?)").run(raw,'معدة / مركبة','أنشئت تلقائيًا من سجل الصيانة القديم');
      return {id:Number(r.lastInsertRowid),name:raw};
    }catch{
      return db.prepare('SELECT id,name FROM equipment_assets WHERE name=?').get(raw)||null;
    }
  }
  function migrateLegacyMaintenance(){
    let legacy=[]; try{legacy=db.prepare('SELECT * FROM maintenance_logs ORDER BY log_date,id').all();}catch{return {migrated:0,skipped:0};}
    const existsStmt=db.prepare("SELECT id FROM equipment_maintenance_records WHERE legacy_source='maintenance_logs' AND legacy_id=?");
    const insertStmt=db.prepare("INSERT INTO equipment_maintenance_records(asset_id,service_date,invoice_number,vendor_name,service_type,description,action_taken,meter_reading,parts_cost,labor_cost,other_cost,invoice_status,work_order_id,notes,created_by,legacy_source,legacy_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    let migrated=0,skipped=0;
    const tx=db.transaction(rows=>{
      for(const row of rows){
        if(existsStmt.get(row.id)){skipped++;continue;}
        const a=ensureAssetByLegacyName(row.equipment_name); if(!a||!/\\d{4}-\\d{2}-\\d{2}/.test(String(row.log_date||''))){skipped++;continue;}
        insertStmt.run(a.id,String(row.log_date).slice(0,10),'','',String(row.status||'صيانة قديمة').trim()||'صيانة قديمة',String(row.description||'').trim(),String(row.action_taken||'').trim(),0,0,0,Math.max(0,Number(row.cost||0)||0),'بيانات قديمة',null,'مرحّل تلقائيًا من سجل الصيانة السابق',row.created_by||null,'maintenance_logs',row.id);
        migrated++;
      }
    });
    tx(legacy);
    return {migrated,skipped,total:legacy.length};
  }
  const legacyMigration=migrateLegacyMaintenance();

  const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:0;};
  const dateOk=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
  const permission=user=>{if(!user)return{can_view:0,can_edit:0};if(user.role==='admin')return{can_view:1,can_edit:1};try{const row=db.prepare("SELECT can_view,can_edit FROM feature_permissions WHERE user_id=? AND feature='equipment_management'").get(user.id);if(row)return{can_view:Number(row.can_view),can_edit:Number(row.can_edit)};}catch{}return user.role==='editor'?{can_view:1,can_edit:1}:{can_view:1,can_edit:0};};
  const guard=edit=>(req,res,next)=>requireAuth(req,res,()=>{const p=permission(req.user);if(!p.can_view||(edit&&!p.can_edit))return res.status(403).json({ok:false,message:'لا توجد صلاحية كافية لإدارة صيانة المعدات'});next();});
  const asset=id=>db.prepare('SELECT id,name,current_meter FROM equipment_assets WHERE id=?').get(Number(id));
  function filter(req,alias='m'){const where=[],args=[];const assetId=Number(req.query.asset_id||0),year=clean(req.query.year,4),month=clean(req.query.month,2);if(assetId){where.push(alias+'.asset_id=?');args.push(assetId);}if(/^\d{4}$/.test(year)){where.push("substr("+alias+".service_date,1,4)=?");args.push(year);}if(/^\d{2}$/.test(month)){where.push("substr("+alias+".service_date,6,2)=?");args.push(month);}return{where:where.length?' WHERE '+where.join(' AND '):'',args};}
  function descendantFolderIds(folderId){
    const seen=new Set(),queue=[Number(folderId)],stmt=db.prepare('SELECT id FROM cloud_folders WHERE parent_id=? ORDER BY id');
    while(queue.length){const id=Number(queue.shift());if(!Number.isSafeInteger(id)||id<=0||seen.has(id))continue;seen.add(id);for(const row of stmt.all(id))queue.push(Number(row.id));}
    return [...seen];
  }
  function billsRoots(){return db.prepare("SELECT id,name,parent_id FROM cloud_folders WHERE lower(name)=lower('Bills') ORDER BY id").all();}
  function billVendors(){
    const map=new Map();
    for(const root of billsRoots()){
      for(const row of db.prepare('SELECT id,name,parent_id FROM cloud_folders WHERE parent_id=? ORDER BY name').all(root.id)){
        const key=normName(row.name); if(key&&!map.has(key))map.set(key,{folder_id:row.id,name:row.name});
      }
    }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  }
  function vendorFiles(folderId){
    const ids=descendantFolderIds(folderId); if(!ids.length)return [];
    const stmt=db.prepare("SELECT id,original_name,mime_type,size_bytes,created_at FROM cloud_files WHERE folder_id=? AND status='ready' ORDER BY created_at DESC,id DESC");
    const out=[]; for(const id of ids) out.push(...stmt.all(id)); return out;
  }

  app.get('/api/equipment-maintenance/vendors',guard(false),(req,res)=>{
    const vendors=billVendors().map(v=>({...v,file_count:vendorFiles(v.folder_id).length}));
    res.json({ok:true,vendors,bills_roots:billsRoots().length});
  });
  app.get('/api/equipment-maintenance/vendor-files',guard(false),(req,res)=>{
    const folderId=Number(req.query.folder_id||0),vendor=billVendors().find(v=>Number(v.folder_id)===folderId);
    if(!vendor)return res.status(404).json({ok:false,message:'الشركة غير موجودة داخل Bills'});
    res.json({ok:true,vendor,files:vendorFiles(folderId)});
  });
  app.get('/api/equipment-maintenance/meta',guard(false),(req,res)=>{
    const years=db.prepare("SELECT DISTINCT substr(service_date,1,4) year FROM equipment_maintenance_records WHERE service_date GLOB '[0-9][0-9][0-9][0-9]-*' ORDER BY year DESC").all().map(x=>x.year);
    const total=Number(db.prepare('SELECT COUNT(*) c FROM equipment_maintenance_records').get()?.c||0);
    const legacy=Number(db.prepare("SELECT COUNT(*) c FROM equipment_maintenance_records WHERE legacy_source='maintenance_logs'").get()?.c||0);
    res.json({ok:true,years,total,legacy,migrated_now:legacyMigration.migrated||0});
  });
  app.get('/api/equipment-maintenance/files/:assetId',guard(false),(req,res)=>{const a=asset(req.params.assetId);if(!a)return res.status(404).json({ok:false,message:'المعدة غير موجودة'});const files=db.prepare("SELECT f.id,f.original_name,f.mime_type,f.size_bytes,f.created_at,l.created_at linked_at FROM cloud_file_links l JOIN cloud_files f ON f.id=l.file_id WHERE l.entity_type='equipment' AND l.entity_id=? AND f.status='ready' ORDER BY f.created_at DESC,f.id DESC").all(a.id);res.json({ok:true,asset:a,files});});
  app.get('/api/equipment-maintenance/archive-candidates',guard(false),(req,res)=>{
    const assetId=Number(req.query.asset_id||0),where=["l.entity_type='equipment'","f.status='ready'","m.id IS NULL"],args=[];
    if(assetId){where.push('l.entity_id=?');args.push(assetId);}
    const rows=db.prepare(`SELECT DISTINCT f.id file_id,f.original_name,f.mime_type,f.size_bytes,f.created_at,a.id asset_id,a.name asset_name
      FROM cloud_file_links l
      JOIN cloud_files f ON f.id=l.file_id
      JOIN equipment_assets a ON a.id=l.entity_id
      LEFT JOIN equipment_maintenance_records m ON m.source_file_id=f.id
      WHERE ${where.join(' AND ')}
      ORDER BY a.name,f.created_at DESC,f.id DESC`).all(...args);
    res.json({ok:true,candidates:rows});
  });
  app.get('/api/equipment-maintenance/records',guard(false),(req,res)=>{const q=filter(req);const rows=db.prepare("SELECT m.*,a.name asset_name,o.order_number,(m.parts_cost+m.labor_cost+m.other_cost) total_cost,(SELECT COUNT(*) FROM cloud_file_links l WHERE l.entity_type='maintenance_record' AND l.entity_id=m.id) attachment_count,(SELECT original_name FROM cloud_files WHERE id=m.invoice_file_id) invoice_file_name FROM equipment_maintenance_records m JOIN equipment_assets a ON a.id=m.asset_id LEFT JOIN equipment_work_orders o ON o.id=m.work_order_id"+q.where+" ORDER BY m.service_date DESC,m.id DESC").all(...q.args);res.json({ok:true,records:rows,permission:permission(req.user)});});
  app.post('/api/equipment-maintenance/records',guard(true),(req,res)=>{const b=req.body||{},assetId=Number(b.asset_id),day=clean(b.service_date,10),sourceFileId=Number(b.source_file_id||0)||null,invoiceFileId=Number(b.invoice_file_id||0)||null;if(!assetId||!dateOk(day))return res.status(400).json({ok:false,message:'المعدة وتاريخ الصيانة مطلوبان'});if(!asset(assetId))return res.status(404).json({ok:false,message:'المعدة غير موجودة'});if(sourceFileId&&!db.prepare("SELECT id FROM cloud_files WHERE id=? AND status='ready'").get(sourceFileId))return res.status(400).json({ok:false,message:'ملف الأرشيف غير موجود'});if(invoiceFileId&&!db.prepare("SELECT id FROM cloud_files WHERE id=? AND status='ready'").get(invoiceFileId))return res.status(400).json({ok:false,message:'ملف الفاتورة غير موجود'});const tx=db.transaction(()=>{const r=db.prepare("INSERT INTO equipment_maintenance_records(asset_id,service_date,invoice_number,vendor_name,service_type,description,action_taken,meter_reading,parts_cost,labor_cost,other_cost,invoice_status,work_order_id,notes,created_by,source_file_id,invoice_file_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(assetId,day,clean(b.invoice_number,100),clean(b.vendor_name,160),clean(b.service_type,120)||'صيانة',clean(b.description,2000),clean(b.action_taken,2000),num(b.meter_reading),num(b.parts_cost),num(b.labor_cost),num(b.other_cost),clean(b.invoice_status,80)||'غير مدفوعة',Number(b.work_order_id||0)||null,clean(b.notes,1500),req.user.id,sourceFileId,invoiceFileId);const link=db.prepare("INSERT OR IGNORE INTO cloud_file_links(file_id,entity_type,entity_id,created_by) VALUES(?,'maintenance_record',?,?)");if(sourceFileId)link.run(sourceFileId,r.lastInsertRowid,req.user.id);if(invoiceFileId)link.run(invoiceFileId,r.lastInsertRowid,req.user.id);return r;});let r;try{r=tx();}catch(e){if(String(e.message).includes('idx_emr_source_file'))return res.status(409).json({ok:false,message:'هذا الملف مرتبط بسجل صيانة مسبقًا'});throw e;}if(num(b.meter_reading)>0)db.prepare('UPDATE equipment_assets SET current_meter=MAX(current_meter,?),updated_at=CURRENT_TIMESTAMP WHERE id=?').run(num(b.meter_reading),assetId);audit(req.user,'CREATE_MAINTENANCE_RECORD','maintenance_record',r.lastInsertRowid,day+':'+clean(b.invoice_number,100));res.json({ok:true,id:r.lastInsertRowid});});
  app.put('/api/equipment-maintenance/records/:id',guard(true),(req,res)=>{const id=Number(req.params.id),o=db.prepare('SELECT * FROM equipment_maintenance_records WHERE id=?').get(id),b=req.body||{};if(!o)return res.status(404).json({ok:false,message:'سجل الصيانة غير موجود'});const assetId=Number(b.asset_id||o.asset_id),day=clean(b.service_date??o.service_date,10);if(!assetId||!dateOk(day))return res.status(400).json({ok:false,message:'المعدة وتاريخ الصيانة مطلوبان'});const invoiceFileId=Number(b.invoice_file_id===undefined?o.invoice_file_id:b.invoice_file_id)||null;if(invoiceFileId&&!db.prepare("SELECT id FROM cloud_files WHERE id=? AND status='ready'").get(invoiceFileId))return res.status(400).json({ok:false,message:'ملف الفاتورة غير موجود'});db.prepare("UPDATE equipment_maintenance_records SET asset_id=?,service_date=?,invoice_number=?,vendor_name=?,service_type=?,description=?,action_taken=?,meter_reading=?,parts_cost=?,labor_cost=?,other_cost=?,invoice_status=?,work_order_id=?,notes=?,invoice_file_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(assetId,day,clean(b.invoice_number??o.invoice_number,100),clean(b.vendor_name??o.vendor_name,160),clean(b.service_type??o.service_type,120),clean(b.description??o.description,2000),clean(b.action_taken??o.action_taken,2000),num(b.meter_reading??o.meter_reading),num(b.parts_cost??o.parts_cost),num(b.labor_cost??o.labor_cost),num(b.other_cost??o.other_cost),clean(b.invoice_status??o.invoice_status,80),Number(b.work_order_id||o.work_order_id||0)||null,clean(b.notes??o.notes,1500),invoiceFileId,id);if(o.invoice_file_id&&Number(o.invoice_file_id)!==invoiceFileId&&Number(o.invoice_file_id)!==Number(o.source_file_id))db.prepare("DELETE FROM cloud_file_links WHERE file_id=? AND entity_type='maintenance_record' AND entity_id=?").run(o.invoice_file_id,id);if(invoiceFileId)db.prepare("INSERT OR IGNORE INTO cloud_file_links(file_id,entity_type,entity_id,created_by) VALUES(?,'maintenance_record',?,?)").run(invoiceFileId,id,req.user.id);audit(req.user,'UPDATE_MAINTENANCE_RECORD','maintenance_record',id,day);res.json({ok:true});});
  app.delete('/api/equipment-maintenance/records/:id',requireRole('admin'),(req,res)=>{const id=Number(req.params.id);if(!db.prepare('SELECT id FROM equipment_maintenance_records WHERE id=?').get(id))return res.status(404).json({ok:false,message:'سجل الصيانة غير موجود'});db.prepare('DELETE FROM equipment_maintenance_records WHERE id=?').run(id);audit(req.user,'DELETE_MAINTENANCE_RECORD','maintenance_record',id,'');res.json({ok:true});});
  app.get('/api/equipment-maintenance/report',guard(false),(req,res)=>{const q=filter(req);const summary=db.prepare("SELECT COUNT(*) maintenance_count,COALESCE(SUM(parts_cost),0) parts_cost,COALESCE(SUM(labor_cost),0) labor_cost,COALESCE(SUM(other_cost),0) other_cost,COALESCE(SUM(parts_cost+labor_cost+other_cost),0) total_cost,COALESCE(AVG(parts_cost+labor_cost+other_cost),0) average_cost FROM equipment_maintenance_records m"+q.where).get(...q.args);const byAsset=db.prepare("SELECT a.id asset_id,a.name asset_name,COUNT(*) maintenance_count,COALESCE(SUM(m.parts_cost+m.labor_cost+m.other_cost),0) total_cost,COALESCE(MAX(m.parts_cost+m.labor_cost+m.other_cost),0) max_cost FROM equipment_maintenance_records m JOIN equipment_assets a ON a.id=m.asset_id"+q.where+" GROUP BY a.id,a.name ORDER BY total_cost DESC,a.name").all(...q.args);const byMonth=db.prepare("SELECT substr(m.service_date,1,7) period,COUNT(*) maintenance_count,COALESCE(SUM(m.parts_cost+m.labor_cost+m.other_cost),0) total_cost FROM equipment_maintenance_records m"+q.where+" GROUP BY substr(m.service_date,1,7) ORDER BY period").all(...q.args);const byVendor=db.prepare("SELECT CASE WHEN TRIM(m.vendor_name)='' THEN 'غير محدد' ELSE m.vendor_name END vendor_name,COUNT(*) maintenance_count,COALESCE(SUM(m.parts_cost+m.labor_cost+m.other_cost),0) total_cost FROM equipment_maintenance_records m"+q.where+" GROUP BY CASE WHEN TRIM(m.vendor_name)='' THEN 'غير محدد' ELSE m.vendor_name END ORDER BY total_cost DESC LIMIT 20").all(...q.args);const byType=db.prepare("SELECT CASE WHEN TRIM(m.service_type)='' THEN 'غير محدد' ELSE m.service_type END service_type,COUNT(*) maintenance_count,COALESCE(SUM(m.parts_cost+m.labor_cost+m.other_cost),0) total_cost FROM equipment_maintenance_records m"+q.where+" GROUP BY CASE WHEN TRIM(m.service_type)='' THEN 'غير محدد' ELSE m.service_type END ORDER BY total_cost DESC").all(...q.args);res.json({ok:true,summary,by_asset:byAsset,by_month:byMonth,by_vendor:byVendor,by_type:byType});});
};