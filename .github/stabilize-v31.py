from pathlib import Path

# ---------------- server hardening ----------------
p=Path('server.js'); s=p.read_text()

s=s.replace('''app.use(express.json({ limit: "50mb" }));\napp.use(express.urlencoded({ extended: true, limit: "50mb" }));''','''const regularJsonParser = express.json({ limit: "12mb" });\nconst backupJsonParser = express.json({ limit: "50mb" });\napp.use((req,res,next) => {\n  if (req.path === "/api/backup/restore" || req.path === "/api/backup/validate") return backupJsonParser(req,res,next);\n  return regularJsonParser(req,res,next);\n});\napp.use(express.urlencoded({ extended: true, limit: "2mb" }));''',1)

needle='''function hashPassword(password, salt) {\n  return crypto.scryptSync(String(password), salt, 64).toString("hex");\n}\n'''
repl='''function hashPassword(password, salt) {\n  return crypto.scryptSync(String(password), salt, 64).toString("hex");\n}\nfunction safeHashEqual(a, b) {\n  try {\n    const aa=Buffer.from(String(a), "hex"), bb=Buffer.from(String(b), "hex");\n    return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);\n  } catch { return false; }\n}\n'''
assert needle in s; s=s.replace(needle,repl,1)

old='''  const failed=db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE username=? AND success=0 AND created_at>=?`).get(normalized,windowStart).c;\n  if(failed>=5){\n    audit(null,"LOGIN_LOCKED","user",normalized,`Too many failed attempts from ${ip}`);\n    return res.status(429).json({ok:false,message:"تم إيقاف محاولات الدخول مؤقتًا لمدة 15 دقيقة بسبب تكرار المحاولات الفاشلة"});\n  }\n  const user = db.prepare(`SELECT * FROM users WHERE username=? AND is_active=1`).get(normalized);\n  if (!user || hashPassword(password || "", user.salt) !== user.password_hash) {'''
new='''  const failedUserIp=db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE username=? AND ip_address=? AND success=0 AND created_at>=?`).get(normalized,ip,windowStart).c;\n  const failedIp=db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE ip_address=? AND success=0 AND created_at>=?`).get(ip,windowStart).c;\n  if(failedUserIp>=5 || failedIp>=20){\n    audit(null,"LOGIN_LOCKED","user",normalized,`Too many failed attempts from ${ip}`);\n    return res.status(429).json({ok:false,message:"تم إيقاف محاولات الدخول مؤقتًا لمدة 15 دقيقة بسبب تكرار المحاولات الفاشلة"});\n  }\n  const user = db.prepare(`SELECT * FROM users WHERE username=? AND is_active=1`).get(normalized);\n  const suppliedHash = user ? hashPassword(password || "", user.salt) : "";\n  if (!user || !safeHashEqual(suppliedHash, user.password_hash)) {'''
assert old in s; s=s.replace(old,new,1)

