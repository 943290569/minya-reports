const templates = require("./employee-evaluation-templates.json");
const fields = ["job_nature","employee_name","employee_number","identity_number","employment_date","evaluation_date","period_from","period_to","supervisor","notes","recommendation","recheck_date","approval","employee_signature","supervisor_signature","section_signature","director_signature"];
const facts = ["absence","late","written_notices","warnings","incidents","safety_violations","misuse_failures","praise","training","inspection_reports"];
function grade(total) { return total >= 90 ? "ممتاز" : total >= 80 ? "جيد جداً" : total >= 70 ? "جيد" : total >= 60 ? "مقبول" : "يحتاج إلى تحسين"; }
function dateValid(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
function normalize(body, savedTemplate=null) {
  if (!body || !Object.hasOwn(templates,body.category)) throw Error("اختر فئة الموظف");
  const t = savedTemplate || templates[body.category], data = {category:body.category};
  for (const f of fields) {
    if (body[f] != null && typeof body[f] !== "string") throw Error("بيانات النص غير صالحة");
    data[f] = String(body[f] || "").trim();
    if (data[f].length > (["notes","approval"].includes(f) ? 4000 : 200)) throw Error("النص يتجاوز الحد المسموح");
  }
  if (!data.employee_name) throw Error("أدخل اسم الموظف");
  for (const f of ["evaluation_date","period_from","period_to"]) if (!dateValid(data[f])) throw Error("أدخل تاريخ التقييم وفترة التقييم");
  for (const f of ["employment_date","recheck_date"]) if (data[f] && !dateValid(data[f])) throw Error("التاريخ غير صالح");
  if(data.period_from > data.period_to) throw Error("بداية الفترة يجب أن تسبق نهايتها");
  if (!Array.isArray(body.scores) || body.scores.length !== t.criteria.length) throw Error("أدخل علامات جميع البنود");
  data.scores = body.scores.map((s,i) => {
    if(!s || typeof s.score !== "number" || !Number.isFinite(s.score) || s.score < 0 || s.score > t.criteria[i].max || Math.abs(Math.round(s.score*100)-s.score*100)>0.000001) throw Error("علامة البند خارج المدى المسموح أو تتجاوز منزلتين");
    const note=String(s.note||"").trim(), source=String(s.source||"").trim();
    if(note.length>1000 || source.length>500) throw Error("ملاحظات البند طويلة");
    return {score:s.score,note,source};
  });
  data.facts = {};
  for(const f of facts) {
    const n=body.facts?.[f] ?? 0;
    if(typeof n!=="number" || !Number.isSafeInteger(n) || n<0 || n>100000) throw Error("أعداد الوقائع غير صالحة");
    data.facts[f]=n;
  }
  for(const [key,cols] of [["indicators",["indicator","value","source","note"]],["plans",["area","action","owner","duration","result"]]]) {
    if(!Array.isArray(body[key]) || body[key].length>10) throw Error("جدول المتابعة غير صالح");
    data[key]=body[key].map(r=>Object.fromEntries(cols.map(c=>{
      const value=String(r?.[c]||"").trim(); if(value.length>1000) throw Error("نص المتابعة طويل"); return [c,value];
    })));
  }
  data.previous_actions=String(body.previous_actions||"").trim();
  if(data.previous_actions.length>2000) throw Error("نص الإجراءات طويل");
  if(!["استمرار دون ملاحظات","استمرار مع خطة تحسين","تدريب","إجراء إداري"].includes(data.recommendation)) throw Error("اختر التوصية");
  data.total=Math.round(data.scores.reduce((sum,s)=>sum+s.score,0)*100)/100;
  data.grade=grade(data.total);
  data.template=t;
  return data;
}
function install(app,{db,requireRole,audit,writeAutomaticBackup}) {
  db.exec(`CREATE TABLE IF NOT EXISTS employee_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, employee_name TEXT NOT NULL, employee_number TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,evaluation_date TEXT NOT NULL,period_from TEXT NOT NULL,period_to TEXT NOT NULL,
    total REAL NOT NULL,grade TEXT NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,updated_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ); CREATE INDEX IF NOT EXISTS idx_employee_eval_name_date ON employee_evaluations(employee_name,evaluation_date);
  CREATE INDEX IF NOT EXISTS idx_employee_eval_number_date ON employee_evaluations(employee_number,evaluation_date);`);
  const access=requireRole("admin","editor");
  app.get("/api/employee-evaluations/templates",access,(req,res)=>res.set("Cache-Control","no-store").json({ok:true,templates}));
  app.get("/api/employee-evaluations/export",access,(req,res)=>{
    res.set("Cache-Control","no-store").attachment("minya-employee-evaluations.json").json({system:"Minya employee evaluations",exported_at:new Date().toISOString(),evaluations:db.prepare("SELECT * FROM employee_evaluations ORDER BY id").all()});
  });
  app.get("/api/employee-evaluations",access,(req,res)=>{
    const q=String(req.query.q||"").slice(0,200),category=String(req.query.category||"");
    let sql="SELECT id,employee_name,employee_number,category,evaluation_date,period_from,period_to,total,grade,revision,updated_at FROM employee_evaluations WHERE 1=1",p=[];
    if(q){sql+=" AND (employee_name LIKE ? OR employee_number LIKE ?)";p.push("%"+q+"%","%"+q+"%");}
    if(category){sql+=" AND category=?";p.push(category);}
    const offset=Math.max(0,Math.min(1000000,Math.trunc(Number(req.query.offset)||0)));
    const total=db.prepare("SELECT COUNT(*) AS n FROM ("+sql+")").get(...p).n;
    res.set("Cache-Control","no-store").json({ok:true,total,rows:db.prepare(sql+" ORDER BY evaluation_date DESC,id DESC LIMIT 100 OFFSET ?").all(...p,offset),offset});
  });
  app.get("/api/employee-evaluations/:id",access,(req,res)=>{
    const row=db.prepare("SELECT * FROM employee_evaluations WHERE id=?").get(Number(req.params.id));
    if(!row) return res.status(404).json({ok:false,message:"التقييم غير موجود"});
    res.set("Cache-Control","no-store").json({ok:true,...row,data:JSON.parse(row.payload),payload:undefined});
  });
  function save(req,res,edit) {
    const existing=edit?db.prepare("SELECT revision,payload FROM employee_evaluations WHERE id=?").get(Number(req.params.id)):null;
    if(edit&&!existing) return res.status(404).json({ok:false,message:"التقييم غير موجود"});
    const saved=existing?JSON.parse(existing.payload):null;
    let d;
    try { d=normalize(req.body,saved&&saved.category===req.body.category?saved.template:null); } catch(e){return res.status(400).json({ok:false,message:e.message});}
    const p=[d.employee_name,d.employee_number,d.category,d.evaluation_date,d.period_from,d.period_to,d.total,d.grade,JSON.stringify(d)];
    let id;
    if(edit){
      id=Number(req.params.id);
      const row=db.prepare("SELECT revision FROM employee_evaluations WHERE id=?").get(id);
      if(!row) return res.status(404).json({ok:false,message:"التقييم غير موجود"});
      if(req.body.revision!==row.revision) return res.status(409).json({ok:false,message:"عدّل مستخدم آخر هذا التقييم. أعد فتحه قبل الحفظ"});
      const result=db.prepare("UPDATE employee_evaluations SET employee_name=?,employee_number=?,category=?,evaluation_date=?,period_from=?,period_to=?,total=?,grade=?,payload=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE id=? AND revision=?").run(...p,req.user.id,id,row.revision);
      if(!result.changes) return res.status(409).json({ok:false,message:"أعد فتح التقييم قبل الحفظ"});
    }else {
      id=Number(db.prepare("INSERT INTO employee_evaluations(employee_name,employee_number,category,evaluation_date,period_from,period_to,total,grade,payload,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...p,req.user.id,req.user.id).lastInsertRowid);
    }
    audit(req.user,edit?"UPDATE_EMPLOYEE_EVALUATION":"CREATE_EMPLOYEE_EVALUATION","employee_evaluation",id,d.employee_name);
    writeAutomaticBackup("employee-evaluation-save",true);
    res.json({ok:true,id,message:"تم حفظ التقييم",total:d.total,grade:d.grade});
  }
  app.post("/api/employee-evaluations",access,(req,res)=>save(req,res,false));
  app.put("/api/employee-evaluations/:id",access,(req,res)=>save(req,res,true));
}
module.exports=install;
module.exports.normalize=normalize;
module.exports.grade=grade;
