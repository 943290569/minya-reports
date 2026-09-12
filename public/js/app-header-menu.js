/* Mobile-only vertical header menu */
(function(){
  const items = [
    {label:"الرئيسية", href:"/", icon:"⌂"},
    {label:"تقرير جديد", href:"/report", icon:"✎", hideFor:["viewer"]},
    {label:"أرشيف التقارير", href:"/archive", icon:"▤"},
    {label:"التقرير الشهري", href:"/monthly", icon:"▦"},
    {label:"التقرير السنوي", href:"/annual", icon:"◔"},
    {label:"المعدات والصيانة", href:"/equipment", icon:"⚙"},
    {label:"المركبات والسائقين", href:"/drivers-licenses.html", icon:"▣"},
    {label:"لوحة التشغيل", href:"/ops-dashboard", icon:"▥"},
    {label:"مركبات حركة المكب والسائقون", href:"/fleet", icon:"▣"},
    {label:"الصيانة والحوادث", href:"/maintenance-incidents", icon:"⚒"},
    {label:"العصارة والغطاء اليومي", href:"/environment", icon:"◫"},
    {label:"السولار الخارجي", href:"/external-diesel", icon:"▦"},
    {label:"البحث الشامل", href:"/global-search", icon:"⌕"},
    {label:"التقرير الأسبوعي", href:"/weekly", icon:"≋"},
    {label:"البحث المتقدم", href:"/search", icon:"⌕"},
    {label:"التقرير الإداري", href:"/managerial", icon:"▧"},
    {label:"الإدارة والصلاحيات", href:"/admin", icon:"◇", adminOnly:true},
    {label:"إدارة النظام", href:"/system.html", icon:"⚙", adminOnly:true},
    {label:"الاستيراد", href:"/drive-import.html", icon:"⇩", adminOnly:true},
    {label:"المراجعة والاعتماد", href:"/reviews", icon:"✓", adminOnly:true}
  ];

  function currentPath(){
    return location.pathname.replace(/\/+$/,"") || "/";
  }

  function currentRole(){
    return (window.MINYA_USER && window.MINYA_USER.role) || document.documentElement.dataset.userRole || "";
  }

  function renderItems(menu){
    if(!menu) return;
    const role=currentRole();
    const path=currentPath();
    menu.dataset.renderedRole=role;
    menu.innerHTML=items.filter(item=>{
      if(item.adminOnly && role!=="admin") return false;
      if(item.hideFor && item.hideFor.includes(role)) return false;
      return true;
    }).map(item=>{
      const active=(path===item.href || (item.href!=="/" && path.startsWith(item.href))) ? " active" : "";
      return `<a class="minya-menu-item${active}" href="${item.href}"><span class="minya-menu-label"><i class="minya-menu-symbol" aria-hidden="true">${item.icon}</i><span>${item.label}</span></span><b aria-hidden="true">‹</b></a>`;
    }).join("");
  }

  function mountBackToTop(){
    if(document.getElementById("minyaBackToTop")) return;

    const style=document.createElement("style");
    style.id="minyaBackToTopStyle";
    style.textContent=`
      #minyaBackToTop{
        position:fixed;
        right:18px;
        bottom:18px;
        z-index:1690;
        width:46px;
        height:46px;
        min-width:46px;
        min-height:46px;
        padding:0 !important;
        display:flex;
        align-items:center;
        justify-content:center;
        border:1px solid rgba(255,255,255,.28) !important;
        border-radius:50% !important;
        background:var(--appearance-accent,#176b4f) !important;
        color:#fff !important;
        box-shadow:0 10px 26px rgba(10,45,34,.24) !important;
        font-size:24px !important;
        font-weight:900 !important;
        line-height:1 !important;
        cursor:pointer;
        transition:transform .18s ease,opacity .18s ease;
      }
      #minyaBackToTop[hidden]{display:none !important;}
      #minyaBackToTop:hover{transform:translateY(-2px);}
      #minyaBackToTop:focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:3px;}
      @media (max-width:760px){
        #minyaBackToTop{right:12px;bottom:14px;width:44px;height:44px;min-width:44px;min-height:44px;font-size:23px !important;}
      }
      @media print{#minyaBackToTop{display:none !important;}}
    `;
    document.head.appendChild(style);

    const btn=document.createElement("button");
    btn.id="minyaBackToTop";
    btn.type="button";
    btn.hidden=true;
    btn.setAttribute("aria-label","العودة إلى بداية الصفحة");
    btn.setAttribute("title","العودة إلى أعلى الصفحة");
    btn.innerHTML='<span aria-hidden="true">↑</span>';
    document.body.appendChild(btn);

    const sync=()=>{
      btn.hidden=(window.scrollY || document.documentElement.scrollTop || 0)<320;
    };

    btn.addEventListener("click",()=>{
      const reduced=document.documentElement.dataset.motion==="reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      window.scrollTo({top:0,left:0,behavior:reduced?"auto":"smooth"});
    });
    window.addEventListener("scroll",sync,{passive:true});
    sync();
  }

  function build(){
    if(!window.matchMedia("(max-width: 760px)").matches) return;
    const header=document.querySelector(".top-header");
    if(!header) return;

    const existing=document.getElementById("minyaHeaderMenu");
    if(existing){
      if(existing.dataset.renderedRole!==currentRole()) renderItems(existing);
      return;
    }

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
    renderItems(menu);

    wrap.append(btn,menu);
    header.appendChild(wrap);

    const close=()=>{
      menu.hidden=true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    };

    btn.addEventListener("click",(event)=>{
      event.stopPropagation();
      renderItems(menu);
      const open=menu.hidden;
      menu.hidden=!open;
      wrap.classList.toggle("open",open);
      btn.setAttribute("aria-expanded",String(open));
      if(open) menu.scrollTop=0;
    });

    document.addEventListener("click",(event)=>{
      if(!wrap.contains(event.target)) close();
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="Escape") close();
    });
  }

  function start(){
    mountBackToTop();
    build();
    let tries=0,lastRole=currentRole();
    const timer=setInterval(()=>{
      tries+=1;
      const role=currentRole();
      if(role!==lastRole){lastRole=role;build();}
      if(tries>=24) clearInterval(timer);
    },250);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("resize",()=>{
    if(window.matchMedia("(max-width: 760px)").matches) build();
  });
})();
