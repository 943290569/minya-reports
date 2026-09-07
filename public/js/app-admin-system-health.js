/* Compact admin system health indicator for the home dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  async function waitForAdmin(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER?.role==='admin';
  }

  async function api(url){
    const response=await fetch(url,{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل حالة النظام');
    return data;
  }

  function status(integrity){
    if(integrity?.level==='danger') return {text:'تحتاج تدخلًا',bg:'#fff0f0',border:'#e8bcbc',color:'#8a2e2e'};
    if(integrity?.level==='warning') return {text:'تحتاج متابعة',bg:'#fff8e8',border:'#ead59a',color:'#7a5a12'};
    return {text:'سليمة',bg:'#eef9f1',border:'#c8dfcf',color:'#176b4f'};
  }

  async function render(){
    if(!(await waitForAdmin())) return;
    let integrity;
    try{integrity=await api('/api/system/integrity');}
    catch(error){console.error('Admin system health failed',error);return;}

    const s=status(integrity);
    document.getElementById('adminSystemHealth')?.remove();

    const section=document.createElement('section');
    section.id='adminSystemHealth';
    section.className='no-print';
    section.style.cssText=`margin:10px 0 14px;padding:10px 12px;border:1px solid ${s.border};border-radius:10px;background:${s.bg};display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;`;
    section.innerHTML=`<div style="display:flex;align-items:center;gap:8px;min-width:0"><strong style="font-size:14px;color:${s.color}">صحة النظام:</strong><span style="font-size:14px;font-weight:800;color:${s.color}">${s.text}</span></div><a href="/system.html" style="font-size:12px;font-weight:800;text-decoration:none;color:${s.color}">فتح إدارة النظام</a>`;

    const workflow=document.getElementById('adminWorkflowSummary');
    const todayOps=document.getElementById('adminTodayOps');
    if(todayOps?.parentNode) todayOps.parentNode.insertBefore(section,todayOps.nextSibling);
    else if(workflow?.parentNode) workflow.parentNode.insertBefore(section,workflow.nextSibling);
    else document.querySelector('main.container')?.prepend(section);
  }

  function init(){setTimeout(render,650);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
