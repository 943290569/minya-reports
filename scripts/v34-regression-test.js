const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function atLeast(version, major, minor) {
  const parts=String(version||'').split('.').map(Number);
  return Number.isFinite(parts[0]) && (parts[0] > major || (parts[0] === major && parts[1] >= minor));
}

const pkg = require('../package.json');
const loader = read('public/app.js');
const drivePage = read('public/drive-import.html');
const driveBundle = read('public/drive-import-bundle.js');
const startServer = read('scripts/start-server.js');
const returnedNotice = read('public/js/app-returned-report-notice.js');
const workflowSummary = read('public/js/app-admin-workflow-summary.js');
const todayOps = read('public/js/app-admin-today-ops.js');
const reviews = read('public/js/app-reviews.js');
const adminWhatsApp = read('public/js/app-admin-whatsapp.js');
const stableShim = read('public/js/app-source-stable-v16.js');
const pivotShim = read('public/js/app-source-pivot-raw-v30.js');
const pivotAdapter = read('public/js/app-source-stations-wide-v9.js');

assert(atLeast(pkg.version,3,4), 'package version must be V3.4.0 or newer');
const assetMatch=loader.match(/MINYA_ASSET_VERSION\s*=\s*"(\d+)\.(\d+)\./);
assert(assetMatch && (Number(assetMatch[1])>3 || (Number(assetMatch[1])===3 && Number(assetMatch[2])>=4)), 'frontend asset version must be V3.4.0 or newer');

assert(startServer.includes('["returned_reason", "TEXT DEFAULT'), 'returned report reason migration is missing');
assert(startServer.includes('["returned_to", "INTEGER"]'), 'returned report editor assignment migration is missing');
assert(startServer.includes('returned_reason=?,returned_at=?,returned_by=?,returned_to=?'), 'return workflow does not persist reason/date/admin/editor');
assert(startServer.includes("returned_reason='',returned_at=NULL,returned_by=NULL,returned_to=NULL"), 'resubmission does not clear old return metadata');
assert(startServer.includes('const restoreCreatedFiles=[];'), 'restore does not track attachment files created during the transaction');
assert(startServer.includes('restoreCreatedFiles.push(stored)'), 'restore does not record newly written attachment files');
assert(startServer.includes('for(const stored of restoreCreatedFiles)safeUnlinkUpload(stored)'), 'failed restore does not clean newly created attachment files');

assert(returnedNotice.includes('أُعيد التقرير للتعديل'), 'editor returned-report notice is missing');
assert(returnedNotice.includes('report.returned_reason'), 'editor notice does not display the saved return reason');
assert(returnedNotice.includes('report.returned_to'), 'dashboard returned-report list is not scoped to the assigned editor');

assert(workflowSummary.includes("metric('بانتظار المراجعة'"), 'admin pending-review metric is missing');
assert(workflowSummary.includes("metric('متأخر أكثر من 24 ساعة'"), 'admin overdue-review metric is missing');
assert(workflowSummary.includes("metric('معاد للتعديل'"), 'admin returned-report metric is missing');
assert(workflowSummary.includes("metric('معتمد اليوم'"), 'admin approved-today metric is missing');

assert(todayOps.includes("timeZone:'Asia/Jerusalem'"), 'daily KPI dates are not resolved in Asia/Jerusalem');
assert(todayOps.includes("metricCard('النفايات'"), 'daily waste KPI is missing');
assert(todayOps.includes("metricCard('الشاحنات'"), 'daily truck KPI is missing');
assert(todayOps.includes("metricCard('السولار'"), 'daily diesel KPI is missing');
assert(todayOps.includes('لا يوجد تقرير أمس للمقارنة'), 'yesterday comparison fallback is missing');
assert(todayOps.includes('% عن أمس'), 'today-versus-yesterday percentage comparison is missing');

assert(reviews.includes('واتساب: تم الاعتماد'), 'review approval WhatsApp action is missing');
assert(reviews.includes('واتساب: إعادة للتعديل'), 'review return WhatsApp action is missing');
assert(adminWhatsApp.includes('https://wa.me/'), 'administrator WhatsApp compose link is missing');

assert(drivePage.includes('معاينة مستقرة V33'), 'Drive import page does not advertise the canonical V33 reader');
assert(drivePage.includes('drive-import-bundle.js?v='), 'Drive JavaScript bundle is missing');
assert(drivePage.includes('drive-import-bundle.css?v='), 'Drive stylesheet bundle is missing');
assert(driveBundle.includes('js/app-source-stable-v16.js'), 'Drive stable reader is missing from the bundle');
assert(driveBundle.includes('js/app-source-pivot-raw-v30.js'), 'Drive Pivot compatibility layer is missing from the bundle');
assert(driveBundle.includes('js/app-source-stations-wide-v9.js'), 'Drive canonical Pivot adapter is missing from the bundle');
assert(driveBundle.includes('js/app-source-usage-note-v22.js'), 'Drive usage note is missing from the bundle');
assert(stableShim.includes('معاينة مستقرة V33'), 'stable reader shim still exposes an old version label');
assert(pivotShim.includes('V33 adapter'), 'legacy Pivot shim still points to an old adapter version');
assert(pivotAdapter.includes('/* V33 Pivot adapter:'), 'canonical Pivot adapter is not V33');

console.log('V3.4 compatibility regression checks passed: workflow + dashboard + WhatsApp + Drive V33 + restore safety.');
