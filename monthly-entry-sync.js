const https = require('https');

module.exports = function installMonthlyEntrySync(app,{db,requireAuth}){
  db.exec(`CREATE TABLE IF NOT EXISTS monthly_entry_rows(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL UNIQUE,
    data_json TEXT NOT NULL DEFAULT '{}',
    updated_by INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ); CREATE INDEX IF NOT EXISTS idx_monthly_entry_date ON monthly_entry_rows(report_date);`);

  const LAT=31.6172667;
  const LON=35.2321917;
  const equipmentNames=['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'];
  const crewDefaults=[['سائقين جرافات واليات',4],['سائقين شحن(قلابات)',2],['عمال زراعة',1],['استقبال وتوجيه الشاحنات',2],['عمال تنظيف وتطاير داخلي',4],['عمال تنظيف تطاير خارجي',5]];
  const opDefaults=[['مكب نفايات المنيا','طن'],['مواد التغطية (اسلوب)','نقلة'],['مواد التغطية (طمم)','كوب'],['كميات المياه للتعقيم والترطيب','كوب'],['عدد مرات رش المياه','مرة'],['كميات العصارة المرحلة','كوب'],['خط الفرز','طن'],['طمم خارجي','طن']];
  const stationDefaults=['محطة ترحيل الخليل','محطة ترحيل ترقوميا','محطة ترحيل يطا'];

  function validMonth(v){return /^\d{4}-\d{2}$/.test(String(v||''));}
  function daysInMonth(month){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate();}
  function blank(date){return {report_date:date,weather:'',temperature:0,start_time:'04:00',end_time:'19:00',notes:'',workday_type:'official',workday_reason:'',workday_manual:0,auto:{water:true,workday:true},crews:crewDefaults.map(([crew_name,crew_count])=>({crew_name,crew_count,notes:''})),operations:opDefaults.map(([operation_name,unit])=>({operation_name,start_time:'',end_time:'',vehicle_count:0,quantity:0,unit,notes:''})),stations:stationDefaults.map(station_name=>({station_name,truck_count:0,waste_tons:0,unit:'طن',notes:''})),equipment:equipmentNames.map(equipment_name=>({equipment_name,operating_status:'يعمل',status_description:'',working_hours:0,diesel_liters:0,notes:''}))};}
  function safeJson(text){try{return JSON.parse(text||'{}');}catch{return {};}}
  function tableCols(name){try{return new Set(db.pragma(`table_info(${name})`).map(x=>x.name));}catch{return new Set();}}
  function getReportData(report){
    const data=blank(report.report_date);
    Object.assign(data,{weather:report.weather||'',temperature:Number(report.temperature||0),start_time:report.start_time||'04:00',end_time:report.end_time||'19:00',notes:report.notes||'',workday_type:report.workday_type||'official',workday_reason:report.workday_reason||'',workday_manual:Number(report.workday_manual||0),auto:{water:false,workday:false}});
    data.crews=db.prepare(`SELECT crew_name,crew_count,notes FROM crews WHERE report_id=? ORDER BY id`).all(report.id);
    data.operations=db.prepare(`SELECT operation_name,start_time,end_time,vehicle_count,quantity,unit,notes FROM operations WHERE report_id=? ORDER BY id`).all(report.id);
    data.stations=db.prepare(`SELECT station_name,truck_count,waste_tons,unit,notes FROM transfer_stations WHERE report_id=? ORDER BY id`).all(report.id);
    data.equipment=db.prepare(`SELECT equipment_name,operating_status,status_description,working_hours,diesel_liters,notes FROM equipment WHERE report_id=? ORDER BY id`).all(report.id);
    if(!data.crews.length)data.crews=blank(report.report_date).crews;
    if(!data.operations.length)data.operations=blank(report.report_date).operations;
    if(!data.stations.length)data.stations=blank(report.report_date).stations;
    if(!data.equipment.length)data.equipment=blank(report.report_date).equipment;
    return data;
  }
  function requestJson(url){return new Promise((resolve,reject)=>{const req=https.get(url,{headers:{'User-Agent':'Minya-Landfill/3.5'}},res=>{let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`weather ${res.statusCode}`));try{resolve(JSON.parse(body));}catch(e){reject(e);}})});req.setTimeout(9000,()=>req.destroy(new Error('weather timeout')));req.on('error',reject);});}
  function weatherLabel(code){code=Number(code);if(code===0)return 'مشمس';if([1,2].includes(code))return 'غائم جزئيًا';if(code===3)return 'غائم';if([45,48].includes(code))return 'ضباب';if([51,53,55,56,57].includes(code))return 'رذاذ';if([61,63,65,66,67,80,81,82].includes(code))return 'ماطر';if([71,73,75,77,85,86].includes(code))return 'ثلجي';if([95,96,99].includes(code))return 'عاصف ممطر';return 'متغير';}
  function dailyMap(payload){const out=new Map(),d=payload&&payload.daily;if(!d||!Array.isArray(d.time))return out;d.time.forEach((date,i)=>{const t=Number(d.temperature_2m_mean?.[i]);const c=d.weather_code?.[i];if(Number.isFinite(t)&&c!==null&&c!==undefined)out.set(date,{temperature:Math.round(t*10)/10,weather:weatherLabel(c),weather_code:Number(c)});});return out;}
  async function getWeather(month){
    const first=`${month}-01`,last=`${month}-${String(daysInMonth(month)).padStart(2,'0')}`;
    const now=new Date();const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const maps=[];
    try{
      const ninetyAgo=new Date(now.getTime()-92*86400000).toISOString().slice(0,10);
      const sixteenAhead=new Date(now.getTime()+16*86400000).toISOString().slice(0,10);
      if(last>=ninetyAgo&&first<=sixteenAhead){
        const start=first>ninetyAgo?first:ninetyAgo; const end=last<sixteenAhead?last:sixteenAhead;
        const u=`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_mean&timezone=Asia%2FHebron&start_date=${start}&end_date=${end}`;
        maps.push(dailyMap(await requestJson(u)));
      }
    }catch(e){console.error('monthly entry forecast weather failed',e.message);}
    try{
      const archiveEnd=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);
      if(first<=archiveEnd){const end=last<archiveEnd?last:archiveEnd;const u=`https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${first}&end_date=${end}&daily=weather_code,temperature_2m_mean&timezone=Asia%2FHebron`;maps.push(dailyMap(await requestJson(u)));}
    }catch(e){console.error('monthly entry archive weather failed',e.message);}
    const out=new Map();maps.forEach(m=>m.forEach((v,k)=>out.set(k,v)));return out;
  }

  app.get('/api/monthly-entry',requireAuth,async(req,res,next)=>{
    const month=String(req.query.month||'').trim();
    if(!validMonth(month))return res.status(400).json({ok:false,message:'الشهر غير صالح'});
    try{
      const reports=db.prepare(`SELECT * FROM daily_reports WHERE report_date LIKE ? ORDER BY report_date`).all(`${month}-%`);
      const existing=reports.map(r=>({id:r.id,report_date:r.report_date,workflow_status:r.workflow_status||'draft'}));
      const reportMap=new Map(reports.map(r=>[r.report_date,r]));
      const stagedRows=db.prepare(`SELECT report_date,data_json,updated_at FROM monthly_entry_rows WHERE report_date LIKE ? ORDER BY report_date`).all(`${month}-%`);
      const stagedMap=new Map(stagedRows.map(x=>[x.report_date,{data:safeJson(x.data_json),updated_at:x.updated_at}]));
      const weather=await getWeather(month);
      const rows=[];
      const totalDays=daysInMonth(month);
      for(let day=1;day<=totalDays;day++){
        const date=`${month}-${String(day).padStart(2,'0')}`;
        let data,source='new',updated_at=null;
        if(reportMap.has(date)){data=getReportData(reportMap.get(date));source='report';}
        else if(stagedMap.has(date)){data={...blank(date),...stagedMap.get(date).data,report_date:date};source='saved-entry';updated_at=stagedMap.get(date).updated_at;}
        else {data=blank(date);}
        if(source==='new'&&weather.has(date)){const w=weather.get(date);data.weather=w.weather;data.temperature=w.temperature;data.weather_source='Open-Meteo';}
        rows.push({report_date:date,data,updated_at,source});
      }
      res.json({ok:true,month,rows,existing,weather:{source:'Open-Meteo',latitude:LAT,longitude:LON,available_days:weather.size}});
    }catch(error){console.error('monthly entry sync load failed',error);next();}
  });
};
