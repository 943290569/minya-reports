from pathlib import Path
p=Path('server.js')
s=p.read_text()

# Add pending reviews API before report list.
anchor='''app.get("/api/reports", requireAuth, (req, res) => {'''
api='''app.get("/api/reviews/pending", requireRole("admin"), (req,res)=>{\n  const from=String(req.query.from||"");\n  const to=String(req.query.to||"");\n  let sql=`SELECT r.*,COALESCE(u.display_name,u.username,'-') AS submitted_by_name FROM daily_reports r LEFT JOIN users u ON u.id=r.submitted_by WHERE r.workflow_status='pending'`;\n  const params=[];\n  if(from){sql+=` AND r.report_date>=?`;params.push(from);}\n  if(to){sql+=` AND r.report_date<=?`;params.push(to);}\n  sql+=` ORDER BY COALESCE(r.submitted_at,r.updated_at) ASC,r.report_date ASC`;\n  const reports=db.prepare(sql).all(...params);\n  res.json({ok:true,count:reports.length,reports});\n});\n\n'''+anchor
if '/api/reviews/pending' not in s:
    assert anchor in s, 'reports anchor missing'
    s=s.replace(anchor,api,1)

# Record optional reason when reopening.
old='''app.post("/api/reports/:id/reopen", requireRole("admin"), (req,res)=>{\n  const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);\n  if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});\n  if((report.workflow_status || "draft") === "draft") return res.status(409).json({ok:false,message:"التقرير مسودة بالفعل"});\n  db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);\n  audit(req.user,"REOPEN_REPORT","report",id,report.report_no); writeAutomaticBackup("report-reopen");\n  res.json({ok:true,message:"تمت إعادة فتح التقرير كمسودة",workflow_status:"draft"});\n});'''
new='''app.post("/api/reports/:id/reopen", requireRole("admin"), (req,res)=>{\n  const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);\n  if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});\n  if((report.workflow_status || "draft") === "draft") return res.status(409).json({ok:false,message:"التقرير مسودة بالفعل"});\n  const reason=String(req.body?.reason||"").trim().slice(0,500);\n  db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);\n  audit(req.user,"REOPEN_REPORT","report",id,reason?`${report.report_no} | السبب: ${reason}`:report.report_no); writeAutomaticBackup("report-reopen");\n  res.json({ok:true,message:"تمت إعادة فتح التقرير كمسودة",workflow_status:"draft"});\n});'''
assert old in s, 'reopen endpoint missing'
s=s.replace(old,new,1)

# Add reviews route.
old='''const appPages=["/","/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/admin"];'''
new='''const appPages=["/","/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/reviews","/admin"];'''
assert old in s, 'appPages anchor missing'
s=s.replace(old,new,1)

p.write_text(s)
