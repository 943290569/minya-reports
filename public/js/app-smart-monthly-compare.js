/* Automatic month comparison — free/local */
(function(){
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
  const sum=(rows,key)=>rows.reduce((s,r)=>s+Number(r[key]||0),0);
  const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const monthKey=()=>todayKey().slice(0,7);
  const previousMonth=value=>{const [y,m]=value.split('-').map(Number);const d=new Date(Date.UTC(y,m-2,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;};
  const pct=(c,p)=>p?((c-p)/p)*100:null;
  const changeText=(c,p,unit)=>{const pctx=pct(c,p);if(pctx===null)return 'لا توجد بيانات كافية للفترة المقابلة';if(Math.abs(pctx)<.05)return `مستقر تقريبًا عند ${fmt(c)} ${unit}`;return `${pctx>0?'ارتفاع':'انخفاض'} ${fmt(Math.abs(pctx))}% مقارنة بالفترة المقابلة`;};
  async function load(){
    const host=document.getElementById('freeSmartInsights');if(!host||document.getElementById('smartMonthCompare'))return;
    const box=document.createElement('div');box.id='smartMonthCompare';box.className='smart-month-compare';box.innerHTML='<strong>مقارنة الشهر السابق</strong><span>جاري الحساب...</span>';host.querySelector('.fsi-summary')?.insertAdjacentElement('afterend',box);
    try{
      const r=await fetch('/api/reports',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error();
      const reports=Array.isArray(d.reports)?d.reports:[],today=todayKey(),currentKey=today.slice(0,7),prevKey=previousMonth(currentKey),elapsedDay=Number(today.slice(8,10));
      const cur=reports.filter(x=>String(x.report_date||'').startsWith(currentKey));
      const prev=reports.filter(x=>{const date=String(x.report_date||'');return date.startsWith(prevKey)&&Number(date.slice(8,10))<=elapsedDay;});
      if(!cur.length){box.innerHTML='<strong>مقارنة الشهر السابق</strong><span>تظهر المقارنة بعد تسجيل بيانات الشهر الحالي.</span>';return;}
      const items=[['total_waste_tons','النفايات','طن'],['total_trucks','الشاحنات','شاحنة'],['total_diesel','السولار','لتر']];
      box.innerHTML=`<div class="smc-head"><strong>مقارنة الشهر السابق</strong><small>${currentKey} حتى يوم ${elapsedDay} مقابل ${prevKey} لنفس المدة</small></div><div class="smc-grid">${items.map(([key,label,unit])=>{const c=sum(cur,key),p=sum(prev,key);return `<div><span>${label}</span><strong>${fmt(c)} ${unit}</strong><small>${changeText(c,p,unit)}</small></div>`;}).join('')}</div>`;
    }catch(_){box.innerHTML='<strong>مقارنة الشهر السابق</strong><span>تعذر حساب المقارنة الآن.</span>';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,300),{once:true});else setTimeout(load,300);
})();
