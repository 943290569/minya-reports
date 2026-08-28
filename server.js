const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
const PORT = Number(process.env.PORT || 5001);
const HOST = process.env.HOST || "0.0.0.0";
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

const dataDir = process.env.MINYA_DATA_DIR ? path.resolve(process.env.MINYA_DATA_DIR) : (process.env.RAILWAY_ENVIRONMENT ? "/data" : __dirname);
const uploadsDir = path.join(dataDir, "uploads");
const backupsDir = path.join(dataDir, "backups");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(backupsDir, { recursive: true });

function safeUploadPath(storedName) {
  const name = String(storedName || "");
  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\") || path.basename(name) !== name) return null;
  const root = path.resolve(uploadsDir);
  const file = path.resolve(root, name);
  if (file === root || !file.startsWith(root + path.sep)) return null;
  return file;
}
function safeUnlinkUpload(storedName) {
  const file = safeUploadPath(storedName);
  if (!file) return false;
  try { if (fs.existsSync(file)) fs.unlinkSync(file); return true; } catch { return false; }
}

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_BACKUP_ATTACHMENTS_BYTES = 40 * 1024 * 1024;
function validateMimeType(value) {
  const mime=String(value || "application/octet-stream").trim();
  return mime.length <= 120 && /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mime);
}
function decodeStrictBase64(value) {
  const text=String(value || "").trim();
  if (!text || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
  try {
    const buffer=Buffer.from(text, "base64");
    const normalized=text.replace(/=+$/, "");
    if (buffer.toString("base64").replace(/=+$/, "") !== normalized) return null;
    return buffer;
  } catch { return null; }
}
function validateBackupObject(backup) {
  const errors=[]; const dates=[]; const numbers=[];
  let attachmentsCount=0, attachmentsBytes=0, invalidReports=0;
  if(!backup || !Array.isArray(backup.reports)) return {valid:false,errors:["قائمة التقارير مفقودة"],summary:null};
  backup.reports.forEach((item,reportIndex)=>{
    const r=item&&item.report?item.report:{};
    if(!r.report_date){ invalidReports++; return; }
    dates.push(String(r.report_date));
    numbers.push(String(r.report_no||generateReportNo(r.report_date)));
    const attachments=Array.isArray(item.attachments)?item.attachments:[];
    attachments.forEach((a,attachmentIndex)=>{
      attachmentsCount++;
      const label=String(a?.original_name || `مرفق ${attachmentIndex+1}`).slice(0,120);
      if(!a || !a.data_base64){ errors.push(`المرفق ${label} في التقرير ${r.report_date} لا يحتوي بيانات`); return; }
      if(String(a.original_name||"").length>255) errors.push(`اسم المرفق طويل جدًا في التقرير ${r.report_date}`);
      if(!validateMimeType(a.mime_type)) errors.push(`نوع MIME غير صالح للمرفق ${label}`);
      const buffer=decodeStrictBase64(a.data_base64);
      if(!buffer){ errors.push(`بيانات Base64 غير صالحة للمرفق ${label}`); return; }
      attachmentsBytes+=buffer.length;
      if(buffer.length>MAX_ATTACHMENT_BYTES) errors.push(`المرفق ${label} يتجاوز الحد الأقصى 8MB`);
    });
  });
  const dupDates=[...new Set(dates.filter((d,i)=>dates.indexOf(d)!==i))];
  const dupNumbers=[...new Set(numbers.filter((d,i)=>numbers.indexOf(d)!==i))];
  if(invalidReports) errors.push(`${invalidReports} تقرير بدون تاريخ`);
  if(dupDates.length) errors.push(`تواريخ مكررة: ${dupDates.slice(0,5).join(", ")}`);
  if(dupNumbers.length) errors.push(`أرقام تقارير مكررة: ${dupNumbers.slice(0,5).join(", ")}`);
  if(attachmentsBytes>MAX_BACKUP_ATTACHMENTS_BYTES) errors.push("إجمالي المرفقات في النسخة يتجاوز الحد الآمن 40MB");
  const sorted=[...dates].sort();
  return {
    valid:errors.length===0, errors,
    summary:{reports_count:backup.reports.length,attachments_count:attachmentsCount,attachments_bytes:attachmentsBytes,maintenance_count:Array.isArray(backup.maintenance)?backup.maintenance.length:0,from_date:sorted[0]||null,to_date:sorted[sorted.length-1]||null,exported_at:backup.exported_at||null,system:backup.system||null,version:backup.version||null}
  };
}

const dbPath = path.join(dataDir, "database.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("busy_timeout = 5000");
db.pragma("temp_store = MEMORY");
db.pragma("cache_size = -20000");

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
    email TEXT DEFAULT '',
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

const userColumns = new Set(db.pragma("table_info(users)").map((c) => c.name));
if (!userColumns.has("email")) db.exec(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(lower(email)) WHERE email IS NOT NULL AND trim(email) <> '';
  CREATE INDEX IF NOT EXISTS idx_crews_report_id ON crews(report_id);
  CREATE INDEX IF NOT EXISTS idx_operations_report_id ON operations(report_id);
  CREATE INDEX IF NOT EXISTS idx_stations_report_id ON transfer_stations(report_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_report_id ON equipment(report_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_report_id ON attachments(report_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_name_report ON equipment(equipment_name, report_id);
  CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_logs(log_date);
  CREATE INDEX IF NOT EXISTS idx_maintenance_equipment_date ON maintenance_logs(equipment_name, log_date);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_login_ip_time ON login_attempts(ip_address, created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_workflow_date ON daily_reports(workflow_status, report_date);
`);

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
function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
function validEmail(value) {
  const email = normalizeEmail(value);
  return !email || (email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}
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
  const row = db.prepare(`SELECT u.id,u.username,u.display_name,u.email,u.role,u.is_active,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(tokenHash(token));
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
        const file = safeUploadPath(a.stored_name);
        return { ...a, data_base64: file && fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : "" };
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
  return { system: "Minya Landfill System", version: "3.2.0", exported_at: new Date().toISOString(), reports, maintenance };
}
let lastAutomaticBackupAt = 0;
const AUTO_BACKUP_INTERVAL_MS = 15 * 60 * 1000;

function writeAutomaticBackup(reason = "auto", force = false) {
  try {
    const now = Date.now();
    if (!force && now - lastAutomaticBackupAt < AUTO_BACKUP_INTERVAL_MS) return false;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `minya-${reason}-${stamp}.json`;
    fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(buildBackupObject(), null, 2), "utf8");

    lastAutomaticBackupAt = now;

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith(".json"))
      .map(name => ({ name, time: fs.statSync(path.join(backupsDir, name)).mtimeMs }))
      .sort((a,b)=>b.time-a.time);

    files.slice(20).forEach(f => {
      try { fs.unlinkSync(path.join(backupsDir, f.name)); } catch {}
    });

    return true;
  } catch (error) {
    console.error("Automatic backup failed", error);
    return false;
  }
}

app.get("/api/health", (req, res) => {
  const integrity = db.pragma("integrity_check", { simple: true });
  res.json({ ok: true, system: "Minya Landfill System V3.2 Stable", database: "SQLite", version: "3.2.0", integrity });
});

app.get("/api/auth/status", (req, res) => {
  const setupRequired = db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count === 0;
  const user = currentUser(req);
  res.json({ ok: true, setupRequired, authenticated: Boolean(user), user: user ? { id:user.id, username:user.username, display_name:user.display_name, email:user.email || "", role:user.role } : null });
});
app.post("/api/auth/setup", (req, res) => {
  if (db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count > 0) return res.status(409).json({ ok:false,message:"تم إعداد النظام مسبقًا" });
  const { username, display_name, email="", password } = req.body;
  const normalizedEmail=normalizeEmail(email);
  if (!username || !password || String(password).length < 8) return res.status(400).json({ok:false,message:"اسم المستخدم وكلمة مرور من 8 أحرف على الأقل مطلوبة"});
  if (!validEmail(normalizedEmail)) return res.status(400).json({ok:false,message:"البريد الإلكتروني غير صالح"});
  const salt = newSalt();
  const result = db.prepare(`INSERT INTO users (username,display_name,email,password_hash,salt,role) VALUES (?,?,?,?,?, 'admin')`).run(String(username).trim(), String(display_name || username).trim(), normalizedEmail, hashPassword(password,salt), salt);
  audit({ id: result.lastInsertRowid, username }, "SETUP_ADMIN", "user", result.lastInsertRowid, "Initial administrator created");
  res.json({ok:true,message:"تم إنشاء حساب المدير"});
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
  const user = db.prepare(`SELECT * FROM users WHERE is_active=1 AND (username=? OR (trim(email)<>'' AND lower(email)=lower(?))) LIMIT 1`).get(normalized,normalized);
  const suppliedHash = user ? hashPassword(password || "", user.salt) : "";
  if (!user || !safeHashEqual(suppliedHash, user.password_hash)) {
    db.prepare(`INSERT INTO login_attempts (username,success,ip_address) VALUES (?,0,?)`).run(normalized,ip);
    audit(null,"LOGIN_FAILED","user",normalized,`Failed login from ${ip}`);
    return res.status(401).json({ok:false,message:"بيانات الدخول غير صحيحة"});
  }
  db.prepare(`INSERT INTO login_attempts (username,success,ip_address) VALUES (?,1,?)`).run(user.username,ip);
  db.prepare(`DELETE FROM login_attempts WHERE username IN (?,?) AND success=0`).run(normalized,user.username);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  db.prepare(`INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (?,?,?)`).run(user.id, tokenHash(token), expires);
  res.setHeader("Set-Cookie", `minya_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${COOKIE_SECURE ? "; Secure" : ""}`);
  audit(user, "LOGIN", "user", user.id, `Login from ${ip}`);
  res.json({ ok:true,user:{ id:user.id,username:user.username,display_name:user.display_name,email:user.email || "",role:user.role } });
});
app.post("/api/auth/logout", requireAuth, (req,res)=>{
  const token = parseCookies(req).minya_session;
  if (token) db.prepare(`DELETE FROM sessions WHERE token_hash=?`).run(tokenHash(token));
  audit(req.user,"LOGOUT","user",req.user.id);
  res.setHeader("Set-Cookie", "minya_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ok:true});
});
app.get("/api/auth/me", requireAuth, (req,res)=>res.json({ok:true,user:req.user}));

app.get("/api/users", requireRole("admin"), (req,res)=>res.json({ok:true,users:db.prepare(`SELECT id,username,display_name,email,role,is_active,created_at FROM users ORDER BY id`).all()}));
app.post("/api/users", requireRole("admin"), (req,res)=>{
  try {
    const { username, display_name, email="", password, role="viewer" } = req.body;
    const normalizedEmail=normalizeEmail(email);
    if (!username || !password || String(password).length < 8) return res.status(400).json({ok:false,message:"بيانات المستخدم غير مكتملة"});
    if (!validEmail(normalizedEmail)) return res.status(400).json({ok:false,message:"البريد الإلكتروني غير صالح"});
    if (!["admin","editor","viewer"].includes(role)) return res.status(400).json({ok:false,message:"صلاحية غير صحيحة"});
    const salt=newSalt();
    const result=db.prepare(`INSERT INTO users (username,display_name,email,password_hash,salt,role) VALUES (?,?,?,?,?,?)`).run(String(username).trim(),String(display_name||username).trim(),normalizedEmail,hashPassword(password,salt),salt,role);
    audit(req.user,"CREATE_USER","user",result.lastInsertRowid,`${username}:${role}:${normalizedEmail}`);
    res.json({ok:true,id:result.lastInsertRowid});
  } catch(error){
    const duplicateEmail=String(error.message||"").includes("idx_users_email_unique") || String(error.message||"").includes("users.email");
    const duplicateUsername=String(error.message||"").includes("users.username");
    res.status(400).json({ok:false,message:duplicateEmail?"البريد الإلكتروني مستخدم لحساب آخر":duplicateUsername?"اسم المستخدم مستخدم مسبقًا":"تعذر إنشاء المستخدم"});
  }
});
app.put("/api/users/:id", requireRole("admin"), (req,res)=>{
  try {
    const id=Number(req.params.id); const {display_name,email,role,is_active,password}=req.body;
    const target=db.prepare(`SELECT * FROM users WHERE id=?`).get(id);
    if(!target) return res.status(404).json({ok:false,message:"المستخدم غير موجود"});
    if(role && !["admin","editor","viewer"].includes(role)) return res.status(400).json({ok:false,message:"صلاحية غير صحيحة"});
    const nextEmail=email===undefined?String(target.email||""):normalizeEmail(email);
    if(!validEmail(nextEmail)) return res.status(400).json({ok:false,message:"البريد الإلكتروني غير صالح"});
    if(nextEmail){
      const emailOwner=db.prepare(`SELECT id FROM users WHERE lower(email)=lower(?) AND id<>?`).get(nextEmail,id);
      if(emailOwner) return res.status(409).json({ok:false,message:"البريد الإلكتروني مستخدم لحساب آخر"});
    }
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
      db.prepare(`UPDATE users SET display_name=?,email=?,role=?,is_active=? WHERE id=?`).run(String(display_name ?? target.display_name).trim()||target.display_name,nextEmail,nextRole,nextActive,id);
      if(password){
        const salt=newSalt();
        db.prepare(`UPDATE users SET password_hash=?,salt=? WHERE id=?`).run(hashPassword(password,salt),salt,id);
        db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
      } else if(!nextActive){
        db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
      }
    });
    tx();
    audit(req.user,"UPDATE_USER","user",id,JSON.stringify({display_name:display_name??target.display_name,email:nextEmail,role:nextRole,is_active:nextActive,password_changed:Boolean(password)}));
    res.json({ok:true,message:"تم تحديث المستخدم"});
  } catch(error){res.status(500).json({ok:false,message:"تعذر تحديث المستخدم"});}
});

app.get("/api/security/sessions", requireRole("admin"), (req,res)=>{
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
  const sessions=db.prepare(`SELECT s.id,s.user_id,s.expires_at,s.created_at,u.username,u.display_name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC`).all();
  const users=db.prepare(`SELECT u.id,u.username,u.display_name,u.email,u.role,u.is_active,
    (SELECT MAX(created_at) FROM login_attempts la WHERE la.username=u.username AND la.success=1) AS last_success_login,
    (SELECT COUNT(*) FROM sessions ss WHERE ss.user_id=u.id) AS active_sessions
    FROM users u ORDER BY u.id`).all();
  res.json({ok:true,sessions,users,summary:{active_sessions:sessions.length,active_users:users.filter(x=>x.is_active).length,admins:users.filter(x=>x.role==="admin"&&x.is_active).length}});
});
app.delete("/api/security/sessions/:id", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id); const row=db.prepare(`SELECT s.*,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?`).get(id); if(!row) return res.status(404).json({ok:false,message:"الجلسة غير موجودة"}); db.prepare(`DELETE FROM sessions WHERE id=?`).run(id); audit(req.user,"TERMINATE_SESSION","session",id,row.username); res.json({ok:true,message:"تم إنهاء الجلسة"}); });
app.post("/api/security/users/:id/logout-all", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id); const u=db.prepare(`SELECT username FROM users WHERE id=?`).get(id); if(!u) return res.status(404).json({ok:false,message:"المستخدم غير موجود"}); const r=db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id); audit(req.user,"LOGOUT_USER_ALL","user",id,`${u.username}:${r.changes}`); res.json({ok:true,count:r.changes,message:"تم إنهاء جميع جلسات المستخدم"}); });
app.post("/api/security/cleanup", requireRole("admin"), (req,res)=>{ const now=new Date().toISOString(); const s=db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now); const cutoff=new Date(Date.now()-30*24*60*60*1000).toISOString(); const a=db.prepare(`DELETE FROM login_attempts WHERE created_at < ?`).run(cutoff); audit(req.user,"SECURITY_CLEANUP","system","security",`sessions:${s.changes},attempts:${a.changes}`); res.json({ok:true,sessions_removed:s.changes,attempts_removed:a.changes}); });

