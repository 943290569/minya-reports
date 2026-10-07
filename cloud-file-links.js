const TYPES = {
  report: { label: 'التقارير اليومية', table: 'daily_reports', title: "report_date || ' — ' || report_no", order: 'report_date DESC,id DESC' },
  equipment: { label: 'المعدات', table: 'equipment_assets', title: 'name', order: 'name,id', feature: 'equipment_management' },
  driver: { label: 'السائقون والرخص', table: 'driver_licenses', title: 'name_ar', order: 'name_ar,id' },
  vehicle: { label: 'مركبات الحركة', table: 'movement_vehicles', title: "plate_number || ' — ' || vehicle_type", order: 'plate_number,id', feature: 'fleet' },
  maintenance: { label: 'سجلات الصيانة', table: 'maintenance_logs', title: "log_date || ' — ' || equipment_name || ' — ' || substr(description,1,80)", order: 'log_date DESC,id DESC' },
  work_order: { label: 'أوامر صيانة المعدات', table: 'equipment_work_orders', title: "order_number || ' — ' || substr(description,1,80)", order: 'reported_date DESC,id DESC', feature: 'equipment_management' },
  incident: { label: 'الحوادث', table: 'incident_logs', title: "incident_date || ' — ' || asset_name || ' — ' || substr(description,1,80)", order: 'incident_date DESC,id DESC', feature: 'incidents' },
  task: { label: 'المهام', table: 'operation_tasks', title: 'title', order: 'id DESC', feature: 'tasks' },
  contract: { label: 'العقود', table: 'contractor_contracts', title: "contractor_name || ' — ' || contract_title", order: 'id DESC', feature: 'contracts' },
  cell: { label: 'خلايا المكب', table: 'landfill_cells', title: 'cell_name', order: 'id', feature: 'cells' },
  diesel: { label: 'السولار الخارجي', table: 'external_diesel_entries', title: "entry_date || ' — ' || source_name || ' — ' || vehicle_number", order: 'entry_date DESC,id DESC' }
};

