const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const pkg = require('../package.json');
const loader = read('public/app.js');
const drivePage = read('public/drive-import.html');
const startServer = read('scripts/start-server.js');
const returnedNotice = read('public/js/app-returned-report-notice.js');
const workflowSummary = read('public/js/app-admin-workflow-summary.js');
const todayOps = read('public/js/app-admin-today-ops.js');
const reviews = read('public/js/app-reviews.js');
const adminWhatsApp = read('public/js/app-admin-whatsapp.js');
const stableShim = read('public/js/app-source-stable-v16.js');
const pivotShim = read('public/js/app-source-pivot-raw-v30.js');
const pivotAdapter = read('public/js/app-source-stations-wide-v9.js');

assert(pkg.version === '3.4.0', 'package version must be V3.4.0');
assert(loader.includes('MINYA_ASSET_VERSION = "3.4.0-'), 'frontend asset version is not V3.4.0');

assert(startServer.includes('["returned_reason", "TEXT DEFAULT'), 'returned report reason migration is missing');
assert(startServer.includes('["returned_to", "INTEGER"]'), 'returned report editor assignment migration is missing');
assert(startServer.includes('returned_reason=?,returned_at=?,returned_by=?,returned_to=?'), 'return workflow does not persist reason/date/admin/editor');
assert(startServer.includes("returned_reason='',returned_at=NULL,returned_by=NULL,returned_to=NULL"), 'resubmission does not clear old return metadata');
assert(startServer.includes('const restoreCreatedFiles=[];'), 'restore does not track attachment files created during the transaction');
assert(startServer.includes('restoreCreatedFiles.push(stored)'), 'restore does not record newly written attachment files');
assert(startServer.includes('for(const stored of restoreCreatedFiles)safeUnlinkUpload(stored)'), 'failed restore does not clean newly created attachment files');

assert(returnedNotice.includes('أُعيد التقرير للتعديل'), 'editor returned-report notice is missing');
assert(returnedNotice.includes('report.returned_reason'), 'editor notice does not display the saved return reason');
assert(returnedNotice.includes("report.returned_to"), 'dashboard returned-report list is not scoped to the assigned editor');

assert(workflowSummary.includes("metric('بانتظار المراجعة'"), 'admin pending-review metric is missing');
assert(workflowSummary.includes("metric('متأخر أكثر من 24 ساعة'"), 'admin overdue-review metric is missing');
assert(workflowSummary.includes("metric('معاد للتعديل'"), 'admin returned-report metric is missing');
assert(workflowSummary.includes("metric('معتمد اليوم'"), 'admin approved-today metric is missing');

assert(todayOps.includes("timeZone:'Asia/Hebron'"), 'daily KPI dates are not resolved in Asia/Hebron');
assert(todayOps.includes("metricCard('النفايات'"), 'daily waste KPI is missing');
assert(todayOps.includes("metricCard('الشاحنات'"), 'daily truck KPI is missing');
assert(todayOps.includes("metricCard('السولار'"), 'daily diesel KPI is missing');
assert(todayOps.includes("لا يوجد تقرير أمس للمقارنة"), 'yesterday comparison fallback is missing');
assert(todayOps.includes("% عن أمس"), 'today-versus-yesterday percentage comparison is missing');

assert(reviews.includes('واتساب: تم الاعتماد'), 'review approval WhatsApp action is missing');
assert(reviews.includes('واتساب: إعادة للتعديل'), 'review return WhatsApp action is missing');
assert(adminWhatsApp.includes('https://wa.me/'), 'administrator WhatsApp compose link is missing');

assert(drivePage.includes('معاينة مستقرة V33'), 'Drive import page does not advertise the canonical V33 reader');
assert(drivePage.includes('3.4.0-source-stable-v33'), 'Drive stable-reader cache key is stale');
assert(drivePage.includes('3.4.0-pivot-compat-v33'), 'Drive Pivot compatibility cache key is stale');
assert(drivePage.includes('3.4.0-stations-pivot-v33'), 'Drive canonical Pivot adapter cache key is stale');
assert(drivePage.includes('3.4.0-usage-note-v24'), 'Drive usage-note cache key is stale');
assert(stableShim.includes('معاينة مستقرة V33'), 'stable reader shim still exposes an old version label');
assert(pivotShim.includes('V33 adapter'), 'legacy Pivot shim still points to an old adapter version');
assert(pivotAdapter.includes('/* V33 Pivot adapter:'), 'canonical Pivot adapter is not V33');

console.log('V3.4 regression checks passed: workflow + dashboard + WhatsApp + Drive V33 + restore safety.');
