/* Returned report notice + editor home alerts. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmtDate=value=>{
    if(!value) return '';
    try{return new Date(value).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return String(value);}
  };
  const reportId=()=>Number(new URLSearchParams(location.search).get('edit')||0);

  async function waitForUser(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER||null;
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل البيانات');
    return data;
  }

  function renderReportNotice(report){
    document.getElementById('returnedReportNotice')?.remove();
    if(!report||String(report.workflow_status||'draft')!=='draft'||!report.returned_at) return;
    const role=window.MINYA_USER?.role||'viewer';
    if(role!=='editor'&&role!=='admin') return;

    const card=document.createElement('section');
    card.id='returnedReportNotice';
    card.className='no-print';
    card.style.cssText='margin:12px 0;padding:14px 16px;border:1px solid #f0b44d;border-radius:10px;background:#fff8e8;color:#5b3a00;line-height:1.7;';
    const reason=String(report.returned_reason||'').trim();
    card.innerHTML=`<strong style="display:block;margin-bottom:4px;font-size:16px">أُعيد التقرير للتعديل</strong><div>${reason?`<b>السبب:</b> ${esc(reason)}`:'لم يتم تسجيل سبب محدد للإعادة.'}</div><small style="display:block;margin-top:4px">تاريخ الإعادة: ${esc(fmtDate(report.returned_at))}</small>`;
    const workflow=document.getElementById('reportWorkflowPanel');
    if(workflow) workflow.after(card); else document.querySelector('main.container')?.prepend(card);
  }

  async function loadReportNotice(){
    const id=reportId(); if(!id) return;
    try{const data=await api(`/api/reports/${id}`); renderReportNotice(data.report||data);}catch(error){console.error('Returned report notice failed',error);}
  }

  function renderHomeCard(reports){
    document.getElementById('returnedReportsHomeCard')?.remove();
    if(!reports.length) return;
    const main=document.querySelector('main.container');
    if(!main) return;

    const card=document.createElement('section');
    card.id='returnedReportsHomeCard';
    card.className='no-print';
    card.style.cssText='margin:16px 0;padding:16px;border:1px solid #f0b44d;border-radius:12px;background:#fff8e8;color:#5b3a00;';
    const items=reports.slice(0,6).map(report=>{
      const reason=String(report.returned_reason||'').trim();
      return `<a href="/report?edit=${Number(report.id)}" style="display:block;margin-top:9px;padding:10px 12px;border:1px solid #efd49a;border-radius:8px;background:#fff;text-decoration:none;color:#5b3a00"><strong>${esc(report.report_no||report.report_date||'تقرير')}</strong><span style="display:block;margin-top:3px;font-size:13px">${esc(report.report_date||'')}${reason?` · ${esc(reason)}`:''}</span></a>`;
    }).join('');
    card.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong style="font-size:17px">تقارير أُعيدت للتعديل</strong><div style="margin-top:3px;font-size:14px">لديك ${reports.length} تقرير يحتاج مراجعتك.</div></div><span style="display:inline-flex;min-width:36px;height:36px;align-items:center;justify-content:center;border-radius:999px;background:#9a6700;color:#fff;font-weight:700">${reports.length}</span></div>${items}${reports.length>6?`<small style="display:block;margin-top:8px">يوجد ${reports.length-6} تقرير إضافي في الأرشيف.</small>`:''}`;

    const firstPanel=main.querySelector('section.panel, .dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(firstPanel) main.insertBefore(card,firstPanel); else main.prepend(card);
  }

  async function loadHomeReturnedReports(){
    const user=await waitForUser();
    if(pathName!=='/'||user?.role!=='editor') return;
    try{
      const data=await api('/api/reports');
      const reports=Array.isArray(data.reports)?data.reports:[];
      const mine=reports.filter(report=>String(report.workflow_status||'draft')==='draft'&&report.returned_at&&Number(report.returned_to||0)===Number(user.id||0)).sort((a,b)=>String(b.returned_at||'').localeCompare(String(a.returned_at||'')));
      renderHomeCard(mine);
    }catch(error){console.error('Returned reports home card failed',error);}
  }

  function init(){
    if(pathName==='/report'){setTimeout(loadReportNotice,350);setTimeout(loadReportNotice,1000);}
    if(pathName==='/'){setTimeout(loadHomeReturnedReports,500);setTimeout(loadHomeReturnedReports,1400);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
