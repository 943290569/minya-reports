/* Shared section visibility for bundled and standalone pages. */
(function(){
  if(window.__MINYA_SECTION_ACCESS__)return;
  window.__MINYA_SECTION_ACCESS__=true;
  let access=null;
  function hide(el){
    if(!el)return;
    el.dataset.sectionAccessHidden='1';
    el.hidden=true;
    el.style.setProperty('display','none','important');
    el.setAttribute('aria-hidden','true');
  }
  function show(el){
    if(el?.dataset.sectionAccessHidden!=='1')return;
    delete el.dataset.sectionAccessHidden;el.hidden=false;
    el.style.removeProperty('display');el.removeAttribute('aria-hidden');
  }
  function apply(){
    if(!access||access.role==='admin')return;
    const routes=new Map();
    Object.entries(access.sections||{}).forEach(([feature,section])=>section.routes.forEach(route=>{
      routes.set(route,feature);if(!route.endsWith('.html'))routes.set(route+'.html',feature);
    }));
    document.querySelectorAll('a[href]').forEach(link=>{
      let url;try{url=new URL(link.getAttribute('href'),location.origin);}catch{return;}
      if(url.origin!==location.origin)return;
      const feature=routes.get(url.pathname.replace(/\/+$/,'')||'/');
      if(!feature)return;
      if(Number(access.permissions[feature]?.can_view)===1)show(link);else hide(link);
    });
    document.querySelectorAll('.review-nav-group').forEach(group=>{
      const links=[...group.querySelectorAll('a[href]')];
      if(links.length&&links.every(a=>a.dataset.sectionAccessHidden==='1'))hide(group);else show(group);
    });
    const entry=access.permissions.report_entry;
    if(entry)for(const id of ['newReportBtn','monthlyEntryBtn']){
      const button=document.getElementById(id);if(Number(entry.can_view)===1)show(button);else hide(button);
    }
    const archive=access.permissions.archive;
    if(archive){const button=document.getElementById('archiveBtn');if(Number(archive.can_view)===1)show(button);else hide(button);}
  }
  async function load(){
    try{
      const r=await fetch('/api/feature-permissions/me',{cache:'no-store'}),data=await r.json();
      if(!r.ok||!data.ok)return;
      access=data;apply();
    }catch{}
  }
  function start(){
    load();let pending=false;
    new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply();});}).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pageshow',load);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
