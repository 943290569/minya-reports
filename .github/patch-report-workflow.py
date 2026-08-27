from pathlib import Path
p=Path('server.js')
s=p.read_text()

# Add workflow columns safely after schema creation.
anchor='''app.use(express.json({ limit: "50mb" }));'''
workflow_columns='''const reportColumns = new Set(db.pragma("table_info(daily_reports)").map((c) => c.name));
[
  ["workflow_status", "TEXT NOT NULL DEFAULT 'draft'"],
  ["submitted_at", "TEXT"],
  ["submitted_by", "INTEGER"],
  ["approved_at", "TEXT"],
  ["approved_by", "INTEGER"],
  ["approved_by_name", "TEXT DEFAULT ''"]
].forEach(([name, definition]) => {
  if (!reportColumns.has(name)) db.exec(`ALTER TABLE daily_reports ADD COLUMN ${name} ${definition}`);
});

'''+anchor
if 'workflow_status' not in s.split(anchor)[0]:
    assert anchor in s, 'express json anchor not found'
    s=s.replace(anchor,workflow_columns,1)

# Protect report update when not draft.
old='''    const id=Number(req.params.id); const current=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id); if(!current) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
    const {report_date,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,crews=[],operations=[],stations=[],equipment=[]}=req.body;'''
new='''    const id=Number(req.params.id); const current=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id); if(!current) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
    if((current.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"التقرير مقفل للمراجعة أو الاعتماد. يجب إعادة فتحه كمسودة أولًا"});
    const {report_date,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,crews=[],operations=[],stations=[],equipment=[]}=req.body;'''
assert old in s, 'report update anchor not found'
s=s.replace(old,new,1)

# Protect report deletion when approved or pending.
old='''  try { const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id); if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); writeAutomaticBackup("pre-delete"); db.prepare(`DELETE FROM daily_reports WHERE id=?`).run(id); audit(req.user,"DELETE_REPORT","report",id,report.report_no); res.json({ok:true,message:"تم حذف التقرير بنجاح"}); }'''
new='''  try { const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id); if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); if((report.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف تقرير مرسل للمراجعة أو معتمد. أعد فتحه كمسودة أولًا"}); writeAutomaticBackup("pre-delete"); db.prepare(`DELETE FROM daily_reports WHERE id=?`).run(id); audit(req.user,"DELETE_REPORT","report",id,report.report_no); res.json({ok:true,message:"تم حذف التقرير بنجاح"}); }'''
assert old in s, 'report delete anchor not found'
s=s.replace(old,new,1)

# Protect attachment add.
old='''  try { const reportId=Number(req.params.id); if(!db.prepare(`SELECT id FROM daily_reports WHERE id=?`).get(reportId)) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); const {name,mime_type,data_base64}=req.body;'''
new='''  try { const reportId=Number(req.params.id); const report=db.prepare(`SELECT id,workflow_status FROM daily_reports WHERE id=?`).get(reportId); if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); if((report.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن إضافة مرفقات بعد إرسال التقرير للمراجعة أو اعتماده"}); const {name,mime_type,data_base64}=req.body;'''
assert old in s, 'attachment add anchor not found'
s=s.replace(old,new,1)

# Protect attachment delete.
old='''app.delete("/api/attachments/:id", requireRole("admin","editor"), (req,res)=>{ const a=db.prepare(`SELECT * FROM attachments WHERE id=?`).get(Number(req.params.id)); if(!a) return res.status(404).json({ok:false,message:"المرفق غير موجود"}); writeAutomaticBackup("pre-attachment-delete"); try{fs.unlinkSync(path.join(uploadsDir,a.stored_name));}catch{} db.prepare(`DELETE FROM attachments WHERE id=?`).run(a.id); audit(req.user,"DELETE_ATTACHMENT","report",a.report_id,a.original_name); res.json({ok:true}); });'''
new='''app.delete("/api/attachments/:id", requireRole("admin","editor"), (req,res)=>{ const a=db.prepare(`SELECT a.*,r.workflow_status FROM attachments a JOIN daily_reports r ON r.id=a.report_id WHERE a.id=?`).get(Number(req.params.id)); if(!a) return res.status(404).json({ok:false,message:"المرفق غير موجود"}); if((a.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف مرفقات تقرير مرسل للمراجعة أو معتمد"}); writeAutomaticBackup("pre-attachment-delete"); try{fs.unlinkSync(path.join(uploadsDir,a.stored_name));}catch{} db.prepare(`DELETE FROM attachments WHERE id=?`).run(a.id); audit(req.user,"DELETE_ATTACHMENT","report",a.report_id,a.original_name); res.json({ok:true}); });'''
assert old in s, 'attachment delete anchor not found'
s=s.replace(old,new,1)

# Add workflow endpoints before attachments endpoints.
anchor2='''app.get("/api/reports/:id/attachments", requireAuth, (req,res)=>res.json({ok:true,attachments:db.prepare(`SELECT id,report_id,original_name,mime_type,size_bytes,created_at FROM attachments WHERE report_id=? ORDER BY id DESC`).all(Number(req.params.id))}));'''
workflow_api='''app.post("/api/reports/:id/submit", requireRole("admin","editor"), (req,res)=>{
  const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);
  if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
  if((report.workflow_status || "draft") !== "draft") return res.status(409).json({ok:false,message:"التقرير ليس في حالة مسودة"});
  const now=new Date().toISOString();
  db.prepare(`UPDATE daily_reports SET workflow_status='pending',submitted_at=?,submitted_by=?,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,id);
  audit(req.user,"SUBMIT_REPORT","report",id,report.report_no); writeAutomaticBackup("report-submit");
  res.json({ok:true,message:"تم إرسال التقرير للمراجعة",workflow_status:"pending"});
});
app.post("/api/reports/:id/approve", requireRole("admin"), (req,res)=>{
  const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);
  if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
  if((report.workflow_status || "draft") !== "pending") return res.status(409).json({ok:false,message:"يجب أن يكون التقرير مرسلًا للمراجعة قبل اعتماده"});
  const now=new Date().toISOString();
  db.prepare(`UPDATE daily_reports SET workflow_status='approved',approved_at=?,approved_by=?,approved_by_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,req.user.display_name || req.user.username,id);
  audit(req.user,"APPROVE_REPORT","report",id,report.report_no); writeAutomaticBackup("report-approve");
  res.json({ok:true,message:"تم اعتماد التقرير",workflow_status:"approved",approved_at:now,approved_by_name:req.user.display_name || req.user.username});
});
app.post("/api/reports/:id/reopen", requireRole("admin"), (req,res)=>{
  const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);
  if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
  if((report.workflow_status || "draft") === "draft") return res.status(409).json({ok:false,message:"التقرير مسودة بالفعل"});
  db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);
  audit(req.user,"REOPEN_REPORT","report",id,report.report_no); writeAutomaticBackup("report-reopen");
  res.json({ok:true,message:"تمت إعادة فتح التقرير كمسودة",workflow_status:"draft"});
});

'''+anchor2
assert anchor2 in s, 'attachments api anchor not found'
s=s.replace(anchor2,workflow_api,1)

p.write_text(s)
