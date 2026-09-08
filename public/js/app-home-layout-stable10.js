/* Stable 10 — home dashboard ordering only. Keeps every feature, changes placement. */
(function(){
  function isHome(){return (location.pathname.replace(/\/+$/,'')||'/')==='/';}
  const order=[
    'todayOperationsSection',
    'adminTodayOps',
    'freeSmartInsights',
    'smartOperationsFree',
    'operationalSummaries',
    'executiveDashboardSection',
    'adminWorkflowSummary',
    'adminSystemHealth'
  ];

  function arrange(){
    if(!isHome()) return;
    const home=document.querySelector('.dashboard-home');
    if(!home) return;
    const grid=home.querySelector('.dashboard-grid');

    if(grid){
      for(const id of order.slice(0,2)){
        const el=document.getElementById(id);
        if(el&&el.parentElement===home&&el.nextElementSibling!==grid)home.insertBefore(el,grid);
      }
      let anchor=grid;
      for(const id of order.slice(2)){
        const el=document.getElementById(id);
        if(!el||el.parentElement!==home)continue;
        if(anchor.nextElementSibling!==el){
          if(anchor.nextSibling)home.insertBefore(el,anchor.nextSibling);else home.appendChild(el);
        }
        anchor=el;
      }
    }else{
      let anchor=null;
      for(const id of order){
        const el=document.getElementById(id);
        if(!el||el.parentElement!==home)continue;
        if(!anchor){
          if(home.firstElementChild!==el)home.insertBefore(el,home.firstElementChild);
        }else if(anchor.nextElementSibling!==el){
          if(anchor.nextSibling)home.insertBefore(el,anchor.nextSibling);else home.appendChild(el);
        }
        anchor=el;
      }
    }
    home.dataset.stable10Ordered='1';
  }

  function init(){
    const home=document.querySelector('.dashboard-home');
    if(!home)return;
    arrange();
    let timer=null;
    let stopped=false;
    const observer=new MutationObserver(()=>{
      if(stopped)return;
      clearTimeout(timer);
      timer=setTimeout(arrange,80);
    });
    observer.observe(home,{childList:true});
    setTimeout(()=>{stopped=true;observer.disconnect();clearTimeout(timer);arrange();},5000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,120),{once:true});
  else setTimeout(init,120);
})();
