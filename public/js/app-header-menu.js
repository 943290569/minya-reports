/* Modern two-column header menu */
(function(){
  const items = [
    {label:"الرئيسية", href:"/", key:"dashboard"},
    {label:"تقرير جديد", href:"/report", key:"report", hideFor:["viewer"]},
    {label:"أرشيف التقارير", href:"/archive", key:"archive"},
    {label:"التقرير الشهري", href:"/monthly", key:"monthly"},
    {label:"التقرير السنوي", href:"/annual", key:"annual"},
    {label:"المعدات والصيانة", href:"/equipment", key:"equipment"},
    {label:"التقرير الأسبوعي", href:"/weekly", key:"weekly"},
    {label:"البحث المتقدم", href:"/search", key:"search"},
    {label:"التقرير الإداري", href:"/managerial", key:"managerial"},
    {label:"الإدارة والصلاحيات", href:"/admin", key:"admin", adminOnly:true},
    {label:"إدارة النظام", href:"/system.html", key:"system", adminOnly:true},
    {label:"المراجعة والاعتماد", href:"/reviews", key:"reviews", adminOnly:true}
  ];

  function currentPath(){
    return (location.pathname.replace(/\/+$/,"") || "/");
  }

  function build(){
    const header=document.querySelector(".top-header");
    if(!header || document.getElementById("minyaMenuButton")) return;

    const oldNav=header.querySelector("nav");
    if(oldNav) oldNav.classList.add("minya-legacy-nav-hidden");

    const wrap=document.createElement("div");
    wrap.className="minya-header-menu-wrap";

    const btn=document.createElement("button");
    btn.id="minyaMenuButton";
    btn.type="button";
    btn.className="minya-menu-button";
    btn.setAttribute("aria-label","فتح قائمة التنقل");
    btn.setAttribute("aria-expanded","false");
    btn.innerHTML='<span aria-hidden="true">☰</span><small>القائمة</small>';

    const menu=document.createElement("div");
    menu.id="minyaHeaderMenu";
    menu.className="minya-header-menu";
    menu.hidden=true;

    const role=(window.MINYA_USER && window.MINYA_USER.role) || document.documentElement.dataset.userRole || "";
    const path=currentPath();

    menu.innerHTML=items.filter(item=>{
      if(item.adminOnly && role && role!=="admin") return false;
      if(item.hideFor && role && item.hideFor.includes(role)) return false;
      return true;
    }).map(item=>{
      const active=(path===item.href || (item.href!=="/" && path.startsWith(item.href))) ? " active" : "";
      return `<a class="minya-menu-item${active}" href="${item.href}"><span>${item.label}</span><b aria-hidden="true">←</b></a>`;
    }).join("");

    wrap.append(btn,menu);
    header.appendChild(wrap);

    const close=()=>{
      menu.hidden=true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    };

    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const willOpen=menu.hidden;
      menu.hidden=!willOpen;
      wrap.classList.toggle("open",willOpen);
      btn.setAttribute("aria-expanded",String(willOpen));
    });

    document.addEventListener("click",(e)=>{
      if(!wrap.contains(e.target)) close();
    });

    document.addEventListener("keydown",(e)=>{
      if(e.key==="Escape") close();
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(build,80),{once:true});
  else setTimeout(build,80);
})();
