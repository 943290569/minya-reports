const fs = require("fs");
const path = require("path");
const Module = require("module");

const root = path.resolve(__dirname, "..");
const serverPath = path.join(root, "server.js");
const pkg = require(path.join(root, "package.json"));
const version = String(pkg.version || "3.5.0");

let source = fs.readFileSync(serverPath, "utf8");

const replacements = [
  [
    'const backupJsonParser = express.json({ limit: "50mb" });',
    'const backupJsonParser = express.json({ limit: "64mb" });'
  ],
  [
    'require("./driver-licenses")(app,{db,requireAuth,requireRole,audit,uploadsDir});',
    'require("./driver-licenses")(app,{db,requireAuth,requireRole,audit,uploadsDir});\nrequire("./web-push-notifications")(app,{db,requireAuth,audit});'
  ],
  [
    'if(!r.report_date){ invalidReports++; return; }\n    dates.push(String(r.report_date));',
    'const reportDate=String(r.report_date||"").trim();if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(reportDate)){errors.push(`تاريخ تقرير غير صالح: ${reportDate||"فارغ"}`);invalidReports++;return;}const parsedDate=new Date(`${reportDate}T00:00:00Z`);if(Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==reportDate){errors.push(`تاريخ تقرير غير موجود في التقويم: ${reportDate}`);invalidReports++;return;}const numericChecks=[["temperature",false],["total_trucks",true],["total_waste_tons",true],["total_diesel",true]];for(const [field,nonNegative] of numericChecks){if(r[field]===undefined||r[field]===null||r[field]==="")continue;const n=Number(r[field]);if(!Number.isFinite(n)||(nonNegative&&n<0)||(field==="total_trucks"&&!Number.isInteger(n)))errors.push(`قيمة رقمية غير صالحة ${field} في تقرير ${reportDate}`);}dates.push(reportDate);'
  ],
  [
    '["approved_by_name", "TEXT DEFAULT \'\'"]\n].forEach(([name, definition]) => {',
    '["approved_by_name", "TEXT DEFAULT \'\'"],\n  ["returned_reason", "TEXT DEFAULT \'\'"],\n  ["returned_at", "TEXT"],\n  ["returned_by", "INTEGER"],\n  ["returned_to", "INTEGER"]\n].forEach(([name, definition]) => {'
  ],
  [
    'function generateReportNo(reportDate) { return `MINYA-${reportDate}`; }',
    'function generateReportNo(reportDate) { return `MINYA-${reportDate}`; }\nfunction validateReportPayload(body = {}) {\n  const reportDate=String(body.report_date||"").trim();\n  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(reportDate)) return "تاريخ التقرير غير صالح";\n  const parsedDate=new Date(`${reportDate}T00:00:00Z`);\n  if(Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==reportDate) return "تاريخ التقرير غير موجود في التقويم";\n  const numericChecks=[["temperature",false,false],["total_trucks",true,true],["total_waste_tons",true,false],["total_diesel",true,false]];\n  for(const [field,nonNegative,integerOnly] of numericChecks){\n    const value=body[field];\n    if(value===undefined||value===null||value==="") continue;\n    const n=Number(value);\n    if(!Number.isFinite(n)) return `قيمة ${field} غير رقمية`;\n    if(nonNegative&&n<0) return `قيمة ${field} لا يمكن أن تكون سالبة`;\n    if(integerOnly&&!Number.isInteger(n)) return `قيمة ${field} يجب أن تكون عددًا صحيحًا`;\n  }\n  return "";\n}'
  ],
  [
    '    if(!report_date)return res.status(400).json({ok:false,message:"تاريخ التقرير مطلوب"});\n    if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(report_date))return res.status(409).json({ok:false,message:"يوجد تقرير محفوظ مسبقًا بنفس التاريخ"});',
    '    const validationError=validateReportPayload(req.body);if(validationError)return res.status(400).json({ok:false,message:validationError});\n    if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=?`).get(report_date))return res.status(409).json({ok:false,message:"يوجد تقرير محفوظ مسبقًا بنفس التاريخ"});'
  ],
  [
    '    if(!report_date)return res.status(400).json({ok:false,message:"تاريخ التقرير مطلوب"});\n    if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=? AND id<>?`).get(report_date,id))return res.status(409).json({ok:false,message:"يوجد تقرير آخر محفوظ بنفس التاريخ"});',
    '    const validationError=validateReportPayload(req.body);if(validationError)return res.status(400).json({ok:false,message:validationError});\n    if(db.prepare(`SELECT id FROM daily_reports WHERE report_date=? AND id<>?`).get(report_date,id))return res.status(409).json({ok:false,message:"يوجد تقرير آخر محفوظ بنفس التاريخ"});'
  ],
  [
    "db.prepare(`UPDATE daily_reports SET workflow_status='pending',submitted_at=?,submitted_by=?,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,id);",
    "db.prepare(`UPDATE daily_reports SET workflow_status='pending',submitted_at=?,submitted_by=?,approved_at=NULL,approved_by=NULL,approved_by_name='',returned_reason='',returned_at=NULL,returned_by=NULL,returned_to=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,id);"
  ],
  [
    "const reason=String(req.body?.reason||\"\").trim().slice(0,500);db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);",
    "const reason=String(req.body?.reason||\"\").trim().slice(0,500);const returnedAt=new Date().toISOString();const returnedTo=report.submitted_by||null;db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',returned_reason=?,returned_at=?,returned_by=?,returned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(reason,returnedAt,req.user.id,returnedTo,id);"
  ],
  [
    'const {name,mime_type,data_base64}=req.body;if(!name||!data_base64)return res.status(400).json({ok:false,message:"الملف مطلوب"});const buffer=Buffer.from(String(data_base64).replace(/^data:[^;]+;base64,/,""),"base64");if(buffer.length>8*1024*1024)return res.status(413).json({ok:false,message:"الحد الأقصى للملف 8MB"});',
    'const {name,mime_type,data_base64}=req.body;const cleanName=String(name||"").trim();const cleanMime=String(mime_type||"application/octet-stream").trim();if(!cleanName||!data_base64)return res.status(400).json({ok:false,message:"الملف مطلوب"});if(cleanName.length>255)return res.status(400).json({ok:false,message:"اسم الملف طويل جدًا"});if(/[\\/\u0000-\u001F\u007F]/.test(cleanName))return res.status(400).json({ok:false,message:"اسم الملف يحتوي محارف غير صالحة"});try{encodeURIComponent(cleanName);}catch{return res.status(400).json({ok:false,message:"اسم الملف غير قابل للترميز"});}if(!validateMimeType(cleanMime))return res.status(400).json({ok:false,message:"نوع الملف غير صالح"});const rawBase64=String(data_base64).replace(/^data:[^;]+;base64,/,"");const buffer=decodeStrictBase64(rawBase64);if(!buffer)return res.status(400).json({ok:false,message:"بيانات الملف غير صالحة"});if(buffer.length>MAX_ATTACHMENT_BYTES)return res.status(413).json({ok:false,message:"الحد الأقصى للملف 8MB"});'
  ],
  [
    'res.type(a.mime_type);res.setHeader("Content-Disposition",`inline; filename*=UTF-8\'\'${encodeURIComponent(a.original_name)}`);res.sendFile(file);',
    'const requestedMime=String(a.mime_type||"").toLowerCase();const safeInline=new Set(["application/pdf","image/jpeg","image/png","image/gif","image/webp","text/plain"]).has(requestedMime);res.setHeader("Content-Type",safeInline?requestedMime:"application/octet-stream");res.setHeader("Content-Disposition",`${safeInline?"inline":"attachment"}; filename*=UTF-8\'\'${encodeURIComponent(a.original_name)}`);res.sendFile(file);'
  ],
  [
    'db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,created_at,updated_at,workflow_status,submitted_at,submitted_by,approved_at,approved_by,approved_by_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.report_date,r.report_no||generateReportNo(r.report_date),r.weather||"",r.temperature||0,r.start_time||"",r.end_time||"",r.total_trucks||0,r.total_waste_tons||0,r.total_diesel||0,r.notes||"",r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString(),["draft","pending","approved"].includes(r.workflow_status)?r.workflow_status:"draft",r.submitted_at||null,r.submitted_by||null,r.approved_at||null,r.approved_by||null,r.approved_by_name||"")',
    'db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,created_at,updated_at,workflow_status,submitted_at,submitted_by,approved_at,approved_by,approved_by_name,returned_reason,returned_at,returned_by,returned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.report_date,r.report_no||generateReportNo(r.report_date),r.weather||"",r.temperature||0,r.start_time||"",r.end_time||"",r.total_trucks||0,r.total_waste_tons||0,r.total_diesel||0,r.notes||"",r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString(),["draft","pending","approved"].includes(r.workflow_status)?r.workflow_status:"draft",r.submitted_at||null,r.submitted_by||null,r.approved_at||null,r.approved_by||null,r.approved_by_name||"",r.returned_reason||"",r.returned_at||null,r.returned_by||null,r.returned_to||null)'
  ],
  [
    'app.post("/api/backup/restore", requireRole("admin"), (req,res)=>{\n  try {',
    'app.post("/api/backup/restore", requireRole("admin"), (req,res)=>{\n  const restoreCreatedFiles=[];\n  try {'
  ],
  [
    'fs.writeFileSync(path.join(uploadsDir,stored),buffer);db.prepare(`INSERT INTO attachments',
    'fs.writeFileSync(path.join(uploadsDir,stored),buffer);restoreCreatedFiles.push(stored);db.prepare(`INSERT INTO attachments'
  ],
  [
    '} catch(error){res.status(500).json({ok:false,message:"فشل استعادة النسخة",error:error.message});}\n});',
    '} catch(error){for(const stored of restoreCreatedFiles)safeUnlinkUpload(stored);res.status(500).json({ok:false,message:"فشل استعادة النسخة",error:error.message});}\n});'
  ],
  [
    'return { system: "Minya Landfill System", version: "3.2.0", exported_at:',
    `return { system: "Minya Landfill System", version: "${version}", exported_at:`
  ],
  [
    'res.json({ ok: true, system: "Minya Landfill System V3.2 Stable", database: "SQLite", version: "3.2.0", integrity });',
    `res.json({ ok: true, system: "Minya Landfill System V${version} Stable", database: "SQLite", version: "${version}", integrity });`
  ],
  [
    'app.listen(PORT, HOST, () => console.log(`Minya Landfill V3 running on http://${HOST}:${PORT}`));',
    `app.listen(PORT, HOST, () => console.log(\`Minya Landfill V${version} running on http://\${HOST}:\${PORT}\`));`
  ]
];

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = haystack.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

replacements.forEach(([before, after], index) => {
  const matches = countOccurrences(source, before);
  if (matches !== 1) {
    throw new Error(`Runtime server sync failed at patch ${index + 1}: expected exactly 1 source match, found ${matches}. Fragment: ${before.slice(0, 80)}`);
  }
  source = source.replace(before, after);
  if (!after.includes(before) && source.includes(before)) {
    throw new Error(`Runtime server sync failed at patch ${index + 1}: legacy fragment still present after replacement.`);
  }
  if (!source.includes(after)) {
    throw new Error(`Runtime server sync failed at patch ${index + 1}: replacement fragment missing after patch.`);
  }
});

const runtimeModule = new Module(serverPath, module);
runtimeModule.filename = serverPath;
runtimeModule.paths = Module._nodeModulePaths(root);
runtimeModule._compile(source, serverPath);
