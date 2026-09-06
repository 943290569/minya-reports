/* Returned report notice for editor/admin. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/report') return;

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmtDate=value=>{
    if(!value) return '';
    try{return new Date(value).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return String(value);}
  };
  const reportId=()=>Number(new URLSearchParams(location.search).get('edit')||0);

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل التقرير');
    return data;
  }

  function render(report){
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

  async function load(){
    const id=reportId(); if(!id) return;
    try{const data=await api(`/api/reports/${id}`); render(data.report||data);}catch(error){console.error('Returned report notice failed',error);}
  }

  function init(){setTimeout(load,350);setTimeout(load,1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
