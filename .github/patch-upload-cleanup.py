from pathlib import Path
p=Path('server.js')
s=p.read_text()

old='''app.delete("/api/reports/:id", requireRole("admin"), (req,res)=>{\n  try { const id=Number(req.params.id); const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id); if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); if((report.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف تقرير مرسل للمراجعة أو معتمد. أعد فتحه كمسودة أولًا"}); writeAutomaticBackup("pre-delete"); db.prepare(`DELETE FROM daily_reports WHERE id=?`).run(id); audit(req.user,"DELETE_REPORT","report",id,report.report_no); res.json({ok:true,message:"تم حذف التقرير بنجاح"}); }\n  catch(error){res.status(500).json({ok:false,message:"فشل حذف التقرير",error:error.message});}\n});'''
new='''app.delete("/api/reports/:id", requireRole("admin"), (req,res)=>{\n  try {\n    const id=Number(req.params.id);\n    const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);\n    if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});\n    if((report.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف تقرير مرسل للمراجعة أو معتمد. أعد فتحه كمسودة أولًا"});\n    const files=db.prepare(`SELECT stored_name FROM attachments WHERE report_id=?`).all(id).map(x=>x.stored_name);\n    writeAutomaticBackup("pre-delete");\n    db.prepare(`DELETE FROM daily_reports WHERE id=?`).run(id);\n    for(const stored of files){ try{ fs.unlinkSync(path.join(uploadsDir,stored)); }catch{} }\n    audit(req.user,"DELETE_REPORT","report",id,report.report_no);\n    res.json({ok:true,message:"تم حذف التقرير بنجاح"});\n  } catch(error){res.status(500).json({ok:false,message:"فشل حذف التقرير",error:error.message});}\n});'''
assert old in s, 'report delete block not found'
s=s.replace(old,new,1)

old2='''}); tx(); audit(req.user,"RESTORE_BACKUP","system","backup",`${backup.reports.length} reports`); writeAutomaticBackup("post-restore"); res.json({ok:true,message:"تمت استعادة النسخة بنجاح",count:backup.reports.length}); }'''
new2='''}); tx();\n    const referenced=new Set(db.prepare(`SELECT stored_name FROM attachments`).all().map(x=>x.stored_name));\n    for(const name of fs.readdirSync(uploadsDir)){\n      const file=path.join(uploadsDir,name);\n      try{ if(fs.statSync(file).isFile() && !referenced.has(name)) fs.unlinkSync(file); }catch{}\n    }\n    audit(req.user,"RESTORE_BACKUP","system","backup",`${backup.reports.length} reports`); writeAutomaticBackup("post-restore"); res.json({ok:true,message:"تمت استعادة النسخة بنجاح",count:backup.reports.length}); }'''
assert old2 in s, 'restore completion block not found'
s=s.replace(old2,new2,1)

p.write_text(s)