app.get("/api/annual-summary", requireAuth, (req, res) => {
  try {
    const year = String(req.query.year || "").trim();

    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({ ok: false, message: "السنة غير صالحة" });
    }

    const reports = db.prepare(`
      SELECT id, report_date, report_no, total_waste_tons, total_trucks, total_diesel
      FROM daily_reports
      WHERE report_date >= ? AND report_date <= ?
      ORDER BY report_date ASC
    `).all(`${year}-01-01`, `${year}-12-31`);

    const years = db.prepare(`
      SELECT DISTINCT substr(report_date, 1, 4) AS year
      FROM daily_reports
      WHERE length(report_date) >= 4
      ORDER BY year DESC
    `).all().map(row => String(row.year || "")).filter(value => /^\d{4}$/.test(value));

    const months = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, "0")}`;
      const rows = reports.filter(report => String(report.report_date || "").startsWith(`${month}-`));
      return {
        month,
        days: rows.length,
        waste: rows.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
        trucks: rows.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0),
        diesel: rows.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0)
      };
    });

    const summary = months.reduce((out, month) => {
      out.days += month.days; out.waste += month.waste; out.trucks += month.trucks; out.diesel += month.diesel; return out;
    }, { days: 0, waste: 0, trucks: 0, diesel: 0 });

    res.json({ ok: true, year, years, reports, months, summary });
  } catch (error) {
    res.status(500).json({ ok: false, message: "تعذر تحميل التقرير السنوي", error: error.message });
  }
});

app.get("/api/monthly-summary", requireAuth, (req, res) => {
  try {
    const month = String(req.query.month || "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ ok: false, message: "الشهر غير صالح" });
    const reports = db.prepare(`SELECT id,report_date,report_no,total_waste_tons,total_trucks,total_diesel FROM daily_reports WHERE report_date LIKE ? ORDER BY report_date ASC`).all(`${month}-%`);
    const summary = reports.reduce((out, report) => { out.waste += Number(report.total_waste_tons || 0); out.trucks += Number(report.total_trucks || 0); out.diesel += Number(report.total_diesel || 0); return out; }, { waste:0,trucks:0,diesel:0 });
    let maxReport=null,minReport=null;
    if(reports.length){ maxReport=reports.reduce((a,b)=>Number(b.total_waste_tons||0)>Number(a.total_waste_tons||0)?b:a); minReport=reports.reduce((a,b)=>Number(b.total_waste_tons||0)<Number(a.total_waste_tons||0)?b:a); }
    res.json({ok:true,month,days:reports.length,reports,summary:{waste:summary.waste,waste_average:reports.length?summary.waste/reports.length:0,trucks:summary.trucks,trucks_average:reports.length?summary.trucks/reports.length:0,diesel:summary.diesel,diesel_average:reports.length?summary.diesel/reports.length:0,max_waste:maxReport?Number(maxReport.total_waste_tons||0):0,max_waste_date:maxReport?maxReport.report_date:null,min_waste:minReport?Number(minReport.total_waste_tons||0):0,min_waste_date:minReport?minReport.report_date:null}});
  } catch(error){res.status(500).json({ok:false,message:"تعذر تحميل التقرير الشهري",error:error.message});}
});

app.get("/api/dashboard", requireAuth, (req, res) => {
  try {
    const today=String(req.query.today||"").trim(), month=String(req.query.month||"").trim(), year=String(req.query.year||"").trim();
    const todayReport=today?db.prepare(`SELECT id,report_date,report_no,total_waste_tons,total_trucks,total_diesel FROM daily_reports WHERE report_date=? LIMIT 1`).get(today):null;
    const monthSummary=month?db.prepare(`SELECT COUNT(*) AS days,COALESCE(SUM(total_waste_tons),0) AS waste,COALESCE(SUM(total_trucks),0) AS trucks FROM daily_reports WHERE report_date LIKE ?`).get(`${month}-%`):{days:0,waste:0,trucks:0};
    const yearSummary=year?db.prepare(`SELECT COUNT(*) AS reports,COALESCE(SUM(total_waste_tons),0) AS waste FROM daily_reports WHERE report_date LIKE ?`).get(`${year}-%`):{reports:0,waste:0};
    const recent=db.prepare(`SELECT id,report_date,report_no,total_waste_tons,total_trucks,total_diesel FROM daily_reports ORDER BY report_date DESC LIMIT 5`).all();
    res.json({ok:true,today:todayReport||null,month:{days:Number(monthSummary.days||0),waste:Number(monthSummary.waste||0),trucks:Number(monthSummary.trucks||0)},year:{reports:Number(yearSummary.reports||0),waste:Number(yearSummary.waste||0)},recent});
  } catch(error){res.status(500).json({ok:false,message:"تعذر تحميل لوحة المعلومات",error:error.message});}
});

app.get("/api/archive", requireAuth, (req,res) => {
  try {
    const page=Math.max(1,Number.parseInt(req.query.page,10)||1); const limit=Math.min(100,Math.max(10,Number.parseInt(req.query.limit,10)||50)); const offset=(page-1)*limit;
    const q=String(req.query.q||"").trim(),from=String(req.query.from||"").trim(),to=String(req.query.to||"").trim(),status=String(req.query.status||"").trim();
    let where=" WHERE 1=1"; const params=[];
    if(q){where+=" AND (report_no LIKE ? OR notes LIKE ?)";const like=`%${q}%`;params.push(like,like);} if(from){where+=" AND report_date >= ?";params.push(from);} if(to){where+=" AND report_date <= ?";params.push(to);} if(["draft","pending","approved"].includes(status)){where+=" AND workflow_status = ?";params.push(status);}
    const summary=db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(total_waste_tons),0) AS total_waste_tons,COALESCE(SUM(total_trucks),0) AS total_trucks,COALESCE(SUM(total_diesel),0) AS total_diesel FROM daily_reports ${where}`).get(...params);
    const reports=db.prepare(`SELECT * FROM daily_reports ${where} ORDER BY report_date DESC LIMIT ? OFFSET ?`).all(...params,limit,offset);
    const total=Number(summary.count||0),pages=Math.max(1,Math.ceil(total/limit));
    res.json({ok:true,page,limit,pages,count:total,reports,summary:{total_waste_tons:Number(summary.total_waste_tons||0),total_trucks:Number(summary.total_trucks||0),total_diesel:Number(summary.total_diesel||0)}});
  } catch(error){res.status(500).json({ok:false,message:"تعذر تحميل الأرشيف",error:error.message});}
});

