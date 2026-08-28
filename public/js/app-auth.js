/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin") link.remove();
    });
  }

  async function doLogout(){
    try{
      await fetch("/api/auth/logout",{method:"POST"});
    }finally{
      location.replace("/login.html");
    }
  }

  function ensureHomeLogout(){
    const path=location.pathname.replace(/\/+$/,"") || "/";
    if(path!=="/" || document.getElementById("minyaHomeLogoutBtn")) return;
    const btn=document.createElement("button");
    btn.type="button";
    btn.id="minyaHomeLogoutBtn";
    btn.textContent="خروج";
    btn.setAttribute("aria-label","تسجيل الخروج");
    Object.assign(btn.style,{
      position:"fixed",
      top:"14px",
      left:"18px",
      zIndex:"99999",
      display:"block",
      visibility:"visible",
      opacity:"1",
      minWidth:"86px",
      minHeight:"42px",
      padding:"9px 16px",
      color:"#ffffff",
      background:"#b42318",
      border:"1px solid rgba(255,255,255,.45)",
      borderRadius:"10px",
      fontWeight:"700",
      cursor:"pointer",
      boxShadow:"0 5px 14px rgba(0,0,0,.22)"
    });
    btn.onclick=doLogout;
    document.body.appendChild(btn);
  }

  function setupAuthenticatedUI(user){
    if(!user) return;
    applyRoleNavigation(user);
    ensureHomeLogout();

    if(!window.__MINYA_ROLE_OBSERVER__){
      const observer=new MutationObserver(()=>{
        applyRoleNavigation(user);
        ensureHomeLogout();
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    const path=location.pathname.replace(/\/+$/,"") || "/";
    const header=document.querySelector(".top-header");
    if(path!=="/" && header && !document.getElementById("minyaUserBox")){
      const box=document.createElement("div");
      box.id="minyaUserBox";
      box.className="minya-user-box";

      const name=document.createElement("span");
      name.textContent=user.display_name || user.username || "مستخدم";

      const role=document.createElement("small");
      role.textContent=user.role==="admin"?"مدير":user.role==="editor"?"محرر":"قراءة فقط";

      const logout=document.createElement("button");
      logout.type="button";
      logout.id="minyaLogoutBtn";
      logout.textContent="خروج";
      logout.onclick=doLogout;

      box.append(name,role,logout);
      header.appendChild(box);
    }

    if(user.role==="viewer"){
      const save=document.getElementById("saveBtn");
      if(save){save.disabled=true;save.title="حساب قراءة فقط";}
    }
  }

  async function check(){
    try{
      const r=await fetch("/api/auth/status");
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
