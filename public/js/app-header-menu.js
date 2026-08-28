/* Mobile-only vertical header menu */
(function(){
  const items = [
    {label:"الرئيسية", href:"/"},
    {label:"تقرير جديد", href:"/report", hideFor:["viewer"]},
    {label:"أرشيف التقارير", href:"/archive"},
    {label:"التقرير الشهري", href:"/monthly"},
    {label:"التقرير السنوي", href:"/annual"},
    {label:"المعدات والصيانة", href:"/equipment"},
    {label:"التقرير الأسبوعي", href:"/weekly"},
    {label:"البحث المتقدم", href:"/search"},
    {label:"التقرير الإداري", href:"/managerial"},
    {label:"الإدارة والصلاحيات", href:"/admin", adminOnly:true},
    {label:"إدارة النظام", href:"/system.html", adminOnly:true},
    {label:"المراجعة والاعتماد", href:"/reviews", adminOnly:true}
  ];

  function currentPath(){
    return location.pathname.replace(/\/+$/,"") || "/";
  }

  function build(){
    if(!window.matchMedia("(max-width: 760px)").matches) return;
    const header=document.querySelector(".top-header");
    if(!header || document.getElementById("minyaMenuButton")) return;

    const role=(window.MINYA_USER && window.MINYA_USER.role) || document.documentElement.dataset.userRole || "";
    const path=currentPath();

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

    menu.innerHTML=items.filter(item=>{
      if(item.adminOnly && role!=="admin") return false;
      if(item.hideFor && item.hideFor.includes(role)) return false;
      return true;
    }).map(item=>{
      const active=(path===item.href || (item.href!=="/" && path.startsWith(item.href))) ? " active" : "";
      return `<a class="minya-menu-item${active}" href="${item.href}"><span>${item.label}</span><b aria-hidden="true">‹</b></a>`;
    }).join("");

    wrap.append(btn,menu);
    header.appendChild(wrap);

    const close=()=>{
      menu.hidden=true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    };

    btn.addEventListener("click",(event)=>{
      event.stopPropagation();
      const open=menu.hidden;
      menu.hidden=!open;
      wrap.classList.toggle("open",open);
      btn.setAttribute("aria-expanded",String(open));
    });

    document.addEventListener("click",(event)=>{
      if(!wrap.contains(event.target)) close();
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="Escape") close();
    });
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{
      tries += 1;
      if(document.documentElement.dataset.userRole || tries>=8){
        clearInterval(timer);
        build();
      }
    },80);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("resize",()=>{
    if(window.matchMedia("(max-width: 760px)").matches) build();
  });
})();
