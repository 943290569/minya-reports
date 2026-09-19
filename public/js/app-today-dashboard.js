/* Today operations dashboard */
(function(){
  function isHome(){const p=location.pathname.replace(/\/+$/,"")||"/";return p==="/";}
  function fmt(v){return Number(v||0).toLocaleString("en-US",{maximumFractionDigits:1});}
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function ensure(){
    const home=document.querySelector('.dashboard-home');
    if(!home||document.getElementById('todayOperationsSection'))return null;
    const section=document.createElement('section');
    section.id='todayOperationsSection';
    section.className='today-operations';
    section.innerHTML=`<div class="today-operations-head"><div><span>TODAY</span><h3>حالة التشغيل اليوم</h3><p id="todayOperationsDate">-</p></div><a href="/report">فتح تقرير اليوم</a></div><div class="today-operations-grid"><div><span>النفايات</span><strong id="todayWaste">—</strong><small>طن</small></div><div><span>الشاحنات</span><strong id="todayTrucks">—</strong></div><div><span>السولار</span><strong id="todayDiesel">—</strong><small>لتر</small></div><div><span>المعدات المتوقفة</span><strong id="todayStopped">—</strong></div><div><span>حالة التقرير</span><strong id="todayReportState">غير محفوظ</strong></div></div><div id="todayComparisons" class="today-comparisons"></div><div id="todayStoppedList" class="today-stopped-list"></div>`;
    const executive=document.getElementById('executiveDashboardSection');
    if(executive) home.insertBefore(section,executive); else home.prepend(section);
    return section;
  }
  async function load(){
    if(!isHome())return;const shell=ensure();if(!shell)return;
    const today=todayIso();document.getElementById('todayOperationsDate').textContent=today;
    try{
      const r=await fetch('/api/reports',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.message||'load failed');
      const reports=Array.isArray(d.reports)?d.reports:[];const row=reports.find(x=>String(x.report_date||'')===today);
      const reportMap=new Map(reports.map(x=>[String(x.report_date||''),x]));
      const pct=(current,previous)=>{const a=Number(current||0),b=Number(previous||0);if(!b)return null;return ((a-b)/b)*100;};
      const pctText=value=>value==null?'—':`${value>=0?'+':''}${value.toFixed(1)}%`;
      const sum=(items,key)=>items.reduce((s,x)=>s+Number(x[key]||0),0);
      const comparison=document.getElementById('todayComparisons');
      const todayDate=new Date(`${today}T00:00:00Z`),yesterday=new Date(todayDate.getTime()-86400000).toISOString().slice(0,10),yRow=reportMap.get(yesterday);
      const [year,month,day]=today.split('-').map(Number);
      const prevMonthDate=new Date(Date.UTC(year,month-2,1)),prevMonthKey=`${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth()+1).padStart(2,'0')}`;
      const currentMonthKey=today.slice(0,7),currentMonth=reports.filter(x=>String(x.report_date||'').startsWith(currentMonthKey)&&Number(String(x.report_date).slice(8,10))<=day);
      const pairedMonth=currentMonth.map(x=>({a:x,b:reportMap.get(`${prevMonthKey}-${String(x.report_date).slice(8,10)}`)})).filter(x=>x.b);
      const pairedYear=reports.filter(x=>String(x.report_date||'').startsWith(`${year}-`)&&String(x.report_date)<=today).map(x=>({a:x,b:reportMap.get(`${year-1}${String(x.report_date).slice(4)}`)})).filter(x=>x.b);
      const monthWaste=pct(sum(pairedMonth.map(x=>x.a),'total_waste_tons'),sum(pairedMonth.map(x=>x.b),'total_waste_tons'));
      const yearWaste=pct(sum(pairedYear.map(x=>x.a),'total_waste_tons'),sum(pairedYear.map(x=>x.b),'total_waste_tons'));
      comparison.innerHTML=`
        <div><span>اليوم مقابل أمس</span><strong>${yRow?pctText(pct(row?.total_waste_tons,yRow.total_waste_tons)):'لا توجد بيانات أمس'}</strong><small>النفايات${yRow?' · يوم مقابل يوم':''}</small></div>
        <div><span>الشهر مقابل السابق</span><strong>${pctText(monthWaste)}</strong><small>النفايات · ${pairedMonth.length} يومًا متقابلًا</small></div>
        <div><span>السنة مقابل السابقة</span><strong>${pctText(yearWaste)}</strong><small>النفايات · ${pairedYear.length} يومًا متقابلًا</small></div>
      `;
      if(!row){shell.dataset.state='missing';document.getElementById('todayReportState').textContent='غير مسجّل';return;}
      document.getElementById('todayWaste').textContent=fmt(row.total_waste_tons);
      document.getElementById('todayTrucks').textContent=fmt(row.total_trucks);
      document.getElementById('todayDiesel').textContent=fmt(row.total_diesel);
      document.getElementById('todayReportState').textContent='محفوظ';shell.dataset.state='ok';
      if(!row.id)return;
      const rr=await fetch(`/api/reports/${row.id}`,{cache:'no-store'}),dd=await rr.json();if(!rr.ok)return;
      const report=dd.report||dd;const eq=Array.isArray(report.equipment)?report.equipment:Array.isArray(dd.equipment)?dd.equipment:[];
      const stopped=eq.filter(x=>{const s=String(x.operating_status||x.status||'').trim();return s&&!["يعمل","شغال","متاح"].includes(s);});
      document.getElementById('todayStopped').textContent=stopped.length;
      const list=document.getElementById('todayStoppedList');
      if(stopped.length){list.innerHTML=`<strong>معدات تحتاج متابعة</strong><div>${stopped.map(x=>`<span>${esc(x.equipment_name||x.name||'معدة')} — ${esc(x.operating_status||x.status||'')}</span>`).join('')}</div>`;}
      else list.innerHTML='<span>لا توجد معدات متوقفة في تقرير اليوم.</span>';
    }catch(e){shell.dataset.state='error';document.getElementById('todayReportState').textContent='تعذر التحميل';console.error('Today dashboard failed',e);}
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,180));
  window.addEventListener('minya-notifications-updated',()=>{const shell=document.getElementById('todayOperationsSection');if(shell&&!shell.dataset.refreshed){shell.dataset.refreshed='1';setTimeout(load,80);}});
})();