app.get("/api/reports", requireAuth, (req, res) => { const reports=db.prepare(`SELECT * FROM daily_reports ORDER BY report_date DESC`).all(); res.json({ok:true,count:reports.length,reports}); });
app.get("/api/reports/:id", requireAuth, (req, res) => { const data=getFullReport(Number(req.params.id)); if(!data)return res.status(404).json({ok:false,message:"التقرير غير موجود"}); res.json({ok:true,...data}); });
app.post("/api/reports", requireRole("admin","editor"), (req,res)=>{
  try { const {report_date,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,crews=[],operations=[],stations=[],equipment=[]}=req.body; if(!report_date)return res.status(400).json({ok:false,message:"تاريخ التقرير مطلوب"}); if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(report_date))return res.status(409).json({ok:false,message:"يوجد تقرير محفوظ مسبقًا بنفس التاريخ"}); const reportNo=generateReportNo(report_date); const tx=db.transaction(()=>{const r=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(report_date,reportNo,weather||"",Number(temperature||0),start_time||"",end_time||"",Number(total_trucks||0),Number(total_waste_tons||0),Number(total_diesel||0),notes||"");insertChildren(r.lastInsertRowid,crews,operations,stations,equipment);return r.lastInsertRowid;}); const id=tx();audit(req.user,"CREATE_REPORT","report",id,reportNo);writeAutomaticBackup("report-create");res.json({ok:true,message:"تم حفظ التقرير بنجاح",report:{id,report_no:reportNo}}); } catch(error){res.status(500).json({ok:false,message:"فشل حفظ التقرير",error:error.message});}
});
app.put("/api/reports/:id", requireRole("admin","editor"), (req,res)=>{
  try { const id=Number(req.params.id);const current=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);if(!current)return res.status(404).json({ok:false,message:"التقرير غير موجود"});if((current.workflow_status||"draft")!=="draft")return res.status(423).json({ok:false,message:"التقرير مقفل للمراجعة أو الاعتماد. يجب إعادة فتحه كمسودة أولًا"});const {report_date,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,crews=[],operations=[],stations=[],equipment=[]}=req.body;if(!report_date)return res.status(400).json({ok:false,message:"تاريخ التقرير مطلوب"});if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=? AND id<>?`).get(report_date,id))return res.status(409).json({ok:false,message:"يوجد تقرير آخر محفوظ بنفس التاريخ"});const reportNo=generateReportNo(report_date);const tx=db.transaction(()=>{db.prepare(`UPDATE daily_reports SET report_date=?,report_no=?,weather=?,temperature=?,start_time=?,end_time=?,total_trucks=?,total_waste_tons=?,total_diesel=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(report_date,reportNo,weather||"",Number(temperature||0),start_time||"",end_time||"",Number(total_trucks||0),Number(total_waste_tons||0),Number(total_diesel||0),notes||"",id);["crews","operations","transfer_stations","equipment"].forEach(t=>db.prepare(`DELETE FROM ${t} WHERE report_id=?`).run(id));insertChildren(id,crews,operations,stations,equipment);});tx();audit(req.user,"UPDATE_REPORT","report",id,reportNo);writeAutomaticBackup("report-update");res.json({ok:true,message:"تم تعديل التقرير بنجاح",report:{id,report_no:reportNo}}); } catch(error){res.status(500).json({ok:false,message:"فشل تعديل التقرير",error:error.message});}
});
app.delete("/api/reports/:id", requireRole("admin"), (req,res)=>{
  try { const id=Number(req.params.id);const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);if(!report)return res.status(404).json({ok:false,message:"التقرير غير موجود"});if((report.workflow_status||"draft")!=="draft")return res.status(423).json({ok:false,message:"لا يمكن حذف تقرير مرسل للمراجعة أو معتمد. أعد فتحه كمسودة أولًا"});const files=db.prepare(`SELECT stored_name FROM attachments WHERE report_id=?`).all(id).map(x=>x.stored_name);writeAutomaticBackup("pre-delete",true);db.prepare(`DELETE FROM daily_reports WHERE id=?`).run(id);for(const stored of files){safeUnlinkUpload(stored);}audit(req.user,"DELETE_REPORT","report",id,report.report_no);res.json({ok:true,message:"تم حذف التقرير بنجاح"}); } catch(error){res.status(500).json({ok:false,message:"فشل حذف التقرير",error:error.message});}
});

