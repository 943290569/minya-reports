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
  "js/page-mode.js"
].forEach((src) => {
  document.write(`<script src="${src}"><\/script>`);
});
