const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 5001);

const dataDir = process.env.RAILWAY_ENVIRONMENT ? "/data" : __dirname;
const uploadsDir = path.join(dataDir, "uploads");
const backupsDir = path.join(dataDir, "backups");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(backupsDir, { recursive: true });

const dbPath = path.join(dataDir, "database.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL UNIQUE,
    report_no TEXT NOT NULL UNIQUE,
    weather TEXT DEFAULT '',
    temperature REAL DEFAULT 0,
    start_time TEXT DEFAULT '04:00',
    end_time TEXT DEFAULT '19:00',
    total_trucks INTEGER DEFAULT 0,
    total_waste_tons REAL DEFAULT 0,
    total_diesel REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS crews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    crew_name TEXT NOT NULL,
    crew_count INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    operation_name TEXT NOT NULL,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    vehicle_count REAL DEFAULT 0,
    quantity REAL DEFAULT 0,
    unit TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS transfer_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    station_name TEXT NOT NULL,
    truck_count INTEGER DEFAULT 0,
    waste_tons REAL DEFAULT 0,
    unit TEXT DEFAULT 'طن',
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    equipment_name TEXT NOT NULL,
    operating_status TEXT DEFAULT 'يعمل',
    status_description TEXT DEFAULT '',
    working_hours REAL DEFAULT 0,
    diesel_liters REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 0,
    ip_address TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_login_attempts_user_time ON login_attempts(username, created_at);
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT DEFAULT '',
    action TEXT NOT NULL,
    entity_type TEXT DEFAULT '',
    entity_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT DEFAULT 'application/octet-stream',
    size_bytes INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_name TEXT NOT NULL,
    log_date TEXT NOT NULL,
    status TEXT DEFAULT 'ملاحظة',
    description TEXT NOT NULL,
    action_taken TEXT DEFAULT '',
    cost REAL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const reportColumns = new Set(db.pragma("table_info(daily_reports)").map((c) => c.name));
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

const regularJsonParser = express.json({ limit: "12mb" });
const backupJsonParser = express.json({ limit: "50mb" });
app.use((req,res,next) => {
  if (req.path === "/api/backup/restore" || req.path === "/api/backup/validate") return backupJsonParser(req,res,next);
  return regularJsonParser(req,res,next);
});
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}
function safeHashEqual(a, b) {
  try {
    const aa=Buffer.from(String(a), "hex"), bb=Buffer.from(String(b), "hex");
    return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
  } catch { return false; }
}
function newSalt() { return crypto.randomBytes(16).toString("hex"); }
function tokenHash(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function parseCookies(req) {
  return String(req.headers.cookie || "").split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx > -1) acc[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    return acc;
  }, {});
}
let lastSessionCleanup = 0;
function currentUser(req) {
  if (Date.now() - lastSessionCleanup > 60*60*1000) {
    try { db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString()); } catch {}
    lastSessionCleanup = Date.now();
  }
  const token = parseCookies(req).minya_session;
  if (!token) return null;
  const row = db.prepare(`SELECT u.id,u.username,u.display_name,u.role,u.is_active,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(tokenHash(token));
  if (!row || !row.is_active || new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}
function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ ok: false, message: "يجب تسجيل الدخول" });
  req.user = user;
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "يجب تسجيل الدخول" });
    if (!roles.includes(user.role)) return res.status(403).json({ ok: false, message: "لا توجد صلاحية كافية" });
    req.user = user;
    next();
  };
}
function audit(user, action, entityType = "", entityId = "", details = "") {
  db.prepare(`INSERT INTO audit_logs (user_id,username,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)`).run(user?.id || null, user?.username || "system", action, entityType, String(entityId || ""), String(details || ""));
}
function localDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hebron", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function generateReportNo(reportDate) { return `MINYA-${reportDate}`; }
function insertChildren(reportId, crews, operations, stations, equipmentRows) {
  const crewInsert = db.prepare(`INSERT INTO crews (report_id, crew_name, crew_count, notes) VALUES (?, ?, ?, ?)`);
  for (const crew of crews) crewInsert.run(reportId, crew.crew_name || "", Number(crew.crew_count || 0), crew.notes || "");
  const operationInsert = db.prepare(`INSERT INTO operations (report_id, operation_name, start_time, end_time, vehicle_count, quantity, unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const operation of operations) operationInsert.run(reportId, operation.operation_name || "", operation.start_time || "", operation.end_time || "", Number(operation.vehicle_count || 0), Number(operation.quantity || 0), operation.unit || "", operation.notes || "");
  const stationInsert = db.prepare(`INSERT INTO transfer_stations (report_id, station_name, truck_count, waste_tons, unit, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const station of stations) stationInsert.run(reportId, station.station_name || "", Number(station.truck_count || 0), Number(station.waste_tons || 0), station.unit || "طن", station.notes || "");
  const equipmentInsert = db.prepare(`INSERT INTO equipment (report_id, equipment_name, operating_status, status_description, working_hours, diesel_liters, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const item of equipmentRows) equipmentInsert.run(reportId, item.equipment_name || "", item.operating_status || "", item.status_description || "", Number(item.working_hours || 0), Number(item.diesel_liters || 0), item.notes || "");
}
function getFullReport(reportId, includeAttachmentData = false) {
  const report = db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(reportId);
  if (!report) return null;
  const attachmentRows = db.prepare(`SELECT id,report_id,original_name,stored_name,mime_type,size_bytes,created_at FROM attachments WHERE report_id=? ORDER BY id`).all(reportId);
  const attachments = includeAttachmentData
    ? attachmentRows.map((a) => {
        const file = path.join(uploadsDir, a.stored_name);
        return { ...a, data_base64: fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : "" };
      })
    : attachmentRows.map(({ stored_name, ...a }) => a);
  return {
    report,
    crews: db.prepare(`SELECT * FROM crews WHERE report_id=? ORDER BY id`).all(reportId),
    operations: db.prepare(`SELECT * FROM operations WHERE report_id=? ORDER BY id`).all(reportId),
    stations: db.prepare(`SELECT * FROM transfer_stations WHERE report_id=? ORDER BY id`).all(reportId),
    equipment: db.prepare(`SELECT * FROM equipment WHERE report_id=? ORDER BY id`).all(reportId),
    attachments,
  };
}
function buildBackupObject() {
  const reports = db.prepare(`SELECT id FROM daily_reports ORDER BY report_date`).all().map(r => getFullReport(r.id, true));
  const maintenance = db.prepare(`SELECT * FROM maintenance_logs ORDER BY log_date,id`).all();
  return { system: "Minya Landfill System", version: "3.0.0", exported_at: new Date().toISOString(), reports, maintenance };
}
function writeAutomaticBackup(reason = "auto") {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `minya-${reason}-${stamp}.json`;
    fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(buildBackupObject(), null, 2), "utf8");
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith(".json")).map(name => ({ name, time: fs.statSync(path.join(backupsDir, name)).mtimeMs })).sort((a,b)=>b.time-a.time);
    files.slice(20).forEach(f => { try { fs.unlinkSync(path.join(backupsDir, f.name)); } catch {} });
  } catch (error) { console.error("Automatic backup failed", error); }
}