app.post("/api/reports/:id/submit", requireRole("admin","editor"), (req,res)=>{ const id=Number(req.params.id);const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);if(!report)return res.status(404).json({ok:false,message:"التقرير غير موجود"});if((report.workflow_status||"draft")!=="draft")return res.status(409).json({ok:false,message:"التقرير ليس في حالة مسودة"});const now=new Date().toISOString();db.prepare(`UPDATE daily_reports SET workflow_status='pending',submitted_at=?,submitted_by=?,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,id);audit(req.user,"SUBMIT_REPORT","report",id,report.report_no);writeAutomaticBackup("report-submit");res.json({ok:true,message:"تم إرسال التقرير للمراجعة",workflow_status:"pending"}); });
app.post("/api/reports/:id/approve", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id);const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);if(!report)return res.status(404).json({ok:false,message:"التقرير غير موجود"});if((report.workflow_status||"draft")!=="pending")return res.status(409).json({ok:false,message:"يجب أن يكون التقرير مرسلًا للمراجعة قبل اعتماده"});const now=new Date().toISOString();db.prepare(`UPDATE daily_reports SET workflow_status='approved',approved_at=?,approved_by=?,approved_by_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,req.user.display_name||req.user.username,id);audit(req.user,"APPROVE_REPORT","report",id,report.report_no);writeAutomaticBackup("report-approve");res.json({ok:true,message:"تم اعتماد التقرير",workflow_status:"approved",approved_at:now,approved_by_name:req.user.display_name||req.user.username}); });
app.post("/api/reports/:id/reopen", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id);const report=db.prepare(`SELECT * FROM daily_reports WHERE id=?`).get(id);if(!report)return res.status(404).json({ok:false,message:"التقرير غير موجود"});if((report.workflow_status||"draft")==="draft")return res.status(409).json({ok:false,message:"التقرير مسودة بالفعل"});const reason=String(req.body?.reason||"").trim().slice(0,500);db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);audit(req.user,"REOPEN_REPORT","report",id,reason?`${report.report_no} | السبب: ${reason}`:report.report_no);writeAutomaticBackup("report-reopen");res.json({ok:true,message:"تمت إعادة فتح التقرير كمسودة",workflow_status:"draft"}); });

