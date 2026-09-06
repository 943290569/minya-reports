/* Admin workflow summary strip for dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  async function waitForAdmin(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER?.role==='admin';
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل الملخص');
    return data;
  }

  function ageHours(report){
    const time=new Date(report?.submitted_at||0).getTime();
    return Number.isFinite(time)&&time>0?Math.max(0,(Date.now()-time)/3600000):0;
  }

  function isToday(value){
    if(!value) return false;
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return false;
    const now=new Date();
    return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
  }

  function metric(label,value,detail,href,tone){
    return `<a href="${href}" style="display:block;text-decoration:none;color:inherit;padding:13px 14px;border:1px solid rgba(0,0,0,.1);border-radius:10px;background:${tone};min-width:0"><small style="display:block;margin-bottom:5px;opacity:.8">${esc(label)}</small><strong style="display:block;font-size:24px;line-height:1">${Number(value||0).toLocaleString('en-US')}</strong><span style="display:block;margin-top:6px;font-size:12px;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(detail)}</span></a>`;
  }

  async function render(){
    if(!(await waitForAdmin())) return;
    let pendingData,reportsData;
    try{
      [pendingData,reportsData]=await Promise.all([api('/api/reviews/pending'),api('/api/reports')]);
    }catch(error){console.error('Admin workflow summary failed',error);return;}

    const pending=Array.isArray(pendingData.reports)?pendingData.reports:[];
    const reports=Array.isArray(reportsData.reports)?reportsData.reports:[];
    const overdue=pending.filter(report=>ageHours(report)>=24);
    const returned=reports.filter(report=>String(report.workflow_status||'draft')==='draft'&&report.returned_at);
    const approvedToday=reports.filter(report=>String(report.workflow_status||'')==='approved'&&isToday(report.approved_at));

    document.getElementById('adminWorkflowSummary')?.remove();
    const section=document.createElement('section');
    section.id='adminWorkflowSummary';
    section.className='no-print';
    section.style.cssText='margin:14px 0 18px;padding:14px;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:rgba(255,255,255,.75);';
    section.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px"><div><strong style="font-size:16px">ملخص سير التقارير</strong><small style="display:block;margin-top:2px;opacity:.7">حالة العمل الحالية للمدير</small></div><a href="/reviews" style="text-decoration:none;font-size:13px">فتح المراجعة</a></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px">${metric('بانتظار المراجعة',pending.length,pending.length?'تقارير تحتاج قرارًا':'لا توجد تقارير معلقة','/reviews','#f4f8ff')}${metric('متأخر أكثر من 24 ساعة',overdue.length,overdue.length?'يحتاج متابعة عاجلة':'لا يوجد تأخير','/reviews','#fff5e8')}${metric('معاد للتعديل',returned.length,returned.length?'مسودات أعيدت للمحررين':'لا توجد تقارير معادة','/archive','#fff8e8')}${metric('معتمد اليوم',approvedToday.length,approvedToday.length?'تم إنجازها اليوم':'لا يوجد اعتماد اليوم','/archive','#eef9f1')}</div>`;

    const grid=document.querySelector('.dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(grid?.parentNode) grid.parentNode.insertBefore(section,grid); else document.querySelector('main.container')?.prepend(section);
  }

  function init(){setTimeout(render,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
