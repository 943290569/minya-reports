/* Approve diesel-only preview into existing daily reports without changing other report data. */
(function(){
  const $=id=>document.getElementById(id);
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const STANDARD=[
    'جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'
  ];
  const aliases={
    'جرافة جنزير 2023':['جرافة جنزير 2023'],
    'جرافة جنزير 2019':['جرافة جنزير 2019','جرافة جنزير k26/2019','k26/2019'],
    'جرافة جنزير 2022':['جرافة جنزير 2022'],
    'باجر جنزير':['باجر جنزير','باقر جنزير','d336'],
    'مدحلة نفايات 2024':['مدحلة نفايات 2024','بومك جديد 2024','بومك cat'],
    'قلاب 1770':['قلاب 1770','قالب 1770'],
    'قلاب 1772':['قلاب 1772','قالب 1772'],
    'مدحلة 36 طن':['مدحلة 36 طن','بومك 36 طن'],
    'مدحلة 24 طن':['مدحلة 24 طن','بومك 24 طن'],
    'تركتر لانديني':['تركتر لانديني','تركتور لانديني','تركتر لنديني'],
    'تركتر جندير':['تركتر جندير','تركتور جندير'],
    'شاحنة تنك مياه':['شاحنة تنك مياه','شاحنة برتقالي 1776','تنك برتقالي'],
    'باجر عجل F428':['باجر عجل f428','باقر عجل f428','باجر 428','باقر 428'],
    'بوبكات':['بوبكات','بوب كات'],
    'ماكنة رش الضباب':['ماكنة رش الضباب','ماكنة رش'],
    'مولد الكهرباء':['مولد الكهرباء','ماتور كهرباء']
  };
  function canonical(v){const n=norm(v);for(const name of STANDARD){if((aliases[name]||[name]).some(a=>{const x=norm(a);return n===x||n.includes(x)||x.includes(n);} ))return name;}return'';}
  async function api(url,options={}){
    const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options,headers:{'Accept':'application/json','Content-Type':'application/json',...(options.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);
    return d;
  }
  function existingEquipment(detail){return Array.isArray(detail.equipment)?detail.equipment:[];}
  function reportObject(detail){return detail.report&&typeof detail.report==='object'?detail.report:detail;}
  function buildEquipment(detail,day){
    const old=existingEquipment(detail),used=new Set();
    const rows=STANDARD.map(name=>{
      const match=old.find(x=>canonical(x.equipment_name)===name);
      if(match)used.add(match);
      return {
        equipment_name:name,
        operating_status:match?.operating_status||'يعمل',
        status_description:match?.status_description||'',
        working_hours:num(match?.working_hours),
        diesel_liters:num(day.diesel?.[name]),
        notes:match?.notes||''
      };
    });
    for(const item of old){if(used.has(item))continue;rows.push({...item,diesel_liters:0});}
    return rows;
  }
  function buildPayload(detail,day){
    const r=reportObject(detail),equipment=buildEquipment(detail,day);
    const total=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);
    return {
      report_date:r.report_date,
      weather:r.weather||'',
      temperature:num(r.temperature),
      start_time:r.start_time||'04:00',
      end_time:r.end_time||'19:00',
      total_trucks:num(r.total_trucks),
      total_waste_tons:num(r.total_waste_tons),
      total_diesel:total,
      notes:r.notes||'',
      crews:Array.isArray(detail.crews)?detail.crews:[],
      operations:Array.isArray(detail.operations)?detail.operations:[],
      stations:Array.isArray(detail.stations)?detail.stations:[],
      equipment
    };
  }
  async function approve(){
    const preview=window.MINYA_DIESEL_ONLY_PREVIEW;
    const msg=$('sourceFilesMessage'),btn=$('approveDieselOnlyBtn');
    if(!preview?.days?.length){if(msg)msg.textContent='حلّل كشف السولار أولًا.';return;}
    if(!confirm(`سيتم اعتماد كميات السولار في التقارير الموجودة لعدد ${preview.days.length} يوم. لن يتم تغيير النفايات أو المحطات أو العمليات. متابعة؟`))return;
    btn.disabled=true;
    let done=0,missing=0,failed=0;
    try{
      const list=await api('/api/reports');
      const byDate=new Map((list.reports||[]).map(r=>[r.report_date,r]));
      for(let i=0;i<preview.days.length;i++){
        const day=preview.days[i],base=byDate.get(day.date);
        if(!base){missing++;if(msg)msg.textContent=`اعتماد السولار: ${i+1}/${preview.days.length} — لا يوجد تقرير ${day.date}`;continue;}
        try{
          if(msg)msg.textContent=`جاري اعتماد السولار ${i+1}/${preview.days.length}: ${day.date}`;
          const detail=await api(`/api/reports/${base.id}`);
          const payload=buildPayload(detail,day);
          await api(`/api/reports/${base.id}`,{method:'PUT',body:JSON.stringify(payload)});
          done++;
        }catch(e){console.error('diesel approval',day.date,e);failed++;}
        await new Promise(resolve=>setTimeout(resolve,30));
      }
      if(msg)msg.textContent=`تم اعتماد السولار في ${done} تقرير. ${missing?`لا يوجد تقرير لـ ${missing} يوم. `:''}${failed?`تعذر تحديث ${failed} تقرير.`:'تمت العملية بدون أخطاء.'}`;
      btn.textContent='✓ تم اعتماد السولار';
      setTimeout(()=>{btn.textContent='اعتماد السولار في التقارير';btn.disabled=false;},2500);
    }catch(e){console.error(e);if(msg)msg.textContent=`تعذر اعتماد السولار: ${e.message||e}`;btn.disabled=false;}
  }
  function ensureButton(){
    const preview=window.MINYA_DIESEL_ONLY_PREVIEW,root=$('sourceFilesPreview');
    if(!root||!preview?.days?.length)return;
    let bar=$('dieselOnlyApprovalBar');
    if(!bar){
      bar=document.createElement('div');bar.id='dieselOnlyApprovalBar';bar.className='source-import-toolbar';
      bar.style.cssText='position:sticky;bottom:8px;z-index:20;background:rgba(255,255,255,.96);padding:12px;border:1px solid #d8e4df;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.08);margin:16px 0;';
      const b=document.createElement('button');b.id='approveDieselOnlyBtn';b.type='button';b.className='drive-primary';b.textContent='اعتماد السولار في التقارير';b.addEventListener('click',approve);
      const note=document.createElement('span');note.textContent='يحدّث السولار والمعدات فقط داخل التقارير الموجودة، ولا ينشئ تقارير ناقصة.';note.style.marginInlineStart='10px';
      bar.append(b,note);root.prepend(bar);
    }
  }
  const observer=new MutationObserver(()=>ensureButton());
  function init(){const root=$('sourceFilesPreview');if(root)observer.observe(root,{childList:true,subtree:false});setInterval(ensureButton,800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
