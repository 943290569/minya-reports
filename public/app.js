// Minya Landfill app loader
[
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
  "js/app-credit.js"
].forEach((src) => {
  document.write(`<script src="${src}"><\/script>`);
});

if (!document.querySelector('link[href="modern-charts.css"]')) {
  const modernChartsCss = document.createElement("link");
  modernChartsCss.rel = "stylesheet";
  modernChartsCss.href = "modern-charts.css";
  document.head.appendChild(modernChartsCss);
}

if (!document.querySelector('link[href="executive-dashboard.css"]')) {
  const executiveDashboardCss = document.createElement("link");
  executiveDashboardCss.rel = "stylesheet";
  executiveDashboardCss.href = "executive-dashboard.css";
  document.head.appendChild(executiveDashboardCss);
}