app.get("/api/health", (req, res) => {
  const integrity = db.pragma("integrity_check", { simple: true });
  res.json({ ok: true, system: "Minya Landfill System V3", database: "SQLite", version: "3.0.0", integrity });
});

app.get("/api/auth/status", (req, res) => {
  const setupRequired = db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count === 0;
  const user = currentUser(req);
  res.json({ ok: true, setupRequired, authenticated: Boolean(user), user: user ? { id:user.id, username:user.username, display_name:user.display_name, role:user.role } : null });
});
app.post("/api/auth/setup", (req, res) => {
  if (db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count > 0) return res.status(409).json({ ok:false,message:"تم إعداد النظام مسبقًا" });
  const { username, display_name, password } = req.body;
  if (!username || !password || String(password).length < 8) return res.status(400).json({ ok:false,message:"اسم المستخدم وكلمة مرور من 8 أحرف على الأقل مطلوبة" });
  const salt = newSalt();
  const result = db.prepare(`INSERT INTO users (username,display_name,password_hash,salt,role) VALUES (?,?,?,?, 'admin')`).run(String(username).trim(), String(display_name || username).trim(), hashPassword(password,salt), salt);
  audit({ id: result.lastInsertRowid, username }, "SETUP_ADMIN", "user", result.lastInsertRowid, "Initial administrator created");
  res.json({ ok:true,message:"تم إنشاء حساب المدير" });
});
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const normalized=String(username || "").trim();
  const ip=String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim().slice(0,120);
  const windowStart=new Date(Date.now()-15*60*1000).toISOString();
  const failedUserIp=db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE username=? AND ip_address=? AND success=0 AND created_at>=?`).get(normalized,ip,windowStart).c;
  const failedIp=db.prepare(`SELECT COUNT(*) AS c FROM login_attempts WHERE ip_address=? AND success=0 AND created_at>=?`).get(ip,windowStart).c;
  if(failedUserIp>=5 || failedIp>=20){
    audit(null,"LOGIN_LOCKED","user",normalized,`Too many failed attempts from ${ip}`);
    return res.status(429).json({ok:false,message:"تم إيقاف محاولات الدخول مؤقتًا لمدة 15 دقيقة بسبب تكرار المحاولات الفاشلة"});
  }
  const user = db.prepare(`SELECT * FROM users WHERE username=? AND is_active=1`).get(normalized);
  const suppliedHash = user ? hashPassword(password || "", user.salt) : "";
  if (!user || !safeHashEqual(suppliedHash, user.password_hash)) {
    db.prepare(`INSERT INTO login_attempts (username,success,ip_address) VALUES (?,0,?)`).run(normalized,ip);
    audit(null,"LOGIN_FAILED","user",normalized,`Failed login from ${ip}`);
    return res.status(401).json({ok:false,message:"بيانات الدخول غير صحيحة"});
  }
  db.prepare(`INSERT INTO login_attempts (username,success,ip_address) VALUES (?,1,?)`).run(normalized,ip);
  db.prepare(`DELETE FROM login_attempts WHERE username=? AND success=0`).run(normalized);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  db.prepare(`INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (?,?,?)`).run(user.id, tokenHash(token), expires);
  res.setHeader("Set-Cookie", `minya_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${process.env.RAILWAY_ENVIRONMENT ? "; Secure" : ""}`);
  audit(user, "LOGIN", "user", user.id, `Login from ${ip}`);
  res.json({ ok:true,user:{ id:user.id,username:user.username,display_name:user.display_name,role:user.role } });
});
app.post("/api/auth/logout", requireAuth, (req,res)=>{
  const token = parseCookies(req).minya_session;
  if (token) db.prepare(`DELETE FROM sessions WHERE token_hash=?`).run(tokenHash(token));
  audit(req.user,"LOGOUT","user",req.user.id);
  res.setHeader("Set-Cookie", "minya_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ok:true});
});
app.get("/api/auth/me", requireAuth, (req,res)=>res.json({ok:true,user:req.user}));

app.get("/api/users", requireRole("admin"), (req,res)=>res.json({ok:true,users:db.prepare(`SELECT id,username,display_name,role,is_active,created_at FROM users ORDER BY id`).all()}));
app.post("/api/users", requireRole("admin"), (req,res)=>{
  try {
    const { username, display_name, password, role="viewer" } = req.body;
    if (!username || !password || String(password).length < 8) return res.status(400).json({ok:false,message:"بيانات المستخدم غير مكتملة"});
    if (!["admin","editor","viewer"].includes(role)) return res.status(400).json({ok:false,message:"صلاحية غير صحيحة"});
    const salt=newSalt();
    const result=db.prepare(`INSERT INTO users (username,display_name,password_hash,salt,role) VALUES (?,?,?,?,?)`).run(username,display_name||username,hashPassword(password,salt),salt,role);
    audit(req.user,"CREATE_USER","user",result.lastInsertRowid,`${username}:${role}`);
    res.json({ok:true,id:result.lastInsertRowid});
  } catch(error){ res.status(400).json({ok:false,message:"تعذر إنشاء المستخدم",error:error.message}); }
});
app.put("/api/users/:id", requireRole("admin"), (req,res)=>{
  try {
    const id=Number(req.params.id); const {display_name,role,is_active,password}=req.body;
    const target=db.prepare(`SELECT * FROM users WHERE id=?`).get(id);
    if(!target) return res.status(404).json({ok:false,message:"المستخدم غير موجود"});
    if(role && !["admin","editor","viewer"].includes(role)) return res.status(400).json({ok:false,message:"صلاحية غير صحيحة"});
    const nextRole=role ?? target.role;
    const nextActive=is_active===undefined?target.is_active:Number(Boolean(is_active));
    if(id===req.user.id && !nextActive) return res.status(400).json({ok:false,message:"لا يمكن إيقاف حساب المدير المستخدم حاليًا"});
    const removesAdmin=target.role==="admin" && target.is_active && (nextRole!=="admin" || !nextActive);
    if(removesAdmin){
      const activeAdmins=db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='admin' AND is_active=1`).get().c;
      if(activeAdmins<=1) return res.status(400).json({ok:false,message:"لا يمكن إيقاف أو خفض صلاحية آخر مدير فعال"});
    }
    if(password && String(password).length<8) return res.status(400).json({ok:false,message:"كلمة المرور يجب أن تكون 8 أحرف على الأقل"});
    const tx=db.transaction(()=>{
      db.prepare(`UPDATE users SET display_name=?,role=?,is_active=? WHERE id=?`).run(String(display_name ?? target.display_name).trim()||target.display_name,nextRole,nextActive,id);
      if(password){
        const salt=newSalt();
        db.prepare(`UPDATE users SET password_hash=?,salt=? WHERE id=?`).run(hashPassword(password,salt),salt,id);
        db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
      } else if(!nextActive){
        db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
      }
    });
    tx();
    audit(req.user,"UPDATE_USER","user",id,JSON.stringify({display_name:display_name??target.display_name,role:nextRole,is_active:nextActive,password_changed:Boolean(password)}));
    res.json({ok:true,message:"تم تحديث المستخدم"});
  } catch(error){res.status(500).json({ok:false,message:"تعذر تحديث المستخدم",error:error.message});}
});

