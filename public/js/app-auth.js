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
        document.addEventListener("DOMContentLoaded",()=>{
          applyRoleNavigation(d.user);

          const observer=new MutationObserver(()=>applyRoleNavigation(d.user));
          observer.observe(document.body,{childList:true,subtree:true});

          const header=document.querySelector(".top-header");
          if(!header || document.getElementById("minyaUserBox")) return;
          const box=document.createElement("div");
          box.id="minyaUserBox";
          box.className="minya-user-box";

          const name=document.createElement("span");
          name.textContent=d.user.display_name || d.user.username || "مستخدم";

          const role=document.createElement("small");
          role.textContent=d.user.role==="admin"?"مدير":d.user.role==="editor"?"محرر":"قراءة فقط";

          const logout=document.createElement("button");
          logout.type="button";
          logout.id="minyaLogoutBtn";
          logout.textContent="خروج";

          box.append(name,role,logout);
          header.appendChild(box);

          logout.onclick=async()=>{
            await fetch("/api/auth/logout",{method:"POST"});
            location.replace("/login.html");
          };

          if(d.user.role==="viewer"){
            const save=document.getElementById("saveBtn");
            if(save){save.disabled=true;save.title="حساب قراءة فقط";}
          }
        });
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
