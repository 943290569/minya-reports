const https=require('https');

module.exports=function installMonthlyEntryLiveFix(app,{db,requireAuth}){
  const LAT=31.6172667,LON=35.2321917;
  const equipmentNames=['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'];
  const crewDefaults=[['سائقين جرافات واليات',4],['سائقين شحن(قلابات)',2],['عمال زراعة',1],['استقبال وتوجيه الشاحنات',2],['عمال تنظيف وتطاير داخلي',4],['عمال تنظيف تطاير خارجي',5]];
  const operationDefaults=[['مكب نفايات المنيا','طن'],['مواد التغطية (اسلوب)','نقلة'],['مواد التغطية (طمم)','كوب'],['كميات المياه للتعقيم والترطيب','كوب'],['عدد مرات رش المياه','مرة'],['كميات العصارة المرحلة','كوب'],['خط الفرز','طن'],['طمم خارجي','طن']];
  const stationDefaults=['محطة ترحيل الخليل','محطة ترحيل ترقوميا','محطة ترحيل يطا'];
  const norm=v=>String(v||'').replace(/[\s()ـ_-]+/g,'').replace(/أ|إ|آ/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const safeJson=t=>{try{return JSON.parse(t||'{}')}catch{return {}}};
  const validMonth=v=>/^\d{4}-\d{2}$/.test(String(v||''));
  const daysInMonth=month=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate()};
  const number=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const blank=date=>({report_date:date,weather:'',temperature:0,start_time:'04:00',end_time:'19:00',notes:'',workday_type:'official',workday_reason:'',workday_manual:0,auto:{water:true,workday:true,weather:true},crews:crewDefaults.map(([crew_name,crew_count])=>({crew_name,crew_count,notes:''})),operations:operationDefaults.map(([operation_name,unit])=>({operation_name,start_time:'',end_time:'',vehicle_count:0,quantity:0,unit,notes:''})),stations:stationDefaults.map(station_name=>({station_name,truck_count:0,waste_tons:0,unit:'طن',notes:''})),equipment:equipmentNames.map(equipment_name=>({equipment_name,operating_status:'يعمل',status_description:'',working_hours:0,diesel_liters:0,notes:''}))});

  function operationMatches(list,canonical){
    const c=norm(canonical);
    return (Array.isArray(list)?list:[]).filter(x=>{
      const n=norm(x.operation_name);
      if(n===c)return true;
      if(c.includes('مكبنفاياتالمنيا'))return (n.includes('مكب')&&n.includes('المنيا'))||(n.includes('نفايات')&&!n.includes('ترحيل')&&!n.includes('محطه'));
      if(c.includes('كمياتالعصارهالمرحله'))return n.includes('عصار');
      if(c.includes('خطالفرز'))return n.includes('فرز');
      if(c.includes('طممخارجي'))return (n.includes('طمم')||n.includes('ردم'))&&n.includes('خارجي');
      if(c.includes('موادالتغطيهاسلوب'))return (n.includes('تغطي')||n.includes('مواد'))&&(n.includes('اسلوب')||n.includes('سلوب'));
      if(c.includes('موادالتغطيهطمم'))return (n.includes('تغطي')||n.includes('مواد'))&&n.includes('طمم')&&!n.includes('خارجي');
      if(c.includes('كمياتالمياه'))return n.includes('مياه')&&!n.includes('رش');
      if(c.includes('عددمراترشالمياه'))return n.includes('رش')&&n.includes('مياه');
      return false;
    });
  }
  function matchOperation(row,canonical){
    const matches=operationMatches(row?.operations,canonical);
    if(!matches.length)return null;
    const best=matches.reduce((a,x)=>number(x.quantity)+number(x.vehicle_count)>number(a.quantity)+number(a.vehicle_count)?x:a,matches[0]);
    return {...best,vehicle_count:Math.max(...matches.map(x=>number(x.vehicle_count))),quantity:Math.max(...matches.map(x=>number(x.quantity)))};
  }
  function stationMatches(list,canonical){
    const target=norm(canonical);
    return (Array.isArray(list)?list:[]).filter(x=>{
      const n=norm(x.station_name);
      if(n===target)return true;
      if(target.includes('الخليل'))return n.includes('خليل');
      if(target.includes('ترقوميا'))return n.includes('ترقوميا');
      if(target.includes('يطا'))return n.includes('يطا')||n.includes('عزيز');
      return false;
    });
  }
  function matchStation(row,canonical){
    const matches=stationMatches(row?.stations,canonical);
    if(!matches.length)return null;
    const best=matches.reduce((a,x)=>number(x.waste_tons)+number(x.truck_count)>number(a.waste_tons)+number(a.truck_count)?x:a,matches[0]);
    return {...best,truck_count:Math.max(...matches.map(x=>number(x.truck_count))),waste_tons:Math.max(...matches.map(x=>number(x.waste_tons)))};
  }
  function equipmentMatches(list,canonical){
    const target=norm(canonical),year=(target.match(/20\d{2}/)||[])[0]||'';
    const base=target.replace(/20\d{2}/g,'');
    const tokens=base.match(/[\u0600-\u06ffa-z0-9]+/g)||[];
    return (Array.isArray(list)?list:[]).filter(x=>{
      const n=norm(x.equipment_name);
      if(n===target)return true;
      if(year&&!n.includes(year))return false;
      return tokens.filter(t=>t.length>=3).every(t=>n.includes(t));
    });
  }
  function canonicalEquipment(list){
    const source=Array.isArray(list)?list:[];
    return equipmentNames.map(name=>{
      const matches=equipmentMatches(source,name);
      if(!matches.length)return {equipment_name:name,operating_status:'يعمل',status_description:'',working_hours:0,diesel_liters:0,notes:''};
      const best=matches.reduce((a,x)=>number(x.diesel_liters)+number(x.working_hours)>number(a.diesel_liters)+number(a.working_hours)?x:a,matches[0]);
      return {...best,equipment_name:name,working_hours:Math.max(...matches.map(x=>number(x.working_hours))),diesel_liters:Math.max(...matches.map(x=>number(x.diesel_liters)))};
    });
  }
  function canonicalize(row,report=null){
    const originalOperations=Array.isArray(row.operations)?row.operations.map(x=>({...x})):[];
    const originalStations=Array.isArray(row.stations)?row.stations.map(x=>({...x})):[];
    const originalEquipment=Array.isArray(row.equipment)?row.equipment.map(x=>({...x})):[];
    const probe={...row,operations:originalOperations,stations:originalStations};
    row.operations=operationDefaults.map(([name,unit])=>{
      const hit=matchOperation(probe,name)||{};
      return {...hit,operation_name:name,start_time:hit.start_time||'',end_time:hit.end_time||'',vehicle_count:number(hit.vehicle_count),quantity:number(hit.quantity),unit:hit.unit||unit,notes:hit.notes||''};
    });
    row.stations=stationDefaults.map(name=>{
      const hit=matchStation(probe,name)||{};
      return {...hit,station_name:name,truck_count:number(hit.truck_count),waste_tons:number(hit.waste_tons),unit:hit.unit||'طن',notes:hit.notes||''};
    });
    row.crews=Array.isArray(row.crews)&&row.crews.length?row.crews:blank(row.report_date).crews;
    row.equipment=canonicalEquipment(originalEquipment);
    const landfill=matchOperation(row,'مكب نفايات المنيا');
    const stationWaste=row.stations.reduce((sum,x)=>sum+number(x.waste_tons),0);
    const stationTrucks=row.stations.reduce((sum,x)=>sum+number(x.truck_count),0);
    const storedWaste=Math.max(0,number(report?.total_waste_tons)-stationWaste);
    const storedTrucks=Math.max(0,number(report?.total_trucks)-stationTrucks);
    if(landfill){
      const target=row.operations.find(x=>x.operation_name==='مكب نفايات المنيا');
      if(target&&number(target.quantity)===0&&storedWaste>0)target.quantity=storedWaste;
      if(target&&number(target.vehicle_count)===0&&storedTrucks>0)target.vehicle_count=storedTrucks;
    }
    const detailDiesel=row.equipment.reduce((sum,x)=>sum+number(x.diesel_liters),0);
    row.stored_totals={waste:number(report?.total_waste_tons),trucks:number(report?.total_trucks),diesel:number(report?.total_diesel)};
    row.summary_totals={
      waste:number(report?.total_waste_tons)>0?number(report.total_waste_tons):number(row.operations.find(x=>x.operation_name==='مكب نفايات المنيا')?.quantity)+stationWaste,
      trucks:number(report?.total_trucks)>0?number(report.total_trucks):number(row.operations.find(x=>x.operation_name==='مكب نفايات المنيا')?.vehicle_count)+stationTrucks,
      diesel:number(report?.total_diesel)>0?number(report.total_diesel):detailDiesel
    };
    row.auto={water:true,workday:true,weather:true,...(row.auto||{})};
    return row;
  }
  function mergeNonZero(primary,backup){
    const out={...backup,...primary};
    out.operations=operationDefaults.map(([name,unit])=>{
      const p=matchOperation(primary,name)||{};
      const b=matchOperation(backup,name)||{};
      return {...b,...p,operation_name:name,unit:p.unit||b.unit||unit,vehicle_count:number(p.vehicle_count)!==0?number(p.vehicle_count):number(b.vehicle_count),quantity:number(p.quantity)!==0?number(p.quantity):number(b.quantity)};
    });
    out.stations=stationDefaults.map(name=>{
      const p=matchStation(primary,name)||{};
      const b=matchStation(backup,name)||{};
      return {...b,...p,station_name:name,unit:p.unit||b.unit||'طن',truck_count:number(p.truck_count)!==0?number(p.truck_count):number(b.truck_count),waste_tons:number(p.waste_tons)!==0?number(p.waste_tons):number(b.waste_tons)};
    });
    const crewMap=new Map((backup.crews||[]).map(x=>[norm(x.crew_name),x]));
    out.crews=(primary.crews||[]).map(x=>{const b=crewMap.get(norm(x.crew_name))||{};return {...b,...x,crew_count:number(x.crew_count)!==0?number(x.crew_count):number(b.crew_count)}});
    if(!out.crews.length)out.crews=backup.crews||[];
    out.equipment=canonicalEquipment([...(backup.equipment||[]),...(primary.equipment||[])]);
    out.auto={...(backup.auto||{}),...(primary.auto||{})};
    return out;
  }
  function reportData(report){
    const row=blank(report.report_date);
    Object.assign(row,{weather:report.weather||'',temperature:number(report.temperature),start_time:report.start_time||'04:00',end_time:report.end_time||'19:00',notes:report.notes||'',workday_type:report.workday_type||'official',workday_reason:report.workday_reason||'',workday_manual:number(report.workday_manual),auto:{water:false,workday:false,weather:false}});
    row.crews=db.prepare('SELECT crew_name,crew_count,notes FROM crews WHERE report_id=? ORDER BY id').all(report.id);
    row.operations=db.prepare('SELECT operation_name,start_time,end_time,vehicle_count,quantity,unit,notes FROM operations WHERE report_id=? ORDER BY id').all(report.id);
    row.stations=db.prepare('SELECT station_name,truck_count,waste_tons,unit,notes FROM transfer_stations WHERE report_id=? ORDER BY id').all(report.id);
    row.equipment=db.prepare('SELECT equipment_name,operating_status,status_description,working_hours,diesel_liters,notes FROM equipment WHERE report_id=? ORDER BY id').all(report.id);
    return canonicalize(row,report);
  }
  function requestJson(url){return new Promise((resolve,reject)=>{const req=https.get(url,{headers:{'User-Agent':'Minya-Landfill/3.5'}},res=>{let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`weather ${res.statusCode}`));try{resolve(JSON.parse(body))}catch(e){reject(e)}})});req.setTimeout(10000,()=>req.destroy(new Error('weather timeout')));req.on('error',reject)});}
  function label(code){code=Number(code);if(code===0)return 'مشمس';if([1,2].includes(code))return 'غائم جزئيًا';if(code===3)return 'غائم';if([45,48].includes(code))return 'ضباب';if([51,53,55,56,57].includes(code))return 'رذاذ';if([61,63,65,66,67,80,81,82].includes(code))return 'ماطر';if([71,73,75,77,85,86].includes(code))return 'ثلجي';if([95,96,99].includes(code))return 'عاصف ممطر';return 'متغير';}
  function weatherMap(payload){const out=new Map(),d=payload?.daily;if(!Array.isArray(d?.time))return out;d.time.forEach((date,i)=>{const t=Number(d.temperature_2m_mean?.[i]),c=d.weather_code?.[i];if(Number.isFinite(t)&&c!==undefined&&c!==null)out.set(date,{temperature:Math.round(t*10)/10,weather:label(c)});});return out;}
  async function getWeather(month){
    const total=daysInMonth(month),first=`${month}-01`,last=`${month}-${String(total).padStart(2,'0')}`,now=new Date();
    const out=new Map();
    try{const archiveEnd=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);if(first<=archiveEnd){const end=last<archiveEnd?last:archiveEnd;const u=`https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${first}&end_date=${end}&daily=weather_code,temperature_2m_mean&timezone=Asia%2FHebron`;weatherMap(await requestJson(u)).forEach((v,k)=>out.set(k,v));}}catch(e){console.error('monthly weather archive',e.message)}
    try{const from=new Date(now.getTime()-92*86400000).toISOString().slice(0,10),to=new Date(now.getTime()+16*86400000).toISOString().slice(0,10);if(last>=from&&first<=to){const start=first>from?first:from,end=last<to?last:to;const u=`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_mean&timezone=Asia%2FHebron&start_date=${start}&end_date=${end}`;weatherMap(await requestJson(u)).forEach((v,k)=>out.set(k,v));}}catch(e){console.error('monthly weather forecast',e.message)}
    return out;
  }

  app.get('/api/monthly-entry',requireAuth,async(req,res)=>{
    const month=String(req.query.month||'').trim();if(!validMonth(month))return res.status(400).json({ok:false,message:'الشهر غير صالح'});
    try{
      const reports=db.prepare('SELECT * FROM daily_reports WHERE report_date LIKE ? ORDER BY report_date').all(`${month}-%`);
      const reportMap=new Map(reports.map(r=>[r.report_date,r]));
      const staged=db.prepare('SELECT report_date,data_json,updated_at FROM monthly_entry_rows WHERE report_date LIKE ? ORDER BY report_date').all(`${month}-%`);
      const stagedMap=new Map(staged.map(x=>[x.report_date,{data:safeJson(x.data_json),updated_at:x.updated_at}]));
      const weather=await getWeather(month),rows=[];
      for(let day=1;day<=daysInMonth(month);day++){
        const date=`${month}-${String(day).padStart(2,'0')}`;let data,source='new',updated_at=null;
        const stagedItem=stagedMap.get(date);
        const stagedData=stagedItem?canonicalize({...blank(date),...stagedItem.data,report_date:date}):null;
        if(reportMap.has(date)){
          const report=reportMap.get(date);
          data=reportData(report);
          if(stagedData){data=canonicalize(mergeNonZero(data,stagedData),report);source='report+saved-entry';updated_at=stagedItem.updated_at;}
          else source='report';
        }else if(stagedData){data=stagedData;source='saved-entry';updated_at=stagedItem.updated_at;}
        else data=canonicalize(blank(date));
        if(source==='new'&&data.auto?.weather!==false&&weather.has(date)){const w=weather.get(date);data.weather=w.weather;data.temperature=w.temperature;data.weather_source='Open-Meteo';}
        rows.push({report_date:date,data,updated_at,source});
      }
      const existingRows=rows.filter(x=>x.source!=='new');
      const monthlyTotals=existingRows.reduce((a,x)=>{const t=x.data?.summary_totals||{};a.trucks+=number(t.trucks);a.waste+=number(t.waste);a.diesel+=number(t.diesel);return a;},{trucks:0,waste:0,diesel:0});
      res.json({ok:true,month,rows,monthly_totals:monthlyTotals,existing:reports.map(r=>({id:r.id,report_date:r.report_date,workflow_status:r.workflow_status||'draft'})),weather:{source:'Open-Meteo',available_days:weather.size}});
    }catch(error){console.error('monthly entry live fix failed',error);res.status(500).json({ok:false,message:'تعذر تحميل بيانات الشهر',error:error.message});}
  });
};
