// Minya Landfill app loader
const MINYA_ASSET_VERSION = "3.2.0-logout-polish";

(function ensureUniversalLogoutButton(){
  function mount(){
    if(document.getElementById("minyaUniversalLogoutBtn")) return;
    const btn=document.createElement("button");
    btn.type="button";
    btn.id="minyaUniversalLogoutBtn";
    btn.textContent="خروج";
    btn.setAttribute("aria-label","تسجيل الخروج");
    Object.assign(btn.style,{
      position:"fixed",
      top:"16px",
      left:"22px",
      zIndex:"2147483647",
      display:"inline-flex",
      alignItems:"center",
      justifyContent:"center",
      gap:"6px",
      minWidth:"74px",
      minHeight:"38px",
      padding:"7px 14px",
      color:"#fff",
      background:"rgba(255,255,255,.10)",
      border:"1px solid rgba(255,255,255,.28)",
      borderRadius:"9px",
      fontSize:"14px",
      fontWeight:"700",
      lineHeight:"1",
      cursor:"pointer",
      boxShadow:"0 2px 8px rgba(0,0,0,.12)",
      backdropFilter:"blur(4px)",
      transition:"background .18s ease,border-color .18s ease,transform .18s ease"
    });
    btn.onmouseenter=()=>{
      btn.style.background="rgba(255,255,255,.18)";
      btn.style.borderColor="rgba(255,255,255,.38)";
    };
    btn.onmouseleave=()=>{
      btn.style.background="rgba(255,255,255,.10)";
      btn.style.borderColor="rgba(255,255,255,.28)";
      btn.style.transform="translateY(0)";
    };
    btn.onmousedown=()=>{ btn.style.transform="translateY(1px)"; };
    btn.onmouseup=()=>{ btn.style.transform="translateY(0)"; };
    btn.onclick=async()=>{
      try{ await fetch("/api/auth/logout",{method:"POST"}); }
      finally{ location.replace("/login.html"); }
    };
    (document.body||document.documentElement).appendChild(btn);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();

[
  "js/app-auth.js",
  "js/app-core.js",
  "js/app-form.js",
  "js/app-monthly.js",
  "js/app-edit.js",
  "js/app-print-daily.js",
  "js/app-print-monthly.js",
  "js/app-final.js",
  "js/app-annual-export.js",
  "js/app-print-annual.js",
  "js/app-annual-comparison.js",
  "js/app-annual-insights.js",
  "js/app-annual-loader.js",
  "js/app-archive-search.js",
  "js/app-archive-pagination.js",
  "js/page-mode.js",
  "js/app-smart-status.js",
  "js/app-modern-charts.js",
  "js/app-monthly-table.js",
  "js/app-executive-dashboard.js",
  "js/app-system-link.js",
  "js/app-credit.js",
  "js/app-v3-pages.js",
  "js/app-report-attachments.js",
  "js/app-permissions-ui.js",
  "js/app-admin-audit.js",
  "js/app-admin-security.js",
  "js/app-admin-users.js",
  "js/app-report-workflow.js",
  "js/app-reviews.js"
].forEach((src) => {
  const versionedSrc = `${src}?v=${MINYA_ASSET_VERSION}`;
  document.write(`<script src="${versionedSrc}"><\/script>`);
});

[
  "modern-charts.css",
  "executive-dashboard.css",
  "v3.css",
  "report-attachments.css",
  "edit-flow.css",
  "admin-audit.css",
  "admin-security.css",
  "admin-users.css",
  "report-workflow.css",
  "reviews.css",
  "report-responsive.css",
  "archive-mobile.css"
].forEach((href) => {
  if (!document.querySelector(`link[href^="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${href}?v=${MINYA_ASSET_VERSION}`;
    document.head.appendChild(link);
  }
});