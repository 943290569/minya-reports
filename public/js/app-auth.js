/* Authentication guard */
(function(){
  /* Install the preview observer stabilizer before any source-import module creates
     its own MutationObserver. The source import helpers only need to react when
     the preview root is rebuilt; they must not react to every nested cell update,
     otherwise V5 and the stations overlay can trigger each other continuously. */
  if(!window.__MINYA_DRIVE_OBSERVER_STABILIZED__ && window.MutationObserver){
    const NativeMutationObserver=window.MutationObserver;
    window.__MINYA_DRIVE_OBSERVER_STABILIZED__=true;
    window.MutationObserver=class MinyaStableMutationObserver extends NativeMutationObserver{
      observe(target,options){
        let safeOptions=options;
        if((target?.id==='previewReports'||target?.id==='sourceFilesPreview')&&options?.subtree){
          safeOptions={...options,subtree:false,childList:true};
        }
        return super.observe(target,safeOptions);
      }
    };
  }

  const publicPages=["/login.html","/setup.html"];

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