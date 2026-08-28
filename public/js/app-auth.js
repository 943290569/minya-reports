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

  function ensureUserBox(user){
    if(!user) return;
    const header=document.querySelector(".top-header");
    if(!header) return;

    let box=document.getElementById("minyaUserBox");
    if(!box){
      box=document.createElement("div");
      box.id="minyaUserBox";
      box.className="minya-user-box";

      const avatar=document.createElement("span");
      avatar.className="minya-user-avatar";

      const meta=document.createElement("span");
      meta.className="minya-user-meta";

      const name=document.createElement("strong");
      name.className="minya-user-name";

      const role=document.createElement("small");
      role.className="minya-user-role";

      meta.append(name,role);
      box.append(avatar,meta);
      header.appendChild(box);
    }

    const displayName=user.display_name || user.username || "مستخدم";
    const avatar=box.querySelector(".minya-user-avatar");
    const name=box.querySelector(".minya-user-name");
    const role=box.querySelector(".minya-user-role");
    if(avatar) avatar.textContent=String(displayName).trim().charAt(0) || "م";
    if(name) name.textContent=displayName;
    if(role) role.textContent=user.role==="admin"?"مدير النظام":user.role==="editor"?"محرر":"قراءة فقط";
    box.title=`${displayName} — ${role?.textContent || ""}`;
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    ensureUserBox(user);

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          ensureUserBox(user);
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