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

  function ensureLogoutInNav(user){
    if(!user || publicPages.includes(location.pathname)) return false;
    const header=document.querySelector(".top-header");
    if(!header) return false;

    let nav=header.querySelector("nav");
    if(!nav){
      nav=document.createElement("nav");
      header.appendChild(nav);
    }

    let btn=document.getElementById("minyaLogoutBtn");
    if(!btn){
      btn=document.createElement("button");
      btn.type="button";
      btn.id="minyaLogoutBtn";
      btn.textContent="خروج";
      btn.setAttribute("aria-label","تسجيل الخروج");
      btn.onclick=doLogout;
    }

    Object.assign(btn.style,{
      position:"static",
      display:"inline-flex",
      alignItems:"center",
      justifyContent:"center",
      minWidth:"68px",
      minHeight:"36px",
      padding:"7px 13px",
      margin:"0",
      color:"rgba(255,255,255,.94)",
      background:"rgba(255,255,255,.07)",
      border:"1px solid rgba(255,255,255,.18)",
      borderRadius:"9px",
      fontSize:"13px",
      fontWeight:"600",
      lineHeight:"1",
      letterSpacing:"0",
      cursor:"pointer",
      boxShadow:"0 1px 3px rgba(0,0,0,.08)",
      transition:"background .18s ease,border-color .18s ease,box-shadow .18s ease"
    });
    btn.onmouseenter=()=>{
      btn.style.background="rgba(255,255,255,.13)";
      btn.style.borderColor="rgba(255,255,255,.28)";
      btn.style.boxShadow="0 2px 6px rgba(0,0,0,.10)";
    };
    btn.onmouseleave=()=>{
      btn.style.background="rgba(255,255,255,.07)";
      btn.style.borderColor="rgba(255,255,255,.18)";
      btn.style.boxShadow="0 1px 3px rgba(0,0,0,.08)";
    };

    if(btn.parentElement!==nav) nav.appendChild(btn);
    return true;
  }

  function ensureUserBox(user){
    if(!user) return;
    const header=document.querySelector(".top-header");
    if(!header || document.getElementById("minyaUserBox")) return;

    const box=document.createElement("div");
    box.id="minyaUserBox";
    box.className="minya-user-box";

    const name=document.createElement("span");
    name.textContent=user.display_name || user.username || "مستخدم";

    const role=document.createElement("small");
    role.textContent=user.role==="admin"?"مدير":user.role==="editor"?"محرر":"قراءة فقط";

    box.append(name,role);
    header.appendChild(box);
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    ensureLogoutInNav(user);
    ensureUserBox(user);

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          ensureLogoutInNav(user);
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    // page-mode may rebuild nav during DOMContentLoaded; re-mount after it settles.
    [0,100,300,800,1500].forEach(delay=>setTimeout(()=>ensureLogoutInNav(user),delay));

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