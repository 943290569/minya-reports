const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }

const ecosystem = read('ecosystem.config.js');
assert(/script:\s*['"]scripts\/start-server\.js['"]/.test(ecosystem), 'PM2 must run scripts/start-server.js');
assert(/PORT:\s*6000\b/.test(ecosystem), 'Production PM2 port must remain 6000');

const build = read('scripts/build-app-bundle.js');
for (const moduleName of [
  'js/app-drive-preimport-consistency.js',
  'js/app-drive-postimport-verify.js',
  'js/app-drive-pre-replace-backup.js'
]) {
  assert(build.includes(`"${moduleName}"`), `Drive bundle is missing ${moduleName}`);
}

const smartOps = read('public/js/app-smart-operations-free.js');
assert(smartOps.includes("timeZone:'Asia/Jerusalem'"), 'Smart operations must use Asia/Jerusalem');
assert(smartOps.includes("href:'/equipment'"), 'Equipment follow-up route must remain /equipment');

const todayDashboard = read('public/js/app-today-dashboard.js');
assert(todayDashboard.includes("timeZone:'Asia/Jerusalem'"), 'Today dashboard must use Asia/Jerusalem');
assert(todayDashboard.includes('function esc('), 'Today dashboard must escape equipment text');
assert(todayDashboard.includes("esc(x.equipment_name||x.name||'معدة')"), 'Today dashboard equipment name must be escaped');

const adminToday = read('public/js/app-admin-today-ops.js');
assert(adminToday.includes("timeZone:'Asia/Jerusalem'"), 'Admin daily KPIs must use Asia/Jerusalem');
assert(!adminToday.includes("timeZone:'Asia/Hebron'"), 'Admin daily KPIs must not use the Hebron alias');

const operationalSummaries = read('public/js/app-operational-summaries.js');
assert(operationalSummaries.includes("timeZone:'Asia/Jerusalem'"), 'Operational summaries must use Asia/Jerusalem');
assert(operationalSummaries.includes('const yesterday=dateMinus(today,1)'), 'Daily operational comparison must use yesterday exactly');
assert(operationalSummaries.includes("String(r.report_date||'')===yesterday"), 'Daily operational comparison must not fall back to an older report');
assert(operationalSummaries.includes('const prior=previousByDate.get(dateMinus(currentDate,7))'), 'Weekly comparison must match each current day to the same weekday one week earlier');
assert(operationalSummaries.includes('return {current,previous,matchedDays:current.length};'), 'Weekly comparison must only compare matched day pairs');
assert(operationalSummaries.includes('المقارنة مبنية على ${comparison.matchedDays} يوم متطابق'), 'Weekly comparison must disclose how many matched days were used');
assert(operationalSummaries.includes('const elapsedDay=Number(today.slice(8,10))'), 'Operational monthly comparison must use the same elapsed days from the previous month');
assert(operationalSummaries.includes('Number(date.slice(8,10))<=elapsedDay'), 'Operational previous-month rows must stop at the matching elapsed day');
assert(operationalSummaries.includes('Math.abs(pct)<0.05'), 'Operational trend stability threshold must remain aligned with monthly/annual reports');

const smartMonthlyCompare = read('public/js/app-smart-monthly-compare.js');
assert(smartMonthlyCompare.includes("timeZone:'Asia/Jerusalem'"), 'Smart monthly comparison must use Asia/Jerusalem');
assert(smartMonthlyCompare.includes('elapsedDay=Number(today.slice(8,10))'), 'Smart monthly comparison must use the same elapsed days from the previous month');
assert(smartMonthlyCompare.includes('Number(date.slice(8,10))<=elapsedDay'), 'Smart previous-month rows must stop at the matching elapsed day');
assert(smartMonthlyCompare.includes('Math.abs(pctx)<.05'), 'Smart monthly stability threshold must remain aligned with the reports');

const annualComparison = read('public/js/app-annual-comparison.js');
assert(annualComparison.includes('timeZone: "Asia/Jerusalem"'), 'Annual comparison must resolve the current date in Asia/Jerusalem');
assert(annualComparison.includes('return Number(year) === currentYear ? today.slice(5) : null;'), 'Annual comparison must limit only the current year to the elapsed period');
assert(annualComparison.includes('return !cutoff || date.slice(5) <= cutoff;'), 'Annual comparison must stop both compared years at the same month/day cutoff');
assert(annualComparison.includes('calculateAnnualTotals(String(previousYear), cutoff)'), 'Annual previous-year totals must use the same elapsed-period cutoff');

const homeLayout = read('public/js/app-home-layout-stable10.js');
assert(homeLayout.includes('MutationObserver'), 'Home layout must react to dynamically inserted sections');
assert(!homeLayout.includes('setInterval('), 'Home layout must not continuously reorder the DOM');

const auth = read('public/js/app-auth.js');
assert(auth.includes('stable10-free5'), 'Smart operations cache version must be current');
assert(auth.includes('stable10-home2'), 'Home layout cache version must be current');

const server = read('server.js');
assert(server.includes('"/equipment"'), 'Server must expose the /equipment app route');

const startServer = read('scripts/start-server.js');
assert(startServer.includes('require("./web-push-notifications")'), 'Runtime wrapper must load web push notifications');

const preGuard = read('public/js/app-drive-preimport-consistency.js');
assert(preGuard.includes('تم إيقاف الاعتماد حفاظًا على البيانات'), 'Pre-import consistency guard is missing');

const postGuard = read('public/js/app-drive-postimport-verify.js');
assert(postGuard.includes('تم التحقق بعد الحفظ'), 'Post-import verification is missing');

const replaceBackup = read('public/js/app-drive-pre-replace-backup.js');
assert(replaceBackup.includes('/api/backup/download'), 'Pre-replace backup must use the authenticated full-backup endpoint');
assert(replaceBackup.includes('تم إيقاف الاستبدال ولم يتم تغيير أي تقرير'), 'Replacement must stop when backup creation fails');

console.log('Stable 10 regression checks passed: port 6000, Jerusalem time, exact daily + matched weekly + elapsed monthly/annual comparisons, safe dashboard rendering, stable home layout, Drive guards, equipment route and Web Push.');