app.get("/api/security/sessions", requireRole("admin"), (req,res)=>{
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
  const sessions=db.prepare(`SELECT s.id,s.user_id,s.expires_at,s.created_at,u.username,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC`).all();
  const users=db.prepare(`SELECT u.id,u.username,u.display_name,u.role,u.is_active,
    (SELECT MAX(created_at) FROM login_attempts la WHERE la.username=u.username AND la.success=1) AS last_success_login,
    (SELECT MAX(created_at) FROM login_attempts la WHERE la.username=u.username AND la.success=0) AS last_failed_login,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.expires_at>=?) AS active_sessions
    FROM users u ORDER BY u.id`).all(new Date().toISOString());
  res.json({ok:true,sessions,users});
});
app.delete("/api/security/sessions/:id", requireRole("admin"), (req,res)=>{
  const id=Number(req.params.id);
  const row=db.prepare(`SELECT s.id,s.user_id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?`).get(id);
  if(!row) return res.status(404).json({ok:false,message:"الجلسة غير موجودة"});
  db.prepare(`DELETE FROM sessions WHERE id=?`).run(id);
  audit(req.user,"REVOKE_SESSION","user",row.user_id,row.username);
  res.json({ok:true});
});
app.post("/api/security/users/:id/logout-all", requireRole("admin"), (req,res)=>{
  const id=Number(req.params.id); const user=db.prepare(`SELECT id,username FROM users WHERE id=?`).get(id);
  if(!user) return res.status(404).json({ok:false,message:"المستخدم غير موجود"});
  const result=db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
  audit(req.user,"LOGOUT_ALL_SESSIONS","user",id,`${user.username}: ${result.changes} sessions`);
  res.json({ok:true,count:result.changes});
});
app.post("/api/security/cleanup", requireRole("admin"), (req,res)=>{
  const sessions=db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString()).changes;
  const attempts=db.prepare(`DELETE FROM login_attempts WHERE created_at < ?`).run(new Date(Date.now()-30*24*60*60*1000).toISOString()).changes;
  audit(req.user,"SECURITY_CLEANUP","system","security",`${sessions} sessions, ${attempts} login attempts`);
  res.json({ok:true,sessions_removed:sessions,attempts_removed:attempts});
});

