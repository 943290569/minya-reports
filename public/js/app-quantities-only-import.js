/* Combined quantities workbook importer: quantities/operations/stations only. Diesel remains on the dedicated diesel path. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const STANDARD_EQUIPMENT=['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'];
  const CREWS=[['سائقين جرافات واليات',4],['سائقين شحن(قلابات)',2],['عمال زراعة',1],['استقبال وتوجيه الشاحنات',2],['عمال تنظيف وتطاير داخلي',4],['عمال تنظيف تطاير خارجي',5]];
  let preview=null;

  function iso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;return'';
  }
  function stableRange(date,min,max){const seed=Number(String(date).replace(/\D/g,'').slice(-4))||0;return min+(seed%(max-min+1));}
  function waterRule(date,weather,temp,humidity){
    const friday=new Date(`${date}T12:00:00+03:00`).getDay()===5;let sprays=0,rule='';
    if(/ماطر|ممطر|امطار|أمطار|مطر|ثلجي|rain/i.test(String(weather||''))){sprays=0;rule='ماطر/ثلجي';}
    else if(friday){sprays=stableRange(date,4,5);rule='الجمعة';}
    else if(Number.isFinite(Number(temp))&&Number(temp)<=15){sprays=4;rule='بارد';}
    else if(Number.isFinite(Number(humidity))&&Number(humidity)>=75){sprays=stableRange(date,2,3);rule='رطب';}
    else{sprays=stableRange(date,8,9);rule='جاف';}
    return{sprays,water:sprays*3,rule};
  }
  function crews(date){
    const friday=new Date(`${date}T12:00:00+03:00`).getDay()===5;
    if(friday)return CREWS.map(([crew_name],i)=>({crew_name,crew_count:[2,0,0,1,0,0][i],notes:''}));
    return CREWS.map(([crew_name,crew_count])=>({crew_name,crew_count,notes:''}));
  }
  function equipmentDefaults(){return STANDARD_EQUIPMENT.map(equipment_name=>({equipment_name,operating_status:'يعمل',status_description:'',working_hours:0,diesel_liters:0,notes:''}));}
  async function api(url,opt={}){const r=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json','Content-Type':'application/json',...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(r.status===401){location.href='/login.html';throw new Error('يجب تسجيل الدخول');}if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);return d;}

  function findHeader(rows){
    for(let i=0;i<Math.min(rows.length,20);i++){
      const r=(rows[i]||[]).map(clean);
      if(r.includes('التاريخ')&&r.some(x=>x.includes('مكب المنيا - عدد المركبات'))&&r.some(x=>x.includes('خط الفرز - الكمية')))return i;
    }
    return -1;
  }
  function headerMap(row){const m={};row.forEach((v,i)=>m[clean(v)]=i);return m;}
  function need(m,name){if(m[name]===undefined)throw new Error(`ملف الكميات: العمود غير موجود: ${name}`);return m[name];}
  async function climate(days){
    if(!days.length)return new Map();const start=days[0].date,end=days.at(-1).date;
    const url=`https://archive-api.open-meteo.com/v1/archive?latitude=31.6364&longitude=35.2145&start_date=${start}&end_date=${end}&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall&timezone=Asia%2FHebron`;
    const out=new Map();
    try{
      const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('weather');const d=await r.json();const h=d.hourly||{},times=h.time||[];
      for(const day of days){
        const vals=[];for(let i=0;i<times.length;i++){if(!String(times[i]).startsWith(day.date))continue;const hour=Number(String(times[i]).slice(11,13));if(hour<9||hour>13)continue;vals.push({t:Number(h.temperature_2m?.[i]),u:Number(h.relative_humidity_2m?.[i]),p:num(h.precipitation?.[i])+num(h.rain?.[i]),s:num(h.snowfall?.[i])});}
        if(!vals.length)continue;const avg=a=>{const x=vals.map(v=>v[a]).filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:null;};
        const snow=vals.some(v=>v.s>0),rain=vals.some(v=>v.p>0.1);out.set(day.date,{weather:snow?'ثلجي':rain?'ماطر':'مشمس',temperature:avg('t'),humidity:avg('u')});
      }
    }catch(e){console.warn('quantities climate',e);}
    return out;
  }
  async function parse(file){
    if(!window.XLSX)throw new Error('قارئ Excel غير متاح');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});
    const sname=wb.SheetNames.find(n=>norm(n).includes('شيت الموقع'))||wb.SheetNames[0];if(!sname)throw new Error('لا توجد ورقة بيانات داخل ملف الكميات');
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sname],{header:1,raw:true,defval:'',blankrows:false}),h=findHeader(rows);if(h<0)throw new Error('ملف الكميات غير مطابق للشيت المعتمد. استخدم آخر ملف شيت الموقع الذي تم تعديله.');
    const m=headerMap(rows[h]);
    const cols={date:need(m,'التاريخ'),landfillCount:need(m,'مكب المنيا - عدد المركبات'),landfillQty:need(m,'مكب المنيا - الكمية (طن)'),tarqCount:need(m,'ترقوميا - عدد الشاحنات'),tarqQty:need(m,'ترقوميا - الكمية (طن)'),yataCount:need(m,'يطا - عدد الشاحنات'),yataQty:need(m,'يطا - الكمية (طن)'),hebCount:need(m,'الخليل - عدد الشاحنات'),hebQty:need(m,'الخليل - الكمية (طن)'),leachCount:need(m,'العصارة - عدد المركبات'),leachQty:need(m,'العصارة - الكمية'),extCount:need(m,'طمم خارجي - عدد المركبات'),extQty:need(m,'طمم خارجي - الكمية'),intCount:need(m,'طمم داخلي - عدد المركبات'),intQty:need(m,'طمم داخلي - الكمية'),styleCount:need(m,'أسلوب - عدد المركبات'),styleQty:need(m,'أسلوب - الكمية'),sortCount:need(m,'خط الفرز - عدد المركبات'),sortQty:need(m,'خط الفرز - الكمية')};
    const days=[];
    for(let i=h+1;i<rows.length;i++){
      const r=rows[i]||[],date=iso(r[cols.date]);if(!date)continue;
      days.push({date,landfillCount:num(r[cols.landfillCount]),landfillQty:num(r[cols.landfillQty]),tarqCount:num(r[cols.tarqCount]),tarqQty:num(r[cols.tarqQty]),yataCount:num(r[cols.yataCount]),yataQty:num(r[cols.yataQty]),hebCount:num(r[cols.hebCount]),hebQty:num(r[cols.hebQty]),leachCount:num(r[cols.leachCount]),leachQty:num(r[cols.leachQty]),extCount:num(r[cols.extCount]),extQty:num(r[cols.extQty]),intCount:num(r[cols.intCount]),intQty:num(r[cols.intQty]),styleCount:num(r[cols.styleCount]),styleQty:num(r[cols.styleQty]),sortCount:num(r[cols.sortCount]),sortQty:num(r[cols.sortQty])});
    }
    if(!days.length)throw new Error('لم يتم العثور على أيام صالحة داخل ملف الكميات');days.sort((a,b)=>a.date.localeCompare(b.date));
    const wx=await climate(days);for(const d of days){const c=wx.get(d.date)||{weather:'مشمس',temperature:10,humidity:null};Object.assign(d,c,waterRule(d.date,c.weather,c.temperature,c.humidity));}
    return days;
  }
  function totals(days){return days.reduce((a,d)=>({landfill:a.landfill+d.landfillQty,stations:a.stations+d.tarqQty+d.yataQty+d.hebQty,external:a.external+d.extQty,internal:a.internal+d.intQty,leachate:a.leachate+d.leachQty,sorting:a.sorting+d.sortQty}),{landfill:0,stations:0,external:0,internal:0,leachate:0,sorting:0});}
  function render(days){
    const root=$('sourceFilesPreview'),msg=$('sourceFilesMessage');if(!root)return;const t=totals(days);
    root.innerHTML=`<div class="source-import-summary"><div><span>الأيام المقروءة</span><strong>${days.length}</strong></div><div><span>نفايات المكب</span><strong>${fmt(t.landfill)} طن</strong></div><div><span>المحطات</span><strong>${fmt(t.stations)} طن</strong></div><div><span>طمم خارجي</span><strong>${fmt(t.external)}</strong></div><div><span>طمم داخلي</span><strong>${fmt(t.internal)}</strong></div></div><div class="drive-preview-note"><strong>ملف الكميات الموحد:</strong> يطا تتضمن عزيز كما هي في الشيت. السولار لا يتم تغييره من هذا الاستيراد.</div><div class="source-import-table-wrap"><table class="v3-table quantities-import-table"><thead><tr><th>التاريخ</th><th>المكب مركبات</th><th>المكب طن</th><th>ترقوميا</th><th>يطا</th><th>الخليل</th><th>العصارة</th><th>طمم خارجي</th><th>طمم داخلي</th><th>أسلوب</th><th>خط الفرز</th><th>رش المياه</th></tr></thead><tbody>${days.map(d=>`<tr><td>${esc(d.date)}</td><td>${fmt(d.landfillCount)}</td><td><strong>${fmt(d.landfillQty)}</strong></td><td>${fmt(d.tarqCount)} / ${fmt(d.tarqQty)}</td><td>${fmt(d.yataCount)} / ${fmt(d.yataQty)}</td><td>${fmt(d.hebCount)} / ${fmt(d.hebQty)}</td><td>${fmt(d.leachCount)} / ${fmt(d.leachQty)}</td><td>${fmt(d.extCount)} / ${fmt(d.extQty)}</td><td>${fmt(d.intCount)} / ${fmt(d.intQty)}</td><td>${fmt(d.styleCount)} / ${fmt(d.styleQty)}</td><td>${fmt(d.sortCount)} / ${fmt(d.sortQty)}</td><td>${fmt(d.sprays)} مرة · ${fmt(d.water)} كوب</td></tr>`).join('')}</tbody></table></div><div id="quantitiesApprovalBar" class="source-import-toolbar" style="position:sticky;bottom:8px;z-index:20;background:rgba(255,255,255,.96);padding:12px;border:1px solid #d8e4df;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.08);margin:16px 0"><button id="approveQuantitiesBtn" type="button" class="drive-primary">اعتماد ملف الكميات في التقارير</button><span>يحدّث الكميات والمحطات والعمليات فقط. السولار والمعدات وباقي بيانات التقرير تبقى كما هي.</span></div>`;
    $('sourceFilesPanel')?.classList.add('source-import-has-preview');if(msg)msg.textContent=`اكتمل تحليل ملف الكميات: ${days.length} يوم.`;$('approveQuantitiesBtn')?.addEventListener('click',approve);
  }
  function opMap(detail){return new Map((detail.operations||[]).map(x=>[norm(x.operation_name),x]));}
  function oldOp(map,names){for(const n of names){const x=map.get(norm(n));if(x)return x;}return{};}
  function buildPayload(detail,day,isNew){
    const r=detail?.report&&typeof detail.report==='object'?detail.report:(detail||{}),ops=opMap(detail||{});
    const waterOld=oldOp(ops,['كميات المياه للتعقيم والترطيب','كميات المياه']),sprayOld=oldOp(ops,['عدد مرات رش المياه']);
    const waterQty=isNew?day.water:num(waterOld.quantity),sprays=isNew?day.sprays:num(sprayOld.quantity);
    const operations=[
      {operation_name:'مكب نفايات المنيا',vehicle_count:day.landfillCount,quantity:day.landfillQty,unit:'طن',notes:''},
      {operation_name:'مواد التغطية (اسلوب)',vehicle_count:day.styleCount,quantity:day.styleQty,unit:'نقلة',notes:''},
      {operation_name:'مواد التغطية (طمم)',vehicle_count:day.intCount,quantity:day.intQty,unit:'كوب',notes:''},
      {operation_name:'كميات المياه للتعقيم والترطيب',vehicle_count:num(waterOld.vehicle_count),quantity:waterQty,unit:'كوب',notes:waterOld.notes||''},
      {operation_name:'عدد مرات رش المياه',vehicle_count:num(sprayOld.vehicle_count),quantity:sprays,unit:'مرة',notes:sprayOld.notes||''},
      {operation_name:'كميات العصارة المرحلة',vehicle_count:day.leachCount,quantity:day.leachQty,unit:'كوب',notes:''},
      {operation_name:'خط الفرز',vehicle_count:day.sortCount,quantity:day.sortQty,unit:'طن',notes:''},
      {operation_name:'طمم خارجي',vehicle_count:day.extCount,quantity:day.extQty,unit:'طن',notes:''}
    ];
    const stations=[{station_name:'محطة ترحيل الخليل',truck_count:day.hebCount,waste_tons:day.hebQty,unit:'طن',notes:''},{station_name:'محطة ترحيل ترقوميا',truck_count:day.tarqCount,waste_tons:day.tarqQty,unit:'طن',notes:''},{station_name:'محطة ترحيل يطا',truck_count:day.yataCount,waste_tons:day.yataQty,unit:'طن',notes:'يشمل عزيز حسب ملف الكميات الموحد'}];
    const equipment=Array.isArray(detail?.equipment)&&detail.equipment.length?detail.equipment:equipmentDefaults();
    const diesel=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);
    return{report_date:day.date,weather:isNew?day.weather:(r.weather||day.weather),temperature:isNew?day.temperature:num(r.temperature),start_time:r.start_time||'04:00',end_time:r.end_time||'19:00',total_trucks:day.landfillCount+day.tarqCount+day.yataCount+day.hebCount,total_waste_tons:day.landfillQty+day.tarqQty+day.yataQty+day.hebQty,total_diesel:diesel,notes:r.notes||'',crews:Array.isArray(detail?.crews)&&detail.crews.length?detail.crews:crews(day.date),operations,stations,equipment};
  }
  async function approve(){
    if(!preview?.length)return;const btn=$('approveQuantitiesBtn'),msg=$('sourceFilesMessage');
    if(!confirm(`سيتم استيراد كميات ${preview.length} يوم. التقارير الموجودة ستُحدَّث في الكميات والمحطات والعمليات فقط، ولن يتغير السولار أو بيانات المعدات. متابعة؟`))return;
    btn.disabled=true;let created=0,updated=0,failed=0;try{
      const list=await api('/api/reports'),byDate=new Map((list.reports||[]).map(x=>[String(x.report_date),x]));
      for(let i=0;i<preview.length;i++){
        const day=preview[i],base=byDate.get(day.date);if(msg)msg.textContent=`جاري استيراد الكميات ${i+1}/${preview.length}: ${day.date}`;
        try{let detail={};if(base?.id)detail=await api(`/api/reports/${base.id}`);const payload=buildPayload(detail,day,!base?.id);await api(base?.id?`/api/reports/${base.id}`:'/api/reports',{method:base?.id?'PUT':'POST',body:JSON.stringify(payload)});base?.id?updated++:created++;}catch(e){console.error('quantities import',day.date,e);failed++;}
        await new Promise(r=>setTimeout(r,25));
      }
      if(msg)msg.textContent=`تم استيراد ملف الكميات: ${updated} تقرير محدث · ${created} تقرير جديد${failed?` · ${failed} فشل`:''}. السولار لم يتغير.`;btn.textContent='✓ تم اعتماد ملف الكميات';
    }catch(e){if(msg)msg.textContent=`تعذر اعتماد ملف الكميات: ${e.message||e}`;}finally{btn.disabled=false;setTimeout(()=>{if(btn)btn.textContent='اعتماد ملف الكميات في التقارير';},2500);}
  }
  async function analyze(){
    const file=$('sourceFile_quantities')?.files?.[0],btn=$('analyzeQuantitiesBtn'),msg=$('sourceFilesMessage');if(!file){if(msg)msg.textContent='اختر ملف الكميات أولًا.';return;}btn.disabled=true;if(msg)msg.textContent='جاري تحليل ملف الكميات الموحد...';
    try{preview=await parse(file);window.MINYA_QUANTITIES_PREVIEW=preview;render(preview);}catch(e){console.error(e);preview=null;if(msg)msg.textContent=e.message||'تعذر تحليل ملف الكميات';}finally{btn.disabled=false;}
  }
  function clear(){preview=null;window.MINYA_QUANTITIES_PREVIEW=null;const f=$('sourceFile_quantities');if(f)f.value='';const s=$('sourceFileState_quantities');if(s)s.textContent='لم يتم اختيار ملف';}
  function init(){
    $('sourceFile_quantities')?.addEventListener('change',e=>{const f=e.target.files?.[0];const s=$('sourceFileState_quantities');if(s)s.textContent=f?.name||'لم يتم اختيار ملف';preview=null;});
    $('analyzeQuantitiesBtn')?.addEventListener('click',analyze);$('clearSourceFilesBtn')?.addEventListener('click',clear);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
