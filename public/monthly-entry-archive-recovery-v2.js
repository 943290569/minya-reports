(()=>{
  const $=s=>document.querySelector(s);
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const norm=v=>String(v||'').replace(/[\s()ـ_\-]+/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const fmt=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:2});
  const monthKey=()=>`${$('#yearSelect')?.value||''}-${String($('#monthSelect')?.value||'').padStart(2,'0')}`;
  const esc=v=>String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');

  async function api(url){
    const r=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
    if(r.status===401){location.href='/login.html';throw new Error('يجب تسجيل الدخول');}
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);
    return d;
  }
  function rowEl(date){return document.querySelector(`#rowsBody tr[data-date="${date}"]`)}
  function inputFor(tr,key){return tr?.querySelector(`input[data-key="${esc(key)}"],select[data-key="${esc(key)}"]`)}
  function fill(tr,key,value){
    const el=inputFor(tr,key),next=num(value);if(!el||next===0||num(el.value)!==0)return false;
    el.value=String(next);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }
  function operationMatches(list,kind){
    return (list||[]).filter(x=>{const n=norm(x.operation_name);
      if(kind==='landfill')return (n.includes('مكب')&&n.includes('منيا'))||(n.includes('نفايات')&&!n.includes('ترحيل')&&!n.includes('محطه')&&!n.includes('فرز'));
      if(kind==='leachate')return n.includes('عصار');
      if(kind==='external')return (n.includes('طمم')||n.includes('ردم'))&&n.includes('خارجي');
      if(kind==='internal')return (n.includes('طمم')||n.includes('ردم'))&&!n.includes('خارجي');
      if(kind==='slope')return n.includes('اسلوب')||n.includes('سلوب');
      if(kind==='sorting')return n.includes('فرز');
      if(kind==='water')return n.includes('مياه')&&!n.includes('رش');
      if(kind==='spray')return n.includes('رش')&&n.includes('مياه');
      return false;
    });
  }
  function bestOp(list,kind){const a=operationMatches(list,kind);if(!a.length)return{};return a.reduce((p,x)=>(num(x.quantity)+num(x.vehicle_count) > num(p.quantity)+num(p.vehicle_count))?x:p,a[0]);}
  function groupStations(list){
    const groups=new Map();
    for(const x of list||[]){const k=norm(x.station_name)||`row-${groups.size}`;const prev=groups.get(k);if(!prev||num(x.waste_tons)+num(x.truck_count)>num(prev.waste_tons)+num(prev.truck_count))groups.set(k,x);}
    return [...groups.values()];
  }
  function station(list,kind){return groupStations(list).find(x=>{const n=norm(x.station_name);if(kind==='hebron')return n.includes('خليل');if(kind==='tarqumia')return n.includes('ترقوميا');if(kind==='yatta')return n.includes('يطا')||n.includes('عزيز');return false;})||{};}
  function equipmentMatch(list,name){
    const target=norm(name),exact=(list||[]).find(x=>norm(x.equipment_name)===target);if(exact)return exact;
    const year=(target.match(/20\d{2}/)||[])[0]||'',tokens=target.replace(/20\d{2}/g,'').match(/[\u0600-\u06ffa-z0-9]+/g)||[];
    return (list||[]).find(x=>{const n=norm(x.equipment_name);if(year&&!n.includes(year))return false;return tokens.filter(t=>t.length>=3).every(t=>n.includes(t));})||{};
  }
  const EQUIPMENT=['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء'];

  function applyDetail(full){
    const r=full.report||{},date=r.report_date,tr=rowEl(date);if(!tr)return {landfill:0,trucks:0,diesel:0};
    const ops=full.operations||[],sts=full.stations||[],eqs=full.equipment||[];
    const landfill=bestOp(ops,'landfill'),hb=station(sts,'hebron'),tq=station(sts,'tarqumia'),yt=station(sts,'yatta');
    const groupedStations=groupStations(sts),stationWaste=groupedStations.reduce((s,x)=>s+num(x.waste_tons),0),stationTrucks=groupedStations.reduce((s,x)=>s+num(x.truck_count),0);
    let landfillQty=num(landfill.quantity),landfillTrucks=num(landfill.vehicle_count);
    if(!landfillQty&&num(r.total_waste_tons)>stationWaste)landfillQty=Math.max(0,num(r.total_waste_tons)-stationWaste);
    if(!landfillTrucks&&num(r.total_trucks)>stationTrucks)landfillTrucks=Math.max(0,num(r.total_trucks)-stationTrucks);
    fill(tr,'op|مكب نفايات المنيا|quantity',landfillQty);fill(tr,'op|مكب نفايات المنيا|vehicle_count',landfillTrucks);
    fill(tr,'st|محطة ترحيل الخليل|truck_count',hb.truck_count);fill(tr,'st|محطة ترحيل الخليل|waste_tons',hb.waste_tons);
    fill(tr,'st|محطة ترحيل ترقوميا|truck_count',tq.truck_count);fill(tr,'st|محطة ترحيل ترقوميا|waste_tons',tq.waste_tons);
    fill(tr,'st|محطة ترحيل يطا|truck_count',yt.truck_count);fill(tr,'st|محطة ترحيل يطا|waste_tons',yt.waste_tons);
    const defs=[['leachate','كميات العصارة المرحلة'],['external','طمم خارجي'],['internal','مواد التغطية (طمم)'],['slope','مواد التغطية (اسلوب)'],['sorting','خط الفرز'],['water','كميات المياه للتعقيم والترطيب'],['spray','عدد مرات رش المياه']];
    for(const [kind,name] of defs){const x=bestOp(ops,kind);fill(tr,`op|${name}|vehicle_count`,x.vehicle_count);fill(tr,`op|${name}|quantity`,x.quantity);}
    for(const name of EQUIPMENT){const x=equipmentMatch(eqs,name);fill(tr,`eq|${name}|working_hours`,x.working_hours);fill(tr,`eq|${name}|diesel_liters`,x.diesel_liters);}
    const detailDiesel=(eqs||[]).reduce((s,x)=>s+num(x.diesel_liters),0),diesel=num(r.total_diesel)>0?num(r.total_diesel):detailDiesel;
    const trucks=num(r.total_trucks)>0?num(r.total_trucks):landfillTrucks+stationTrucks;
    return {landfill:landfillQty,trucks,diesel};
  }
  function setSummary(label,value){const root=$('#summary');if(!root)return;const span=[...root.querySelectorAll('span')].find(x=>String(x.textContent||'').includes(label));const strong=span?.querySelector('strong');if(strong)strong.textContent=fmt(value);}
  async function recover(){
    const month=monthKey();if(!/^\d{4}-\d{2}$/.test(month))return;
    const status=$('#status');try{
      const list=await api('/api/reports');const reports=(list.reports||[]).filter(r=>String(r.report_date||'').startsWith(month+'-'));
      const details=[];for(let i=0;i<reports.length;i+=6){details.push(...await Promise.all(reports.slice(i,i+6).map(r=>api(`/api/reports/${r.id}`))));}
      let landfill=0,trucks=0,diesel=0;for(const d of details){const t=applyDetail(d);landfill+=t.landfill;trucks+=t.trucks;diesel+=t.diesel;}
      setSummary('الشاحنات',trucks);setSummary('نفايات المكب',landfill);setSummary('السولار',diesel);
      if(status)status.textContent=`تم تحميل البيانات الأصلية لـ ${details.length} تقرير`;
    }catch(e){if(status)status.textContent=`تعذر استرجاع التفاصيل الأصلية: ${e.message}`;}
  }
  function hook(){const btn=$('#loadBtn');if(!btn||btn.dataset.archiveRecoveryV2)return;btn.dataset.archiveRecoveryV2='1';btn.addEventListener('click',()=>setTimeout(recover,500));setTimeout(recover,900);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
