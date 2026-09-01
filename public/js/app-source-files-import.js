/* Raw monthly source import V3: whitelist columns only + resilient header matching. Preview only. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const normalize=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const WEATHER_SOURCE='Open-Meteo';
  const WEATHER_LAT=31.6364;
  const WEATHER_LON=35.2145;
  const WEATHER_TZ='Asia/Hebron';
  const COLD_TEMP_MAX=15;
  const HUMIDITY_MIN=75;
  const NORMAL_CREWS=[4,2,1,2,4,5];
  const FRIDAY_CREWS=[2,0,0,1,0,0];

  const FIELD_ALIASES={
    date:['تاريخ','التاريخ','تاريخ الحركه','تاريخ الحركة','تاريخ الوزن','date'],
    quantity:['كميه','كمية','الكميه','الكمية','الوزن','الوزن الصافي','صافي الوزن','الكميه النهائيه','الكمية النهائية','net weight','quantity'],
    landfillSource:['اسم الجهه','اسم الجهة','الجهه','الجهة','مصدر النفايات','نوع النفايات','نوع الحموله','نوع الحمولة','نوع الماده','نوع المادة','البيان','الاسم'],
    station:['قسم','المحطه','المحطة','اسم المحطه','اسم المحطة','الجهه','الجهة','الاسم'],
    equipment:['اسم الاليه','اسم الآلية','الاليه','الآلية','المعده','المعدة','الصنف','البيان'],
    dieselQuantity:['كميه السولار','كمية السولار','كميه الديزل','كمية الديزل','سولار','ديزل','لتر','كميه','كمية']
  };

  const DIESEL_EQUIPMENT=[
    {name:'جرافة جنزير 2023',aliases:['جرافة جنزير 2023']},
    {name:'جرافة جنزير 2019',aliases:['جرافة جنزير 2019','جرافة جنزير k26/2019','k26/2019']},
    {name:'جرافة جنزير 2022',aliases:['جرافة جنزير 2022']},
    {name:'باجر جنزير',aliases:['باجر جنزير','باقر جنزير','باجر جنزير d336','d336']},
    {name:'مدحلة نفايات 2024',aliases:['مدحلة نفايات 2024','بومك جديد 2024','بومك cat']},
    {name:'قلاب 1770',aliases:['قلاب 1770']},
    {name:'قلاب 1772',aliases:['قلاب 1772']},
    {name:'مدحلة 36 طن',aliases:['مدحلة 36 طن','بومك 36 طن']},
    {name:'مدحلة 24 طن',aliases:['مدحلة 24 طن','بومك 24 طن']},
    {name:'تركتر لانديني',aliases:['تركتر لانديني','تركتور لانديني','تركتر لنديني','لانديني ازرق']},
    {name:'تركتر جندير',aliases:['تركتر جندير','تركتور جندير']},
    {name:'شاحنة تنك مياه',aliases:['شاحنة تنك مياه','شاحنة برتقالي 1776','تنك برتقالي']},
    {name:'باجر عجل F428',aliases:['باجر عجل f428','باقر عجل f428','باجر 428','باقر 428']},
    {name:'بوبكات',aliases:['بوبكات','بوب كات']},
    {name:'ماكنة رش الضباب',aliases:['ماكنة رش الضباب','ماكنة رش']},
    {name:'مولد الكهرباء',aliases:['مولد الكهرباء','ماتور كهرباء']}
  ];

  const state={files:{landfill:null,stations:null,aziz:null,diesel:null},daily:new Map(),sourceNames:new Set(),ignoredDieselNames:new Set(),errors:[],columnUsage:{}};

  function excelDateToIso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);if(!s)return '';
    if(/^\d+(?:\.0+)?$/.test(s)&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(Number(s));if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
    return '';
  }

  function inferType(fileName){
    const n=normalize(fileName);
    if(n.includes('سولار')||n.includes('ديزل')||n.includes('diesel'))return 'diesel';
    if(n.includes('عزيز'))return 'aziz';
    if(n.includes('محطات')||n.includes('stations'))return 'stations';
    if(n.includes('مكب')||n.includes('landfill'))return 'landfill';
    return '';
  }

  function getDaily(date){
    if(!state.daily.has(date))state.daily.set(date,{date,landfill:{localAuthorities:{trucks:0,tons:0},settlements:{trucks:0,tons:0},individuals:{trucks:0,tons:0},companies:{trucks:0,tons:0},otherWaste:{trucks:0,tons:0},leachate:{trucks:0,tons:0},externalFill:{trucks:0,tons:0}},stations:{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0},other:{trucks:0,tons:0}},azizAddedToYata:{trucks:0,tons:0},diesel:{},totalDiesel:0,derived:{weather:'',temperature:null,humidity:null,isFriday:false,crewCounts:[],crewTotal:0,waterSprays:null,waterQuantity:null,waterRule:'',weatherSource:WEATHER_SOURCE}});
    return state.daily.get(date);
  }

  function aliasMatch(value,aliases){const n=normalize(value);if(!n)return false;return aliases.some(a=>{const x=normalize(a);return n===x||n.includes(x)||x.includes(n);});}
  function aliasIndices(headers,aliases){const out=[];(headers||[]).forEach((v,i)=>{if(aliasMatch(v,aliases))out.push(i);});return out;}
  function numericRatio(rows,col,start){let filled=0,numeric=0;for(let i=start;i<Math.min(rows.length,start+80);i++){const v=(rows[i]||[])[col];if(clean(v)==='')continue;filled++;const n=Number(String(v).replace(/,/g,''));if(Number.isFinite(n))numeric++;}return filled?numeric/filled:0;}

  function sampleScore(rows,col,start,kind){
    let score=0,seen=0;
    for(let i=start;i<Math.min(rows.length,start+80);i++){
      const raw=clean((rows[i]||[])[col]);if(!raw)continue;seen++;const n=normalize(raw);
      if(kind==='landfillSource'){if(/عصاره|طمم|نفايات|هيئات|مستوطن|اسرائيل|افراد|شركات|مصانع/.test(n))score+=5;if(!excelDateToIso(raw)&&!Number.isFinite(Number(raw)))score+=1;}
      else if(kind==='station'){if(/يطا|ترقوميا|الخليل|محطه|ترحيل/.test(n))score+=6;}
      else if(kind==='equipment'){if(canonicalEquipment(raw))score+=7;}
    }
    return seen?score/seen:0;
  }

  function chooseCandidate(rows,headers,aliases,start,kind){
    const candidates=aliasIndices(headers,aliases);if(!candidates.length)return -1;if(candidates.length===1)return candidates[0];
    let best=candidates[0],bestScore=-Infinity;
    for(const col of candidates){const score=kind==='quantity'?numericRatio(rows,col,start)*10:sampleScore(rows,col,start,kind);if(score>bestScore){best=col;bestScore=score;}}
    return best;
  }

  function findHeaderRow(rows,type){
    const max=Math.min(rows.length,50);let best=-1,bestScore=0;
    for(let i=0;i<max;i++){
      const row=rows[i]||[],hasDate=aliasIndices(row,FIELD_ALIASES.date).length>0,hasQty=aliasIndices(row,type==='diesel'?FIELD_ALIASES.dieselQuantity:FIELD_ALIASES.quantity).length>0;
      const hasSource=type==='landfill'?aliasIndices(row,FIELD_ALIASES.landfillSource).length>0:type==='stations'?aliasIndices(row,FIELD_ALIASES.station).length>0:type==='aziz'?true:aliasIndices(row,FIELD_ALIASES.equipment).length>0;
      const hasKnownDiesel=type==='diesel'&&row.some(v=>Boolean(canonicalEquipment(v)));const score=(hasDate?4:0)+(hasQty?3:0)+(hasSource?2:0)+(hasKnownDiesel?5:0);
      if(score>bestScore){best=i;bestScore=score;}
    }
    return bestScore>=5?best:-1;
  }

  function recordUsage(type,headers,usedIndexes,labels){
    const unique=[...new Set(usedIndexes.filter(i=>i>=0))];state.columnUsage[type]={total:(headers||[]).filter(v=>clean(v)!=='').length,used:unique.length,usedNames:unique.map(i=>clean(headers[i])||`عمود ${i+1}`),fields:labels||[]};
  }

  function classifyLandfillSource(label){const n=normalize(label);if(n.includes('عصاره'))return 'leachate';if(n.includes('طمم'))return 'externalFill';if(n.includes('هيئات محليه')||n.includes('هيئات المحلية'))return 'localAuthorities';if(n.includes('اسرائيلي')||n.includes('مستوطن'))return 'settlements';if(n.includes('افراد')||n.includes('نقديه')||n.includes('نقدية'))return 'individuals';if(n.includes('شركات')||n.includes('مصانع'))return 'companies';return 'otherWaste';}
  function classifyStation(label){const n=normalize(label);if(n.includes('يطا'))return 'yata';if(n.includes('ترقوميا'))return 'tarqumia';if(n.includes('الخليل'))return 'hebron';return 'other';}
  function canonicalEquipment(label){const n=normalize(label);if(!n)return '';for(const eq of DIESEL_EQUIPMENT){if(eq.aliases.some(a=>{const x=normalize(a);return n===x||n.includes(x);} ))return eq.name;}return '';}

  function workbookRows(wb,type=''){
    let preferred='';if(type==='diesel')preferred=wb.SheetNames.find(n=>normalize(n).includes('سولار'))||wb.SheetNames.find(n=>normalize(n).includes('ديزل'))||'';
    preferred=preferred||wb.SheetNames.find(n=>normalize(n).includes('تقرير الارساليه'))||wb.SheetNames.find(n=>normalize(n).includes('ارساليه'))||wb.SheetNames[0];if(!preferred)throw new Error('لا توجد ورقة بيانات داخل الملف');
    return XLSX.utils.sheet_to_json(wb.Sheets[preferred],{header:1,raw:true,defval:''});
  }

  function parseLandfill(rows){
    const h=findHeaderRow(rows,'landfill');if(h<0)throw new Error('ملف المكب: لم أجد صف العناوين الأساسية');const headers=rows[h]||[],start=h+1;
    const dateCol=chooseCandidate(rows,headers,FIELD_ALIASES.date,start,'date'),nameCol=chooseCandidate(rows,headers,FIELD_ALIASES.landfillSource,start,'landfillSource'),qtyCol=chooseCandidate(rows,headers,FIELD_ALIASES.quantity,start,'quantity');
    if(dateCol<0||nameCol<0||qtyCol<0)throw new Error('ملف المكب: يلزم فقط التاريخ + الجهة/نوع الوارد + الكمية');recordUsage('landfill',headers,[dateCol,nameCol,qtyCol],['التاريخ','الجهة/نوع الوارد','الكمية']);
    for(let i=start;i<rows.length;i++){const row=rows[i]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const label=clean(row[nameCol]);if(!label)continue;const rawQty=clean(row[qtyCol]);if(rawQty==='')continue;const qty=num(row[qtyCol]),bucket=classifyLandfillSource(label),d=getDaily(date);d.landfill[bucket].trucks++;d.landfill[bucket].tons+=qty;state.sourceNames.add(label);}
  }

  function parseStations(rows,isAziz=false){
    const type=isAziz?'aziz':'stations',h=findHeaderRow(rows,type);if(h<0)throw new Error(`${isAziz?'ملف عزيز':'ملف المحطات'}: لم أجد صف العناوين الأساسية`);const headers=rows[h]||[],start=h+1;
    const dateCol=chooseCandidate(rows,headers,FIELD_ALIASES.date,start,'date'),qtyCol=chooseCandidate(rows,headers,FIELD_ALIASES.quantity,start,'quantity'),stationCol=isAziz?-1:chooseCandidate(rows,headers,FIELD_ALIASES.station,start,'station');
    if(dateCol<0||qtyCol<0||(!isAziz&&stationCol<0))throw new Error(isAziz?'ملف عزيز: يلزم التاريخ + الكمية':'ملف المحطات: يلزم التاريخ + اسم/قسم المحطة + الكمية');
    recordUsage(type,headers,isAziz?[dateCol,qtyCol]:[dateCol,stationCol,qtyCol],isAziz?['التاريخ','الكمية']:['التاريخ','المحطة','الكمية']);
    for(let i=start;i<rows.length;i++){const row=rows[i]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const rawQty=clean(row[qtyCol]);if(rawQty==='')continue;const qty=num(row[qtyCol]),d=getDaily(date);if(isAziz){d.stations.yata.trucks++;d.stations.yata.tons+=qty;d.azizAddedToYata.trucks++;d.azizAddedToYata.tons+=qty;}else{const label=clean(row[stationCol]);if(!label)continue;const bucket=classifyStation(label);d.stations[bucket].trucks++;d.stations[bucket].tons+=qty;}}
  }

  function parseDiesel(rows){
    const h=findHeaderRow(rows,'diesel');if(h<0)throw new Error('كشف السولار: لم أجد التاريخ مع آلية/كمية سولار');const headers=rows[h]||[],start=h+1,dateCol=chooseCandidate(rows,headers,FIELD_ALIASES.date,start,'date');if(dateCol<0)throw new Error('كشف السولار: لم أجد عمود التاريخ');
    const wideCols=[];headers.forEach((v,i)=>{const eq=canonicalEquipment(v);if(eq)wideCols.push({i,eq});});
    if(wideCols.length){recordUsage('diesel',headers,[dateCol,...wideCols.map(x=>x.i)],['التاريخ','أعمدة آليات المكب فقط']);for(let r=start;r<rows.length;r++){const row=rows[r]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const d=getDaily(date);for(const c of wideCols){const raw=clean(row[c.i]);if(raw==='')continue;const liters=num(row[c.i]);if(!liters)continue;d.diesel[c.eq]=(d.diesel[c.eq]||0)+liters;d.totalDiesel+=liters;}}return;}
    const equipmentCol=chooseCandidate(rows,headers,FIELD_ALIASES.equipment,start,'equipment'),qtyCol=chooseCandidate(rows,headers,FIELD_ALIASES.dieselQuantity,start,'quantity');if(equipmentCol<0||qtyCol<0)throw new Error('كشف السولار: يلزم التاريخ + اسم الآلية + كمية السولار');recordUsage('diesel',headers,[dateCol,equipmentCol,qtyCol],['التاريخ','اسم الآلية','كمية السولار']);
    for(let r=start;r<rows.length;r++){const row=rows[r]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const raw=clean(row[equipmentCol]);if(!raw)continue,eq=canonicalEquipment(raw);if(!eq){state.ignoredDieselNames.add(raw);continue;}const rawQty=clean(row[qtyCol]);if(rawQty==='')continue;const liters=num(row[qtyCol]),d=getDaily(date);d.diesel[eq]=(d.diesel[eq]||0)+liters;d.totalDiesel+=liters;}
  }

  async function readFile(file,type){const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),rows=workbookRows(wb,type);if(type==='landfill')parseLandfill(rows);else if(type==='diesel')parseDiesel(rows);else parseStations(rows,type==='aziz');}

  function weatherCodeToArabic(code){if(code===0)return 'مشمس';if(code===1||code===2)return 'غائم جزئيًا';if(code===3)return 'غائم';if(code===45||code===48)return 'ضباب';if([51,53,55,61,63,65,80,81,82].includes(code))return 'ماطر';if([71,73,75,85,86].includes(code))return 'ثلجي';if([95,96,99].includes(code))return 'عاصف';return 'غير محدد';}
  function stableRange(date,min,max){const seed=Number(String(date).replace(/\D/g,'').slice(-4))||0;return min+(seed%(max-min+1));}

  function applyDerivedRules(day,weatherText,avgTemp,avgHumidity){
    const isFriday=new Date(`${day.date}T12:00:00Z`).getUTCDay()===5,crews=isFriday?FRIDAY_CREWS:NORMAL_CREWS;let sprays=0,rule='';
    if(weatherText==='ماطر'||weatherText==='ثلجي'){sprays=0;rule='ماطر/ثلجي';}else if(isFriday){sprays=stableRange(day.date,4,5);rule='الجمعة';}else if(Number.isFinite(avgTemp)&&avgTemp<=COLD_TEMP_MAX){sprays=4;rule='بارد';}else if(Number.isFinite(avgHumidity)&&avgHumidity>=HUMIDITY_MIN){sprays=stableRange(day.date,2,3);rule='رطب';}else{sprays=stableRange(day.date,8,9);rule='جاف';}
    day.derived={weather:weatherText,temperature:Number.isFinite(avgTemp)?Math.round(avgTemp):null,humidity:Number.isFinite(avgHumidity)?Math.round(avgHumidity):null,isFriday,crewCounts:[...crews],crewTotal:crews.reduce((a,b)=>a+b,0),waterSprays:sprays,waterQuantity:sprays*3,waterRule:rule,weatherSource:WEATHER_SOURCE};
  }

  async function enrichWeather(){
    const days=[...state.daily.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!days.length)return;const start=days[0].date,end=days[days.length-1].date,url='https://archive-api.open-meteo.com/v1/archive?latitude='+WEATHER_LAT+'&longitude='+WEATHER_LON+'&start_date='+start+'&end_date='+end+'&hourly=temperature_2m,relative_humidity_2m,weather_code&timezone='+encodeURIComponent(WEATHER_TZ);
    try{const r=await fetch(url);if(!r.ok)throw new Error('weather');const data=await r.json(),times=data?.hourly?.time||[],temps=data?.hourly?.temperature_2m||[],humidity=data?.hourly?.relative_humidity_2m||[],codes=data?.hourly?.weather_code||data?.hourly?.weathercode||[],agg=new Map();for(let i=0;i<times.length;i++){const date=String(times[i]||'').slice(0,10),hh=Number(String(times[i]||'').slice(11,13));if(hh<9||hh>13)continue;if(!agg.has(date))agg.set(date,{sumT:0,nT:0,sumH:0,nH:0,freq:{}});const a=agg.get(date),t=Number(temps[i]),h=Number(humidity[i]),c=Number(codes[i]);if(Number.isFinite(t)){a.sumT+=t;a.nT++;}if(Number.isFinite(h)){a.sumH+=h;a.nH++;}if(Number.isFinite(c))a.freq[c]=(a.freq[c]||0)+1;}for(const day of days){const a=agg.get(day.date);if(!a){applyDerivedRules(day,'غير محدد',NaN,NaN);continue;}let mainCode=0,best=-1;for(const k in a.freq){if(a.freq[k]>best){best=a.freq[k];mainCode=Number(k);}}applyDerivedRules(day,weatherCodeToArabic(mainCode),a.nT?a.sumT/a.nT:NaN,a.nH?a.sumH/a.nH:NaN);}}catch(_){for(const day of days)applyDerivedRules(day,'غير محدد',NaN,NaN);}
  }

  function totalsFor(day){const incomingKeys=['localAuthorities','settlements','individuals','companies','otherWaste'],incoming=incomingKeys.reduce((a,k)=>({trucks:a.trucks+day.landfill[k].trucks,tons:a.tons+day.landfill[k].tons}),{trucks:0,tons:0}),stations=Object.values(day.stations).reduce((a,x)=>({trucks:a.trucks+x.trucks,tons:a.tons+x.tons}),{trucks:0,tons:0});return {incoming,stations};}

  function usageNote(){const names={landfill:'المكب',stations:'المحطات',aziz:'عزيز',diesel:'السولار'},rows=Object.entries(state.columnUsage).map(([type,u])=>`${names[type]||type}: استخدم ${u.used} من ${u.total||u.used} أعمدة (${u.fields.join(' + ')})`);return rows.length?`<div class="drive-preview-note"><strong>القراءة الانتقائية:</strong> ${rows.map(esc).join(' — ')}. بقية الأعمدة تم تجاهلها.</div>`:'';}

  function renderPreview(){
    const root=$('sourceFilesPreview');if(!root)return;const days=[...state.daily.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!days.length){root.innerHTML='<div class="drive-empty">لم يتم استخراج بيانات يومية.</div>';return;}
    const monthWaste=days.reduce((s,d)=>s+totalsFor(d).incoming.tons,0),monthStation=days.reduce((s,d)=>s+totalsFor(d).stations.tons,0),aziz=days.reduce((s,d)=>s+d.azizAddedToYata.tons,0),diesel=days.reduce((s,d)=>s+d.totalDiesel,0),ignored=[...state.ignoredDieselNames].slice(0,20);
    root.innerHTML=`<div class="source-import-summary"><div><span>الأيام المقروءة</span><strong>${days.length}</strong></div><div><span>نفايات واردة للمكب</span><strong>${fmt(monthWaste)} طن</strong></div><div><span>نفايات المحطات</span><strong>${fmt(monthStation)} طن</strong></div><div><span>عزيز المضاف إلى يطا</span><strong>${fmt(aziz)} طن</strong></div><div><span>سولار آليات المكب</span><strong>${fmt(diesel)} لتر</strong></div></div>${usageNote()}<div class="drive-preview-note">هذه معاينة فقط. لا يتم حفظ أي بيانات. مصدر الطقس: ${WEATHER_SOURCE}. الحرارة والرطوبة 09:00–13:00 على ${WEATHER_LAT}, ${WEATHER_LON}.</div>${ignored.length?`<div class="drive-preview-note">تم تجاهل بنود سولار غير مرتبطة بالمكب: ${ignored.map(esc).join('، ')}${state.ignoredDieselNames.size>ignored.length?' ...':''}</div>`:''}<div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>الطقس</th><th>°C</th><th>الطواقم</th><th>رش المياه</th><th>مياه/كوب</th><th>هيئات محلية</th><th>مستوطنات</th><th>أفراد</th><th>شركات</th><th>إجمالي الوارد</th><th>يطا</th><th>منها عزيز</th><th>ترقوميا</th><th>الخليل</th><th>السولار</th></tr></thead><tbody>${days.map(d=>{const t=totalsFor(d);return `<tr><td>${esc(d.date)}</td><td>${esc(d.derived.weather||'-')}${d.derived.isFriday?' · جمعة':''}</td><td>${d.derived.temperature??'-'}</td><td>${fmt(d.derived.crewTotal)}</td><td>${d.derived.waterSprays??'-'}</td><td>${d.derived.waterQuantity??'-'}</td><td>${fmt(d.landfill.localAuthorities.tons)}</td><td>${fmt(d.landfill.settlements.tons)}</td><td>${fmt(d.landfill.individuals.tons)}</td><td>${fmt(d.landfill.companies.tons)}</td><td><strong>${fmt(t.incoming.tons)}</strong></td><td>${fmt(d.stations.yata.tons)}</td><td>${fmt(d.azizAddedToYata.tons)}</td><td>${fmt(d.stations.tarqumia.tons)}</td><td>${fmt(d.stations.hebron.tons)}</td><td>${fmt(d.totalDiesel)}</td></tr>`;}).join('')}</tbody></table></div>`;$('sourceFilesPanel')?.classList.add('source-import-has-preview');
  }

  function updateFileState(){['landfill','stations','aziz','diesel'].forEach(type=>{const el=$(`sourceFileState_${type}`);if(el)el.textContent=state.files[type]?.name||'لم يتم اختيار ملف';});}

  async function analyze(){
    const msg=$('sourceFilesMessage');state.daily.clear();state.sourceNames.clear();state.ignoredDieselNames.clear();state.errors=[];state.columnUsage={};const files=Object.entries(state.files).filter(([,f])=>f);if(!files.length){if(msg)msg.textContent='اختر ملفًا واحدًا على الأقل.';return;}
    try{if(!window.XLSX)throw new Error('قارئ Excel غير متاح');if(msg)msg.textContent='جاري قراءة الأعمدة المطلوبة فقط وتجاهل بقية الأعمدة...';for(const [type,file] of files)await readFile(file,type);if(msg)msg.textContent='تم تجميع الملفات. جاري حساب الطقس والحرارة والجمعة والطواقم ورش المياه...';await enrichWeather();if(msg)msg.textContent=`تمت قراءة ${files.length} ملف/ملفات بنجاح. راجع النتائج قبل أي خطوة حفظ.`;renderPreview();}catch(e){console.error(e);if(msg)msg.textContent=e.message||'تعذر تحليل الملفات';}
  }

  function bindInput(type,id){$(id)?.addEventListener('change',e=>{const f=e.target.files?.[0]||null;if(f){const inferred=inferType(f.name);if(inferred&&inferred!==type){$('sourceFilesMessage').textContent=`اسم الملف ${f.name} يبدو من نوع مختلف عن الخانة المختارة.`;}}state.files[type]=f;updateFileState();});}

  function init(){
    if(!$('sourceFilesPanel'))return;bindInput('landfill','sourceFile_landfill');bindInput('stations','sourceFile_stations');bindInput('aziz','sourceFile_aziz');bindInput('diesel','sourceFile_diesel');$('analyzeSourceFilesBtn')?.addEventListener('click',analyze);$('clearSourceFilesBtn')?.addEventListener('click',()=>{state.files={landfill:null,stations:null,aziz:null,diesel:null};state.daily.clear();state.ignoredDieselNames.clear();state.columnUsage={};['sourceFile_landfill','sourceFile_stations','sourceFile_aziz','sourceFile_diesel'].forEach(id=>{if($(id))$(id).value='';});updateFileState();if($('sourceFilesPreview'))$('sourceFilesPreview').innerHTML='';if($('sourceFilesMessage'))$('sourceFilesMessage').textContent='لم يتم تحليل ملفات بعد.';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();