app.get("/api/reviews/pending", requireRole("admin"), (req,res)=>{
  const from=String(req.query.from||"");
  const to=String(req.query.to||"");
  let sql=`SELECT r.*,COALESCE(u.display_name,u.username,'-') AS submitted_by_name FROM daily_reports r LEFT JOIN users u ON u.id=r.submitted_by WHERE r.workflow_status='pending'`;
  const params=[];
  if(from){sql+=` AND r.report_date>=?`;params.push(from);}
  if(to){sql+=` AND r.report_date<=?`;params.push(to);}
  sql+=` ORDER BY COALESCE(r.submitted_at,r.updated_at) ASC,r.report_date ASC`;
  const reports=db.prepare(sql).all(...params);
  res.json({ok:true,count:reports.length,reports});
});

app.get("/api/reports", requireAuth, (req, res) => {
  try { res.json({ ok:true, count:db.prepare(`SELECT COUNT(*) AS c FROM daily_reports`).get().c, reports:db.prepare(`SELECT * FROM daily_reports ORDER BY report_date DESC`).all() }); }
  catch(error){ res.status(500).json({ok:false,message:"فشل تحميل التقارير",error:error.message}); }
});
app.get("/api/reports/:id", requireAuth, (req,res)=>{
  try { const data=getFullReport(Number(req.params.id)); if(!data) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); res.json({ok:true,...data}); }
  catch(error){res.status(500).json({ok:false,message:"فشل فتح التقرير",error:error.message});}
});
app.post("/api/reports", requireRole("admin","editor"), (req,res)=>{
  try {
    const {report_date,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,crews=[],operations=[],stations=[],equipment=[]}=req.body;
    if(!report_date) return res.status(400).json({ok:false,message:"تاريخ التقرير مطلوب"});
    if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(report_date)) return res.status(409).json({ok:false,message:"يوجد تقرير محفوظ مسبقًا لنفس التاريخ"});
    const reportNo=generateReportNo(report_date);
    const tx=db.transaction(()=>{ const r=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(report_date,reportNo,weather||"",Number(temperature||0),start_time||"",end_time||"",Number(total_trucks||0),Number(total_waste_tons||0),Number(total_diesel||0),notes||""); insertChildren(r.lastInsertRowid,crews,operations,stations,equipment); return r.lastInsertRowid; });
    const id=tx(); audit(req.user,"CREATE_REPORT","report",id,reportNo); writeAutomaticBackup("report-create"); res.json({ok:true,message:"تم حفظ التقرير بنجاح",report:{id,report_no:reportNo}});
  } catch(error){res.status(500).json({ok:false,message:"فشل حفظ التقرير",error:error.message});}
});
app.put("/api/reports/:id", requireRole("admin","editor"), (req,res)=>{
  try {
    const id=Number(req.params.id); const current=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id); if(!current) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
    if((current.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"التقرير مقفل للمراجعة أو الاعتماد. يجب إعادة فتحه كمسودة أولًا"});
    const {report_date,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,crews=[],operations=[],stations=[],equipment=[]}=req.body;
    if(!report_date) return res.status(400).json({ok:false,message:"تاريخ التقرير مطلوب"});
    if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=? AND id<>?`).get(report_date,id)) return res.status(409).json({ok:false,message:"يوجد تقرير آخر محفوظ بنفس التاريخ"});
    const reportNo=generateReportNo(report_date);
    const tx=db.transaction(()=>{ db.prepare(`UPDATE daily_reports SET report_date=?,report_no=?,weather=?,temperature=?,start_time=?,end_time=?,total_trucks=?,total_waste_tons=?,total_diesel=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(report_date,reportNo,weather||"",Number(temperature||0),start_time||"",end_time||"",Number(total_trucks||0),Number(total_waste_tons||0),Number(total_diesel||0),notes||"",id); ["crews","operations","transfer_stations","equipment"].forEach(t=>db.prepare(`DELETE FROM ${t} WHERE report_id=?`).run(id)); insertChildren(id,crews,operations,stations,equipment); });
    tx(); audit(req.user,"UPDATE_REPORT","report",id,reportNo); writeAutomaticBackup("report-update"); res.json({ok:true,message:"تم تعديل التقرير بنجاح",report:{id,report_no:reportNo}});
  } catch(error){res.status(500).json({ok:false,message:"فشل تعديل التقرير",error:error.message});}
});
app.delete("/api/reports/:id", requireRole("admin"), (req,res)=>{
  try {
    const id=Number(req.params.id);
    const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);
    if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"});
    if((report.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف تقرير مرسل للمراجعة أو معتمد. أعد فتحه كمسودة أولًا"});
    const files=db.prepare(`SELECT stored_name FROM attachments WHERE report_id=?`).all(id).map(x=>x.stored_name);
    writeAutomaticBackup("pre-delete");
    db.prepare(`DELETE FROM daily_reports WHERE id=?`).run(id);
    for(const stored of files){ try{ fs.unlinkSync(path.join(uploadsDir,stored)); }catch{} }
    audit(req.user,"DELETE_REPORT","report",id,report.report_no);
    res.json({ok:true,message:"تم حذف التقرير بنجاح"});
  } catch(error){res.status(500).json({ok:false,message:"فشل حذف التقرير",error:error.message});}
});

app.post("/api/reports/:id/submit", requireRole("admin","editor"), (req,res)=>{
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
  const reason=String(req.body?.reason||"").trim().slice(0,500);
  db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);
  audit(req.user,"REOPEN_REPORT","report",id,reason?`${report.report_no} | السبب: ${reason}`:report.report_no); writeAutomaticBackup("report-reopen");
  res.json({ok:true,message:"تمت إعادة فتح التقرير كمسودة",workflow_status:"draft"});
});

