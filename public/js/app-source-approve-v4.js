/* Source preview -> official daily-report template V4. Matches the approved MINYA daily report structure and preserves duplicate replace/skip flow. */
(function(){
  const $=id=>document.getElementById(id), clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const originals={landfill:null,diesel:null,cover:null};
  const parsed={specials:null,diesel:null,cover:null};

  const EQUIPMENT=[
    ['باقر جنزير',['باقر جنزير','باجر جنزير','d336']],
    ['جرافة جنزير 2023',['جرافة جنزير 2023']],
    ['جرافة جنزير 2022',['جرافة جنزير 2022']],
    ['جرافة عجل',['جرافة عجل']],
    ['بومك 24 طن',['بومك 24 طن','مدحلة 24 طن']],
    ['بومك 36 طن',['بومك 36 طن','مدحلة 36 طن']],
    ['قلاب 1770',['قلاب 1770','قالب 1770']],
    ['قلاب 1772',['قلاب 1772','قالب 1772']],
    ['تنك برتقالي',['تنك برتقالي','شاحنة تنك مياه','1776']],
    ['بوب كات',['بوب كات','بوبكات']],
    ['باقر 428',['باقر 428','باجر 428','f428']],
    ['بومك CAT',['بومك cat','مدحلة نفايات 2024','بومك جديد 2024']],
    ['تركتر جندير',['تركتر جندير','تركتور جندير']],
    ['تركتر لنديني',['تركتر لنديني','تركتر لانديني','تركتور لانديني']],
    ['جرافة k963',['جرافة k963','k963']],
    ['جرافة 80',['جرافة 80']],
    ['خط الفرز',['خط الفرز']]
  ];

  function pair(v){const s=clean(v),tm=s.match(/([\d,.]+)\s*طن/),cm=s.match(/([\d,.]+)\s*شاح(?:نة|نه)/);return{tons:tm?num(tm[1]):num(s),trucks:cm?num(cm[1]):0};}
  function iso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;return'';
  }
  function captureInput(id,key){const f=$(id)?.files?.[0];if(f&&!/normalized/i.test(f.name)){originals[key]=f;parsed[key]=null;}}
  function capture(){captureInput('sourceFile_landfill','landfill');captureInput('sourceFile_diesel','diesel');captureInput('sourceFile_cover','cover');}

  async function rowsFrom(file){if(!file)return[];const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,cellStyles:false,cellNF:false,cellHTML:false});return wb.SheetNames.map(name=>XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false}));}
  async function parseSpecials(){
    if(parsed.specials)return parsed.specials;const out=new Map();
    for(const rows of await rowsFrom(originals.landfill)){
      let h=-1;for(let i=0;i<Math.min(rows.length,25);i++){const a=norm(rows[i]?.[0]),b=norm(rows[i]?.[1]),c=norm(rows[i]?.[2]);if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('مركبات')||c.includes('شاحنات')||c.includes('وحد'))){h=i;break;}}
      if(h<0)continue;let d='';
      for(let i=h+1;i<rows.length;i++){const r=rows[i]||[],date=iso(r[0]);if(date){d=date;if(!out.has(d))out.set(d,{leachate:{tons:0,trucks:0},tamm:{tons:0,trucks:0},cover:{tons:0,trucks:0}});continue;}if(!d)continue;const n=norm(r[0]);if(!n||n.includes('الاجمالي')||n.includes('grand total'))continue;const x=out.get(d),v={tons:num(r[1]),trucks:Math.max(0,Math.round(num(r[2])))};if(n.includes('عصاره')){x.leachate.tons+=v.tons;x.leachate.trucks+=v.trucks;}else if(n.includes('مواد لتغطيه المكب')){x.cover.tons+=v.tons;x.cover.trucks+=v.trucks;}else if(n.includes('طمم')){x.tamm.tons+=v.tons;x.tamm.trucks+=v.trucks;}}
    }
    parsed.specials=out;return out;
  }
  function eqCanonical(label){const n=norm(label);for(const [name,aliases] of EQUIPMENT)if(aliases.some(a=>{const x=norm(a);return n===x||n.includes(x)||x.includes(n);} ))return name;return'';}
  async function parseDiesel(){
    if(parsed.diesel)return parsed.diesel;const out=new Map();
    for(const rows of await rowsFrom(originals.diesel)){
      let h=-1,dateCol=-1;for(let i=0;i<Math.min(rows.length,35);i++){const rr=rows[i]||[];const dc=rr.findIndex(v=>/تاريخ|date/i.test(norm(v)));if(dc>=0&&(rr.some(v=>eqCanonical(v)))){h=i;dateCol=dc;break;}}
      if(h>=0){const headers=rows[h]||[],cols=[];headers.forEach((v,i)=>{const eq=eqCanonical(v);if(eq)cols.push([i,eq]);});for(let i=h+1;i<rows.length;i++){const r=rows[i]||[],d=iso(r[dateCol]);if(!d)continue;if(!out.has(d))out.set(d,{});for(const [ci,eq] of cols){const liters=num(r[ci]);if(liters)out.get(d)[eq]=(out.get(d)[eq]||0)+liters;}}continue;}
      /* Long format: date + equipment + quantity. */
      for(let i=0;i<Math.min(rows.length,35);i++){const rr=rows[i]||[],dc=rr.findIndex(v=>/تاريخ|date/i.test(norm(v))),ec=rr.findIndex(v=>/اليه|آليه|معده|صنف|بيان/.test(norm(v))),qc=rr.findIndex(v=>/سولار|ديزل|كمي/.test(norm(v)));if(dc<0||ec<0||qc<0)continue;for(let j=i+1;j<rows.length;j++){const r=rows[j]||[],d=iso(r[dc]),eq=eqCanonical(r[ec]);if(!d||!eq)continue;if(!out.has(d))out.set(d,{});out.get(d)[eq]=(out.get(d)[eq]||0)+num(r[qc]);}break;}
    }
    parsed.diesel=out;return out;
  }
  async function parseCover(){
    if(parsed.cover)return parsed.cover;const out=new Map();
    for(const rows of await rowsFrom(originals.cover))for(let h=0;h<Math.min(rows.length,30);h++){
      const rr=rows[h]||[],dc=rr.findIndex(v=>/تاريخ|date/i.test(norm(v))),nc=rr.findIndex(v=>/نوع|بيان|اسم|ماده/.test(norm(v))),qc=rr.findIndex(v=>/كمي|عدد|نقله|كوب/.test(norm(v)));if(dc<0||nc<0||qc<0)continue;
      for(let i=h+1;i<rows.length;i++){const r=rows[i]||[],d=iso(r[dc]),n=norm(r[nc]);if(!d||!n)continue;if(!out.has(d))out.set(d,{style:{count:0,qty:0},tamm:{count:0,qty:0}});const q=num(r[qc]);if(n.includes('اسلوب')){out.get(d).style.count++;out.get(d).style.qty+=q;}else if(n.includes('طمم')){out.get(d).tamm.count++;out.get(d).tamm.qty+=q;}}
      break;
    }
    parsed.cover=out;return out;
  }

  function crewsFor(total){return [
    {crew_name:'سائقين جرافات واليات',crew_count:0,notes:'التفصيل غير متوفر في ملفات المصدر'},
    {crew_name:'سائقين شحن',crew_count:0,notes:'التفصيل غير متوفر في ملفات المصدر'},
    {crew_name:'عمال تنظيف وتطاير داخلي',crew_count:0,notes:'التفصيل غير متوفر في ملفات المصدر'},
    {crew_name:'عمال فرز',crew_count:0,notes:'التفصيل غير متوفر في ملفات المصدر'},
    {crew_name:'إجمالي العاملين',crew_count:total,notes:'مستورد من المعاينة'}
  ];}

  async function payloadFromRow(tr){
    const c=tr.querySelectorAll('td');if(c.length<16)return null;const report_date=clean(c[0].textContent);if(!/^\d{4}-\d{2}-\d{2}$/.test(report_date))return null;
    const incoming=pair(c[10].textContent),yata=pair(c[11].textContent),aziz=pair(c[12].textContent),tarq=pair(c[13].textContent),heb=pair(c[14].textContent);
    const sprays=num(c[4].textContent),water=num(c[5].textContent),crewTotal=num(c[3].textContent),special=(await parseSpecials()).get(report_date)||{leachate:{tons:0,trucks:0},tamm:{tons:0,trucks:0},cover:{tons:0,trucks:0}},cover=(await parseCover()).get(report_date)||{style:{count:0,qty:0},tamm:{count:0,qty:0}},dieselMap=(await parseDiesel()).get(report_date)||{};
    const operations=[
      {operation_name:'مكب نفايات المنيا',start_time:'04:00',end_time:'19:00',vehicle_count:incoming.trucks,quantity:incoming.tons,unit:'طن',notes:''},
      {operation_name:'مواد التغطية (اسلوب)',start_time:'',end_time:'',vehicle_count:cover.style.count,quantity:cover.style.qty,unit:'نقلة',notes:'من ملف مواد التغطية الخارجي فقط'},
      {operation_name:'مواد التغطية ( طمم)',start_time:'',end_time:'',vehicle_count:cover.tamm.count,quantity:cover.tamm.qty,unit:'كوب',notes:'من ملف مواد التغطية الخارجي فقط'},
      {operation_name:'كميات المياه',start_time:'',end_time:'',vehicle_count:water>0?1:0,quantity:water,unit:'كوب',notes:''},
      {operation_name:'عدد مرات رش المياه',start_time:'',end_time:'',vehicle_count:sprays>0?1:0,quantity:sprays,unit:'',notes:''},
      {operation_name:'كميات العصارة',start_time:'',end_time:'',vehicle_count:special.leachate.trucks,quantity:special.leachate.tons,unit:'طن',notes:'الكمية كما وردت في ملف المكب'},
      {operation_name:'خط الفرز',start_time:'',end_time:'',vehicle_count:0,quantity:0,unit:'طن',notes:'لا توجد قيمة في ملفات المصدر الحالية'},
      {operation_name:'( طمم) خارجي',start_time:'',end_time:'',vehicle_count:0,quantity:0,unit:'طن',notes:'غير مربوط تلقائيًا بطمم ملف المكب لتجنب خلط البنود'}
    ];
    const stations=[
      {station_name:'محطة ترحيل الخليل',truck_count:heb.trucks,waste_tons:heb.tons,unit:'طن',notes:''},
      {station_name:'محطة ترحيل ترقوميا',truck_count:tarq.trucks,waste_tons:tarq.tons,unit:'طن',notes:''},
      {station_name:'محطة ترحيل يطا',truck_count:yata.trucks,waste_tons:yata.tons,unit:'طن',notes:aziz.tons||aziz.trucks?`منها عزيز: ${aziz.tons} طن · ${aziz.trucks} شاحنة`:''}
    ];
    const equipment=EQUIPMENT.map(([equipment_name])=>({equipment_name,operating_status:'غير محدد',status_description:'حالة الآلية غير متوفرة في ملفات المصدر',working_hours:0,diesel_liters:num(dieselMap[equipment_name]),notes:'مستورد من كشف السولار'}));
    const stationTrucks=stations.reduce((s,x)=>s+x.truck_count,0),stationTons=stations.reduce((s,x)=>s+x.waste_tons,0),diesel=Object.values(dieselMap).reduce((s,x)=>s+num(x),0)||num(c[15].textContent);
    return{report_date,weather:clean(c[1].textContent).replace(/\s*·\s*جمعة/g,'').replace('جاري...',''),temperature:num(c[2].textContent),start_time:'04:00',end_time:'19:00',total_trucks:incoming.trucks+stationTrucks,total_waste_tons:incoming.tons+stationTons,total_diesel:diesel,notes:'تم إنشاؤه من معاينة ملفات المصدر الشهرية وفق قالب التقرير اليومي المعتمد.',crews:crewsFor(crewTotal),operations,stations,equipment};
  }
  async function getRows(){const root=$('sourceFilesPreview'),table=[...(root?.querySelectorAll('.source-import-table')||[])].find(t=>t.querySelector('tbody tr td:nth-child(16)'));if(!table)return[];const out=[];for(const tr of table.querySelectorAll('tbody tr')){const p=await payloadFromRow(tr);if(p)out.push(p);}return out;}
  async function existing(){const r=await fetch('/api/reports',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر قراءة التقارير الموجودة');return new Map((d.reports||[]).filter(x=>x.report_date&&x.id).map(x=>[String(x.report_date),Number(x.id)]));}
  function refreshBar(){const bar=$('sourceApproveBar'),has=Boolean($('sourceFilesPreview')?.querySelector('.source-import-table tbody tr'));if(bar)bar.style.display=has?'flex':'none';}
  function ensureUi(){const panel=$('sourceFilesPanel');if(!panel||$('sourceApproveBar'))return;const bar=document.createElement('div');bar.id='sourceApproveBar';bar.className='drive-approval-bar';bar.style.marginTop='14px';bar.innerHTML='<button id="cancelSourceApprovalBtn" type="button" class="drive-cancel">إلغاء الاعتماد</button><button id="approveSourceDailyBtn" type="button" class="drive-primary">اعتماد كتقارير يومية</button><div id="sourceApproveProgress" class="drive-progress hidden" style="width:100%"></div>';panel.appendChild(bar);$('cancelSourceApprovalBtn').addEventListener('click',()=>{document.getElementById('sourceDuplicatePanel')?.remove();const p=$('sourceApproveProgress');if(p){p.classList.add('hidden');p.textContent='';}});$('approveSourceDailyBtn').addEventListener('click',begin);refreshBar();}
  function showDuplicates(rows,ex){document.getElementById('sourceDuplicatePanel')?.remove();const dups=rows.filter(x=>ex.has(x.report_date));if(!dups.length)return false;const box=document.createElement('div');box.id='sourceDuplicatePanel';box.className='drive-panel';box.style.marginTop='14px';box.innerHTML=`<div class="drive-panel-head"><div><small>تقارير موجودة مسبقًا</small><h3>اختر الإجراء لكل تاريخ</h3></div><span class="drive-readonly">الافتراضي: تجاهل</span></div><div class="drive-preview-note">الجديد يُحفظ تلقائيًا. التقرير الموجود يمكن استبداله أو تجاهله، والتجاهل لا يوقف بقية التقارير.</div><div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>الإجراء</th></tr></thead><tbody>${dups.map(x=>`<tr><td>${esc(x.report_date)}</td><td><select data-source-conflict="${esc(x.report_date)}"><option value="skip" selected>تجاهل والمتابعة</option><option value="replace">استبدال الموجود</option></select></td></tr>`).join('')}</tbody></table></div><div class="drive-approval-bar"><button id="cancelDuplicateImport" class="drive-cancel" type="button">إلغاء العملية</button><button id="continueDuplicateImport" class="drive-primary" type="button">متابعة الاعتماد</button></div>`;$('sourceApproveBar').before(box);$('cancelDuplicateImport').addEventListener('click',()=>box.remove());$('continueDuplicateImport').addEventListener('click',()=>run(rows,ex));return true;}
  async function begin(){capture();const b=$('approveSourceDailyBtn');b.disabled=true;try{const rows=await getRows();if(!rows.length){alert('لا توجد بيانات يومية جاهزة للاعتماد. نفّذ المعاينة أولًا.');return;}const ex=await existing();if(!showDuplicates(rows,ex))await run(rows,ex);}catch(e){alert(e.message||e);}finally{b.disabled=false;}}
  async function run(rows,ex){const actions=new Map([...document.querySelectorAll('[data-source-conflict]')].map(s=>[s.dataset.sourceConflict,s.value]));document.getElementById('sourceDuplicatePanel')?.remove();const p=$('sourceApproveProgress');p.classList.remove('hidden');let created=0,replaced=0,skipped=0,failed=0;const errors=[];for(let i=0;i<rows.length;i++){const x=rows[i],id=ex.get(x.report_date),action=id?(actions.get(x.report_date)||'skip'):'create';p.textContent=`جاري الاعتماد ${i+1} من ${rows.length} — ${x.report_date}`;if(action==='skip'){skipped++;continue;}try{const r=await fetch(id?`/api/reports/${id}`:'/api/reports',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`خطأ ${r.status}`);id?replaced++:created++;}catch(e){failed++;errors.push(`${x.report_date}: ${e.message||e}`);}}p.textContent=`تم: ${created} جديد · ${replaced} مستبدل · ${skipped} متجاهل · ${failed} فشل`;alert(`${failed?'اكتملت العملية مع أخطاء':'اكتملت العملية بنجاح'}\nجديد: ${created}\nمستبدل: ${replaced}\nمتجاهل: ${skipped}\nفشل: ${failed}${errors.length?`\n${errors.slice(0,5).join('\n')}`:''}`);}
  function init(){ensureUi();document.addEventListener('change',e=>{if(e.target?.id==='sourceFile_landfill')captureInput('sourceFile_landfill','landfill');if(e.target?.id==='sourceFile_diesel')captureInput('sourceFile_diesel','diesel');if(e.target?.id==='sourceFile_cover')captureInput('sourceFile_cover','cover');},true);$('analyzeSourceFilesBtn')?.addEventListener('click',()=>[300,900,1800,3500,7000,12000].forEach(ms=>setTimeout(refreshBar,ms)));$('clearSourceFilesBtn')?.addEventListener('click',()=>{originals.landfill=originals.diesel=originals.cover=null;parsed.specials=parsed.diesel=parsed.cover=null;setTimeout(refreshBar,50);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
