(()=>{
  const $=s=>document.querySelector(s);
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const norm=v=>String(v||'').replace(/[\s()ـ_\-]+/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const fmt=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:2});
  const canonicalLandfill=norm('مكب نفايات المنيا');
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
  function forceFill(tr,key,value){
    const el=inputFor(tr,key),next=num(value);if(!el||next<=0)return false;
    if(num(el.value)===next)return true;
    el.value=String(next);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function isLegacyWaste(x){
    const n=norm(x?.operation_name);
    if(!n||n===canonicalLandfill)return false;
    return (n.includes('مكب')&&n.includes('منيا')) ||
      (n.includes('نفايات')&&!n.includes('ترحيل')&&!n.includes('محطه')&&!n.includes('فرز'));
  }
  function legacyWasteTotals(ops){
    const rows=(ops||[]).filter(isLegacyWaste);
    return {
      legacyWasteTons:rows.reduce((s,x)=>s+num(x.quantity),0),
      legacyWasteTrucks:rows.reduce((s,x)=>s+num(x.vehicle_count),0)
    };
  }
  function canonicalWasteTotals(ops){
    const rows=(ops||[]).filter(x=>norm(x?.operation_name)===canonicalLandfill);
    return {
      tons:rows.reduce((s,x)=>s+num(x.quantity),0),
      trucks:rows.reduce((s,x)=>s+num(x.vehicle_count),0)
    };
  }
  function stationRows(stations){
    const map=new Map();
    for(const x of stations||[]){
      const k=norm(x.station_name)||`row-${map.size}`;
      const p=map.get(k);
      if(!p||num(x.waste_tons)+num(x.truck_count)>num(p.waste_tons)+num(p.truck_count))map.set(k,x);
    }
    return [...map.values()];
  }
  function equipmentDiesel(rows){
    const map=new Map();
    for(const x of rows||[]){
      const k=norm(x.equipment_name)||`row-${map.size}`;
      const p=map.get(k);
      if(!p||num(x.diesel_liters)>num(p.diesel_liters))map.set(k,x);
    }
    return [...map.values()].reduce((s,x)=>s+num(x.diesel_liters),0);
  }
  function setSummary(label,value){
    const root=$('#summary');if(!root)return;
    const span=[...root.querySelectorAll('span')].find(x=>String(x.textContent||'').includes(label));
    const strong=span?.querySelector('strong');if(strong)strong.textContent=fmt(value);
  }
  function apply(full){
    const r=full.report||{},date=r.report_date,tr=rowEl(date);
    const ops=full.operations||[],sts=stationRows(full.stations||[]),eqs=full.equipment||[];
    const canonical=canonicalWasteTotals(ops);
    const {legacyWasteTons,legacyWasteTrucks}=legacyWasteTotals(ops);
    const stationWaste=sts.reduce((s,x)=>s+num(x.waste_tons),0);
    const stationTrucks=sts.reduce((s,x)=>s+num(x.truck_count),0);
    const storedLandfillWaste=Math.max(0,num(r.total_waste_tons)-stationWaste);
    const storedLandfillTrucks=Math.max(0,num(r.total_trucks)-stationTrucks);
    const landfillTons=canonical.tons>0?canonical.tons:(legacyWasteTons>0?legacyWasteTons:storedLandfillWaste);
    const landfillTrucks=canonical.trucks>0?canonical.trucks:(legacyWasteTrucks>0?legacyWasteTrucks:storedLandfillTrucks);
    if(tr){
      forceFill(tr,'op|مكب نفايات المنيا|quantity',landfillTons);
      forceFill(tr,'op|مكب نفايات المنيا|vehicle_count',landfillTrucks);
    }
    const diesel=num(r.total_diesel)>0?num(r.total_diesel):equipmentDiesel(eqs);
    const trucks=num(r.total_trucks)>0?num(r.total_trucks):landfillTrucks+stationTrucks;
    return {landfill:landfillTons,trucks,diesel,legacyWasteTons,legacyWasteTrucks};
  }
  async function recover(){
    const month=monthKey();if(!/^\d{4}-\d{2}$/.test(month))return;
    const status=$('#status');
    try{
      const list=await api('/api/reports');
      const reports=(list.reports||[]).filter(r=>String(r.report_date||'').startsWith(month+'-'));
      const details=[];
      for(let i=0;i<reports.length;i+=8){
        details.push(...await Promise.all(reports.slice(i,i+8).map(r=>api(`/api/reports/${r.id}`))));
      }
      const totals=details.reduce((a,d)=>{const t=apply(d);a.landfill+=t.landfill;a.trucks+=t.trucks;a.diesel+=t.diesel;a.legacy+=t.legacyWasteTons;return a;},{landfill:0,trucks:0,diesel:0,legacy:0});
      setSummary('الشاحنات',totals.trucks);
      setSummary('نفايات المكب',totals.landfill);
      setSummary('السولار',totals.diesel);
      if(status)status.textContent=`تم استرجاع ${details.length} تقريرًا · كميات قديمة: ${fmt(totals.legacy)} طن`;
    }catch(e){if(status)status.textContent=`تعذر استرجاع بيانات الشهر: ${e.message}`;}
  }
  function hook(){
    const btn=$('#loadBtn');if(!btn||btn.dataset.legacySumFix)return;
    btn.dataset.legacySumFix='1';
    btn.addEventListener('click',()=>setTimeout(recover,1100));
    setTimeout(recover,1600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
