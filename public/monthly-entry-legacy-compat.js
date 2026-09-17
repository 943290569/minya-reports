(()=>{
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const fmt=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:2});

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
  function setSummaryValue(label,value){
    const root=document.getElementById('summary');if(!root)return;
    const span=[...root.querySelectorAll('span')].find(x=>String(x.textContent||'').includes(label));
    const strong=span?.querySelector('strong');if(!strong)return;
    const next=fmt(value);
    if(String(strong.textContent||'').trim()!==next)strong.textContent=next;
  }
  function patchSummary(totals){
    if(!totals)return;
    setSummaryValue('الشاحنات',totals.trucks);
    setSummaryValue('نفايات المكب',totals.waste);
    setSummaryValue('السولار',totals.diesel);
  }
  async function recover(){
    const month=monthKey();if(!/^\d{4}-\d{2}$/.test(month))return;
    try{
      const d=await json(`/api/monthly-entry?month=${encodeURIComponent(month)}`);
      const totals=d.monthly_totals||null;
      if(!totals)return;
      patchSummary(totals);
      setTimeout(()=>patchSummary(totals),120);
      setTimeout(()=>patchSummary(totals),500);
    }catch(e){console.warn('monthly totals compatibility',e);}
  }
  function hook(){
    const btn=document.getElementById('loadBtn');if(!btn||btn.dataset.monthlyTotalsHooked)return;
    btn.dataset.monthlyTotalsHooked='1';
    btn.addEventListener('click',()=>setTimeout(recover,500));
    setTimeout(recover,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