old='''app.post("/api/maintenance", requireRole("admin","editor"), (req,res)=>{ const {equipment_name,log_date,status,description,action_taken,cost}=req.body; if(!equipment_name||!log_date||!description) return res.status(400).json({ok:false,message:"اسم الآلية والتاريخ والوصف مطلوبة"}); const r=db.prepare(`INSERT INTO maintenance_logs (equipment_name,log_date,status,description,action_taken,cost,created_by) VALUES (?,?,?,?,?,?,?)`).run(equipment_name,log_date,status||"ملاحظة",description,action_taken||"",Number(cost||0),req.user.id); audit(req.user,"CREATE_MAINTENANCE","maintenance",r.lastInsertRowid,equipment_name); res.json({ok:true,id:r.lastInsertRowid}); });\napp.delete("/api/maintenance/:id", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id); db.prepare(`DELETE FROM maintenance_logs WHERE id=?`).run(id); audit(req.user,"DELETE_MAINTENANCE","maintenance",id); res.json({ok:true}); });'''
new='''app.post("/api/maintenance", requireRole("admin","editor"), (req,res)=>{ const {equipment_name,log_date,status,description,action_taken,cost}=req.body; if(!equipment_name||!log_date||!description) return res.status(400).json({ok:false,message:"اسم الآلية والتاريخ والوصف مطلوبة"}); const r=db.prepare(`INSERT INTO maintenance_logs (equipment_name,log_date,status,description,action_taken,cost,created_by) VALUES (?,?,?,?,?,?,?)`).run(equipment_name,log_date,status||"ملاحظة",description,action_taken||"",Number(cost||0),req.user.id); audit(req.user,"CREATE_MAINTENANCE","maintenance",r.lastInsertRowid,equipment_name); writeAutomaticBackup("maintenance-create"); res.json({ok:true,id:r.lastInsertRowid}); });\napp.delete("/api/maintenance/:id", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id); writeAutomaticBackup("pre-maintenance-delete"); db.prepare(`DELETE FROM maintenance_logs WHERE id=?`).run(id); audit(req.user,"DELETE_MAINTENANCE","maintenance",id); res.json({ok:true}); });'''
assert old in s; s=s.replace(old,new,1)

# Opportunistic expired-session cleanup without a timer.
needle='''function currentUser(req) {\n  const token = parseCookies(req).minya_session;'''
repl='''let lastSessionCleanup = 0;\nfunction currentUser(req) {\n  if (Date.now() - lastSessionCleanup > 60*60*1000) {\n    try { db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString()); } catch {}\n    lastSessionCleanup = Date.now();\n  }\n  const token = parseCookies(req).minya_session;'''
assert needle in s; s=s.replace(needle,repl,1)
p.write_text(s)

# ---------------- remove duplicate legacy user controls in admin ----------------
p=Path('public/js/app-v3-pages.js'); s=p.read_text()
start=s.index('    c.innerHTML=`<div class="v3-admin-grid">', s.index('async function renderAdmin'))
end=s.index('`;\n    async function load()', start)+2
old=s[start:end]
# Keep backup + audit only. Full user management is rendered by app-admin-users.js.
new='''    c.innerHTML=`<div class="v3-admin-grid"><div class="v3-panel"><h3>النسخ الاحتياطي والاستعادة</h3><a class="v3-primary inline" href="/api/backup/download">تنزيل نسخة كاملة</a><p>للحماية من استعادة ملف غير صالح، تتم الاستعادة من شاشة إدارة النظام بعد فحص النسخة ومعاينتها والتأكيد.</p><a class="v3-link-btn" href="/system.html">فتح الاستعادة الآمنة</a></div></div><div class="v3-panel"><h3>سجل التعديلات Audit Log</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النوع</th><th>المعرف</th><th>التفاصيل</th></tr></thead><tbody id="auditBody"></tbody></table></div></div>`;'''
s=s[:start]+new+s[end:]
# Replace legacy load/users/add-user handler with audit-only load.
load_start=s.index('    async function load(){', s.index('async function renderAdmin'))
uadd=s.index('    uAdd.onclick=', load_start)
load_block=s[load_start:uadd]
new_load='''    async function load(){try{const a=await api('/api/audit?limit=300');auditBody.innerHTML=a.logs.map(x=>`<tr><td>${esc(x.created_at)}</td><td>${esc(x.username)}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${esc(x.entity_id)}</td><td>${esc(x.details)}</td></tr>`).join('');}catch(e){c.innerHTML=`<div class="v3-panel">${esc(e.message)} — هذه الصفحة للمدير فقط.</div>`;}}\n'''
s=s[:load_start]+new_load+s[uadd:]
# Remove old add-user handler line through load();
handler_start=s.index('    uAdd.onclick=', s.index('async function renderAdmin'))
handler_end=s.index('    load();', handler_start)+len('    load();')
s=s[:handler_start]+'    load();'+s[handler_end:]
p.write_text(s)
