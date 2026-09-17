(()=>{
  const originalFetch=window.fetch.bind(window);
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const fmt=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:2});
  const norm=v=>String(v||'').replace(/[\s()ـ_-]+/g,'').replace(/أ|إ|آ/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const isMonthlyGet=(input,init)=>{
    const method=String(init?.method||'GET').toUpperCase();
    const url=typeof input==='string'?input:String(input?.url||'');
    return method==='GET'&&url.includes('/api/monthly-entry')&&url.includes('month=');
  };
  const stationWaste=data=>(Array.isArray(data?.stations)?data.stations:[]).reduce((s,x)=>s+num(x.waste_tons),0);
  const stationTrucks=data=>(Array.isArray(data?.stations)?data.stations:[]).reduce((s,x)=>s+num(x.truck_count),0);
  const landfillOp=data=>(Array.isArray(data?.operations)?data.operations:[]).find(x=>{
    const n=norm(x.operation_name);return n==='مكبنفاياتالمنيا'||((n.includes('مكب')&&n.includes('المنيا'))||(n.includes('نفايات')&&!n.includes('ترحيل')&&!n.includes('محطه')));
  })||{};
  const opBy=data=>name=>(Array.isArray(data?.operations)?data.operations:[]).find(x=>norm(x.operation_name)===norm(name))||{};
  const detailDiesel=data=>(Array.isArray(data?.equipment)?data.equipment:[]).reduce((s,x)=>s+num(x.diesel_liters),0);

  function patchSummary(payload){
    const rows=(Array.isArray(payload?.rows)?payload.rows:[]).filter(x=>x&&x.source!=='new');
    const summary=document.querySelector('#summary');
    if(!summary)return;
    let landfill=0,trucks=0,diesel=0;
    for(const row of rows){
      const d=row.data||{};
      const sw=stationWaste(d),st=stationTrucks(d),lf=landfillOp(d);
      const directWaste=num(lf.quantity)||Math.max(0,num(d.stored_totals?.waste||d.summary_totals?.waste)-sw);
      const directTrucks=num(lf.vehicle_count)||Math.max(0,num(d.stored_totals?.trucks||d.summary_totals?.trucks)-st);
      landfill+=directWaste;
      trucks+=directTrucks+st;
      diesel+=detailDiesel(d)||num(d.stored_totals?.diesel||d.summary_totals?.diesel);
    }
    const spans=[...summary.querySelectorAll('span')];
    const put=(prefix,value,suffix='')=>{const s=spans.find(x=>x.textContent.trim().startsWith(prefix));if(s)s.innerHTML=`${prefix} <strong>${value}</strong>${suffix}`};
    put('أيام مفعّلة:',fmt(rows.length));
    put('الشاحنات:',fmt(trucks));
    put('نفايات المكب:',fmt(landfill),' طن');
    put('السولار:',fmt(diesel),' لتر');
  }

  window.fetch=async function(input,init){
    const res=await originalFetch(input,init);
    if(!isMonthlyGet(input,init)||!res.ok)return res;
    try{
      const payload=await res.clone().json();
      if(!Array.isArray(payload?.rows))return res;
      window.__MINYA_MONTHLY_ENTRY_RESPONSE__=payload;
      const filtered={...payload,rows:payload.rows.filter(x=>x&&x.source!=='new')};
      setTimeout(()=>patchSummary(payload),0);
      setTimeout(()=>patchSummary(payload),350);
      setTimeout(()=>patchSummary(payload),900);
      return new Response(JSON.stringify(filtered),{status:res.status,statusText:res.statusText,headers:new Headers(res.headers)});
    }catch{return res;}
  };

  document.addEventListener('input',e=>{if(e.target?.closest?.('#rowsBody'))setTimeout(()=>{const p=window.__MINYA_MONTHLY_ENTRY_RESPONSE__;if(p)patchSummary(p)},0)});
})();