app.get("/api/reports/:id/attachments", requireAuth, (req,res)=>res.json({ok:true,attachments:db.prepare(`SELECT id,report_id,original_name,mime_type,size_bytes,created_at FROM attachments WHERE report_id=? ORDER BY id DESC`).all(Number(req.params.id))}));
app.post("/api/reports/:id/attachments", requireRole("admin","editor"), (req,res)=>{
  try { const reportId=Number(req.params.id); const report=db.prepare(`SELECT id,workflow_status FROM daily_reports WHERE id=?`).get(reportId); if(!report) return res.status(404).json({ok:false,message:"التقرير غير موجود"}); if((report.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن إضافة مرفقات بعد إرسال التقرير للمراجعة أو اعتماده"}); const {name,mime_type,data_base64}=req.body; if(!name||!data_base64) return res.status(400).json({ok:false,message:"الملف مطلوب"}); const buffer=Buffer.from(String(data_base64).replace(/^data:[^;]+;base64,/,""),"base64"); if(buffer.length>8*1024*1024) return res.status(413).json({ok:false,message:"الحد الأقصى للملف 8MB"}); const ext=path.extname(name).replace(/[^.a-zA-Z0-9]/g,"").slice(0,10); const stored=`${reportId}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`; fs.writeFileSync(path.join(uploadsDir,stored),buffer); const r=db.prepare(`INSERT INTO attachments (report_id,original_name,stored_name,mime_type,size_bytes,created_by) VALUES (?,?,?,?,?,?)`).run(reportId,name,stored,mime_type||"application/octet-stream",buffer.length,req.user.id); audit(req.user,"ADD_ATTACHMENT","report",reportId,name); writeAutomaticBackup("attachment-add"); res.json({ok:true,id:r.lastInsertRowid}); }
  catch(error){res.status(500).json({ok:false,message:"فشل رفع المرفق",error:error.message});}
});
app.get("/api/attachments/:id/download", requireAuth, (req,res)=>{ const a=db.prepare(`SELECT * FROM attachments WHERE id=?`).get(Number(req.params.id)); if(!a) return res.status(404).end(); const file=path.join(uploadsDir,a.stored_name); if(!fs.existsSync(file)) return res.status(404).end(); res.type(a.mime_type); res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`); res.sendFile(file); });
app.delete("/api/attachments/:id", requireRole("admin","editor"), (req,res)=>{ const a=db.prepare(`SELECT a.*,r.workflow_status FROM attachments a JOIN daily_reports r ON r.id=a.report_id WHERE a.id=?`).get(Number(req.params.id)); if(!a) return res.status(404).json({ok:false,message:"المرفق غير موجود"}); if((a.workflow_status || "draft") !== "draft") return res.status(423).json({ok:false,message:"لا يمكن حذف مرفقات تقرير مرسل للمراجعة أو معتمد"}); writeAutomaticBackup("pre-attachment-delete"); try{fs.unlinkSync(path.join(uploadsDir,a.stored_name));}catch{} db.prepare(`DELETE FROM attachments WHERE id=?`).run(a.id); audit(req.user,"DELETE_ATTACHMENT","report",a.report_id,a.original_name); res.json({ok:true}); });

app.get("/api/maintenance", requireAuth, (req,res)=>{ const {equipment_name="",from="",to=""}=req.query; let sql=`SELECT m.*,u.display_name AS created_by_name FROM maintenance_logs m LEFT JOIN users u ON u.id=m.created_by WHERE 1=1`; const p=[]; if(equipment_name){sql+=` AND m.equipment_name LIKE ?`;p.push(`%${equipment_name}%`);} if(from){sql+=` AND m.log_date>=?`;p.push(from);} if(to){sql+=` AND m.log_date<=?`;p.push(to);} sql+=` ORDER BY m.log_date DESC,m.id DESC`; res.json({ok:true,logs:db.prepare(sql).all(...p)}); });
app.post("/api/maintenance", requireRole("admin","editor"), (req,res)=>{ const {equipment_name,log_date,status,description,action_taken,cost}=req.body; if(!equipment_name||!log_date||!description) return res.status(400).json({ok:false,message:"اسم الآلية والتاريخ والوصف مطلوبة"}); const r=db.prepare(`INSERT INTO maintenance_logs (equipment_name,log_date,status,description,action_taken,cost,created_by) VALUES (?,?,?,?,?,?,?)`).run(equipment_name,log_date,status||"ملاحظة",description,action_taken||"",Number(cost||0),req.user.id); audit(req.user,"CREATE_MAINTENANCE","maintenance",r.lastInsertRowid,equipment_name); writeAutomaticBackup("maintenance-create"); res.json({ok:true,id:r.lastInsertRowid}); });
app.delete("/api/maintenance/:id", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id); writeAutomaticBackup("pre-maintenance-delete"); db.prepare(`DELETE FROM maintenance_logs WHERE id=?`).run(id); audit(req.user,"DELETE_MAINTENANCE","maintenance",id); res.json({ok:true}); });

app.get("/api/equipment/summary", requireAuth, (req,res)=>{
  const from=req.query.from||"0000-01-01", to=req.query.to||"9999-12-31";
  const rows=db.prepare(`SELECT e.equipment_name, SUM(e.working_hours) AS working_hours, SUM(e.diesel_liters) AS diesel_liters, COUNT(*) AS report_days, (SELECT e2.operating_status FROM equipment e2 JOIN daily_reports r2 ON r2.id=e2.report_id WHERE e2.equipment_name=e.equipment_name AND r2.report_date BETWEEN ? AND ? ORDER BY r2.report_date DESC LIMIT 1) AS latest_status, (SELECT r2.report_date FROM equipment e2 JOIN daily_reports r2 ON r2.id=e2.report_id WHERE e2.equipment_name=e.equipment_name AND r2.report_date BETWEEN ? AND ? ORDER BY r2.report_date DESC LIMIT 1) AS latest_date FROM equipment e JOIN daily_reports r ON r.id=e.report_id WHERE r.report_date BETWEEN ? AND ? GROUP BY e.equipment_name ORDER BY e.equipment_name`).all(from,to,from,to,from,to);
  const maint=db.prepare(`SELECT equipment_name,COUNT(*) AS maintenance_count FROM maintenance_logs WHERE log_date BETWEEN ? AND ? GROUP BY equipment_name`).all(from,to); const map=new Map(maint.map(x=>[x.equipment_name,x.maintenance_count])); rows.forEach(r=>r.maintenance_count=map.get(r.equipment_name)||0); res.json({ok:true,rows});
});

app.get("/api/search", requireAuth, (req,res)=>{
  const {q="",from="",to="",equipment_status="",min_waste="",max_waste=""}=req.query; let sql=`SELECT DISTINCT r.* FROM daily_reports r LEFT JOIN equipment e ON e.report_id=r.id WHERE 1=1`; const p=[]; if(q){sql+=` AND (r.report_no LIKE ? OR r.notes LIKE ? OR e.equipment_name LIKE ? OR e.status_description LIKE ?)`; const like=`%${q}%`;p.push(like,like,like,like);} if(from){sql+=` AND r.report_date>=?`;p.push(from);} if(to){sql+=` AND r.report_date<=?`;p.push(to);} if(equipment_status){sql+=` AND e.operating_status=?`;p.push(equipment_status);} if(min_waste!==""){sql+=` AND r.total_waste_tons>=?`;p.push(Number(min_waste));} if(max_waste!==""){sql+=` AND r.total_waste_tons<=?`;p.push(Number(max_waste));} sql+=` ORDER BY r.report_date DESC LIMIT 500`; res.json({ok:true,reports:db.prepare(sql).all(...p)});
});

app.get("/api/weekly", requireAuth, (req,res)=>{
  const start=req.query.start; if(!start) return res.status(400).json({ok:false,message:"حدد بداية الأسبوع"}); const d=new Date(`${start}T00:00:00Z`); const end=new Date(d.getTime()+6*86400000).toISOString().slice(0,10); const reports=db.prepare(`SELECT * FROM daily_reports WHERE report_date BETWEEN ? AND ? ORDER BY report_date`).all(start,end); const sum=k=>reports.reduce((s,r)=>s+Number(r[k]||0),0); res.json({ok:true,start,end,reports,summary:{days:reports.length,waste:sum("total_waste_tons"),trucks:sum("total_trucks"),diesel:sum("total_diesel"),waste_avg:reports.length?sum("total_waste_tons")/reports.length:0,trucks_avg:reports.length?sum("total_trucks")/reports.length:0,diesel_avg:reports.length?sum("total_diesel")/reports.length:0}});
});

app.get("/api/alerts", requireAuth, (req,res)=>{
  const alerts=[]; const today=localDateString(); if(!db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(today)) alerts.push({level:"warning",title:"تقرير اليوم غير محفوظ",detail:today}); const latest=db.prepare(`SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT 1`).get(); if(latest){ const stopped=db.prepare(`SELECT equipment_name,operating_status,status_description FROM equipment WHERE report_id=? AND operating_status IN ('متعطل','تحت الصيانة')`).all(latest.id); stopped.forEach(x=>alerts.push({level:"danger",title:`${x.equipment_name} - ${x.operating_status}`,detail:x.status_description||latest.report_date})); const month=latest.report_date.slice(0,7); const avg=db.prepare(`SELECT AVG(total_diesel) AS v,AVG(total_waste_tons) AS w FROM daily_reports WHERE report_date LIKE ?`).get(`${month}%`); if(Number(avg.v)>0&&Number(latest.total_diesel)>Number(avg.v)*1.2) alerts.push({level:"warning",title:"سولار أعلى من متوسط الشهر",detail:`${latest.total_diesel} لتر`}); if(Number(avg.w)>0&&Number(latest.total_waste_tons)>Number(avg.w)*1.2) alerts.push({level:"info",title:"نفايات أعلى من متوسط الشهر",detail:`${latest.total_waste_tons} طن`}); }
  res.json({ok:true,alerts});
});

app.get("/api/audit", requireRole("admin"), (req,res)=>{ const limit=Math.min(Number(req.query.limit||200),1000); res.json({ok:true,logs:db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`).all(limit)}); });

