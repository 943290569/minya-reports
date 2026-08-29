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
assert(loader.includes("/* MINYA_MODULES_START */"), "frontend bundle source marker is missing");
assert(bundle.includes("/* ===== js/page-mode.js ===== */"), "page routing is missing from the frontend bundle");
assert(!bundle.includes('<script defer src='), "the combined bundle still triggers dozens of slow script requests");

console.log("UI regression checks passed: page isolation + stored diesel + fast monthly details + single-request bundle.");
