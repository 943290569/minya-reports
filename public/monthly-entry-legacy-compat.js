(()=>{
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const fmt=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:2});
  let archiveReports=[];

  function monthKey(){
    const y=document.getElementById('yearSelect')?.value||'';
    const m=String(document.getElementById('monthSelect')?.value||'').padStart(2,'0');
    return `${y}-${m}`;
  }
  async function json(url){
    const r=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
    if(r.status===401){location.href='/login.html';throw new Error('يجب تسجيل الدخول');}
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);
    return d;
  }
  function monthlyArchiveTotals(){
    const month=monthKey();
    const list=archiveReports.filter(r=>String(r.report_date||'').startsWith(month+'-'));
    return list.reduce((a,r)=>{
      a.days++;
      a.trucks+=num(r.total_trucks);
      a.waste+=num(r.total_waste_tons);
      a.diesel+=num(r.total_diesel);
      return a;
    },{days:0,trucks:0,waste:0,diesel:0});
  }
  function setSummaryValue(label,value){
    const root=document.getElementById('summary');if(!root)return;
    const span=[...root.querySelectorAll('span')].find(x=>String(x.textContent||'').includes(label));
    const strong=span?.querySelector('strong');if(strong)strong.textContent=fmt(value);
  }
  function patchSummary(){
    const totals=monthlyArchiveTotals();if(!totals.days)return;
    setSummaryValue('الشاحنات',totals.trucks);
    setSummaryValue('نفايات المكب',totals.waste);
    setSummaryValue('السولار',totals.diesel);
  }
  async function recover(){
    try{
      const d=await json('/api/reports');
      archiveReports=Array.isArray(d.reports)?d.reports:[];
      patchSummary();
      setTimeout(patchSummary,150);
      setTimeout(patchSummary,600);
    }catch(e){console.warn('monthly archive totals compatibility',e);}
  }
  function hook(){
    const btn=document.getElementById('loadBtn');if(!btn||btn.dataset.archiveTotalsHooked)return;
    btn.dataset.archiveTotalsHooked='1';
    btn.addEventListener('click',()=>setTimeout(recover,500));
    setTimeout(recover,1000);
    const summary=document.getElementById('summary');
    if(summary)new MutationObserver(()=>queueMicrotask(patchSummary)).observe(summary,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
