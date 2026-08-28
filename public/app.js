// Minya Landfill app loader
// Hide the raw single-page report markup until page-mode finishes selecting the requested view.
document.documentElement.style.visibility = "hidden";
const MINYA_ASSET_VERSION = "3.2.0-no-route-flash";

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

function revealMinyaApp(){
  document.documentElement.style.visibility = "visible";
}

// page-mode registers its DOMContentLoaded handler while the scripts above are loaded,
// so this listener runs afterwards and reveals only the already-selected page.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", revealMinyaApp, { once: true });
} else {
  revealMinyaApp();
}

// Safety fallback: never leave the application hidden if another script fails unexpectedly.
setTimeout(revealMinyaApp, 1800);
