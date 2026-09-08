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
    section.innerHTML=`<div class="today-operations-head"><div><span>TODAY</span><h3>حالة التشغيل اليوم</h3><p id="todayOperationsDate">-</p></div><a href="/report">فتح تقرير اليوم</a></div><div class="today-operations-grid"><div><span>النفايات</span><strong id="todayWaste">0</strong><small>طن</small></div><div><span>الشاحنات</span><strong id="todayTrucks">0</strong></div><div><span>السولار</span><strong id="todayDiesel">0</strong><small>لتر</small></div><div><span>المعدات المتوقفة</span><strong id="todayStopped">0</strong></div><div><span>حالة التقرير</span><strong id="todayReportState">غير محفوظ</strong></div></div><div id="todayStoppedList" class="today-stopped-list"></div>`;
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
      if(!row){shell.dataset.state='missing';return;}
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
    }catch(e){shell.dataset.state='error';console.error('Today dashboard failed',e);}
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,180));
  window.addEventListener('minya-notifications-updated',()=>{const shell=document.getElementById('todayOperationsSection');if(shell&&!shell.dataset.refreshed){shell.dataset.refreshed='1';setTimeout(load,80);}});
})();
