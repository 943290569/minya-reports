/* Automatic month comparison — free/local */
(function(){
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
  const sum=(rows,key)=>rows.reduce((s,r)=>s+Number(r[key]||0),0);
  const monthKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const previousMonth=value=>{const [y,m]=value.split('-').map(Number);const d=new Date(y,m-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const pct=(c,p)=>p?((c-p)/p)*100:null;
  const changeText=(c,p,unit)=>{const pctx=pct(c,p);if(pctx===null)return 'لا توجد بيانات كافية للشهر السابق';if(Math.abs(pctx)<.1)return `مستقر تقريبًا عند ${fmt(c)} ${unit}`;return `${pctx>0?'ارتفاع':'انخفاض'} ${fmt(Math.abs(pctx))}% مقارنة بالشهر السابق`;};
  async function load(){
    const host=document.getElementById('freeSmartInsights');if(!host||document.getElementById('smartMonthCompare'))return;
    const box=document.createElement('div');box.id='smartMonthCompare';box.className='smart-month-compare';box.innerHTML='<strong>مقارنة الشهر السابق</strong><span>جاري الحساب...</span>';host.querySelector('.fsi-summary')?.insertAdjacentElement('afterend',box);
    try{
      const r=await fetch('/api/reports',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error();
      const reports=Array.isArray(d.reports)?d.reports:[],currentKey=monthKey(),prevKey=previousMonth(currentKey),cur=reports.filter(x=>String(x.report_date||'').startsWith(currentKey)),prev=reports.filter(x=>String(x.report_date||'').startsWith(prevKey));
      if(!cur.length){box.innerHTML='<strong>مقارنة الشهر السابق</strong><span>تظهر المقارنة بعد تسجيل بيانات الشهر الحالي.</span>';return;}
      const items=[['total_waste_tons','النفايات','طن'],['total_trucks','الشاحنات','شاحنة'],['total_diesel','السولار','لتر']];
      box.innerHTML=`<div class="smc-head"><strong>مقارنة الشهر السابق</strong><small>${currentKey} مقابل ${prevKey}</small></div><div class="smc-grid">${items.map(([key,label,unit])=>{const c=sum(cur,key),p=sum(prev,key);return `<div><span>${label}</span><strong>${fmt(c)} ${unit}</strong><small>${changeText(c,p,unit)}</small></div>`;}).join('')}</div>`;
    }catch(_){box.innerHTML='<strong>مقارنة الشهر السابق</strong><span>تعذر حساب المقارنة الآن.</span>';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,300),{once:true});else setTimeout(load,300);
})();
