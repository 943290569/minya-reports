// Minya Landfill app loader
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
  "js/app-archive-search.js",
  "js/page-mode.js",
  "js/app-smart-status.js",
  "js/app-modern-charts.js",
  "js/app-monthly-table.js",
  "js/app-executive-dashboard.js",
  "js/app-system-link.js",
  "js/app-credit.js",
  "js/app-v3-pages.js",
  "js/app-report-attachments.js",
  "js/app-permissions-ui.js"
].forEach((src) => {
  document.write(`<script src="${src}"><\/script>`);
});

[
  "modern-charts.css",
  "executive-dashboard.css",
  "v3.css",
  "report-attachments.css"
].forEach((href) => {
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
});
