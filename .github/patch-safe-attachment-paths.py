from pathlib import Path

p = Path('server.js')
s = p.read_text(encoding='utf-8')

anchor = '''fs.mkdirSync(backupsDir, { recursive: true });\n\nconst dbPath = path.join(dataDir, "database.db");'''
insert = '''fs.mkdirSync(backupsDir, { recursive: true });\n\nfunction safeUploadPath(storedName) {\n  const name = String(storedName || "");\n  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\\\") || path.basename(name) !== name) return null;\n  const root = path.resolve(uploadsDir);\n  const file = path.resolve(root, name);\n  if (file === root || !file.startsWith(root + path.sep)) return null;\n  return file;\n}\nfunction safeUnlinkUpload(storedName) {\n  const file = safeUploadPath(storedName);\n  if (!file) return false;\n  try { if (fs.existsSync(file)) fs.unlinkSync(file); return true; } catch { return false; }\n}\n\nconst dbPath = path.join(dataDir, "database.db");'''
if anchor not in s:
    raise SystemExit('anchor not found')
s = s.replace(anchor, insert, 1)

old = '''        const file = path.join(uploadsDir, a.stored_name);\n        return { ...a, data_base64: fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : "" };'''
new = '''        const file = safeUploadPath(a.stored_name);\n        return { ...a, data_base64: file && fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : "" };'''
if old not in s: raise SystemExit('backup attachment read snippet not found')
s = s.replace(old, new, 1)

old = '''    for(const stored of files){ try{ fs.unlinkSync(path.join(uploadsDir,stored)); }catch{} }'''
new = '''    for(const stored of files){ safeUnlinkUpload(stored); }'''
if old not in s: raise SystemExit('report delete snippet not found')
s = s.replace(old, new, 1)

old = '''app.get("/api/attachments/:id/download", requireAuth, (req,res)=>{ const a=db.prepare(`SELECT * FROM attachments WHERE id=?`).get(Number(req.params.id)); if(!a) return res.status(404).end(); const file=path.join(uploadsDir,a.stored_name); if(!fs.existsSync(file)) return res.status(404).end(); res.type(a.mime_type); res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`); res.sendFile(file); });'''
new = '''app.get("/api/attachments/:id/download", requireAuth, (req,res)=>{ const a=db.prepare(`SELECT * FROM attachments WHERE id=?`).get(Number(req.params.id)); if(!a) return res.status(404).end(); const file=safeUploadPath(a.stored_name); if(!file) return res.status(400).json({ok:false,message:"مسار المرفق غير صالح"}); if(!fs.existsSync(file)) return res.status(404).end(); res.type(a.mime_type); res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`); res.sendFile(file); });'''
if old not in s: raise SystemExit('download snippet not found')
s = s.replace(old, new, 1)

old = '''app.delete("/api/attachments/:id", requireRole("admin","editor"), (req,res)=>{ const a=db.prepare(`SELECT a.*,r.workflow_status FROM attachments a JOIN daily_reports r ON r.id=a.report_id WHERE a.id=?`).get(Number(req.params.id)); if(!a) return res.status(404).json({ok:false,message:"المرفق غير موجود"}); if((a.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف مرفقات تقرير مرسل للمراجعة أو معتمد"}); writeAutomaticBackup("pre-attachment-delete"); try{fs.unlinkSync(path.join(uploadsDir,a.stored_name));}catch{} db.prepare(`DELETE FROM attachments WHERE id=?`).run(a.id); audit(req.user,"DELETE_ATTACHMENT","report",a.report_id,a.original_name); res.json({ok:true}); });'''
new = '''app.delete("/api/attachments/:id", requireRole("admin","editor"), (req,res)=>{ const a=db.prepare(`SELECT a.*,r.workflow_status FROM attachments a JOIN daily_reports r ON r.id=a.report_id WHERE a.id=?`).get(Number(req.params.id)); if(!a) return res.status(404).json({ok:false,message:"المرفق غير موجود"}); if((a.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف مرفقات تقرير مرسل للمراجعة أو معتمد"}); writeAutomaticBackup("pre-attachment-delete"); safeUnlinkUpload(a.stored_name); db.prepare(`DELETE FROM attachments WHERE id=?`).run(a.id); audit(req.user,"DELETE_ATTACHMENT","report",a.report_id,a.original_name); res.json({ok:true}); });'''
if old not in s: raise SystemExit('delete attachment snippet not found')
s = s.replace(old, new, 1)

old = '''  const missingAttachments=attachmentRows.filter(a=>!fs.existsSync(path.join(uploadsDir,a.stored_name))).map(a=>({id:a.id,report_id:a.report_id,name:a.original_name,stored_name:a.stored_name}));\n  const knownNames=new Set(attachmentRows.map(a=>a.stored_name));'''
new = '''  const invalidAttachmentPaths=attachmentRows.filter(a=>!safeUploadPath(a.stored_name)).map(a=>({id:a.id,report_id:a.report_id,name:a.original_name,stored_name:a.stored_name}));\n  const missingAttachments=attachmentRows.filter(a=>{const file=safeUploadPath(a.stored_name);return !file||!fs.existsSync(file);}).map(a=>({id:a.id,report_id:a.report_id,name:a.original_name,stored_name:a.stored_name}));\n  const knownNames=new Set(attachmentRows.filter(a=>safeUploadPath(a.stored_name)).map(a=>a.stored_name));'''
if old not in s: raise SystemExit('integrity snippet not found')
s = s.replace(old, new, 1)

old = '''  if(missingAttachments.length) issues.push({level:"danger",code:"missing_attachments",message:`يوجد ${missingAttachments.length} مرفق مسجل وملفه غير موجود`});'''
new = '''  if(invalidAttachmentPaths.length) issues.push({level:"danger",code:"invalid_attachment_paths",message:`يوجد ${invalidAttachmentPaths.length} مرفق بمسار تخزين غير صالح`});\n  if(missingAttachments.length) issues.push({level:"danger",code:"missing_attachments",message:`يوجد ${missingAttachments.length} مرفق مسجل وملفه غير موجود أو مساره غير صالح`});'''
if old not in s: raise SystemExit('integrity issues snippet not found')
s = s.replace(old, new, 1)

old = '''  res.json({ok:true,level,sqlite_integrity:sqliteIntegrity,missing_attachments:missingAttachments,orphan_files:orphanFiles,reports_without_operations:reportsWithoutOperations,reports_without_equipment:reportsWithoutEquipment,duplicate_dates:duplicateDates,duplicate_numbers:duplicateNumbers,expired_sessions:expiredSessions,latest_backup:latestBackup?latestBackup.name:null,latest_backup_age_hours:latestBackupAgeHours,issues});'''
new = '''  res.json({ok:true,level,sqlite_integrity:sqliteIntegrity,invalid_attachment_paths:invalidAttachmentPaths,missing_attachments:missingAttachments,orphan_files:orphanFiles,reports_without_operations:reportsWithoutOperations,reports_without_equipment:reportsWithoutEquipment,duplicate_dates:duplicateDates,duplicate_numbers:duplicateNumbers,expired_sessions:expiredSessions,latest_backup:latestBackup?latestBackup.name:null,latest_backup_age_hours:latestBackupAgeHours,issues});'''
if old not in s: raise SystemExit('integrity response snippet not found')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('patched server.js safely')
