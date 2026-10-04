const crypto=require("crypto");
module.exports=function(app,{db,requireRole,audit,writeAutomaticBackup}){
 db.exec(`CREATE TABLE IF NOT EXISTS water_drivers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,token TEXT NOT NULL UNIQUE);
 CREATE TABLE IF NOT EXISTS water_entries(id INTEGER PRIMARY KEY AUTOINCREMENT,driver_id INTEGER NOT NULL,entry_date TEXT NOT NULL,tanks INTEGER NOT NULL,notes TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(driver_id,entry_date));
 CREATE TABLE IF NOT EXISTS water_receipts(driver_id INTEGER NOT NULL,mutation_id TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(driver_id,mutation_id));`);
 for(const [id,name] of [[1,"قصي جبارين"],[2,"نديم الطروة"]])db.prepare("INSERT OR IGNORE INTO water_drivers(id,name,token) VALUES(?,?,?)").run(id,name,crypto.randomBytes(24).toString("hex"));
 const access=requireRole("admin","editor");
 const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 function driver(req,res,next){const token=String(req.headers["x-water-token"]||"");const d=/^[a-f0-9]{48}$/.test(token)?db.prepare("SELECT id,name FROM water_drivers WHERE token=?").get(token):null;if(!d)return res.status(401).json({ok:false,message:"رابط السائق غير صالح"});req.waterDriver=d;res.set("Cache-Control","no-store");next();}
 app.get("/api/water/driver",driver,(req,res)=>res.json({ok:true,driver:req.waterDriver,entries:db.prepare("SELECT * FROM water_entries WHERE driver_id=? ORDER BY entry_date DESC LIMIT 366").all(req.waterDriver.id)}));
 app.post("/api/water/entry",driver,(req,res)=>{
 const b=req.body||{},d=req.waterDriver;
 if(!validDate(b.entry_date)||!Number.isInteger(b.tanks)||b.tanks<0||b.tanks>1000||typeof b.notes!=="string"||b.notes.length>1000||!Number.isSafeInteger(b.revision)||b.revision<0||!/^[-a-zA-Z0-9]{16,80}$/.test(b.mutation_id||""))return res.status(400).json({ok:false,message:"تحقق من التاريخ وعدد التنكات"});
 const save=db.transaction(()=>{
 const receipt=db.prepare("SELECT response FROM water_receipts WHERE driver_id=? AND mutation_id=?").get(d.id,b.mutation_id);if(receipt)return {replay:true,data:JSON.parse(receipt.response)};
 const current=db.prepare("SELECT * FROM water_entries WHERE driver_id=? AND entry_date=?").get(d.id,b.entry_date);
 if((current?.revision||0)!==b.revision)return {conflict:true,current};
 if(current)db.prepare("UPDATE water_entries SET tanks=?,notes=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(b.tanks,b.notes.trim(),current.id);
 else db.prepare("INSERT INTO water_entries(driver_id,entry_date,tanks,notes) VALUES(?,?,?,?)").run(d.id,b.entry_date,b.tanks,b.notes.trim());
 const entry=db.prepare("SELECT * FROM water_entries WHERE driver_id=? AND entry_date=?").get(d.id,b.entry_date),data={ok:true,entry};
 db.prepare("INSERT INTO water_receipts(driver_id,mutation_id,response) VALUES(?,?,?)").run(d.id,b.mutation_id,JSON.stringify(data));return {data};
 });const result=save();if(result.conflict)return res.status(409).json({ok:false,message:"يوجد تسجيل أحدث لهذا اليوم. راجع العدد قبل التصحيح",current:result.current});
 if(!result.replay){audit({id:null,username:"water:"+d.name},"SAVE_WATER_ENTRY","water_entry",result.data.entry.id,b.entry_date);writeAutomaticBackup("water-entry",false);}
 res.json(result.data);
 });
 app.get("/api/water/admin",access,(req,res)=>{
 const month=String(req.query.month||"");if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({ok:false,message:"اختر الشهر"});
 res.set("Cache-Control","no-store").json({ok:true,drivers:db.prepare("SELECT * FROM water_drivers ORDER BY id").all(),entries:db.prepare("SELECT e.*,d.name FROM water_entries e JOIN water_drivers d ON d.id=e.driver_id WHERE substr(entry_date,1,7)=? ORDER BY entry_date DESC,driver_id").all(month)});
 });
};