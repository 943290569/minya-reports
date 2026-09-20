const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function installEmployeeComplaints(app, { db, requireRole, audit, uploadsDir }) {
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
  `);

  const TYPES = new Set(["إدارية","مالية","الدوام","المواصلات","بيئة العمل","السلامة","المعدات والأدوات","معاملة وظيفية","أخرى"]);
  const STATUSES = new Set(["new","reviewing","action_taken","responded","closed"]);
  const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
  const attempts = new Map();

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

  app.get("/api/employee-complaints", requireRole("admin","editor"), (req, res) => {
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

  app.patch("/api/employee-complaints/:id", requireRole("admin","editor"), (req, res) => {
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
    audit(req.user, "UPDATE_EMPLOYEE_COMPLAINT", "employee_complaint", id, `${current.complaint_no} - ${status}`);
    res.json({ ok:true });
  });

  app.get("/api/employee-complaints/:id/audio", requireRole("admin","editor"), (req, res) => {
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
