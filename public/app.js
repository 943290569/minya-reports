// Minya Landfill app loader
[
  "js/app-core.js",
  "js/app-form.js",
  "js/app-monthly.js",
  "js/app-edit.js",
  "js/app-print-daily.js",
  "js/app-print-monthly.js",
  "js/app-final.js",
  "js/app-annual-export.js"
].forEach((src) => {
  document.write(`<script src="${src}"><\/script>`);
});
