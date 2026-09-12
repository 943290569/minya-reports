/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function mountStandaloneRemembrance(){
    if(publicPages.includes(location.pathname)) return;
    if(document.getElementById("minyaLoadingScreen")) return;

    const messages=[
      "لا تنسَ ذكر الله",
      "صلِّ على النبي ﷺ",
      "سبحان الله وبحمده",
      "الحمد لله",
      "لا إله إلا الله"
    ];

    let loadingSeconds=1;
    let remembranceFontSize=72;
    let theme="day";
    try{
      const saved=JSON.parse(localStorage.getItem("minya_appearance_settings_v1")||"{}");
      const seconds=Number(saved?.loadingSeconds);
      const fontSize=Math.round(Number(saved?.remembranceFontSize));
      const hasFastLoading=Number(saved?.loadingDurationRevision)===2;
      loadingSeconds=hasFastLoading&&[1,2,3,4,5].includes(seconds)?seconds:1;
      remembranceFontSize=Number.isFinite(fontSize)?Math.min(72,Math.max(11,fontSize)):72;
      theme=saved?.theme==="night"?"night":"day";
    }catch(_){}

    const screen=document.createElement("div");
    screen.id="minyaLoadingScreen";
    screen.setAttribute("role","status");
    screen.setAttribute("aria-live","polite");
    const chosen=messages[Math.floor(Math.random()*messages.length)];
    const night=theme==="night";
    screen.style.cssText=`position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:${night?"linear-gradient(135deg,#0e1714 0%,#17231f 100%)":"linear-gradient(135deg,#f7fbf9 0%,#eef6f2 100%)"};direction:rtl;font-family:Tahoma,Arial,sans-serif;opacity:1;transition:opacity .10s ease`;
    screen.innerHTML=`<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 20px"><p style="margin:0;color:${night?"#dff5ea":"#176b4f"};font-size:${remembranceFontSize}px;font-weight:900;line-height:1.35;text-align:center">${chosen}</p><div style="width:8px;height:8px;margin:20px auto 0;border-radius:50%;background:${night?"#75cfa9":"#176b4f"}"></div></div>`;
    document.documentElement.appendChild(screen);

    setTimeout(()=>{
      screen.style.opacity="0";
      setTimeout(()=>screen.remove(),110);
    },loadingSeconds*1000);
  }

  function loadScriptOnce(src,attribute){
    if(document.querySelector(`script[${attribute}]`)) return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.setAttribute(attribute,'1');
    document.head.appendChild(script);
  }

  function loadStyleOnce(href,marker){
    if(document.querySelector(`link[${marker}]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(marker,'1');
    document.head.appendChild(link);
  }

  function loadSharedEnhancements(){
    if(publicPages.includes(location.pathname)) return;
    loadStyleOnce('/notification-center.css?v=stable9-update1','data-minya-notification-style');
    if(!window.__MINYA_NOTIFICATION_CENTER__) loadScriptOnce('/js/app-notification-center.js?v=stable9-update1','data-minya-notifications');
    if(location.pathname==='/drivers-licenses.html'&&!window.__MINYA_LICENSE_FILTERS__) loadScriptOnce('/js/app-driver-license-filters.js?v=stable9-update1','data-minya-license-filters');

    loadStyleOnce('/pwa.css?v=stable10-pwa5','data-minya-pwa-style');
    loadScriptOnce('/js/app-pwa.js?v=stable10-pwa5','data-minya-pwa');
    loadStyleOnce('/local-notifications.css?v=stable10-push4','data-minya-local-notifications-style');
    loadScriptOnce('/js/app-local-notifications.js?v=stable10-push4','data-minya-local-notifications');

    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(path==='/'){
      loadStyleOnce('/smart-insights-free.css?v=stable10-free4','data-minya-smart-free-style');
      loadScriptOnce('/js/app-smart-insights-free.js?v=stable10-free4','data-minya-smart-free');
      loadStyleOnce('/smart-search-free.css?v=stable10-free4','data-minya-smart-search-style');
      loadScriptOnce('/js/app-smart-search-free.js?v=stable10-free4','data-minya-smart-search');
      loadStyleOnce('/smart-monthly-compare.css?v=stable10-free4','data-minya-smart-compare-style');
      loadScriptOnce('/js/app-smart-monthly-compare.js?v=stable10-free4','data-minya-smart-compare');
      loadStyleOnce('/smart-operations-free.css?v=stable10-free4','data-minya-smart-ops-style');
      loadScriptOnce('/js/app-smart-operations-free.js?v=stable10-free5','data-minya-smart-ops');
      loadStyleOnce('/operational-summaries.css?v=stable10-summary2','data-minya-operational-summary-style');
      loadScriptOnce('/js/app-operational-summaries.js?v=stable10-summary2','data-minya-operational-summary');
      loadScriptOnce('/js/app-home-layout-stable10.js?v=stable10-home2','data-minya-home-layout');
    }
  }

  mountStandaloneRemembrance();

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html","/drive-import.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin") link.remove();
    });
  }

  function removeUserBox(){
    document.getElementById("minyaUserBox")?.remove();
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    removeUserBox();
    loadSharedEnhancements();

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          removeUserBox();
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    if(user.role==="viewer"){
      const save=document.getElementById("saveBtn");
      if(save){save.disabled=true;save.title="حساب قراءة فقط";}
    }
  }

  async function check(){
    try{
      const r=await fetch("/api/auth/status",{cache:"no-store"});
      const d=await r.json();
      const path=location.pathname;
      if(d.setupRequired && path!=="/setup.html"){ location.replace("/setup.html"); return; }
      if(!d.setupRequired && !d.authenticated && !publicPages.includes(path)){ location.replace("/login.html"); return; }
      if(d.authenticated){
        window.MINYA_USER=d.user;
        document.documentElement.dataset.userRole=d.user.role;
        if(document.readyState==="loading"){
          document.addEventListener("DOMContentLoaded",()=>setupAuthenticatedUI(d.user),{once:true});
        }else{
          setupAuthenticatedUI(d.user);
        }
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
