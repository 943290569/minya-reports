/* Admin daily operational KPIs on home dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  const fmt=value=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  function hebronDate(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const map=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل البيانات');
    return data;
  }

  async function waitForUser(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER||null;
  }

  function equipmentSummary(equipment){
    const list=Array.isArray(equipment)?equipment:[];
    if(!list.length) return {total:0,working:0,issues:0,text:'لا توجد بيانات معدات'};
    const working=list.filter(item=>String(item.operating_status||'').trim()==='يعمل').length;
    const issues=list.length-working;
    return {total:list.length,working,issues,text:issues?`${working} يعمل / ${issues} يحتاج متابعة`:`${working} يعمل / لا توجد أعطال مسجلة`};
  }

  function renderMissing(today){
    if(document.getElementById('adminTodayOps')) return;
    const main=document.querySelector('main.container'); if(!main) return;
    const section=document.createElement('section');
    section.id='adminTodayOps'; section.className='no-print';
    section.style.cssText='margin:14px 0;padding:14px 16px;border:1px solid rgba(120,120,120,.22);border-radius:12px;background:rgba(255,255,255,.7);';
    section.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><strong style="font-size:17px">مؤشرات تشغيل اليوم</strong><small style="display:block;margin-top:3px">${esc(today)}</small></div><a href="/report" style="text-decoration:none">إنشاء تقرير اليوم</a></div><p style="margin:10px 0 0">لم يتم تسجيل تقرير اليوم حتى الآن.</p>`;
    const grid=document.querySelector('.dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(grid&&grid.parentElement) grid.parentElement.insertBefore(section,grid); else main.prepend(section);
  }

  function renderReport(report,details,today){
    if(document.getElementById('adminTodayOps')) return;
    const main=document.querySelector('main.container'); if(!main) return;
    const eq=equipmentSummary(details?.equipment);
    const section=document.createElement('section');
    section.id='adminTodayOps'; section.className='no-print';
    section.style.cssText='margin:14px 0;padding:14px 16px;border:1px solid rgba(55,110,160,.22);border-radius:12px;background:rgba(248,252,255,.88);';
    section.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><div><strong style="font-size:17px">مؤشرات تشغيل اليوم</strong><small style="display:block;margin-top:3px">${esc(today)} — ${esc(report.report_no||'')}</small></div><a href="/report?edit=${Number(report.id)}" style="text-decoration:none">فتح تقرير اليوم</a></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px"><div style="padding:12px;border-radius:10px;background:rgba(255,255,255,.9)"><small>النفايات</small><strong style="display:block;font-size:22px;margin-top:3px">${fmt(report.total_waste_tons)} طن</strong></div><div style="padding:12px;border-radius:10px;background:rgba(255,255,255,.9)"><small>الشاحنات</small><strong style="display:block;font-size:22px;margin-top:3px">${fmt(report.total_trucks)}</strong></div><div style="padding:12px;border-radius:10px;background:rgba(255,255,255,.9)"><small>السولار</small><strong style="display:block;font-size:22px;margin-top:3px">${fmt(report.total_diesel)} لتر</strong></div><div style="padding:12px;border-radius:10px;background:rgba(255,255,255,.9)"><small>المعدات</small><strong style="display:block;font-size:16px;margin-top:5px">${esc(eq.text)}</strong></div></div>`;
    const grid=document.querySelector('.dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(grid&&grid.parentElement) grid.parentElement.insertBefore(section,grid); else main.prepend(section);
  }

  async function init(){
    const user=await waitForUser();
    if(user?.role!=='admin') return;
    const today=hebronDate();
    try{
      const data=await api('/api/reports');
      const reports=Array.isArray(data.reports)?data.reports:[];
      const report=reports.find(item=>String(item.report_date||'')===today);
      if(!report){renderMissing(today);return;}
      let details=null;
      try{const full=await api(`/api/reports/${report.id}`);details=full.report||full;}catch{}
      renderReport(report,details,today);
    }catch(error){console.error('Admin today ops failed',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500));else setTimeout(init,500);
})();
