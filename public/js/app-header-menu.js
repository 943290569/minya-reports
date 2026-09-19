/* Mobile-only vertical header menu */
(function(){
  const items = [
    {label:"الرئيسية", href:"/", icon:"⌂"},
    {label:"تقرير جديد", href:"/report", icon:"✎", hideFor:["viewer"]},
    {label:"أرشيف التقارير", href:"/archive", icon:"▤"},
    {label:"التقرير الشهري", href:"/monthly", icon:"▦"},
    {label:"التقرير السنوي", href:"/annual", icon:"◔"},
    {label:"المعدات والصيانة", href:"/equipment", icon:"⚙"},
    {label:"إدارة المعدات الوقائية", href:"/equipment-management", icon:"⚙"},
    {label:"ملفات ومرفقات الموقع", href:"/files", icon:"▰"},
    {label:"رخص السائقين", href:"/drivers-licenses.html", icon:"▣"},
    {label:"لوحة التشغيل", href:"/ops-dashboard", icon:"▥"},
    {label:"مركبات حركة المكب", href:"/fleet", icon:"▣"},
    {label:"الصيانة والحوادث", href:"/maintenance-incidents", icon:"⚒"},
    {label:"العصارة والغطاء اليومي", href:"/environment", icon:"◫"},
    {label:"الملاحظات والمهام", href:"/tasks", icon:"✓"},
    {label:"المقاولون والعقود", href:"/contracts", icon:"▧"},
    {label:"الخلايا والسعة", href:"/cells", icon:"▦"},
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
      const active=(path===item.href) ? " active" : "";
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

  function buildDesktop(){
    if(!window.matchMedia("(min-width: 761px)").matches) return;
    const header=document.querySelector(".top-header");
    const nav=header?.querySelector("nav");
    if(!nav) return;

    const role=currentRole();
    const path=currentPath();
    const normalizeHref=(value)=>{
      try{
        const pathname=new URL(value,location.origin).pathname.replace(/\/+$/,"") || "/";
        return pathname.endsWith(".html") ? pathname.slice(0,-5) : pathname;
      }catch(_){ return String(value || ""); }
    };
    const primaryHrefs=["/","/report","/archive","/monthly","/annual","/ops-dashboard"];
    nav.querySelectorAll(".minya-nav-more").forEach((legacyMore)=>legacyMore.remove());
    const existingMore=nav.querySelector(".minya-desktop-more");
    const storedLinks=existingMore ? [...existingMore.querySelectorAll("a[href]")] : [];
    const directLinks=[...nav.querySelectorAll(":scope > a[href]")];
    const existingByHref=new Map();
    [...directLinks,...storedLinks].forEach((link)=>{
      const key=normalizeHref(link.getAttribute("href"));
      if(!existingByHref.has(key)) existingByHref.set(key,link);
      link.remove();
    });

    const routeButtons=new Map([
      ["/report",document.getElementById("newReportBtn")],
      ["/archive",document.getElementById("archiveBtn")]
    ]);
    const visibleItems=items.filter((item)=>{
      if(item.adminOnly && role!=="admin") return false;
      if(item.hideFor && item.hideFor.includes(role)) return false;
      return true;
    });
    const visibleKeys=new Set(visibleItems.map((item)=>normalizeHref(item.href)));
    routeButtons.forEach((button,key)=>{
      if(button) button.hidden=!visibleKeys.has(key);
    });

    let more=existingMore;
    let moreButton=more?.querySelector(".minya-desktop-more-button");
    let morePanel=more?.querySelector(".minya-desktop-more-panel");
    if(!more){
      more=document.createElement("div");
      more.className="minya-desktop-more";
      moreButton=document.createElement("button");
      moreButton.type="button";
      moreButton.className="minya-desktop-more-button";
      moreButton.innerHTML='<span>المزيد</span><span aria-hidden="true">⌄</span>';
      moreButton.setAttribute("aria-expanded","false");
      morePanel=document.createElement("div");
      morePanel.className="minya-desktop-more-panel";
      morePanel.hidden=true;
      const close=()=>{morePanel.hidden=true;moreButton.setAttribute("aria-expanded","false");more.classList.remove("open");};
      moreButton.addEventListener("click",(event)=>{
        event.stopPropagation();
        const open=morePanel.hidden;
        morePanel.hidden=!open;
        moreButton.setAttribute("aria-expanded",String(open));
        more.classList.toggle("open",open);
      });
      document.addEventListener("click",(event)=>{if(!more.contains(event.target)) close();});
      document.addEventListener("keydown",(event)=>{if(event.key==="Escape") close();});
      more.append(moreButton,morePanel);
    }
    morePanel.innerHTML="";

    visibleItems.forEach((item)=>{
      const key=normalizeHref(item.href);
      let link=routeButtons.get(key) || existingByHref.get(key);
      if(!link){
        link=document.createElement("a");
        link.className="app-nav-link";
        link.href=item.href;
      }
      if(link.tagName==="A"){
        link.textContent=item.label;
        const active=normalizeHref(path)===key;
        link.classList.toggle("active",active);
        if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
      }
      if(primaryHrefs.includes(key)) nav.appendChild(link);
      else morePanel.appendChild(link);
    });

    const hasActiveSecondary=morePanel.querySelector(".app-nav-link.active");
    moreButton.classList.toggle("active",Boolean(hasActiveSecondary));
    if(morePanel.children.length) nav.appendChild(more);
    else more.remove();
  }

  function start(){
    mountBackToTop();
    build();
    buildDesktop();
    setTimeout(buildDesktop,150);
    setTimeout(buildDesktop,600);
    let tries=0,lastRole=currentRole();
    const timer=setInterval(()=>{
      tries+=1;
      const role=currentRole();
      if(role!==lastRole){lastRole=role;build();buildDesktop();}
      if(tries>=24) clearInterval(timer);
    },250);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("resize",()=>{
    if(window.matchMedia("(max-width: 760px)").matches) build();
    else buildDesktop();
  });
})();
