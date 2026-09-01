/* Raw monthly source import V1: landfill + stations + Aziz. Preview only. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const normalize=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const state={files:{landfill:null,stations:null,aziz:null},daily:new Map(),sourceNames:new Set(),errors:[]};

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
      azizAddedToYata:{trucks:0,tons:0}
    });
    return state.daily.get(date);
  }

  function findHeaderRow(rows){
    for(let i=0;i<Math.min(rows.length,25);i++){
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

  function workbookRows(wb){
    const preferred=wb.SheetNames.find(n=>normalize(n).includes('تقرير الارساليه'))||wb.SheetNames.find(n=>normalize(n).includes('ارساليه'))||wb.SheetNames[0];
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

  async function readFile(file,type){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const rows=workbookRows(wb);
    if(type==='landfill')parseLandfill(rows);else parseStations(rows,type==='aziz');
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
    root.innerHTML=`
      <div class="source-import-summary">
        <div><span>الأيام المقروءة</span><strong>${days.length}</strong></div>
        <div><span>نفايات واردة للمكب</span><strong>${fmt(monthWaste)} طن</strong></div>
        <div><span>نفايات المحطات</span><strong>${fmt(monthStation)} طن</strong></div>
        <div><span>عزيز المضاف إلى يطا</span><strong>${fmt(aziz)} طن</strong></div>
      </div>
      <div class="drive-preview-note">هذه معاينة فقط. لم يتم حفظ أي بيانات في التقارير.</div>
      <div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>هيئات محلية</th><th>مستوطنات</th><th>أفراد</th><th>شركات</th><th>إجمالي الوارد</th><th>يطا</th><th>منها عزيز</th><th>ترقوميا</th><th>الخليل</th></tr></thead><tbody>${days.map(d=>{const t=totalsFor(d);return `<tr><td>${esc(d.date)}</td><td>${fmt(d.landfill.localAuthorities.tons)}</td><td>${fmt(d.landfill.settlements.tons)}</td><td>${fmt(d.landfill.individuals.tons)}</td><td>${fmt(d.landfill.companies.tons)}</td><td><strong>${fmt(t.incoming.tons)}</strong></td><td>${fmt(d.stations.yata.tons)}</td><td>${fmt(d.azizAddedToYata.tons)}</td><td>${fmt(d.stations.tarqumia.tons)}</td><td>${fmt(d.stations.hebron.tons)}</td></tr>`;}).join('')}</tbody></table></div>`;
    $('sourceFilesPanel')?.classList.add('source-import-has-preview');
  }

  function updateFileState(){
    ['landfill','stations','aziz'].forEach(type=>{const el=$(`sourceFileState_${type}`);if(el)el.textContent=state.files[type]?.name||'لم يتم اختيار ملف';});
  }

  async function analyze(){
    const msg=$('sourceFilesMessage');state.daily.clear();state.sourceNames.clear();state.errors=[];
    const files=Object.entries(state.files).filter(([,f])=>f);
    if(!files.length){if(msg)msg.textContent='اختر ملفًا واحدًا على الأقل.';return;}
    try{
      if(!window.XLSX)throw new Error('قارئ Excel غير متاح');
      if(msg)msg.textContent='جاري قراءة الملفات وتجميع البيانات...';
      for(const [type,file] of files)await readFile(file,type);
      if(msg)msg.textContent=`تمت قراءة ${files.length} ملف/ملفات. راجع النتائج قبل أي خطوة حفظ.`;
      renderPreview();
    }catch(e){console.error(e);if(msg)msg.textContent=e.message||'تعذر تحليل الملفات';}
  }

  function bindInput(type,id){
    $(id)?.addEventListener('change',e=>{const f=e.target.files?.[0]||null;if(f){const inferred=inferType(f.name);if(inferred&&inferred!==type){$('sourceFilesMessage').textContent=`اسم الملف ${f.name} يبدو من نوع مختلف عن الخانة المختارة.`;}}state.files[type]=f;updateFileState();});
  }

  function init(){
    if(!$('sourceFilesPanel'))return;
    bindInput('landfill','sourceFile_landfill');bindInput('stations','sourceFile_stations');bindInput('aziz','sourceFile_aziz');
    $('analyzeSourceFilesBtn')?.addEventListener('click',analyze);
    $('clearSourceFilesBtn')?.addEventListener('click',()=>{state.files={landfill:null,stations:null,aziz:null};state.daily.clear();['sourceFile_landfill','sourceFile_stations','sourceFile_aziz'].forEach(id=>{if($(id))$(id).value='';});updateFileState();if($('sourceFilesPreview'))$('sourceFilesPreview').innerHTML='';if($('sourceFilesMessage'))$('sourceFilesMessage').textContent='لم يتم تحليل ملفات بعد.';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
