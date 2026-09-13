module.exports = function installOperationsManagement(app, { db, requireAuth, requireRole, audit }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'ملاحظة',
      location TEXT DEFAULT '',
      assigned_to TEXT DEFAULT '',
      priority TEXT DEFAULT 'متوسطة',
      status TEXT DEFAULT 'جديدة',
      start_date TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      progress INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      close_notes TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_operation_tasks_due ON operation_tasks(status,due_date);
    CREATE TABLE IF NOT EXISTS contractor_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_name TEXT NOT NULL,
      contract_number TEXT DEFAULT '',
      contract_title TEXT NOT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      contract_value REAL DEFAULT 0,
      paid_value REAL DEFAULT 0,
      progress REAL DEFAULT 0,
      status TEXT DEFAULT 'فعال',
      responsible_person TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_contracts_end ON contractor_contracts(status,end_date);
    CREATE TABLE IF NOT EXISTS landfill_cells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cell_name TEXT NOT NULL UNIQUE,
      design_capacity_m3 REAL DEFAULT 0,
      design_capacity_tons REAL DEFAULT 0,
      used_volume_m3 REAL DEFAULT 0,
      received_tons REAL DEFAULT 0,
      average_daily_tons REAL DEFAULT 0,
      current_level REAL,
      compaction_density REAL DEFAULT 0.92,
      status TEXT DEFAULT 'قيد التشغيل',
      measurement_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_landfill_cells_status ON landfill_cells(status);
    CREATE TABLE IF NOT EXISTS management_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT DEFAULT 'application/octet-stream',
      size_bytes INTEGER DEFAULT 0,
      data BLOB NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_management_files_entity ON management_files(entity_type,entity_id);
  `);

  const taskStatuses = new Set(['جديدة','قيد التنفيذ','متأخرة','مغلقة']);
  const priorities = new Set(['منخفضة','متوسطة','عالية','عاجلة']);
  const contractStatuses = new Set(['مسودة','فعال','متوقف','منتهي','مستلم']);
  const cellStatuses = new Set(['مخططة','تحت التجهيز','قيد التشغيل','مغلقة']);
  const features = new Set(['tasks','contracts','cells']);
  const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
  const number = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
  };
  const dateOk = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  const permission = (user, feature) => {
    if (!user) return { can_view: 0, can_edit: 0 };
    if (user.role === 'admin') return { can_view: 1, can_edit: 1 };
    const row = db.prepare('SELECT can_view,can_edit FROM feature_permissions WHERE user_id=? AND feature=?').get(user.id, feature);
    if (row) return { can_view: Number(row.can_view), can_edit: Number(row.can_edit) };
    return user.role === 'editor' ? { can_view: 1, can_edit: 1 } : { can_view: 1, can_edit: 0 };
  };
  const guard = (feature, edit = false) => (req, res, next) => requireAuth(req, res, () => {
    if (!features.has(feature)) return res.status(404).json({ ok: false, message: 'القسم غير موجود' });
    const allowed = permission(req.user, feature);
    if (!allowed.can_view || (edit && !allowed.can_edit)) return res.status(403).json({ ok: false, message: 'لا توجد صلاحية كافية لهذا القسم' });
    next();
  });

  app.get('/api/ops/tasks', guard('tasks'), (req, res) => {
    const q = text(req.query.q, 100), status = text(req.query.status, 30);
    let sql = `SELECT t.*,u.display_name AS created_by_name FROM operation_tasks t LEFT JOIN users u ON u.id=t.created_by WHERE 1=1`;
    const params = [];
    if (q) { const like = `%${q}%`; sql += ' AND (t.title LIKE ? OR t.location LIKE ? OR t.assigned_to LIKE ? OR t.description LIKE ?)'; params.push(like,like,like,like); }
    if (taskStatuses.has(status)) { sql += ' AND t.status=?'; params.push(status); }
    sql += ` ORDER BY CASE t.priority WHEN 'عاجلة' THEN 1 WHEN 'عالية' THEN 2 WHEN 'متوسطة' THEN 3 ELSE 4 END,COALESCE(NULLIF(t.due_date,''),'9999-12-31'),t.id DESC`;
    const rows = db.prepare(sql).all(...params).map(row => ({ ...row, attachment_count:db.prepare(`SELECT COUNT(*) n FROM management_files WHERE entity_type='task' AND entity_id=?`).get(row.id).n, is_overdue: row.status !== 'مغلقة' && row.due_date && row.due_date < new Date().toISOString().slice(0,10) ? 1 : 0 }));
    res.json({ ok: true, tasks: rows, permission: permission(req.user, 'tasks') });
  });
  app.post('/api/ops/tasks', guard('tasks', true), (req, res) => {
    const b = req.body || {}, title = text(b.title, 160), due = text(b.due_date, 10), start = text(b.start_date, 10);
    if (!title) return res.status(400).json({ ok: false, message: 'عنوان المهمة مطلوب' });
    if (!dateOk(due) || !dateOk(start)) return res.status(400).json({ ok: false, message: 'التاريخ غير صالح' });
    const status = taskStatuses.has(b.status) ? b.status : 'جديدة', priority = priorities.has(b.priority) ? b.priority : 'متوسطة';
    const progress = status === 'مغلقة' ? 100 : number(b.progress, 0, 100);
    const result = db.prepare(`INSERT INTO operation_tasks(title,category,location,assigned_to,priority,status,start_date,due_date,progress,description,close_notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(title,text(b.category,50)||'ملاحظة',text(b.location,100),text(b.assigned_to,100),priority,status,start,due,progress,text(b.description,2000),text(b.close_notes,1000),req.user.id);
    audit(req.user,'CREATE_OPERATION_TASK','task',result.lastInsertRowid,title);
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put('/api/ops/tasks/:id', guard('tasks', true), (req, res) => {
    const id = Number(req.params.id), old = db.prepare('SELECT * FROM operation_tasks WHERE id=?').get(id), b = req.body || {};
    if (!old) return res.status(404).json({ ok: false, message: 'المهمة غير موجودة' });
    const title = text(b.title ?? old.title,160), due = text(b.due_date ?? old.due_date,10), start = text(b.start_date ?? old.start_date,10);
    if (!title || !dateOk(due) || !dateOk(start)) return res.status(400).json({ ok:false,message:'بيانات المهمة غير صالحة' });
    const status = taskStatuses.has(b.status) ? b.status : old.status, priority = priorities.has(b.priority) ? b.priority : old.priority;
    const progress = status === 'مغلقة' ? 100 : number(b.progress ?? old.progress,0,100);
    db.prepare(`UPDATE operation_tasks SET title=?,category=?,location=?,assigned_to=?,priority=?,status=?,start_date=?,due_date=?,progress=?,description=?,close_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(title,text(b.category??old.category,50),text(b.location??old.location,100),text(b.assigned_to??old.assigned_to,100),priority,status,start,due,progress,text(b.description??old.description,2000),text(b.close_notes??old.close_notes,1000),id);
    audit(req.user,'UPDATE_OPERATION_TASK','task',id,`${title} | ${status}`); res.json({ok:true});
  });
  app.delete('/api/ops/tasks/:id', requireRole('admin'), (req,res) => {
    const id=Number(req.params.id), old=db.prepare('SELECT title FROM operation_tasks WHERE id=?').get(id);
    if(!old)return res.status(404).json({ok:false,message:'المهمة غير موجودة'});
    db.transaction(()=>{db.prepare(`DELETE FROM management_files WHERE entity_type='task' AND entity_id=?`).run(id);db.prepare('DELETE FROM operation_tasks WHERE id=?').run(id);})(); audit(req.user,'DELETE_OPERATION_TASK','task',id,old.title); res.json({ok:true});
  });

  app.get('/api/ops/contracts', guard('contracts'), (req,res) => {
    const q=text(req.query.q,100), status=text(req.query.status,30); let sql='SELECT * FROM contractor_contracts WHERE 1=1', params=[];
    if(q){const like=`%${q}%`;sql+=' AND (contractor_name LIKE ? OR contract_number LIKE ? OR contract_title LIKE ? OR responsible_person LIKE ?)';params.push(like,like,like,like);}
    if(contractStatuses.has(status)){sql+=' AND status=?';params.push(status);} sql+=' ORDER BY COALESCE(NULLIF(end_date,\'\'),\'9999-12-31\'),id DESC';
    const today=new Date().toISOString().slice(0,10), soon=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
    const contracts=db.prepare(sql).all(...params).map(row=>({...row,attachment_count:db.prepare(`SELECT COUNT(*) n FROM management_files WHERE entity_type='contract' AND entity_id=?`).get(row.id).n,remaining_value:Math.max(0,Number(row.contract_value||0)-Number(row.paid_value||0)),expiry_state:row.status==='فعال'&&row.end_date?(row.end_date<today?'منتهي':row.end_date<=soon?'قريب':'ساري'):'—'}));
    res.json({ok:true,contracts,permission:permission(req.user,'contracts')});
  });
  app.post('/api/ops/contracts', guard('contracts',true), (req,res) => {
    const b=req.body||{}, contractor=text(b.contractor_name,160), title=text(b.contract_title,200), start=text(b.start_date,10), end=text(b.end_date,10);
    if(!contractor||!title)return res.status(400).json({ok:false,message:'اسم المقاول وموضوع العقد مطلوبان'});
    if(!dateOk(start)||!dateOk(end))return res.status(400).json({ok:false,message:'تاريخ العقد غير صالح'});
    const result=db.prepare(`INSERT INTO contractor_contracts(contractor_name,contract_number,contract_title,start_date,end_date,contract_value,paid_value,progress,status,responsible_person,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(contractor,text(b.contract_number,80),title,start,end,number(b.contract_value),number(b.paid_value),number(b.progress,0,100),contractStatuses.has(b.status)?b.status:'فعال',text(b.responsible_person,120),text(b.notes,2000),req.user.id);
    audit(req.user,'CREATE_CONTRACT','contract',result.lastInsertRowid,`${contractor} | ${title}`);res.json({ok:true,id:result.lastInsertRowid});
  });
  app.put('/api/ops/contracts/:id', guard('contracts',true), (req,res) => {
    const id=Number(req.params.id),old=db.prepare('SELECT * FROM contractor_contracts WHERE id=?').get(id),b=req.body||{};if(!old)return res.status(404).json({ok:false,message:'العقد غير موجود'});
    const contractor=text(b.contractor_name??old.contractor_name,160),title=text(b.contract_title??old.contract_title,200),start=text(b.start_date??old.start_date,10),end=text(b.end_date??old.end_date,10);
    if(!contractor||!title||!dateOk(start)||!dateOk(end))return res.status(400).json({ok:false,message:'بيانات العقد غير صالحة'});
    db.prepare(`UPDATE contractor_contracts SET contractor_name=?,contract_number=?,contract_title=?,start_date=?,end_date=?,contract_value=?,paid_value=?,progress=?,status=?,responsible_person=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(contractor,text(b.contract_number??old.contract_number,80),title,start,end,number(b.contract_value??old.contract_value),number(b.paid_value??old.paid_value),number(b.progress??old.progress,0,100),contractStatuses.has(b.status)?b.status:old.status,text(b.responsible_person??old.responsible_person,120),text(b.notes??old.notes,2000),id);
    audit(req.user,'UPDATE_CONTRACT','contract',id,`${contractor} | ${title}`);res.json({ok:true});
  });
  app.delete('/api/ops/contracts/:id', requireRole('admin'), (req,res) => {const id=Number(req.params.id),old=db.prepare('SELECT contract_title FROM contractor_contracts WHERE id=?').get(id);if(!old)return res.status(404).json({ok:false,message:'العقد غير موجود'});db.transaction(()=>{db.prepare(`DELETE FROM management_files WHERE entity_type='contract' AND entity_id=?`).run(id);db.prepare('DELETE FROM contractor_contracts WHERE id=?').run(id);})();audit(req.user,'DELETE_CONTRACT','contract',id,old.contract_title);res.json({ok:true});});

  const cellView = row => {
    const capacityTons=number(row.design_capacity_tons)||number(row.design_capacity_m3)*number(row.compaction_density,0,10);
    const usedTons=number(row.received_tons)||number(row.used_volume_m3)*number(row.compaction_density,0,10);
    const remainingTons=Math.max(0,capacityTons-usedTons), average=number(row.average_daily_tons);
    return {...row,calculated_capacity_tons:capacityTons,calculated_used_tons:usedTons,remaining_tons:remainingTons,used_percent:capacityTons?Math.min(100,usedTons/capacityTons*100):0,remaining_days:average?remainingTons/average:null,remaining_years:average?remainingTons/average/365:null};
  };
  app.get('/api/ops/cells', guard('cells'), (req,res) => {const cells=db.prepare('SELECT * FROM landfill_cells ORDER BY id').all().map(cellView);res.json({ok:true,cells,permission:permission(req.user,'cells')});});
  app.post('/api/ops/cells', guard('cells',true), (req,res) => {
    const b=req.body||{},name=text(b.cell_name,80),date=text(b.measurement_date,10);if(!name)return res.status(400).json({ok:false,message:'اسم الخلية مطلوب'});if(!dateOk(date))return res.status(400).json({ok:false,message:'تاريخ القياس غير صالح'});
    try{const result=db.prepare(`INSERT INTO landfill_cells(cell_name,design_capacity_m3,design_capacity_tons,used_volume_m3,received_tons,average_daily_tons,current_level,compaction_density,status,measurement_date,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(name,number(b.design_capacity_m3),number(b.design_capacity_tons),number(b.used_volume_m3),number(b.received_tons),number(b.average_daily_tons),b.current_level===''||b.current_level==null?null:Number(b.current_level),number(b.compaction_density,0,10)||0.92,cellStatuses.has(b.status)?b.status:'قيد التشغيل',date,text(b.notes,2000),req.user.id);audit(req.user,'CREATE_LANDFILL_CELL','cell',result.lastInsertRowid,name);res.json({ok:true,id:result.lastInsertRowid});}catch(e){if(String(e.message).includes('UNIQUE'))return res.status(409).json({ok:false,message:'اسم الخلية مسجل مسبقًا'});throw e;}
  });
  app.put('/api/ops/cells/:id', guard('cells',true), (req,res) => {
    const id=Number(req.params.id),old=db.prepare('SELECT * FROM landfill_cells WHERE id=?').get(id),b=req.body||{};if(!old)return res.status(404).json({ok:false,message:'الخلية غير موجودة'});const name=text(b.cell_name??old.cell_name,80),date=text(b.measurement_date??old.measurement_date,10);if(!name||!dateOk(date))return res.status(400).json({ok:false,message:'بيانات الخلية غير صالحة'});
    try{db.prepare(`UPDATE landfill_cells SET cell_name=?,design_capacity_m3=?,design_capacity_tons=?,used_volume_m3=?,received_tons=?,average_daily_tons=?,current_level=?,compaction_density=?,status=?,measurement_date=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(name,number(b.design_capacity_m3??old.design_capacity_m3),number(b.design_capacity_tons??old.design_capacity_tons),number(b.used_volume_m3??old.used_volume_m3),number(b.received_tons??old.received_tons),number(b.average_daily_tons??old.average_daily_tons),b.current_level===''?null:Number(b.current_level??old.current_level),number(b.compaction_density??old.compaction_density,0,10)||0.92,cellStatuses.has(b.status)?b.status:old.status,date,text(b.notes??old.notes,2000),id);audit(req.user,'UPDATE_LANDFILL_CELL','cell',id,name);res.json({ok:true});}catch(e){if(String(e.message).includes('UNIQUE'))return res.status(409).json({ok:false,message:'اسم الخلية مستخدم'});throw e;}
  });
  app.delete('/api/ops/cells/:id', requireRole('admin'), (req,res) => {const id=Number(req.params.id),old=db.prepare('SELECT cell_name FROM landfill_cells WHERE id=?').get(id);if(!old)return res.status(404).json({ok:false,message:'الخلية غير موجودة'});db.prepare('DELETE FROM landfill_cells WHERE id=?').run(id);audit(req.user,'DELETE_LANDFILL_CELL','cell',id,old.cell_name);res.json({ok:true});});

  app.get('/api/ops/management-dashboard', requireAuth, (req,res) => {
    const today=new Date().toISOString().slice(0,10),soon=new Date(Date.now()+30*86400000).toISOString().slice(0,10),alerts=[];
    const overdue=db.prepare(`SELECT id,title,due_date,assigned_to FROM operation_tasks WHERE status<>'مغلقة' AND due_date<>'' AND due_date<? ORDER BY due_date`).all(today);
    const urgent=db.prepare(`SELECT id,title,due_date,assigned_to FROM operation_tasks WHERE status<>'مغلقة' AND priority='عاجلة' ORDER BY due_date`).all();
    const contracts=db.prepare(`SELECT id,contractor_name,contract_title,end_date FROM contractor_contracts WHERE status='فعال' AND end_date<>'' AND end_date<=? ORDER BY end_date`).all(soon);
    const cells=db.prepare(`SELECT * FROM landfill_cells WHERE status='قيد التشغيل'`).all().map(cellView).filter(x=>x.used_percent>=85);
    overdue.forEach(x=>alerts.push({type:'danger',source:'مهمة',title:`مهمة متأخرة: ${x.title}`,detail:`الموعد ${x.due_date}${x.assigned_to?` | ${x.assigned_to}`:''}`,href:'/tasks'}));
    urgent.filter(x=>!overdue.some(o=>o.id===x.id)).forEach(x=>alerts.push({type:'warning',source:'مهمة',title:`مهمة عاجلة: ${x.title}`,detail:x.due_date?`الموعد ${x.due_date}`:'دون موعد',href:'/tasks'}));
    contracts.forEach(x=>alerts.push({type:x.end_date<today?'danger':'warning',source:'عقد',title:`${x.contract_title} | ${x.contractor_name}`,detail:x.end_date<today?`انتهى في ${x.end_date}`:`ينتهي في ${x.end_date}`,href:'/contracts'}));
    cells.forEach(x=>alerts.push({type:x.used_percent>=95?'danger':'warning',source:'خلية',title:`${x.cell_name} مستخدمة بنسبة ${x.used_percent.toFixed(1)}%`,detail:x.remaining_days==null?'حدّث المتوسط اليومي':`متبقٍ نحو ${Math.ceil(x.remaining_days)} يوم`,href:'/cells'}));
    res.json({ok:true,alerts,summary:{open_tasks:db.prepare(`SELECT COUNT(*) n FROM operation_tasks WHERE status<>'مغلقة'`).get().n,overdue_tasks:overdue.length,active_contracts:db.prepare(`SELECT COUNT(*) n FROM contractor_contracts WHERE status='فعال'`).get().n,active_cells:db.prepare(`SELECT COUNT(*) n FROM landfill_cells WHERE status='قيد التشغيل'`).get().n}});
  });
  app.get('/api/ops/management-search', requireAuth, (req,res) => {
    const q=text(req.query.q,100);if(!q)return res.json({ok:true,results:[]});const like=`%${q}%`,results=[];
    db.prepare(`SELECT id,title,location,assigned_to,due_date,status FROM operation_tasks WHERE title LIKE ? OR location LIKE ? OR assigned_to LIKE ? OR description LIKE ? LIMIT 50`).all(like,like,like,like).forEach(x=>results.push({type:'مهمة',title:x.title,reference:x.due_date||x.status,detail:[x.location,x.assigned_to].filter(Boolean).join(' | '),href:'/tasks'}));
    db.prepare(`SELECT id,contractor_name,contract_number,contract_title,end_date FROM contractor_contracts WHERE contractor_name LIKE ? OR contract_number LIKE ? OR contract_title LIKE ? OR responsible_person LIKE ? LIMIT 50`).all(like,like,like,like).forEach(x=>results.push({type:'عقد',title:x.contract_title,reference:x.contract_number||x.end_date,detail:x.contractor_name,href:'/contracts'}));
    db.prepare(`SELECT id,cell_name,status,measurement_date,notes FROM landfill_cells WHERE cell_name LIKE ? OR status LIKE ? OR notes LIKE ? LIMIT 50`).all(like,like,like).forEach(x=>results.push({type:'خلية',title:x.cell_name,reference:x.measurement_date||x.status,detail:x.notes||x.status,href:'/cells'}));
    res.json({ok:true,results});
  });
  const entityTable={task:'operation_tasks',contract:'contractor_contracts'};
  app.get('/api/ops/management-files/:type/:id',requireAuth,(req,res)=>{const type=text(req.params.type,20),id=Number(req.params.id);if(!entityTable[type])return res.status(400).json({ok:false,message:'نوع السجل غير صالح'});const files=db.prepare('SELECT id,file_name,mime_type,size_bytes,created_at FROM management_files WHERE entity_type=? AND entity_id=? ORDER BY id DESC').all(type,id);res.json({ok:true,files});});
  app.post('/api/ops/management-files/:type/:id',requireRole('admin','editor'),(req,res)=>{const type=text(req.params.type,20),id=Number(req.params.id),b=req.body||{};if(!entityTable[type]||!db.prepare(`SELECT id FROM ${entityTable[type]} WHERE id=?`).get(id))return res.status(404).json({ok:false,message:'السجل غير موجود'});const name=text(b.name,220),requestedMime=text(b.mime_type,120),mime=/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(requestedMime)?requestedMime:'application/octet-stream',raw=String(b.data_base64||'').replace(/^data:[^;]+;base64,/,'');if(!name||!raw||raw.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(raw))return res.status(400).json({ok:false,message:'المرفق غير صالح'});const buffer=Buffer.from(raw,'base64');if(!buffer.length||buffer.length>5*1024*1024)return res.status(413).json({ok:false,message:'الحد الأقصى للمرفق 5MB'});const result=db.prepare('INSERT INTO management_files(entity_type,entity_id,file_name,mime_type,size_bytes,data,created_by) VALUES(?,?,?,?,?,?,?)').run(type,id,name,mime,buffer.length,buffer,req.user.id);audit(req.user,'ADD_MANAGEMENT_FILE',type,id,name);res.json({ok:true,id:result.lastInsertRowid});});
  app.get('/api/ops/management-file/:id',requireAuth,(req,res)=>{const file=db.prepare('SELECT * FROM management_files WHERE id=?').get(Number(req.params.id));if(!file)return res.status(404).send('المرفق غير موجود');const inline=new Set(['application/pdf','image/jpeg','image/png','image/webp']).has(file.mime_type);res.setHeader('Content-Type',inline?file.mime_type:'application/octet-stream');res.setHeader('Content-Disposition',`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`);res.send(file.data);});
  app.delete('/api/ops/management-file/:id',requireRole('admin'),(req,res)=>{const id=Number(req.params.id),file=db.prepare('SELECT * FROM management_files WHERE id=?').get(id);if(!file)return res.status(404).json({ok:false,message:'المرفق غير موجود'});db.prepare('DELETE FROM management_files WHERE id=?').run(id);audit(req.user,'DELETE_MANAGEMENT_FILE',file.entity_type,file.entity_id,file.file_name);res.json({ok:true});});
};
