const crypto=require("crypto");
module.exports=function(app,{db,requireRole,audit,writeAutomaticBackup}){
 db.exec(`CREATE TABLE IF NOT EXISTS haul_drivers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,token TEXT NOT NULL UNIQUE);
 CREATE TABLE IF NOT EXISTS haul_entries(id INTEGER PRIMARY KEY AUTOINCREMENT,driver_id INTEGER NOT NULL,entry_date TEXT NOT NULL,trips INTEGER NOT NULL,site TEXT NOT NULL,odo_start REAL NOT NULL,odo_end REAL NOT NULL,notes TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(driver_id,entry_date,site));
 CREATE TABLE IF NOT EXISTS haul_receipts(driver_id INTEGER NOT NULL,mutation_id TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(driver_id,mutation_id));`);
 for(const [id,name] of [[1,"سعيد ربعي"],[2,"إسماعيل الفروخ"]])db.prepare("INSERT OR IGNORE INTO haul_drivers(id,name,token) VALUES(?,?,?)").run(id,name,crypto.randomBytes(24).toString("hex"));
 const access=requireRole("admin","editor");
 const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 function driver(req,res,next){const token=String(req.headers["x-haul-token"]||"");const d=/^[a-f0-9]{48}$/.test(token)?db.prepare("SELECT id,name FROM haul_drivers WHERE token=?").get(token):null;if(!d)return res.status(401).json({ok:false,message:"رابط السائق غير صالح"});req.haulDriver=d;res.set("Cache-Control","no-store");next();}
 app.get("/api/haul/driver",driver,(req,res)=>res.json({ok:true,driver:req.haulDriver,entries:db.prepare("SELECT * FROM haul_entries WHERE driver_id=? ORDER BY entry_date DESC LIMIT 366").all(req.haulDriver.id)}));
 app.post("/api/haul/entry",driver,(req,res)=>{
 const b=req.body||{},d=req.haulDriver;
 if(!["سلوب","أم رمبة"].includes(b.site)||typeof b.odo_start!=="number"||typeof b.odo_end!=="number"||!Number.isFinite(b.odo_start)||!Number.isFinite(b.odo_end)||b.odo_start<0||b.odo_end<b.odo_start||b.odo_end>10000000||!validDate(b.entry_date)||!Number.isInteger(b.trips)||b.trips<0||b.trips>1000||typeof b.notes!=="string"||b.notes.length>1000||!Number.isSafeInteger(b.revision)||b.revision<0||!/^[-a-zA-Z0-9]{16,80}$/.test(b.mutation_id||""))return res.status(400).json({ok:false,message:"تحقق من التاريخ والموقع والعداد وعدد النقلات"});
 const save=db.transaction(()=>{
 const receipt=db.prepare("SELECT response FROM haul_receipts WHERE driver_id=? AND mutation_id=?").get(d.id,b.mutation_id);if(receipt)return {replay:true,data:JSON.parse(receipt.response)};
 const current=db.prepare("SELECT * FROM haul_entries WHERE driver_id=? AND entry_date=? AND site=?").get(d.id,b.entry_date,b.site);
 if((current?.revision||0)!==b.revision)return {conflict:true,current};
 if(current)db.prepare("UPDATE haul_entries SET trips=?,notes=?,odo_start=?,odo_end=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(b.trips,b.notes.trim(),b.odo_start,b.odo_end,current.id);
 else db.prepare("INSERT INTO haul_entries(driver_id,entry_date,trips,notes,site,odo_start,odo_end) VALUES(?,?,?,?,?,?,?)").run(d.id,b.entry_date,b.trips,b.notes.trim(),b.site,b.odo_start,b.odo_end);
 const entry=db.prepare("SELECT * FROM haul_entries WHERE driver_id=? AND entry_date=? AND site=?").get(d.id,b.entry_date,b.site),data={ok:true,entry};
 db.prepare("INSERT INTO haul_receipts(driver_id,mutation_id,response) VALUES(?,?,?)").run(d.id,b.mutation_id,JSON.stringify(data));return {data};
 });const result=save();if(result.conflict)return res.status(409).json({ok:false,message:"يوجد تسجيل أحدث لهذا اليوم. راجع العدد قبل التصحيح",current:result.current});
 if(!result.replay){audit({id:null,username:"haul:"+d.name},"SAVE_HAUL_ENTRY","haul_entry",result.data.entry.id,b.entry_date);writeAutomaticBackup("haul-entry",false);}
 res.json(result.data);
 });
 app.get("/api/haul/admin",access,(req,res)=>{
 const month=String(req.query.month||"");if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({ok:false,message:"اختر الشهر"});
 res.set("Cache-Control","no-store").json({ok:true,drivers:db.prepare("SELECT * FROM haul_drivers ORDER BY id").all(),entries:db.prepare("SELECT e.*,d.name FROM haul_entries e JOIN haul_drivers d ON d.id=e.driver_id WHERE substr(entry_date,1,7)=? ORDER BY entry_date DESC,driver_id").all(month)});
 });
};