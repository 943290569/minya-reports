/* Dedicated diesel-only fast path: parse only landfill equipment diesel, no weather or other source processing. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const equipment=[
    {name:'جرافة جنزير 2023',a:['جرافة جنزير 2023']},
    {name:'جرافة جنزير 2019',a:['جرافة جنزير 2019','جرافة جنزير k26/2019','k26/2019']},
    {name:'جرافة جنزير 2022',a:['جرافة جنزير 2022']},
    {name:'باجر جنزير',a:['باجر جنزير','باقر جنزير','باجر جنزير d336','d336']},
    {name:'مدحلة نفايات 2024',a:['مدحلة نفايات 2024','بومك جديد 2024','بومك cat']},
    {name:'قلاب 1770',a:['قلاب 1770']},{name:'قلاب 1772',a:['قلاب 1772']},
    {name:'مدحلة 36 طن',a:['مدحلة 36 طن','بومك 36 طن']},
    {name:'مدحلة 24 طن',a:['مدحلة 24 طن','بومك 24 طن']},
    {name:'تركتر لانديني',a:['تركتر لانديني','تركتور لانديني','لانديني ازرق']},
    {name:'تركتر جندير',a:['تركتر جندير','تركتور جندير']},
    {name:'شاحنة تنك مياه',a:['شاحنة تنك مياه','شاحنة برتقالي 1776','تنك برتقالي']},
    {name:'باجر عجل F428',a:['باجر عجل f428','باقر عجل f428','باجر 428','باقر 428']},
    {name:'بوبكات',a:['بوبكات','بوب كات']},
    {name:'ماكنة رش الضباب',a:['ماكنة رش الضباب','ماكنة رش']},
    {name:'مولد الكهرباء',a:['مولد الكهرباء','ماتور كهرباء']}
  ];

  function canonical(v){const n=norm(v);if(!n)return'';for(const e of equipment){if(e.a.some(a=>{const x=norm(a);return n===x||n.includes(x);} ))return e.name;}return'';}
  function iso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);let m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    return'';
  }
  function onlyDiesel(){return !!$('sourceFile_diesel')?.files?.[0]&&!$('sourceFile_landfill')?.files?.[0]&&!$('sourceFile_stations')?.files?.[0]&&!$('sourceFile_aziz')?.files?.[0]&&!$('sourceFile_cover')?.files?.[0];}

  async function analyzeDiesel(file){
    const msg=$('sourceFilesMessage'),root=$('sourceFilesPreview'),btn=$('analyzeSourceFilesBtn');
    if(btn)btn.disabled=true;if(msg)msg.textContent='جاري قراءة كشف السولار فقط...';
    try{
      if(!window.XLSX)throw new Error('قارئ Excel غير متاح');
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});
      const sname=wb.SheetNames.find(n=>/سولار|ديزل/i.test(norm(n)))||wb.SheetNames[0];
      if(!sname)throw new Error('لا توجد ورقة بيانات داخل الملف');
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sname],{header:1,raw:true,defval:'',blankrows:false});
      let h=-1,dateCol=-1,cols=[];
      for(let r=0;r<Math.min(rows.length,35);r++){
        const row=rows[r]||[];const dc=row.findIndex(v=>/^(التاريخ|تاريخ|date)$/i.test(norm(v)));
        const cc=[];row.forEach((v,i)=>{const name=canonical(v);if(name)cc.push({i,name});});
        if(dc>=0&&cc.length){h=r;dateCol=dc;cols=cc;break;}
      }
      if(h<0)throw new Error('كشف السولار: لم أجد صف التاريخ وأعمدة آليات المكب');
      const daily=new Map();
      for(let r=h+1;r<rows.length;r++){
        const row=rows[r]||[],date=iso(row[dateCol]);if(!date)continue;
        if(!daily.has(date))daily.set(date,{date,total:0,by:{}});const d=daily.get(date);
        for(const c of cols){const liters=num(row[c.i]);if(!liters)continue;d.by[c.name]=(d.by[c.name]||0)+liters;d.total+=liters;}
      }
      const days=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
      if(!days.length)throw new Error('لم يتم العثور على بيانات سولار يومية');
      const used=[...new Set(cols.map(c=>c.name))].sort((a,b)=>equipment.findIndex(e=>e.name===a)-equipment.findIndex(e=>e.name===b));
      const equipmentTotals=Object.fromEntries(used.map(name=>[name,days.reduce((s,d)=>s+num(d.by[name]),0)]));
      const total=days.reduce((s,d)=>s+d.total,0);
      const headerCells=used.map(name=>`<th>${esc(name)}<br><small>(لتر)</small></th>`).join('');
      const bodyRows=days.map(d=>`<tr><td>${esc(d.date)}</td>${used.map(name=>`<td>${fmt(d.by[name]||0)}</td>`).join('')}<td><strong>${fmt(d.total)}</strong></td></tr>`).join('');
      const footerCells=used.map(name=>`<th>${fmt(equipmentTotals[name])}</th>`).join('');
      if(root)root.innerHTML=`<div class="source-import-summary"><div><span>الأيام المقروءة</span><strong>${days.length}</strong></div><div><span>إجمالي سولار الشهر</span><strong>${fmt(total)} لتر</strong></div><div><span>الآليات المقروءة</span><strong>${used.length}</strong></div></div><div class="drive-preview-note"><strong>كشف السولار:</strong> الكمية لكل معدة حسب اليوم، مع مجموع يومي ومجموع نهائي لكل معدة وللشهر.</div><div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th>${headerCells}<th>المجموع اليومي<br><small>(لتر)</small></th></tr></thead><tbody>${bodyRows}</tbody><tfoot><tr><th>المجموع النهائي</th>${footerCells}<th><strong>${fmt(total)}</strong></th></tr></tfoot></table></div>`;
      $('sourceFilesPanel')?.classList.add('source-import-has-preview');
      if(msg)msg.textContent=`اكتمل تحليل كشف السولار: ${days.length} يوم، ${used.length} معدة، الإجمالي ${fmt(total)} لتر.`;
      window.MINYA_DIESEL_ONLY_PREVIEW={days:days.map(d=>({date:d.date,totalDiesel:d.total,diesel:d.by})),equipmentTotals,total};
    }catch(e){console.error(e);if(msg)msg.textContent=e.message||'تعذر تحليل كشف السولار';}
    finally{if(btn)btn.disabled=false;}
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#analyzeSourceFilesBtn');if(!btn||!onlyDiesel())return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    analyzeDiesel($('sourceFile_diesel').files[0]);
  },true);
})();
