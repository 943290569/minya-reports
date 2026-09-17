(()=>{
  const norm=v=>String(v||'').replace(/[\s()ـ_\-]+/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const esc=v=>String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  const EQUIPMENT=['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'];
  let cachedRows=[];

  function monthKey(){
    const y=document.getElementById('yearSelect')?.value||'';
    const m=String(document.getElementById('monthSelect')?.value||'').padStart(2,'0');
    return `${y}-${m}`;
  }
  function opMatch(list,kind){
    return (list||[]).find(x=>{
      const n=norm(x.operation_name);
      if(kind==='landfill')return (n.includes('مكب')&&n.includes('المنيا'))||(n.includes('نفايات')&&!n.includes('ترحيل')&&!n.includes('محطه'));
      if(kind==='leachate')return n.includes('عصار');
      if(kind==='external')return n.includes('طمم')&&n.includes('خارجي');
      if(kind==='internal')return n.includes('طمم')&&!n.includes('خارجي');
      if(kind==='slope')return n.includes('اسلوب')||n.includes('سلوب');
      if(kind==='sorting')return n.includes('فرز');
      if(kind==='water')return n.includes('مياه')&&!n.includes('رش');
      if(kind==='spray')return n.includes('رش')&&n.includes('مياه');
      return false;
    })||{};
  }
  function stationMatch(list,kind){
    return (list||[]).find(x=>{
      const n=norm(x.station_name);
      if(kind==='hebron')return n.includes('خليل');
      if(kind==='tarqumia')return n.includes('ترقوميا');
      if(kind==='yatta')return n.includes('يطا')||n.includes('عزيز');
      return false;
    })||{};
  }
  function equipmentMatch(list,canonical){
    const target=norm(canonical);
    const exact=(list||[]).find(x=>norm(x.equipment_name)===target);
    if(exact)return exact;
    const year=(target.match(/20\d{2}/)||[])[0]||'';
    const words=target.replace(/20\d{2}/g,'').match(/[\u0600-\u06ff]+/g)||[];
    return (list||[]).find(x=>{
      const n=norm(x.equipment_name);
      if(year&&!n.includes(year))return false;
      return words.filter(w=>w.length>=3).every(w=>n.includes(w));
    })||{};
  }
  function rowEl(date){return document.querySelector(`#rowsBody tr[data-date="${date}"]`)}
  function inputFor(tr,key){return tr?.querySelector(`input[data-key="${esc(key)}"],select[data-key="${esc(key)}"]`)}
  function fill(tr,key,value,force=false){
    const el=inputFor(tr,key);if(!el)return false;
    const old=num(el.value),next=num(value);
    if(!force&&old!==0)return false;
    if(next===0)return false;
    el.value=String(next);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function setText(tr,key,value){
    const el=inputFor(tr,key);if(!el||!value)return false;
    if(String(el.value||'').trim())return false;
    el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function applyRow(item){
    const data=item?.data||{},date=item?.report_date||data.report_date;if(!date)return;
    const tr=rowEl(date);if(!tr)return;
    const ops=Array.isArray(data.operations)?data.operations:[];
    const sts=Array.isArray(data.stations)?data.stations:[];
    const eqs=Array.isArray(data.equipment)?data.equipment:[];
    const landfill=opMatch(ops,'landfill');
    const hb=stationMatch(sts,'hebron'),tq=stationMatch(sts,'tarqumia'),yt=stationMatch(sts,'yatta');
    const stationWaste=num(hb.waste_tons)+num(tq.waste_tons)+num(yt.waste_tons);
    const stationTrucks=num(hb.truck_count)+num(tq.truck_count)+num(yt.truck_count);
    let landfillQty=num(landfill.quantity),landfillTrucks=num(landfill.vehicle_count);
    const stored=data.stored_totals||{};
    if(!landfillQty&&num(stored.waste))landfillQty=Math.max(0,num(stored.waste)-stationWaste);
    if(!landfillTrucks&&num(stored.trucks))landfillTrucks=Math.max(0,num(stored.trucks)-stationTrucks);
    fill(tr,'op|مكب نفايات المنيا|quantity',landfillQty);
    fill(tr,'op|مكب نفايات المنيا|vehicle_count',landfillTrucks);
    fill(tr,'st|محطة ترحيل الخليل|truck_count',hb.truck_count);fill(tr,'st|محطة ترحيل الخليل|waste_tons',hb.waste_tons);
    fill(tr,'st|محطة ترحيل ترقوميا|truck_count',tq.truck_count);fill(tr,'st|محطة ترحيل ترقوميا|waste_tons',tq.waste_tons);
    fill(tr,'st|محطة ترحيل يطا|truck_count',yt.truck_count);fill(tr,'st|محطة ترحيل يطا|waste_tons',yt.waste_tons);
    const opDefs=[
      ['leachate','كميات العصارة المرحلة'],['external','طمم خارجي'],['internal','مواد التغطية (طمم)'],['slope','مواد التغطية (اسلوب)'],['sorting','خط الفرز'],['water','كميات المياه للتعقيم والترطيب'],['spray','عدد مرات رش المياه']
    ];
    opDefs.forEach(([kind,name])=>{const x=opMatch(ops,kind);fill(tr,`op|${name}|vehicle_count`,x.vehicle_count);fill(tr,`op|${name}|quantity`,x.quantity);});
    EQUIPMENT.forEach(name=>{
      const x=equipmentMatch(eqs,name);if(!x||!x.equipment_name)return;
      fill(tr,`eq|${name}|working_hours`,x.working_hours);
      fill(tr,`eq|${name}|diesel_liters`,x.diesel_liters);
      setText(tr,`eq|${name}|status_description`,x.status_description);
    });
  }
  function patchSummary(){
    const s=document.getElementById('summary');if(!s||!cachedRows.length)return;
    let detailDiesel=0,storedDiesel=0;
    cachedRows.forEach(item=>{
      const d=item?.data||{};
      detailDiesel+=(d.equipment||[]).reduce((a,x)=>a+num(x.diesel_liters),0);
      storedDiesel+=num(d.stored_totals?.diesel);
    });
    if(detailDiesel>0||storedDiesel<=0)return;
    const spans=[...s.querySelectorAll('span')];
    const dieselSpan=spans.find(x=>String(x.textContent||'').includes('السولار'));
    const strong=dieselSpan?.querySelector('strong');if(strong)strong.textContent=storedDiesel.toLocaleString('en-US',{maximumFractionDigits:2});
  }
  async function recover(){
    const month=monthKey();if(!/^\d{4}-\d{2}$/.test(month))return;
    try{
      const r=await fetch(`/api/monthly-entry?month=${encodeURIComponent(month)}&compat=1`,{cache:'no-store',credentials:'same-origin'});
      if(!r.ok)return;const d=await r.json();cachedRows=Array.isArray(d.rows)?d.rows:[];
      cachedRows.forEach(applyRow);
      setTimeout(patchSummary,80);
    }catch(e){console.warn('monthly legacy compatibility',e);}
  }
  function hook(){
    const btn=document.getElementById('loadBtn');if(!btn||btn.dataset.legacyCompat)return;
    btn.dataset.legacyCompat='1';btn.addEventListener('click',()=>setTimeout(recover,450));
    setTimeout(recover,900);
    const summary=document.getElementById('summary');if(summary)new MutationObserver(()=>setTimeout(patchSummary,0)).observe(summary,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
