const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const index = read("public/index.html");
const pageMode = read("public/js/page-mode.js");
const monthly = read("public/js/app-monthly.js");
const monthlyTable = read("public/js/app-monthly-table.js");
const annual = read("public/js/app-final.js");
const multipage = read("public/multipage.css");
const loader = read("public/app.js");
const bundle = read("public/app-bundle.js");
const styleBundle = read("public/app-bundle.css");
const annualLoader = read("public/js/app-annual-loader.js");
const annualComparison = read("public/js/app-annual-comparison.js");
const appearance = read("public/js/app-appearance-settings.js");
const appearanceStyles = read("public/appearance-settings.css");

assert(index.includes('class="archive-date-control"'), "archive date control is not addressable by page styles");
assert(index.includes('id="periodPageTitle"'), "period page heading is missing");
assert(pageMode.includes('title.textContent = "التقرير الشهري"'), "monthly page title is not isolated");
assert(pageMode.includes('title.textContent = "التقرير السنوي"'), "annual page title is not isolated");
assert(multipage.includes('body[data-page="archive"] #annualSummarySection'), "annual block can leak into archive");
assert(multipage.includes('body[data-page="monthly"] #annualSummarySection'), "annual block can leak into monthly");
assert(multipage.includes('body[data-page="monthly"] .archive-date-control'), "daily date search can leak into monthly");
assert(annual.includes('if (path !== "/annual") return;'), "annual section can mount outside annual page");
assert(monthly.includes('setValue("monthlyDieselTotal", formatNumber(monthly.dieselTotal))'), "monthly stored diesel is not canonical");
assert(!monthlyTable.includes('getReport(report.id)'), "monthly detail table still performs per-report requests");
assert(index.includes('src="app-bundle.js?v='), "the page does not load the combined frontend bundle");
assert(index.includes('href="app-bundle.css?v='), "the page does not load the combined style bundle");
assert(loader.includes("/* MINYA_MODULES_START */"), "frontend bundle source marker is missing");
assert(loader.includes("/* MINYA_STYLES_START */"), "style bundle source marker is missing");
assert(bundle.includes("/* ===== js/page-mode.js ===== */"), "page routing is missing from the frontend bundle");
assert(!bundle.includes('<script defer src='), "the combined bundle still triggers dozens of slow script requests");
assert(!bundle.includes('link.rel = "stylesheet"'), "the JavaScript bundle still triggers dozens of slow style requests");
assert(styleBundle.includes("/* ===== modern-charts.css ===== */"), "chart styles are missing from the style bundle");
assert(annualLoader.includes("data.previous_reports"), "annual loader does not cache previous-year reports");
assert(annualLoader.includes("...(Array.isArray(window.annualAvailableYears)"), "annual year choices are replaced after changing the year");
assert(annualComparison.includes("window.annualPreviousReports"), "annual comparison still requires a second request");
assert(loader.includes("MINYA_APPEARANCE_STORAGE_KEY"), "appearance settings are not applied before the loading screen");
assert(loader.includes("Number(window.MINYA_APPEARANCE_SETTINGS.loadingSeconds"), "remembrance duration is not user-controlled");
assert(loader.includes('"js/app-appearance-settings.js"'), "appearance controls are missing from the frontend bundle");
assert(loader.includes('"appearance-settings.css"'), "appearance styles are missing from the style bundle");
assert(appearance.includes('navPosition: ["top", "right", "left"]'), "menu position controls are incomplete");
assert(appearance.includes('theme: ["day", "night", "auto"]'), "day and night controls are incomplete");
assert(appearanceStyles.includes('html[data-nav-position="right"]'), "right-side menu styles are missing");
assert(appearanceStyles.includes('html[data-theme="night"]'), "night theme styles are missing");

console.log("UI regression checks passed: page isolation + stored diesel + consolidated assets + single-request annual comparison.");
