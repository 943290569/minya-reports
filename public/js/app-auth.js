/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];
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
          const header=document.querySelector(".top-header");
          if(!header || document.getElementById("minyaUserBox")) return;
          const box=document.createElement("div");
          box.id="minyaUserBox"; box.className="minya-user-box";
          box.innerHTML=`<span>${d.user.display_name}</span><small>${d.user.role==="admin"?"مدير":d.user.role==="editor"?"محرر":"قراءة فقط"}</small><button type="button" id="minyaLogoutBtn">خروج</button>`;
          header.appendChild(box);
          document.getElementById("minyaLogoutBtn").onclick=async()=>{ await fetch("/api/auth/logout",{method:"POST"}); location.replace("/login.html"); };
          if(d.user.role==="viewer"){
            const save=document.getElementById("saveBtn"); if(save){save.disabled=true;save.title="حساب قراءة فقط";}
          }
        });
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
