/* Stable 10 — home dashboard ordering only. Keeps every feature, changes placement. */
(function(){
  function isHome(){return (location.pathname.replace(/\/+$/,'')||'/')==='/';}
  function arrange(){
    if(!isHome()) return;
    const home=document.querySelector('.dashboard-home');
    if(!home) return;

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

    const grid=home.querySelector('.dashboard-grid');
    let anchor=grid || home.firstElementChild;

    if(grid){
      order.slice(0,2).forEach(id=>{
        const el=document.getElementById(id);
        if(el) home.insertBefore(el,grid);
      });
      anchor=grid;
      order.slice(2).forEach(id=>{
        const el=document.getElementById(id);
        if(el){
          if(anchor.nextSibling) home.insertBefore(el,anchor.nextSibling);
          else home.appendChild(el);
          anchor=el;
        }
      });
    }else{
      order.forEach(id=>{
        const el=document.getElementById(id);
        if(el) home.appendChild(el);
      });
    }

    home.dataset.stable10Ordered='1';
  }

  function init(){
    arrange();
    let count=0;
    const timer=setInterval(()=>{
      arrange();
      if(++count>=12) clearInterval(timer);
    },350);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200),{once:true});
  else setTimeout(init,200);
})();
