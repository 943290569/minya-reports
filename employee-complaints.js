const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function installEmployeeComplaints(app, { db, requireRole, currentUser, audit, uploadsDir }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_no TEXT NOT NULL UNIQUE,
      public_token TEXT NOT NULL UNIQUE,
      employee_name TEXT DEFAULT '',
      complaint_type TEXT NOT NULL,
      complaint_text TEXT DEFAULT '',
      audio_stored_name TEXT DEFAULT '',
      audio_original_name TEXT DEFAULT '',
      audio_mime_type TEXT DEFAULT '',
      audio_size_bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      action_taken TEXT DEFAULT '',
      response_text TEXT DEFAULT '',
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date TEXT NOT NULL,
      responded_at TEXT,
      closed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_employee_complaints_status_due
      ON employee_complaints(status,due_date,submitted_at);
    CREATE INDEX IF NOT EXISTS idx_employee_complaints_type
      ON employee_complaints(complaint_type,submitted_at);
    CREATE TABLE IF NOT EXISTS complaint_reviewers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS complaint_reviewer_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reviewer_id) REFERENCES complaint_reviewers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_complaint_reviewer_sessions_expires
      ON complaint_reviewer_sessions(expires_at);
  `);

  const TYPES = new Set(["إدارية","مالية","الدوام","المواصلات","بيئة العمل","السلامة","المعدات والأدوات","معاملة وظيفية","أخرى"]);
  const STATUSES = new Set(["new","reviewing","action_taken","responded","closed"]);
  const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
  const attempts = new Map();

  function passwordHash(password, salt) {
    return crypto.scryptSync(String(password), salt, 64).toString("hex");
  }
  function tokenHash(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
  }
  function parseCookies(req) {
    return String(req.headers.cookie || "").split(";").reduce((acc, part) => {
      const i = part.indexOf("=");
      if (i > -1) acc[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1).trim());
      return acc;
    }, {});
  }
  function complaintReviewer(req) {
    try {
      db.prepare("DELETE FROM complaint_reviewer_sessions WHERE expires_at < ?").run(new Date().toISOString());
      const token = parseCookies(req).complaint_session;
      if (!token) return null;
      return db.prepare(`SELECT r.id,r.username,r.display_name,r.is_active,s.expires_at
        FROM complaint_reviewer_sessions s JOIN complaint_reviewers r ON r.id=s.reviewer_id
        WHERE s.token_hash=?`).get(tokenHash(token)) || null;
    } catch { return null; }
  }
  function requireComplaintAccess(req, res, next) {
    const reviewer = complaintReviewer(req);
    if (reviewer && reviewer.is_active && new Date(reviewer.expires_at).getTime() >= Date.now()) {
      req.complaintReviewer = reviewer;
      req.complaintAccessUser = { id:null, username:`complaints:${reviewer.username}`, source:"reviewer" };
      return next();
    }
    const siteUser = typeof currentUser === "function" ? currentUser(req) : null;
    if (siteUser && siteUser.is_active && ["admin","editor"].includes(siteUser.role)) {
      req.complaintAccessUser = siteUser;
      return next();
    }
    return res.status(401).json({ ok:false, message:"يجب تسجيل الدخول بحساب مسؤول الشكاوى أو بحساب مدير/محرر." });
  }
  function setComplaintCookie(req, res, token) {
    const secure = req.secure || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
    res.cookie("complaint_session", token, {
      httpOnly:true, sameSite:"lax", secure, path:"/", maxAge:12*60*60*1000
    });
  }

  app.post("/api/employee-complaints-auth/login", (req,res) => {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const row = db.prepare("SELECT * FROM complaint_reviewers WHERE lower(username)=? AND is_active=1").get(username);
    if (!row || passwordHash(password,row.salt) !== row.password_hash) {
      return res.status(401).json({ ok:false, message:"اسم المستخدم أو كلمة المرور غير صحيحة." });
    }
    db.prepare("DELETE FROM complaint_reviewer_sessions WHERE reviewer_id=?").run(row.id);
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now()+12*60*60*1000).toISOString();
    db.prepare("INSERT INTO complaint_reviewer_sessions(reviewer_id,token_hash,expires_at) VALUES(?,?,?)")
      .run(row.id,tokenHash(token),expires);
    setComplaintCookie(req,res,token);
    res.json({ ok:true, reviewer:{ username:row.username, display_name:row.display_name } });
  });
  app.post("/api/employee-complaints-auth/logout", requireComplaintAccess, (req,res) => {
    const token = parseCookies(req).complaint_session;
    if (token) db.prepare("DELETE FROM complaint_reviewer_sessions WHERE token_hash=?").run(tokenHash(token));
    res.clearCookie("complaint_session",{path:"/"});
    res.json({ok:true});
  });
  app.get("/api/employee-complaints-auth/me", requireComplaintAccess, (req,res) => {
    if (req.complaintReviewer) return res.json({ok:true,reviewer:{username:req.complaintReviewer.username,display_name:req.complaintReviewer.display_name},source:"reviewer"});
    res.json({ok:true,reviewer:{username:req.complaintAccessUser.username,display_name:req.complaintAccessUser.display_name||""},source:"site"});
  });

  app.get("/api/employee-complaints-reviewer", requireRole("admin"), (req,res) => {
    const row = db.prepare("SELECT id,username,display_name,is_active,created_at,updated_at FROM complaint_reviewers ORDER BY id LIMIT 1").get();
    res.json({ok:true,reviewer:row||null});
  });
  app.put("/api/employee-complaints-reviewer", requireRole("admin"), (req,res) => {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const displayName = String(req.body?.display_name || "").trim().slice(0,120);
    const password = String(req.body?.password || "");
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return res.status(400).json({ok:false,message:"اسم المستخدم يجب أن يكون من 3 إلى 40 حرفًا أو رقمًا."});
    if (password.length < 8) return res.status(400).json({ok:false,message:"كلمة المرور يجب ألا تقل عن 8 أحرف."});
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = passwordHash(password,salt);
    const existing = db.prepare("SELECT id FROM complaint_reviewers ORDER BY id LIMIT 1").get();
    if (existing) {
      db.prepare("UPDATE complaint_reviewers SET username=?,display_name=?,password_hash=?,salt=?,is_active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .run(username,displayName,hash,salt,existing.id);
      db.prepare("DELETE FROM complaint_reviewer_sessions WHERE reviewer_id=?").run(existing.id);
      audit(req.user,"RESET_COMPLAINT_REVIEWER","complaint_reviewer",existing.id,username);
    } else {
      const r=db.prepare("INSERT INTO complaint_reviewers(username,display_name,password_hash,salt) VALUES(?,?,?,?)")
        .run(username,displayName,hash,salt);
      audit(req.user,"CREATE_COMPLAINT_REVIEWER","complaint_reviewer",r.lastInsertRowid,username);
    }
    res.json({ok:true});
  });

  function ipOf(req) {
    return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim().slice(0,120);
  }
  function allowedSubmission(req) {
    const now = Date.now(), ip = ipOf(req) || "unknown", windowMs = 10 * 60 * 1000;
    const recent = (attempts.get(ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= 8) return false;
    recent.push(now); attempts.set(ip, recent);
    if (attempts.size > 1000) {
      for (const [key, list] of attempts) {
        const live = list.filter(t => now - t < windowMs);
        if (live.length) attempts.set(key, live); else attempts.delete(key);
      }
    }
    return true;
  }
  function localDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Hebron", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date).reduce((a,p) => (a[p.type] = p.value, a), {});
    return { y:Number(parts.year), m:Number(parts.month), d:Number(parts.day) };
  }
  function localDateString(date = new Date()) {
    const p = localDateParts(date);
    return `${String(p.y).padStart(4,"0")}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`;
  }
  function addBusinessDays(startDate, days) {
    const [y,m,d] = startDate.split("-").map(Number);
    const cur = new Date(Date.UTC(y, m - 1, d));
    let added = 0;
    while (added < days) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      const dow = cur.getUTCDay();
      if (dow !== 5 && dow !== 6) added++;
    }
    return cur.toISOString().slice(0,10);
  }
  function nextComplaintNo() {
    const year = localDateString().slice(0,4);
    const prefix = `EMP-${year}-`;
    const row = db.prepare(
      "SELECT complaint_no FROM employee_complaints WHERE complaint_no LIKE ? ORDER BY complaint_no DESC LIMIT 1"
    ).get(prefix + "%");
    const last = row ? Number(String(row.complaint_no).slice(prefix.length)) || 0 : 0;
    return prefix + String(last + 1).padStart(4,"0");
  }
  function decodeAudio(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const base64 = text.includes(",") ? text.slice(text.indexOf(",") + 1) : text;
    if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return null;
    try {
      const buffer = Buffer.from(base64, "base64");
      return buffer.length ? buffer : null;
    } catch { return null; }
  }
  function extForMime(mime) {
    if (mime === "audio/mpeg") return ".mp3";
    if (mime === "audio/mp4" || mime === "audio/x-m4a") return ".m4a";
    if (mime === "audio/wav" || mime === "audio/x-wav") return ".wav";
    if (mime === "audio/ogg") return ".ogg";
    if (mime === "audio/webm") return ".webm";
    return ".audio";
  }
  function publicShape(row) {
    return {
      complaint_no: row.complaint_no,
      complaint_type: row.complaint_type,
      status: row.status,
      submitted_at: row.submitted_at,
      due_date: row.due_date,
      response_text: row.response_text || "",
      responded_at: row.responded_at || null,
      closed_at: row.closed_at || null
    };
  }

  app.post("/api/employee-complaints", (req, res) => {
    if (!allowedSubmission(req)) return res.status(429).json({ ok:false, message:"تم إرسال عدة طلبات. حاول لاحقًا." });
    const employeeName = String(req.body?.employee_name || "").trim().slice(0,120);
    const complaintType = String(req.body?.complaint_type || "").trim();
    const complaintText = String(req.body?.complaint_text || "").trim().slice(0,5000);
    const audioMime = String(req.body?.audio_mime_type || "").trim().toLowerCase().slice(0,120);
    const audioName = String(req.body?.audio_original_name || "complaint-audio").replace(/[\\/\0-\x1f\x7f]/g,"_").slice(0,180);
    const audio = decodeAudio(req.body?.audio_base64);

    if (!TYPES.has(complaintType)) return res.status(400).json({ ok:false, message:"اختر طبيعة الشكوى." });
    if (!complaintText && !audio) return res.status(400).json({ ok:false, message:"اكتب تفاصيل الشكوى أو أرفق تسجيلًا صوتيًا." });
    if (audio && !audioMime.startsWith("audio/")) return res.status(400).json({ ok:false, message:"المرفق الصوتي غير صالح." });
    if (audio && audio.length > MAX_AUDIO_BYTES) return res.status(413).json({ ok:false, message:"حجم التسجيل الصوتي يجب ألا يتجاوز 8 MB." });

    let storedName = "";
    try {
      if (audio) {
        fs.mkdirSync(uploadsDir, { recursive:true });
        storedName = `employee-complaint-${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extForMime(audioMime)}`;
        fs.writeFileSync(path.join(uploadsDir, storedName), audio, { flag:"wx" });
      }
      const submittedDate = localDateString();
      const dueDate = addBusinessDays(submittedDate, 5);
      const token = crypto.randomBytes(32).toString("hex");
      const insert = db.transaction(() => {
        const complaintNo = nextComplaintNo();
        db.prepare(`INSERT INTO employee_complaints
          (complaint_no,public_token,employee_name,complaint_type,complaint_text,audio_stored_name,audio_original_name,audio_mime_type,audio_size_bytes,due_date)
          VALUES (?,?,?,?,?,?,?,?,?,?)`)
          .run(complaintNo, token, employeeName, complaintType, complaintText, storedName, audio ? audioName : "", audio ? audioMime : "", audio ? audio.length : 0, dueDate);
        return complaintNo;
      });
      const complaintNo = insert();
      res.status(201).json({ ok:true, complaint_no:complaintNo, tracking_token:token, due_date:dueDate });
    } catch (error) {
      if (storedName) { try { fs.unlinkSync(path.join(uploadsDir, storedName)); } catch {} }
      res.status(500).json({ ok:false, message:"تعذر حفظ الشكوى. حاول مرة أخرى." });
    }
  });

  app.get("/api/employee-complaints/track/:token", (req, res) => {
    const token = String(req.params.token || "");
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(404).json({ ok:false, message:"رقم المتابعة غير صالح." });
    const row = db.prepare("SELECT * FROM employee_complaints WHERE public_token=?").get(token);
    if (!row) return res.status(404).json({ ok:false, message:"لم يتم العثور على الشكوى." });
    res.json({ ok:true, complaint:publicShape(row) });
  });

  app.get("/api/employee-complaints", requireComplaintAccess, (req, res) => {
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();
    const where = [], params = [];
    if (status && STATUSES.has(status)) { where.push("status=?"); params.push(status); }
    if (type && TYPES.has(type)) { where.push("complaint_type=?"); params.push(type); }
    const sql = `SELECT id,complaint_no,employee_name,complaint_type,complaint_text,audio_original_name,audio_mime_type,audio_size_bytes,
      status,action_taken,response_text,submitted_at,due_date,responded_at,closed_at,updated_at
      FROM employee_complaints ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 WHEN 'action_taken' THEN 2 WHEN 'responded' THEN 3 ELSE 4 END,
      due_date ASC, id DESC LIMIT 500`;
    res.json({ ok:true, complaints:db.prepare(sql).all(...params) });
  });

  app.patch("/api/employee-complaints/:id", requireComplaintAccess, (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare("SELECT * FROM employee_complaints WHERE id=?").get(id);
    if (!current) return res.status(404).json({ ok:false, message:"الشكوى غير موجودة." });
    const status = String(req.body?.status || current.status).trim();
    if (!STATUSES.has(status)) return res.status(400).json({ ok:false, message:"حالة الشكوى غير صالحة." });
    const actionTaken = String(req.body?.action_taken ?? current.action_taken ?? "").trim().slice(0,5000);
    const responseText = String(req.body?.response_text ?? current.response_text ?? "").trim().slice(0,5000);
    const now = new Date().toISOString();
    const respondedAt = (responseText || status === "responded" || status === "closed") ? (current.responded_at || now) : null;
    const closedAt = status === "closed" ? (current.closed_at || now) : null;
    db.prepare(`UPDATE employee_complaints SET status=?,action_taken=?,response_text=?,responded_at=?,closed_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(status, actionTaken, responseText, respondedAt, closedAt, id);
    audit(req.complaintAccessUser, "UPDATE_EMPLOYEE_COMPLAINT", "employee_complaint", id, `${current.complaint_no} - ${status}`);
    res.json({ ok:true });
  });

  app.get("/api/employee-complaints/:id/audio", requireComplaintAccess, (req, res) => {
    const row = db.prepare("SELECT complaint_no,audio_stored_name,audio_original_name,audio_mime_type FROM employee_complaints WHERE id=?").get(Number(req.params.id));
    if (!row || !row.audio_stored_name) return res.status(404).json({ ok:false, message:"لا يوجد تسجيل صوتي." });
    const root = path.resolve(uploadsDir);
    const file = path.resolve(root, row.audio_stored_name);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.status(404).json({ ok:false, message:"ملف التسجيل غير موجود." });
    res.setHeader("Content-Type", row.audio_mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="complaint-audio"`);
    res.setHeader("X-Content-Type-Options","nosniff");
    res.sendFile(file);
  });
};
