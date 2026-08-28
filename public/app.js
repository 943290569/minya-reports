// Minya Landfill app loader
const MINYA_ASSET_VERSION = "3.2.0-logout-loader";

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
      top:"14px",
      left:"18px",
      zIndex:"2147483647",
      display:"block",
      visibility:"visible",
      opacity:"1",
      minWidth:"86px",
      minHeight:"42px",
      padding:"9px 16px",
      color:"#fff",
      background:"#b42318",
      border:"1px solid rgba(255,255,255,.45)",
      borderRadius:"10px",
      fontWeight:"700",
      cursor:"pointer",
      boxShadow:"0 5px 14px rgba(0,0,0,.22)"
    });
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