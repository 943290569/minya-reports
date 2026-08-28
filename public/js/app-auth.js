/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin"){
        link.remove();
      }
    });
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);

    if(!window.__MINYA_ROLE_OBSERVER__){
      const observer=new MutationObserver(()=>applyRoleNavigation(user));
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    const header=document.querySelector(".top-header");
    if(header && !document.getElementById("minyaUserBox")){
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

      box.append(name,role,logout);

      const path=location.pathname.replace(/\/+$/,"") || "/";
      const target=path==="/" ? (header.querySelector("nav") || header) : header;
      target.appendChild(box);

      logout.onclick=async()=>{
        try{
          await fetch("/api/auth/logout",{method:"POST"});
        }finally{
          location.replace("/login.html");
        }
      };
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