module.exports = function installCloudFileLinks(app, { db, requireAuth, requireRole, audit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS cloud_file_links (
    file_id INTEGER NOT NULL REFERENCES cloud_files(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(file_id,entity_type,entity_id)
  );
  CREATE INDEX IF NOT EXISTS idx_cloud_file_links_entity ON cloud_file_links(entity_type,entity_id);`);
  const positiveId = value => /^\d+$/.test(String(value ?? '')) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  const exists = table => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
  function allowed(user, type, edit = false) {
    const t = TYPES[type];
    if (!t || !exists(t.table) || !user) return false;
    if (edit && !['admin', 'editor'].includes(user.role)) return false;
    if (user.role === 'admin' || !t.feature || !exists('feature_permissions')) return true;
    const p = db.prepare('SELECT can_view,can_edit FROM feature_permissions WHERE user_id=? AND feature=?').get(user.id,t.feature);
    return !p || Boolean(p.can_view && (!edit || p.can_edit));
  }
  function target(type, id) {
    const t = TYPES[type];
    return db.prepare(`SELECT id,${t.title} AS title FROM ${t.table} WHERE id=?`).get(Number(id));
  }
  function checkTarget(req, res, type, id, edit = false) {
    if (!Object.hasOwn(TYPES,type) || !positiveId(id)) {
      res.status(400).json({ok:false,message:'اختر القسم والسجل'}); return null;
    }
    if (!allowed(req.user,type,edit)) {
      res.status(403).json({ok:false,message:'لا توجد صلاحية لهذا القسم'}); return null;
    }
    const row = target(type,id);
    if (!row) { res.status(404).json({ok:false,message:'السجل غير موجود'}); return null; }
    return row;
  }
  function file(id) {
    return positiveId(id) && db.prepare("SELECT id FROM cloud_files WHERE id=? AND status='ready'").get(Number(id));
  }
  function linksFor(user, id) {
    return db.prepare('SELECT entity_type,entity_id,created_at FROM cloud_file_links WHERE file_id=? ORDER BY created_at,entity_type,entity_id').all(Number(id)).flatMap(link => {
      if (!Object.hasOwn(TYPES,link.entity_type) || !allowed(user,link.entity_type)) return [];
      const row = target(link.entity_type,link.entity_id);
      return row ? [{...link,title:row.title,section:TYPES[link.entity_type].label,can_edit:allowed(user,link.entity_type,true)}] : [];
    });
  }
  const archiveAssetAliases = new Map([
    ['963 081 (22)','CAT 963 موديل 2022'],
    ['963 917 (23)','CAT 963 موديل 2023'],
    ['963k','CAT 963K'],
    ['336 E','CAT 336E'],
    ['428 F2','CAT 428 F2'],
    ['950 H','CAT 950H'],
    ['CAT 816','CAT 816'],
    ['bomag 24 ton','Bomag 24 طن'],
    ['bomag 36 ton','Bomag 36 طن'],
    ['volvo 1770','Volvo 1770'],
    ['volvo 1772','Volvo 1772'],
    ['volvo 1776','Volvo 1776'],
    ['landini tractor','Landini Tractor'],
    ['kia','Kia'],
    ['ssang medical waste','SsangYong Medical Waste'],
    ['ssang black','SsangYong Black'],
    ['ssang silver','SsangYong Silver'],
    ['ssang rexton','SsangYong Rexton'],
    ['ford medical waste','Ford Medical Waste'],
    ['bobcat','Bobcat'],
    ['john deer','John Deere'],
    ['mitsubishi','Mitsubishi'],
    ['main getor','Main Generator'],
    ['main fuel pump','Main Fuel Pump'],
    ['fuel tank black','Fuel Tank Black'],
    ['sprying machine','Spraying Machine']
  ]);
  const archiveNorm = value => String(value || '').toLowerCase().replace(/[\\s_\\-./\\\\()[\\]]+/g,'').replace(/[^a-z0-9\\u0600-\\u06ff]/g,'');
  function canonicalArchiveAssetName(folderName) {
    const direct = archiveAssetAliases.get(String(folderName || '').trim());
    if (direct) return direct;
    const n = archiveNorm(folderName);
    for (const [source,targetName] of archiveAssetAliases) if (archiveNorm(source) === n) return targetName;
    return String(folderName || '').trim().slice(0,120);
  }
  function assetByLooseName(name) {
    const wanted = archiveNorm(name);
    const rows = db.prepare('SELECT id,name FROM equipment_assets ORDER BY id').all();
    return rows.find(row => archiveNorm(row.name) === wanted) || rows.find(row => {
      const n = archiveNorm(row.name);
      return n && wanted && (n.includes(wanted) || wanted.includes(n));
    });
  }
  function ensureArchiveAsset(name,userId) {
    let row = assetByLooseName(name);
    if (row) return {row,created:false};
    const result = db.prepare("INSERT INTO equipment_assets(name,equipment_type,status,notes,created_by) VALUES(?,?,'تعمل',?,?)")
      .run(name,'معدة / مركبة','مستورد تلقائيًا من أرشيف الصيانة',userId);
    row = db.prepare('SELECT id,name FROM equipment_assets WHERE id=?').get(result.lastInsertRowid);
    return {row,created:true};
  }
  function descendantFolderIds(folderId) {
    return db.prepare(`WITH RECURSIVE tree(id) AS (
      SELECT id FROM cloud_folders WHERE id=?
      UNION ALL
      SELECT f.id FROM cloud_folders f JOIN tree t ON f.parent_id=t.id
    ) SELECT id FROM tree`).all(folderId).map(x=>Number(x.id));
  }
  function linkFolderFilesToAsset(folderId,assetId,userId) {
    const ids = descendantFolderIds(folderId);
    if (!ids.length) return 0;
    const marks = ids.map(()=>'?').join(',');
    const files = db.prepare(`SELECT id FROM cloud_files WHERE status='ready' AND folder_id IN (${marks})`).all(...ids);
    const stmt = db.prepare("INSERT OR IGNORE INTO cloud_file_links(file_id,entity_type,entity_id,created_by) VALUES(?,'equipment',?,?)");
    let linked = 0;
    const tx = db.transaction(rows => { for (const row of rows) linked += stmt.run(row.id,assetId,userId).changes; });
    tx(files);
    return linked;
  }
  app.post('/api/cloud-files/maintenance-archive/relink', requireRole('admin','editor'), (req,res) => {
    try {
      if (!exists('equipment_assets')) return res.status(503).json({ok:false,message:'جدول المعدات غير جاهز'});
      const root = db.prepare("SELECT id FROM cloud_folders WHERE parent_id IS NULL AND name='الصيانة'").get();
      if (!root) return res.status(404).json({ok:false,message:'مجلد الصيانة غير موجود'});
      const machineRoot = db.prepare("SELECT id FROM cloud_folders WHERE parent_id=? AND lower(name)=lower('all machins and cars')").get(root.id);
      const sources = [];
      if (machineRoot) {
        db.prepare('SELECT id,name FROM cloud_folders WHERE parent_id=? ORDER BY name').all(machineRoot.id)
          .filter(x=>String(x.name||'').trim())
          .forEach(x=>sources.push({folder_id:x.id,source_name:x.name,asset_name:canonicalArchiveAssetName(x.name)}));
      }
      const special = [
        ['محرك CAT 816','CAT 816'],
        ['محرك جرافة جنزير 963 2022','CAT 963 موديل 2022']
      ];
      for (const [folderName,assetName] of special) {
        const row = db.prepare('SELECT id FROM cloud_folders WHERE parent_id=? AND name=?').get(root.id,folderName);
        if (row) sources.push({folder_id:row.id,source_name:folderName,asset_name:assetName});
      }
      let linked=0,created=0;
      const details=[];
      for (const source of sources) {
        const asset = ensureArchiveAsset(source.asset_name,req.user.id);
        if (asset.created) created++;
        const count = linkFolderFilesToAsset(source.folder_id,asset.row.id,req.user.id);
        linked += count;
        details.push({folder:source.source_name,asset:asset.row.name,linked:count,created:asset.created});
      }
      audit(req.user,'RELINK_MAINTENANCE_ARCHIVE','equipment',0,`linked=${linked},created=${created}`);
      res.json({ok:true,linked,created,assets:details.length,details});
    } catch (error) {
      res.status(500).json({ok:false,message:'تعذر ربط أرشيف الصيانة بالمعدات',error:error.message});
    }
  });

  app.get('/api/cloud-files/link-types', requireAuth, (req,res) => {
    res.json({ok:true,types:Object.entries(TYPES).filter(([type])=>allowed(req.user,type)).map(([type,t])=>({type,label:t.label,can_edit:allowed(req.user,type,true)}))});
  });
  app.get('/api/cloud-files/link-targets', requireAuth, (req,res) => {
    const type = String(req.query.type || '');
    if (!Object.hasOwn(TYPES,type)) return res.status(400).json({ok:false,message:'القسم غير صالح'});
    if (!allowed(req.user,type)) return res.status(403).json({ok:false,message:'لا توجد صلاحية لهذا القسم'});
    const t = TYPES[type], query = String(req.query.q || '').trim().slice(0,150);
    const rows = db.prepare(`SELECT id,${t.title} AS title FROM ${t.table} WHERE (${t.title}) LIKE ? ORDER BY ${t.order} LIMIT 101`).all('%'+query+'%');
    res.json({ok:true,targets:rows.slice(0,100),has_more:rows.length>100});
  });
  app.get('/api/cloud-files/linked', requireAuth, (req,res) => {
    const type = String(req.query.type || ''), id = req.query.id;
    const row = checkTarget(req,res,type,id);
    if (!row) return;
    const files = db.prepare(`SELECT f.id,f.original_name,f.mime_type,f.size_bytes,f.created_at FROM cloud_files f JOIN cloud_file_links l ON l.file_id=f.id WHERE l.entity_type=? AND l.entity_id=? AND f.status='ready' ORDER BY f.created_at DESC,f.id DESC`).all(type,Number(id));
    res.json({ok:true,target:{type,id:Number(id),title:row.title,section:TYPES[type].label},files,can_edit:allowed(req.user,type,true)});
  });
  app.get('/api/cloud-files/:id/links', requireAuth, (req,res) => {
    if (!file(req.params.id)) return res.status(404).json({ok:false,message:'الملف غير موجود'});
    res.json({ok:true,links:linksFor(req.user,req.params.id)});
  });
  app.post('/api/cloud-files/:id/links', requireRole('admin', 'editor'), (req,res) => {
    if (!file(req.params.id)) return res.status(404).json({ok:false,message:'الملف غير موجود أو لم يكتمل رفعه'});
    const type = String(req.body?.entity_type || ''), id = req.body?.entity_id;
    const row = checkTarget(req,res,type,id,true);
    if (!row) return;
    const result = db.prepare('INSERT OR IGNORE INTO cloud_file_links(file_id,entity_type,entity_id,created_by) VALUES(?,?,?,?)').run(Number(req.params.id),type,Number(id),req.user.id);
    if (result.changes) audit(req.user,'LINK_CLOUD_FILE',type,Number(id),String(req.params.id));
    res.json({ok:true,message:result.changes?'تم ربط الملف بالسجل':'الملف مرتبط بهذا السجل بالفعل',links:linksFor(req.user,req.params.id)});
  });
  app.delete('/api/cloud-files/:id/links/:type/:recordId', requireRole('admin', 'editor'), (req,res) => {
    if (!file(req.params.id)) return res.status(404).json({ok:false,message:'الملف غير موجود'});
    const {type,recordId} = req.params;
    if (!checkTarget(req,res,type,recordId,true)) return;
    const result = db.prepare('DELETE FROM cloud_file_links WHERE file_id=? AND entity_type=? AND entity_id=?').run(Number(req.params.id),type,Number(recordId));
    if (result.changes) audit(req.user,'UNLINK_CLOUD_FILE',type,Number(recordId),String(req.params.id));
    res.json({ok:true,message:'تم فك الربط، والملف محفوظ في ملفات الموقع'});
  });
};