function directorySize(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).reduce((sum, name) => {
    try { const st=fs.statSync(path.join(dir,name)); return sum + (st.isFile()?st.size:0); } catch { return sum; }
  }, 0);
}
function listBackupFiles() {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir).filter(name=>name.endsWith(".json")).map(name=>{
    const st=fs.statSync(path.join(backupsDir,name));
    return {name,size_bytes:st.size,created_at:st.mtime.toISOString()};
  }).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}
app.get("/api/system/integrity", requireRole("admin"), (req,res)=>{
  try {
    const sqlite_integrity=db.pragma("integrity_check", { simple:true });
    const attachmentRows=db.prepare(`SELECT id,report_id,original_name,stored_name FROM attachments ORDER BY id`).all();
    const missing_attachments=attachmentRows.filter(a=>!fs.existsSync(path.join(uploadsDir,a.stored_name))).map(a=>({id:a.id,report_id:a.report_id,name:a.original_name}));
    const knownFiles=new Set(attachmentRows.map(a=>a.stored_name));
    const orphan_files=fs.existsSync(uploadsDir)?fs.readdirSync(uploadsDir).filter(name=>{ try{return fs.statSync(path.join(uploadsDir,name)).isFile()&&!knownFiles.has(name);}catch{return false;} }):[];
    const reports_without_operations=db.prepare(`SELECT r.id,r.report_no,r.report_date FROM daily_reports r LEFT JOIN operations o ON o.report_id=r.id GROUP BY r.id HAVING COUNT(o.id)=0 ORDER BY r.report_date DESC`).all();
    const reports_without_equipment=db.prepare(`SELECT r.id,r.report_no,r.report_date FROM daily_reports r LEFT JOIN equipment e ON e.report_id=r.id GROUP BY r.id HAVING COUNT(e.id)=0 ORDER BY r.report_date DESC`).all();
    const duplicate_dates=db.prepare(`SELECT report_date,COUNT(*) AS count FROM daily_reports GROUP BY report_date HAVING COUNT(*)>1`).all();
    const duplicate_numbers=db.prepare(`SELECT report_no,COUNT(*) AS count FROM daily_reports GROUP BY report_no HAVING COUNT(*)>1`).all();
    const expired_sessions=db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE expires_at < ?`).get(new Date().toISOString()).c;
    const backups=listBackupFiles();
    const latest_backup=backups[0]||null;
    const backup_age_hours=latest_backup?Math.max(0,(Date.now()-new Date(latest_backup.created_at).getTime())/3600000):null;
    const issues=[];
    if(sqlite_integrity!=="ok") issues.push({level:"danger",code:"sqlite",title:"فحص SQLite غير سليم",count:1});
    if(missing_attachments.length) issues.push({level:"danger",code:"missing_attachments",title:"مرفقات مسجلة وملفاتها مفقودة",count:missing_attachments.length});
    if(orphan_files.length) issues.push({level:"warning",code:"orphan_files",title:"ملفات غير مرتبطة بتقرير",count:orphan_files.length});
    if(reports_without_operations.length) issues.push({level:"warning",code:"reports_without_operations",title:"تقارير بدون عمليات تشغيل",count:reports_without_operations.length});
    if(reports_without_equipment.length) issues.push({level:"warning",code:"reports_without_equipment",title:"تقارير بدون بيانات معدات",count:reports_without_equipment.length});
    if(duplicate_dates.length||duplicate_numbers.length) issues.push({level:"danger",code:"duplicates",title:"تكرار في معرفات التقارير",count:duplicate_dates.length+duplicate_numbers.length});
    if(!latest_backup) issues.push({level:"warning",code:"no_backup",title:"لا توجد نسخة احتياطية محفوظة",count:1});
    else if(backup_age_hours>72) issues.push({level:"warning",code:"old_backup",title:"آخر نسخة احتياطية أقدم من 72 ساعة",count:1});
    const level=issues.some(x=>x.level==="danger")?"danger":issues.length?"warning":"ok";
    res.json({ok:true,level,sqlite_integrity,issues,missing_attachments,orphan_files,reports_without_operations,reports_without_equipment,duplicate_dates,duplicate_numbers,expired_sessions,latest_backup,backup_age_hours,checked_at:new Date().toISOString()});
  } catch(error){ res.status(500).json({ok:false,message:"فشل فحص سلامة البيانات",error:error.message}); }
});

app.get("/api/system/storage", requireRole("admin"), (req,res)=>{
  const database_bytes=fs.existsSync(dbPath)?fs.statSync(dbPath).size:0;
  const uploads_bytes=directorySize(uploadsDir);
  const backups_bytes=directorySize(backupsDir);
  const total_bytes=database_bytes+uploads_bytes+backups_bytes;
  const reference_limit_bytes=512*1024*1024;
  const usage_percent=(total_bytes/reference_limit_bytes)*100;
  const level=usage_percent>=85?"danger":usage_percent>=70?"warning":"ok";
  res.json({ok:true,database_bytes,uploads_bytes,backups_bytes,total_bytes,reference_limit_bytes,usage_percent,level,attachments_count:db.prepare(`SELECT COUNT(*) AS c FROM attachments`).get().c,backups_count:listBackupFiles().length});
});
app.get("/api/backups", requireRole("admin"), (req,res)=>res.json({ok:true,backups:listBackupFiles().slice(0,20)}));
app.get("/api/backups/:name/download", requireRole("admin"), (req,res)=>{
  const name=path.basename(String(req.params.name||""));
  if(!/^minya-.*\.json$/.test(name)) return res.status(400).json({ok:false,message:"اسم النسخة غير صالح"});
  const file=path.join(backupsDir,name);
  if(!fs.existsSync(file)) return res.status(404).json({ok:false,message:"النسخة غير موجودة"});
  audit(req.user,"DOWNLOAD_SAVED_BACKUP","system","backup",name);
  res.download(file,name);
});
app.post("/api/backup/validate", requireRole("admin"), (req,res)=>{
  try {
    const backup=req.body;
    if(!backup||!Array.isArray(backup.reports)) return res.status(400).json({ok:false,message:"ملف النسخة غير صالح"});
    const dates=[]; const numbers=[]; let attachments_count=0; let attachments_bytes=0; let invalid_reports=0;
    for(const item of backup.reports){
      const r=item&&item.report?item.report:{};
      if(!r.report_date){invalid_reports++; continue;}
      dates.push(String(r.report_date)); numbers.push(String(r.report_no||generateReportNo(r.report_date)));
      for(const a of item.attachments||[]){ attachments_count++; if(a.data_base64) attachments_bytes+=Math.floor(String(a.data_base64).length*0.75); }
    }
    const duplicate_dates=[...new Set(dates.filter((v,i,a)=>a.indexOf(v)!==i))];
    const duplicate_numbers=[...new Set(numbers.filter((v,i,a)=>a.indexOf(v)!==i))];
    const maintenance_count=Array.isArray(backup.maintenance)?backup.maintenance.length:0;
    const first_date=dates.length?[...dates].sort()[0]:null; const last_date=dates.length?[...dates].sort().slice(-1)[0]:null;
    const errors=[];
    if(invalid_reports) errors.push(`${invalid_reports} تقرير بدون تاريخ صالح`);
    if(duplicate_dates.length) errors.push(`تكرار في ${duplicate_dates.length} تاريخ تقرير`);
    if(duplicate_numbers.length) errors.push(`تكرار في ${duplicate_numbers.length} رقم تقرير`);
    const valid=errors.length===0;
    res.json({ok:true,valid,errors,summary:{reports_count:backup.reports.length,maintenance_count,attachments_count,attachments_bytes,first_date,last_date,exported_at:backup.exported_at||null,system:backup.system||"",version:backup.version||backup.backup_version||""}});
  } catch(error){res.status(400).json({ok:false,message:"تعذر فحص النسخة",error:error.message});}
});
app.get("/api/backup/download", requireRole("admin"), (req,res)=>{ audit(req.user,"DOWNLOAD_BACKUP","system","backup"); const data=JSON.stringify(buildBackupObject(),null,2); const name=`minya-backup-${localDateString()}-${Date.now()}.json`; res.setHeader("Content-Type","application/json; charset=utf-8"); res.setHeader("Content-Disposition",`attachment; filename=${name}`); res.send(data); });
app.post("/api/backup/restore", requireRole("admin"), (req,res)=>{
  try { const backup=req.body; if(!backup||!Array.isArray(backup.reports)) return res.status(400).json({ok:false,message:"ملف النسخة غير صالح"}); writeAutomaticBackup("pre-restore"); const tx=db.transaction(()=>{ db.exec(`DELETE FROM attachments; DELETE FROM crews; DELETE FROM operations; DELETE FROM transfer_stations; DELETE FROM equipment; DELETE FROM daily_reports; DELETE FROM maintenance_logs;`); for(const item of backup.reports){ const r=item.report||{}; const result=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,created_at,updated_at,workflow_status,submitted_at,submitted_by,approved_at,approved_by,approved_by_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.report_date,r.report_no||generateReportNo(r.report_date),r.weather||"",Number(r.temperature||0),r.start_time||"",r.end_time||"",Number(r.total_trucks||0),Number(r.total_waste_tons||0),Number(r.total_diesel||0),r.notes||"",r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString(),["draft","pending","approved"].includes(r.workflow_status)?r.workflow_status:"draft",r.submitted_at||null,r.submitted_by||null,r.approved_at||null,r.approved_by||null,r.approved_by_name||""); insertChildren(result.lastInsertRowid,item.crews||[],item.operations||[],item.stations||[],item.equipment||[]); for(const a of item.attachments||[]){ if(!a.data_base64) continue; const buffer=Buffer.from(a.data_base64,"base64"); const ext=path.extname(a.original_name||"").replace(/[^.a-zA-Z0-9]/g,"").slice(0,10); const stored=`${result.lastInsertRowid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`; fs.writeFileSync(path.join(uploadsDir,stored),buffer); db.prepare(`INSERT INTO attachments (report_id,original_name,stored_name,mime_type,size_bytes,created_by,created_at) VALUES (?,?,?,?,?,?,?)`).run(result.lastInsertRowid,a.original_name||"مرفق",stored,a.mime_type||"application/octet-stream",buffer.length,req.user.id,a.created_at||new Date().toISOString()); } } for(const m of backup.maintenance||[]){ db.prepare(`INSERT INTO maintenance_logs (equipment_name,log_date,status,description,action_taken,cost,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)`).run(m.equipment_name,m.log_date,m.status||"ملاحظة",m.description||"",m.action_taken||"",Number(m.cost||0),req.user.id,m.created_at||new Date().toISOString()); } }); tx();
    const referenced=new Set(db.prepare(`SELECT stored_name FROM attachments`).all().map(x=>x.stored_name));
    for(const name of fs.readdirSync(uploadsDir)){
      const file=path.join(uploadsDir,name);
      try{ if(fs.statSync(file).isFile() && !referenced.has(name)) fs.unlinkSync(file); }catch{}
    }
    audit(req.user,"RESTORE_BACKUP","system","backup",`${backup.reports.length} reports`); writeAutomaticBackup("post-restore"); res.json({ok:true,message:"تمت استعادة النسخة بنجاح",count:backup.reports.length}); }
  catch(error){res.status(500).json({ok:false,message:"فشل استعادة النسخة",error:error.message});}
});

app.get("/api/export/managerial.csv", requireAuth, (req,res)=>{
  const from=req.query.from||"0000-01-01",to=req.query.to||"9999-12-31"; const reports=db.prepare(`SELECT report_date,report_no,total_waste_tons,total_trucks,total_diesel,notes FROM daily_reports WHERE report_date BETWEEN ? AND ? ORDER BY report_date`).all(from,to); const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`; const lines=[["التاريخ","رقم التقرير","النفايات طن","الشاحنات","السولار لتر","الملاحظات"],...reports.map(r=>[r.report_date,r.report_no,r.total_waste_tons,r.total_trucks,r.total_diesel,r.notes])].map(row=>row.map(esc).join(",")); res.setHeader("Content-Type","text/csv; charset=utf-8"); res.setHeader("Content-Disposition",`attachment; filename=minya-managerial-${from}-${to}.csv`); res.send("\uFEFF"+lines.join("\r\n"));
});

const appPages=["/","/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/reviews","/admin"];
appPages.forEach(route=>app.get(route,(req,res)=>res.sendFile(path.join(__dirname,"public","index.html"))));

app.listen(PORT,"0.0.0.0",()=>{
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
  console.log("======================================");
  console.log(" Minya Landfill System V3");
  console.log(` Port: ${PORT}`);
  console.log(` Database: ${dbPath}`);
  console.log("======================================");
});
