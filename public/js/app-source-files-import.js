/* Raw monthly source import V2: landfill + stations + Aziz + diesel + weather-derived fields. Preview only. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const normalize=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const WEATHER_LAT=31.6364;
  const WEATHER_LON=35.2145;
  const WEATHER_TZ='Asia/Hebron';
  const COLD_TEMP_MAX=15;
  const HUMIDITY_MIN=75;
  const NORMAL_CREWS=[4,2,1,2,4,5];
  const FRIDAY_CREWS=[2,0,0,1,0,0];

  const DIESEL_EQUIPMENT=[
    {name:'جرافة جنزير 2023',aliases:['جرافة جنزير 2023']},
    {name:'جرافة جنزير 2019',aliases:['جرافة جنزير 2019','جرافة جنزير k26/2019','k26/2019']},
    {name:'جرافة جنزير 2022',aliases:['جرافة جنزير 2022']},
    {name:'باجر جنزير',aliases:['باجر جنزير','باقر جنزير','باجر جنزير d336','d336']},
    {name:'مدحلة نفايات 2024',aliases:['مدحلة نفايات 2024','بومك جديد 2024']},
    {name:'قلاب 1770',aliases:['قلاب 1770']},
    {name:'قلاب 1772',aliases:['قلاب 1772']},
    {name:'مدحلة 36 طن',aliases:['مدحلة 36 طن','بومك 36 طن']},
    {name:'مدحلة 24 طن',aliases:['مدحلة 24 طن','بومك 24 طن']},
    {name:'تركتر لانديني',aliases:['تركتر لانديني','تركتور لانديني','تركتر لنديني']},
    {name:'تركتر جندير',aliases:['تركتر جندير','تركتور جندير']},
    {name:'شاحنة تنك مياه',aliases:['شاحنة تنك مياه','شاحنة برتقالي 1776','تنك برتقالي']},
    {name:'باجر عجل F428',aliases:['باجر عجل f428','باقر عجل f428','باجر 428','باقر 428']},
    {name:'بوبكات',aliases:['بوبكات','بوب كات']},
    {name:'ماكنة رش الضباب',aliases:['ماكنة رش الضباب','ماكنة رش']},
    {name:'مولد الكهرباء',aliases:['مولد الكهرباء','ماتور كهرباء']}
  ];

  const state={files:{landfill:null,stations:null,aziz:null,diesel:null},daily:new Map(),sourceNames:new Set(),ignoredDieselNames:new Set(),errors:[]};

  function excelDateToIso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v); if(!s)return '';
    if(/^\d+(?:\.0+)?$/.test(s)&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(Number(s));if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
    return '';
  }

  function inferType(fileName){
    const n=normalize(fileName);
    if(n.includes('سولار')||n.includes('ديزل')||n.includes('diesel')) return 'diesel';
    if(n.includes('عزيز')) return 'aziz';
    if(n.includes('محطات')||n.includes('stations')) return 'stations';
    if(n.includes('مكب')||n.includes('landfill')) return 'landfill';
    return '';
  }

  function getDaily(date){
    if(!state.daily.has(date)) state.daily.set(date,{
      date,
      landfill:{localAuthorities:{trucks:0,tons:0},settlements:{trucks:0,tons:0},individuals:{trucks:0,tons:0},companies:{trucks:0,tons:0},otherWaste:{trucks:0,tons:0},leachate:{trucks:0,tons:0},externalFill:{trucks:0,tons:0}},
      stations:{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0},other:{trucks:0,tons:0}},
      azizAddedToYata:{trucks:0,tons:0},
      diesel:{},totalDiesel:0,
      derived:{weather:'',temperature:null,humidity:null,isFriday:false,crewCounts:[],crewTotal:0,waterSprays:null,waterQuantity:null,waterRule:''}
    });
    return state.daily.get(date);
  }

  function findHeaderRow(rows){
    for(let i=0;i<Math.min(rows.length,30);i++){
      const r=(rows[i]||[]).map(normalize);
      if(r.includes('تاريخ')&&(r.includes('كميه')||r.includes('كمية'))) return i;
    }
    return -1;
  }

  function columnIndex(headers,name,occurrence=1){
    const target=normalize(name);let seen=0;
    for(let i=0;i<headers.length;i++) if(normalize(headers[i])===target){seen++;if(seen===occurrence)return i;}
    return -1;
  }

  function firstColumn(headers,names){
    for(const n of names){const idx=columnIndex(headers,n);if(idx>=0)return idx;}
    return -1;
  }

  function classifyLandfillSource(label){
    const n=normalize(label);
    if(n.includes('عصاره')) return 'leachate';
    if(n.includes('طمم')) return 'externalFill';
    if(n.includes('هيئات محليه')||n.includes('هيئات المحلية')) return 'localAuthorities';
    if(n.includes('اسرائيلي')||n.includes('مستوطن')) return 'settlements';
    if(n.includes('افراد')||n.includes('نقديه')||n.includes('نقدية')) return 'individuals';
    if(n.includes('شركات')||n.includes('مصانع')) return 'companies';
    return 'otherWaste';
  }

  function classifyStation(label){
    const n=normalize(label);
    if(n.includes('يطا')) return 'yata';
    if(n.includes('ترقوميا')) return 'tarqumia';
    if(n.includes('الخليل')) return 'hebron';
    return 'other';
  }

  function canonicalEquipment(label){
    const n=normalize(label);
    if(!n)return '';
    for(const eq of DIESEL_EQUIPMENT){
      if(eq.aliases.some(a=>{const x=normalize(a);return n===x||n.includes(x);} )) return eq.name;
    }
    return '';
  }

  function workbookRows(wb,type=''){
    let preferred='';
    if(type==='diesel') preferred=wb.SheetNames.find(n=>normalize(n).includes('سولار'))||wb.SheetNames.find(n=>normalize(n).includes('ديزل'))||'';
    preferred=preferred||wb.SheetNames.find(n=>normalize(n).includes('تقرير الارساليه'))||wb.SheetNames.find(n=>normalize(n).includes('ارساليه'))||wb.SheetNames[0];
    if(!preferred) throw new Error('لا توجد ورقة بيانات داخل الملف');
    return XLSX.utils.sheet_to_json(wb.Sheets[preferred],{header:1,raw:true,defval:''});
  }

  function parseLandfill(rows){
    const h=findHeaderRow(rows);if(h<0)throw new Error('ملف المكب: لم أجد صف العناوين');
    const headers=rows[h]||[];
    const dateCol=columnIndex(headers,'تاريخ');
    const nameCol=columnIndex(headers,'الاسم',2);
    const qtyCol=columnIndex(headers,'كمية');
    if(dateCol<0||nameCol<0||qtyCol<0)throw new Error('ملف المكب: أعمدة تاريخ / الاسم الثاني / كمية غير مكتملة');
    for(let i=h+1;i<rows.length;i++){
      const row=rows[i]||[];const date=excelDateToIso(row[dateCol]);if(!date)continue;
      const label=clean(row[nameCol]);if(!label)continue;const qty=num(row[qtyCol]);
      const bucket=classifyLandfillSource(label);const d=getDaily(date);d.landfill[bucket].trucks++;d.landfill[bucket].tons+=qty;state.sourceNames.add(label);
    }
  }

  function parseStations(rows,isAziz=false){
    const h=findHeaderRow(rows);if(h<0)throw new Error(`${isAziz?'ملف عزيز':'ملف المحطات'}: لم أجد صف العناوين`);
    const headers=rows[h]||[];
    const dateCol=columnIndex(headers,'تاريخ');
    const qtyCol=columnIndex(headers,'كمية');
    let stationCol=columnIndex(headers,'قسم');
    if(isAziz) stationCol=-1;
    if(dateCol<0||qtyCol<0||(!isAziz&&stationCol<0))throw new Error(`${isAziz?'ملف عزيز':'ملف المحطات'}: الأعمدة الأساسية غير مكتملة`);
    for(let i=h+1;i<rows.length;i++){
      const row=rows[i]||[];const date=excelDateToIso(row[dateCol]);if(!date)continue;const qty=num(row[qtyCol]);if(!qty&&clean(row[qtyCol])==='')continue;
      const d=getDaily(date);
      if(isAziz){d.stations.yata.trucks++;d.stations.yata.tons+=qty;d.azizAddedToYata.trucks++;d.azizAddedToYata.tons+=qty;}
      else {const label=clean(row[stationCol]);if(!label||normalize(label)==='الاسم')continue;const bucket=classifyStation(label);d.stations[bucket].trucks++;d.stations[bucket].tons+=qty;}
    }
  }

  function findDieselHeaderRow(rows){
    for(let i=0;i<Math.min(rows.length,40);i++){
      const row=rows[i]||[];const n=row.map(normalize);
      const hasDate=n.some(x=>x==='تاريخ'||x==='التاريخ'||x==='date');
      const hasKnown=row.some(v=>Boolean(canonicalEquipment(v)));
      const hasQty=n.some(x=>x==='كميه'||x==='كمية'||x.includes('كميه السولار')||x.includes('كمية السولار'));
      const hasEq=n.some(x=>x.includes('اسم الاليه')||x.includes('اسم الآليه')||x==='الاليه'||x==='الآليه'||x==='الصنف');
      if(hasDate&&(hasKnown||(hasQty&&hasEq))) return i;
    }
    return -1;
  }

  function parseDiesel(rows){
    const h=findDieselHeaderRow(rows);if(h<0)throw new Error('كشف السولار: لم أجد صف العناوين أو آليات المكب');
    const headers=rows[h]||[];
    const dateCol=firstColumn(headers,['تاريخ','التاريخ','date']);
    if(dateCol<0)throw new Error('كشف السولار: لم أجد عمود التاريخ');

    const wideCols=[];
    headers.forEach((v,i)=>{const eq=canonicalEquipment(v);if(eq)wideCols.push({i,eq});});
    if(wideCols.length){
      for(let r=h+1;r<rows.length;r++){
        const row=rows[r]||[];const date=excelDateToIso(row[dateCol]);if(!date)continue;const d=getDaily(date);
        for(const c of wideCols){const liters=num(row[c.i]);if(!liters)continue;d.diesel[c.eq]=(d.diesel[c.eq]||0)+liters;d.totalDiesel+=liters;}
      }
      return;
    }

    const equipmentCol=firstColumn(headers,['اسم الالية','اسم الآلية','الالية','الآلية','الصنف','البيان']);
    const qtyCol=firstColumn(headers,['كمية السولار','كميه السولار','كمية','كميه','لتر']);
    if(equipmentCol<0||qtyCol<0)throw new Error('كشف السولار: لم أجد عمود الآلية وكمية السولار');
    for(let r=h+1;r<rows.length;r++){
      const row=rows[r]||[];const date=excelDateToIso(row[dateCol]);if(!date)continue;
      const raw=clean(row[equipmentCol]);if(!raw)continue;const eq=canonicalEquipment(raw);
      if(!eq){state.ignoredDieselNames.add(raw);continue;}
      const liters=num(row[qtyCol]);if(!liters&&clean(row[qtyCol])==='')continue;const d=getDaily(date);d.diesel[eq]=(d.diesel[eq]||0)+liters;d.totalDiesel+=liters;
    }
  }

  async function readFile(file,type){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const rows=workbookRows(wb,type);
    if(type==='landfill')parseLandfill(rows);else if(type==='diesel')parseDiesel(rows);else parseStations(rows,type==='aziz');
  }

  function weatherCodeToArabic(code){
    if(code===0)return 'مشمس';
    if(code===1||code===2)return 'غائم جزئيًا';
    if(code===3)return 'غائم';
    if(code===45||code===48)return 'ضباب';
    if([51,53,55,61,63,65,80,81,82].includes(code))return 'ماطر';
    if([71,73,75,85,86].includes(code))return 'ثلجي';
    if([95,96,99].includes(code))return 'عاصف';
    return 'غير محدد';
  }

  function stableRange(date,min,max){
    const seed=Number(String(date).replace(/\D/g,'').slice(-4))||0;
    return min+(seed%(max-min+1));
  }

  function applyDerivedRules(day,weatherText,avgTemp,avgHumidity){
    const isFriday=new Date(`${day.date}T12:00:00Z`).getUTCDay()===5;
    const crews=isFriday?FRIDAY_CREWS:NORMAL_CREWS;
    let sprays=0,rule='';
    if(weatherText==='ماطر'||weatherText==='ثلجي') {sprays=0;rule='ماطر/ثلجي';}
    else if(isFriday) {sprays=stableRange(day.date,4,5);rule='الجمعة';}
    else if(Number.isFinite(avgTemp)&&avgTemp<=COLD_TEMP_MAX) {sprays=4;rule='بارد';}
    else if(Number.isFinite(avgHumidity)&&avgHumidity>=HUMIDITY_MIN) {sprays=stableRange(day.date,2,3);rule='رطب';}
    else {sprays=stableRange(day.date,8,9);rule='جاف';}
    day.derived={weather:weatherText,temperature:Number.isFinite(avgTemp)?Math.round(avgTemp):null,humidity:Number.isFinite(avgHumidity)?Math.round(avgHumidity):null,isFriday,crewCounts:[...crews],crewTotal:crews.reduce((a,b)=>a+b,0),waterSprays:sprays,waterQuantity:sprays*3,waterRule:rule};
  }

  async function enrichWeather(){
    const days=[...state.daily.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!days.length)return;
    const start=days[0].date,end=days[days.length-1].date;
    const url='https://archive-api.open-meteo.com/v1/archive?latitude='+WEATHER_LAT+'&longitude='+WEATHER_LON+'&start_date='+start+'&end_date='+end+'&hourly=temperature_2m,relative_humidity_2m,weathercode&timezone='+encodeURIComponent(WEATHER_TZ);
    try{
      const r=await fetch(url);if(!r.ok)throw new Error('weather');const data=await r.json();
      const times=data?.hourly?.time||[],temps=data?.hourly?.temperature_2m||[],humidity=data?.hourly?.relative_humidity_2m||[],codes=data?.hourly?.weathercode||[];
      const agg=new Map();
      for(let i=0;i<times.length;i++){
        const date=String(times[i]||'').slice(0,10),hh=Number(String(times[i]||'').slice(11,13));if(hh<9||hh>13)continue;
        if(!agg.has(date))agg.set(date,{sumT:0,nT:0,sumH:0,nH:0,freq:{}});const a=agg.get(date);
        const t=Number(temps[i]);if(Number.isFinite(t)){a.sumT+=t;a.nT++;}
        const h=Number(humidity[i]);if(Number.isFinite(h)){a.sumH+=h;a.nH++;}
        const c=Number(codes[i]);if(Number.isFinite(c))a.freq[c]=(a.freq[c]||0)+1;
      }
      for(const day of days){
        const a=agg.get(day.date);if(!a){applyDerivedRules(day,'غير محدد',NaN,NaN);continue;}
        let mainCode=0,best=-1;for(const k in a.freq){if(a.freq[k]>best){best=a.freq[k];mainCode=Number(k);}}
        applyDerivedRules(day,weatherCodeToArabic(mainCode),a.nT?a.sumT/a.nT:NaN,a.nH?a.sumH/a.nH:NaN);
      }
    }catch(_){for(const day of days)applyDerivedRules(day,'غير محدد',NaN,NaN);}
  }

  function totalsFor(day){
    const incomingKeys=['localAuthorities','settlements','individuals','companies','otherWaste'];
    const incoming=incomingKeys.reduce((a,k)=>({trucks:a.trucks+day.landfill[k].trucks,tons:a.tons+day.landfill[k].tons}),{trucks:0,tons:0});
    const stations=Object.values(day.stations).reduce((a,x)=>({trucks:a.trucks+x.trucks,tons:a.tons+x.tons}),{trucks:0,tons:0});
    return {incoming,stations};
  }

  function renderPreview(){
    const root=$('sourceFilesPreview');if(!root)return;
    const days=[...state.daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
    if(!days.length){root.innerHTML='<div class="drive-empty">لم يتم استخراج بيانات يومية.</div>';return;}
    const monthWaste=days.reduce((s,d)=>s+totalsFor(d).incoming.tons,0);
    const monthStation=days.reduce((s,d)=>s+totalsFor(d).stations.tons,0);
    const aziz=days.reduce((s,d)=>s+d.azizAddedToYata.tons,0);
    const diesel=days.reduce((s,d)=>s+d.totalDiesel,0);
    const ignored=[...state.ignoredDieselNames].slice(0,20);
    root.innerHTML=`
      <div class="source-import-summary">
        <div><span>الأيام المقروءة</span><strong>${days.length}</strong></div>
        <div><span>نفايات واردة للمكب</span><strong>${fmt(monthWaste)} طن</strong></div>
        <div><span>نفايات المحطات</span><strong>${fmt(monthStation)} طن</strong></div>
        <div><span>عزيز المضاف إلى يطا</span><strong>${fmt(aziz)} طن</strong></div>
        <div><span>سولار آليات المكب</span><strong>${fmt(diesel)} لتر</strong></div>
      </div>
      <div class="drive-preview-note">هذه معاينة فقط. لم يتم حفظ أي بيانات في التقارير. الطقس والحرارة محسوبان للفترة 09:00–13:00 حسب إحداثيات تقوع/بيت لحم المستخدمة في سكربت التقرير القديم.</div>
      ${ignored.length?`<div class="drive-preview-note">تم تجاهل بنود سولار غير مرتبطة بآليات المكب: ${ignored.map(esc).join('، ')}${state.ignoredDieselNames.size>ignored.length?' ...':''}</div>`:''}
      <div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>الطقس</th><th>°C</th><th>الطواقم</th><th>رش المياه</th><th>مياه/كوب</th><th>هيئات محلية</th><th>مستوطنات</th><th>أفراد</th><th>شركات</th><th>إجمالي الوارد</th><th>يطا</th><th>منها عزيز</th><th>ترقوميا</th><th>الخليل</th><th>السولار</th></tr></thead><tbody>${days.map(d=>{const t=totalsFor(d);return `<tr><td>${esc(d.date)}</td><td>${esc(d.derived.weather||'-')}${d.derived.isFriday?' · جمعة':''}</td><td>${d.derived.temperature??'-'}</td><td>${fmt(d.derived.crewTotal)}</td><td>${d.derived.waterSprays??'-'}</td><td>${d.derived.waterQuantity??'-'}</td><td>${fmt(d.landfill.localAuthorities.tons)}</td><td>${fmt(d.landfill.settlements.tons)}</td><td>${fmt(d.landfill.individuals.tons)}</td><td>${fmt(d.landfill.companies.tons)}</td><td><strong>${fmt(t.incoming.tons)}</strong></td><td>${fmt(d.stations.yata.tons)}</td><td>${fmt(d.azizAddedToYata.tons)}</td><td>${fmt(d.stations.tarqumia.tons)}</td><td>${fmt(d.stations.hebron.tons)}</td><td>${fmt(d.totalDiesel)}</td></tr>`;}).join('')}</tbody></table></div>`;
    $('sourceFilesPanel')?.classList.add('source-import-has-preview');
  }

  function updateFileState(){
    ['landfill','stations','aziz','diesel'].forEach(type=>{const el=$(`sourceFileState_${type}`);if(el)el.textContent=state.files[type]?.name||'لم يتم اختيار ملف';});
  }

  async function analyze(){
    const msg=$('sourceFilesMessage');state.daily.clear();state.sourceNames.clear();state.ignoredDieselNames.clear();state.errors=[];
    const files=Object.entries(state.files).filter(([,f])=>f);
    if(!files.length){if(msg)msg.textContent='اختر ملفًا واحدًا على الأقل.';return;}
    try{
      if(!window.XLSX)throw new Error('قارئ Excel غير متاح');
      if(msg)msg.textContent='جاري قراءة الملفات وتجميع البيانات...';
      for(const [type,file] of files)await readFile(file,type);
      if(msg)msg.textContent='تم تجميع الملفات. جاري حساب الطقس والحرارة والجمعة والطواقم ورش المياه...';
      await enrichWeather();
      if(msg)msg.textContent=`تمت قراءة ${files.length} ملف/ملفات. راجع النتائج قبل أي خطوة حفظ.`;
      renderPreview();
    }catch(e){console.error(e);if(msg)msg.textContent=e.message||'تعذر تحليل الملفات';}
  }

  function bindInput(type,id){
    $(id)?.addEventListener('change',e=>{const f=e.target.files?.[0]||null;if(f){const inferred=inferType(f.name);if(inferred&&inferred!==type){$('sourceFilesMessage').textContent=`اسم الملف ${f.name} يبدو من نوع مختلف عن الخانة المختارة.`;}}state.files[type]=f;updateFileState();});
  }

  function init(){
    if(!$('sourceFilesPanel'))return;
    bindInput('landfill','sourceFile_landfill');bindInput('stations','sourceFile_stations');bindInput('aziz','sourceFile_aziz');bindInput('diesel','sourceFile_diesel');
    $('analyzeSourceFilesBtn')?.addEventListener('click',analyze);
    $('clearSourceFilesBtn')?.addEventListener('click',()=>{state.files={landfill:null,stations:null,aziz:null,diesel:null};state.daily.clear();state.ignoredDieselNames.clear();['sourceFile_landfill','sourceFile_stations','sourceFile_aziz','sourceFile_diesel'].forEach(id=>{if($(id))$(id).value='';});updateFileState();if($('sourceFilesPreview'))$('sourceFilesPreview').innerHTML='';if($('sourceFilesMessage'))$('sourceFilesMessage').textContent='لم يتم تحليل ملفات بعد.';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