app.get("/api/reports/:id/attachments", requireAuth, (req,res)=>res.json({ok:true,attachments:db.prepare(`SELECT id,report_id,original_name,mime_type,size_bytes,created_at FROM attachments WHERE report_id=? ORDER BY id DESC`).all(Number(req.params.id))}));
app.post("/api/reports/:id/attachments", requireRole("admin","editor"), (req,res)=>{
  try { const reportId=Number(req.params.id);const report=db.prepare(`SELECT id,workflow_status FROM daily_reports WHERE id=?`).get(reportId);if(!report)return res.status(404).json({ok:false,message:"التقرير غير موجود"});if((report.workflow_status||"draft")!=="draft")return res.status(423).json({ok:false,message:"لا يمكن إضافة مرفقات بعد إرسال التقرير للمراجعة أو اعتماده"});const {name,mime_type,data_base64}=req.body;if(!name||!data_base64)return res.status(400).json({ok:false,message:"الملف مطلوب"});const buffer=Buffer.from(String(data_base64).replace(/^data:[^;]+;base64,/,""),"base64");if(buffer.length>8*1024*1024)return res.status(413).json({ok:false,message:"الحد الأقصى للملف 8MB"});const ext=path.extname(name).replace(/[^.a-zA-Z0-9]/g,"").slice(0,10);const stored=`${reportId}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`;fs.writeFileSync(path.join(uploadsDir,stored),buffer);const r=db.prepare(`INSERT INTO attachments (report_id,original_name,stored_name,mime_type,size_bytes,created_by) VALUES (?,?,?,?,?,?)`).run(reportId,name,stored,mime_type||"application/octet-stream",buffer.length,req.user.id);audit(req.user,"ADD_ATTACHMENT","report",reportId,name);writeAutomaticBackup("attachment-add");res.json({ok:true,id:r.lastInsertRowid}); } catch(error){res.status(500).json({ok:false,message:"فشل رفع المرفق",error:error.message});}
});
app.get("/api/attachments/:id/download", requireAuth, (req,res)=>{ const a=db.prepare(`SELECT * FROM attachments WHERE id=?`).get(Number(req.params.id));if(!a)return res.status(404).end();const file=safeUploadPath(a.stored_name);if(!file)return res.status(400).json({ok:false,message:"مسار المرفق غير صالح"});if(!fs.existsSync(file))return res.status(404).end();res.type(a.mime_type);res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`);res.sendFile(file); });
app.delete("/api/attachments/:id", requireRole("admin","editor"), (req,res)=>{ const a=db.prepare(`SELECT a.*,r.workflow_status FROM attachments a JOIN daily_reports r ON r.id=a.report_id WHERE a.id=?`).get(Number(req.params.id));if(!a)return res.status(404).json({ok:false,message:"المرفق غير موجود"});if((a.workflow_status||"draft")!=="draft")return res.status(423).json({ok:false,message:"لا يمكن حذف مرفقات تقرير مرسل للمراجعة أو معتمد"});writeAutomaticBackup("pre-attachment-delete",true);safeUnlinkUpload(a.stored_name);db.prepare(`DELETE FROM attachments WHERE id=?`).run(a.id);audit(req.user,"DELETE_ATTACHMENT","report",a.report_id,a.original_name);res.json({ok:true}); });

app.get("/api/maintenance", requireAuth, (req,res)=>{ const {equipment_name="",from="",to=""}=req.query;let sql=`SELECT m.*,u.display_name AS created_by_name FROM maintenance_logs m LEFT JOIN users u ON u.id=m.created_by WHERE 1=1`;const p=[];if(equipment_name){sql+=` AND m.equipment_name LIKE ?`;p.push(`%${equipment_name}%`);}if(from){sql+=` AND m.log_date>=?`;p.push(from);}if(to){sql+=` AND m.log_date<=?`;p.push(to);}sql+=` ORDER BY m.log_date DESC,m.id DESC`;res.json({ok:true,logs:db.prepare(sql).all(...p)}); });
app.post("/api/maintenance", requireRole("admin","editor"), (req,res)=>{ const {equipment_name,log_date,status,description,action_taken,cost}=req.body;if(!equipment_name||!log_date||!description)return res.status(400).json({ok:false,message:"اسم الآلية والتاريخ والوصف مطلوبة"});const r=db.prepare(`INSERT INTO maintenance_logs (equipment_name,log_date,status,description,action_taken,cost,created_by) VALUES (?,?,?,?,?,?,?)`).run(equipment_name,log_date,status||"ملاحظة",description,action_taken||"",Number(cost||0),req.user.id);audit(req.user,"CREATE_MAINTENANCE","maintenance",r.lastInsertRowid,equipment_name);writeAutomaticBackup("maintenance-create");res.json({ok:true,id:r.lastInsertRowid}); });
app.delete("/api/maintenance/:id", requireRole("admin"), (req,res)=>{ const id=Number(req.params.id);writeAutomaticBackup("pre-maintenance-delete",true);db.prepare(`DELETE FROM maintenance_logs WHERE id=?`).run(id);audit(req.user,"DELETE_MAINTENANCE","maintenance",id);res.json({ok:true}); });

app.get("/api/equipment/summary", requireAuth, (req,res)=>{ const from=req.query.from||"0000-01-01",to=req.query.to||"9999-12-31";const rows=db.prepare(`SELECT e.equipment_name, SUM(e.working_hours) AS working_hours, SUM(e.diesel_liters) AS diesel_liters, COUNT(*) AS report_days, (SELECT e2.operating_status FROM equipment e2 JOIN daily_reports r2 ON r2.id=e2.report_id WHERE e2.equipment_name=e.equipment_name AND r2.report_date BETWEEN ? AND ? ORDER BY r2.report_date DESC LIMIT 1) AS latest_status, (SELECT r2.report_date FROM equipment e2 JOIN daily_reports r2 ON r2.id=e2.report_id WHERE e2.equipment_name=e.equipment_name AND r2.report_date BETWEEN ? AND ? ORDER BY r2.report_date DESC LIMIT 1) AS latest_date FROM equipment e JOIN daily_reports r ON r.id=e.report_id WHERE r.report_date BETWEEN ? AND ? GROUP BY e.equipment_name ORDER BY e.equipment_name`).all(from,to,from,to,from,to);const maint=db.prepare(`SELECT equipment_name,COUNT(*) AS maintenance_count FROM maintenance_logs WHERE log_date BETWEEN ? AND ? GROUP BY equipment_name`).all(from,to);const map=new Map(maint.map(x=>[x.equipment_name,x.maintenance_count]));rows.forEach(r=>r.maintenance_count=map.get(r.equipment_name)||0);res.json({ok:true,rows}); });

app.get("/api/search", requireAuth, (req,res)=>{ const {q="",from="",to="",equipment_status="",min_waste="",max_waste=""}=req.query;let sql=`SELECT DISTINCT r.* FROM daily_reports r LEFT JOIN equipment e ON e.report_id=r.id WHERE 1=1`;const p=[];if(q){sql+=` AND (r.report_no LIKE ? OR r.notes LIKE ? OR e.equipment_name LIKE ? OR e.status_description LIKE ?)`;const like=`%${q}%`;p.push(like,like,like,like);}if(from){sql+=` AND r.report_date>=?`;p.push(from);}if(to){sql+=` AND r.report_date<=?`;p.push(to);}if(equipment_status){sql+=` AND e.operating_status=?`;p.push(equipment_status);}if(min_waste!==""){sql+=` AND r.total_waste_tons>=?`;p.push(Number(min_waste));}if(max_waste!==""){sql+=` AND r.total_waste_tons<=?`;p.push(Number(max_waste));}sql+=` ORDER BY r.report_date DESC LIMIT 500`;res.json({ok:true,reports:db.prepare(sql).all(...p)}); });
app.get("/api/weekly", requireAuth, (req,res)=>{ const start=req.query.start;if(!start)return res.status(400).json({ok:false,message:"حدد بداية الأسبوع"});const d=new Date(`${start}T00:00:00Z`);const end=new Date(d.getTime()+6*86400000).toISOString().slice(0,10);const reports=db.prepare(`SELECT * FROM daily_reports WHERE report_date BETWEEN ? AND ? ORDER BY report_date`).all(start,end);const sum=k=>reports.reduce((s,r)=>s+Number(r[k]||0),0);res.json({ok:true,start,end,reports,summary:{days:reports.length,waste:sum("total_waste_tons"),trucks:sum("total_trucks"),diesel:sum("total_diesel"),waste_avg:reports.length?sum("total_waste_tons")/reports.length:0,trucks_avg:reports.length?sum("total_trucks")/reports.length:0}}); });
app.get("/api/reviews/pending", requireRole("admin"), (req,res)=>{ const from=String(req.query.from||""),to=String(req.query.to||"");let sql=`SELECT r.*,COALESCE(u.display_name,u.username,'-') AS submitted_by_name FROM daily_reports r LEFT JOIN users u ON u.id=r.submitted_by WHERE r.workflow_status='pending'`;const params=[];if(from){sql+=` AND r.report_date>=?`;params.push(from);}if(to){sql+=` AND r.report_date<=?`;params.push(to);}sql+=` ORDER BY COALESCE(r.submitted_at,r.updated_at) ASC,r.report_date ASC`;const reports=db.prepare(sql).all(...params);res.json({ok:true,count:reports.length,reports}); });

app.get("/api/export/managerial.csv", requireAuth, (req,res)=>{ const from=req.query.from||"0000-01-01",to=req.query.to||"9999-12-31";const rows=db.prepare(`SELECT report_date,report_no,total_waste_tons,total_trucks,total_diesel,notes FROM daily_reports WHERE report_date BETWEEN ? AND ? ORDER BY report_date`).all(from,to);const escCsv=v=>`"${String(v??"").replaceAll('"','""')}"`;const csv=['التاريخ,رقم التقرير,النفايات طن,الشاحنات,السولار لتر,الملاحظات',...rows.map(r=>[r.report_date,r.report_no,r.total_waste_tons,r.total_trucks,r.total_diesel,r.notes].map(escCsv).join(','))].join('\n');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename=minya-managerial.csv');res.send('\ufeff'+csv); });
app.get("/api/audit", requireRole("admin"), (req,res)=>{ const limit=Math.min(Number(req.query.limit||200),1000);res.json({ok:true,logs:db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`).all(limit)}); });
app.get("/api/backup/download", requireRole("admin"), (req,res)=>{ const payload=buildBackupObject();audit(req.user,"DOWNLOAD_BACKUP","system","full");res.setHeader("Content-Disposition",`attachment; filename=minya-backup-${localDateString()}.json`);res.json(payload); });

function directorySize(dir) { try { return fs.readdirSync(dir,{withFileTypes:true}).reduce((sum,entry)=>{if(!entry.isFile())return sum;try{return sum+fs.statSync(path.join(dir,entry.name)).size;}catch{return sum;}},0); } catch{return 0;} }
app.get("/api/system/storage", requireRole("admin"), (req,res)=>{ const dbBytes=fs.existsSync(dbPath)?fs.statSync(dbPath).size:0;const uploadsBytes=directorySize(uploadsDir);const backupsBytes=directorySize(backupsDir);const totalBytes=dbBytes+uploadsBytes+backupsBytes;const referenceLimitBytes=512*1024*1024;const percent=referenceLimitBytes?Number(((totalBytes/referenceLimitBytes)*100).toFixed(2)):0;const level=percent>=85?"danger":percent>=70?"warning":"ok";const attachmentCount=db.prepare(`SELECT COUNT(*) AS count FROM attachments`).get().count;const backupCount=fs.readdirSync(backupsDir).filter(name=>name.endsWith(".json")).length;res.json({ok:true,db_bytes:dbBytes,uploads_bytes:uploadsBytes,backups_bytes:backupsBytes,total_bytes:totalBytes,reference_limit_bytes:referenceLimitBytes,percent,level,attachment_count:attachmentCount,backup_count:backupCount}); });
app.get("/api/backups", requireRole("admin"), (req,res)=>{ const backups=fs.readdirSync(backupsDir).filter(name=>/^minya-.*\.json$/.test(name)).map(name=>{const stat=fs.statSync(path.join(backupsDir,name));return{name,size_bytes:stat.size,created_at:stat.mtime.toISOString()};}).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,20);res.json({ok:true,backups}); });
app.get("/api/backups/:name/download", requireRole("admin"), (req,res)=>{ const name=path.basename(String(req.params.name||""));if(!/^minya-.*\.json$/.test(name))return res.status(400).json({ok:false,message:"اسم النسخة غير صالح"});const file=path.join(backupsDir,name);if(!fs.existsSync(file))return res.status(404).json({ok:false,message:"النسخة غير موجودة"});audit(req.user,"DOWNLOAD_SAVED_BACKUP","system",name);res.download(file,name); });

app.get("/api/system/integrity", requireRole("admin"), (req,res)=>{
  const sqliteIntegrity=db.pragma("integrity_check",{simple:true});
  const attachmentRows=db.prepare(`SELECT id,report_id,original_name,stored_name FROM attachments ORDER BY id`).all();
  const invalidAttachmentPaths=attachmentRows.filter(a=>!safeUploadPath(a.stored_name)).map(a=>({id:a.id,report_id:a.report_id,name:a.original_name,stored_name:a.stored_name}));
  const missingAttachments=attachmentRows.filter(a=>{const file=safeUploadPath(a.stored_name);return!file||!fs.existsSync(file);}).map(a=>({id:a.id,report_id:a.report_id,name:a.original_name,stored_name:a.stored_name}));
  const knownNames=new Set(attachmentRows.filter(a=>safeUploadPath(a.stored_name)).map(a=>a.stored_name));
  const orphanFiles=fs.readdirSync(uploadsDir).filter(name=>{try{return fs.statSync(path.join(uploadsDir,name)).isFile()&&!knownNames.has(name);}catch{return false;}});
  const reportsWithoutOperations=db.prepare(`SELECT id,report_no,report_date FROM daily_reports r WHERE NOT EXISTS (SELECT 1 FROM operations o WHERE o.report_id=r.id) ORDER BY report_date DESC`).all();
  const reportsWithoutEquipment=db.prepare(`SELECT id,report_no,report_date FROM daily_reports r WHERE NOT EXISTS (SELECT 1 FROM equipment e WHERE e.report_id=r.id) ORDER BY report_date DESC`).all();
  const duplicateDates=db.prepare(`SELECT report_date,COUNT(*) AS count FROM daily_reports GROUP BY report_date HAVING COUNT(*)>1`).all();
  const duplicateNumbers=db.prepare(`SELECT report_no,COUNT(*) AS count FROM daily_reports GROUP BY report_no HAVING COUNT(*)>1`).all();
  const nowIso=new Date().toISOString();const expiredSessions=db.prepare(`SELECT COUNT(*) AS count FROM sessions WHERE expires_at < ?`).get(nowIso).count;
  const backupFiles=fs.readdirSync(backupsDir).filter(name=>/^minya-.*\.json$/.test(name)).map(name=>{const stat=fs.statSync(path.join(backupsDir,name));return{name,mtime:stat.mtime};}).sort((a,b)=>b.mtime-a.mtime);const latestBackup=backupFiles[0]||null;const latestBackupAgeHours=latestBackup?Number(((Date.now()-latestBackup.mtime.getTime())/3600000).toFixed(1)):null;
  const issues=[];if(sqliteIntegrity!=="ok")issues.push({level:"danger",code:"sqlite",message:`فحص SQLite: ${sqliteIntegrity}`});if(invalidAttachmentPaths.length)issues.push({level:"danger",code:"invalid_attachment_paths",message:`يوجد ${invalidAttachmentPaths.length} مرفق بمسار تخزين غير صالح`});if(missingAttachments.length)issues.push({level:"danger",code:"missing_attachments",message:`يوجد ${missingAttachments.length} مرفق مسجل وملفه غير موجود أو مساره غير صالح`});if(orphanFiles.length)issues.push({level:"warning",code:"orphan_files",message:`يوجد ${orphanFiles.length} ملف مرفق غير مرتبط بقاعدة البيانات`});if(reportsWithoutOperations.length)issues.push({level:"warning",code:"no_operations",message:`يوجد ${reportsWithoutOperations.length} تقرير بدون سجلات عمليات`});if(reportsWithoutEquipment.length)issues.push({level:"warning",code:"no_equipment",message:`يوجد ${reportsWithoutEquipment.length} تقرير بدون سجلات معدات`});if(duplicateDates.length||duplicateNumbers.length)issues.push({level:"danger",code:"duplicates",message:"تم العثور على تكرار في تاريخ أو رقم التقرير"});if(expiredSessions)issues.push({level:"warning",code:"expired_sessions",message:`يوجد ${expiredSessions} جلسة منتهية يمكن تنظيفها`});if(!latestBackup)issues.push({level:"warning",code:"no_backup",message:"لا توجد نسخة احتياطية محفوظة"});else if(latestBackupAgeHours>72)issues.push({level:"warning",code:"old_backup",message:`آخر نسخة احتياطية منذ ${latestBackupAgeHours} ساعة`});const level=issues.some(x=>x.level==="danger")?"danger":issues.length?"warning":"ok";
  res.json({ok:true,level,sqlite_integrity:sqliteIntegrity,invalid_attachment_paths:invalidAttachmentPaths,missing_attachments:missingAttachments,orphan_files:orphanFiles,reports_without_operations:reportsWithoutOperations,reports_without_equipment:reportsWithoutEquipment,duplicate_dates:duplicateDates,duplicate_numbers:duplicateNumbers,expired_sessions:expiredSessions,latest_backup:latestBackup?latestBackup.name:null,latest_backup_age_hours:latestBackupAgeHours,issues});
});

app.post("/api/backup/validate", requireRole("admin"), (req,res)=>{ try{const result=validateBackupObject(req.body);res.status(result.valid?200:400).json({ok:result.valid,valid:result.valid,message:result.valid?"النسخة صالحة للاستعادة":"النسخة تحتوي أخطاء تمنع الاستعادة",errors:result.errors,summary:result.summary});}catch(error){res.status(400).json({ok:false,valid:false,message:"تعذر فحص النسخة",error:error.message});} });
app.post("/api/backup/restore", requireRole("admin"), (req,res)=>{
  try { const backup=req.body;const validation=validateBackupObject(backup);if(!validation.valid)return res.status(400).json({ok:false,message:"تم رفض الاستعادة لأن النسخة لم تجتز فحص السلامة",errors:validation.errors});writeAutomaticBackup("pre-restore",true);const tx=db.transaction(()=>{["crews","operations","transfer_stations","equipment","attachments","daily_reports","maintenance_logs"].forEach(t=>db.prepare(`DELETE FROM ${t}`).run());for(const item of backup.reports){const r=item.report;const rr=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,created_at,updated_at,workflow_status,submitted_at,submitted_by,approved_at,approved_by,approved_by_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.report_date,r.report_no||generateReportNo(r.report_date),r.weather||"",r.temperature||0,r.start_time||"",r.end_time||"",r.total_trucks||0,r.total_waste_tons||0,r.total_diesel||0,r.notes||"",r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString(),["draft","pending","approved"].includes(r.workflow_status)?r.workflow_status:"draft",r.submitted_at||null,r.submitted_by||null,r.approved_at||null,r.approved_by||null,r.approved_by_name||"");const newId=rr.lastInsertRowid;insertChildren(newId,item.crews||[],item.operations||[],item.stations||[],item.equipment||[]);for(const a of item.attachments||[]){if(!a.data_base64)continue;const ext=path.extname(a.original_name||"").replace(/[^.a-zA-Z0-9]/g,"").slice(0,10);const stored=`${newId}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`;const buffer=decodeStrictBase64(a.data_base64);if(!buffer)throw new Error("بيانات مرفق غير صالحة أثناء الاستعادة");fs.writeFileSync(path.join(uploadsDir,stored),buffer);db.prepare(`INSERT INTO attachments (report_id,original_name,stored_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?)`).run(newId,a.original_name||"file",stored,a.mime_type||"application/octet-stream",buffer.length,a.created_at||new Date().toISOString());}}for(const m of backup.maintenance||[]){db.prepare(`INSERT INTO maintenance_logs (equipment_name,log_date,status,description,action_taken,cost,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)`).run(m.equipment_name,m.log_date,m.status,m.description,m.action_taken,m.cost,m.created_by,m.created_at);}});tx();const referenced=new Set(db.prepare(`SELECT stored_name FROM attachments`).all().map(x=>x.stored_name));for(const name of fs.readdirSync(uploadsDir)){const file=path.join(uploadsDir,name);try{if(fs.statSync(file).isFile()&&!referenced.has(name))fs.unlinkSync(file);}catch{}}audit(req.user,"RESTORE_BACKUP","system","backup",`${backup.reports.length} reports`);writeAutomaticBackup("post-restore",true);res.json({ok:true,message:"تمت استعادة النسخة بنجاح",count:backup.reports.length}); } catch(error){res.status(500).json({ok:false,message:"فشل استعادة النسخة",error:error.message});}
});

app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const appPages=["/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/reviews","/admin"];
appPages.forEach(route=>app.get(route,(req,res)=>res.sendFile(path.join(__dirname,"public","index.html"))));

app.listen(PORT, HOST, () => console.log(`Minya Landfill V3 running on http://${HOST}:${PORT}`));
