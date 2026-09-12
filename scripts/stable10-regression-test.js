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
assert(build.includes('js/app-monthly-comparison-stable10.js'), 'Stable 10 monthly comparison override is not registered in the app bundle');

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

const monthlyComparison = read('public/js/app-monthly-comparison-stable10.js');
assert(monthlyComparison.includes("timeZone:'Asia/Jerusalem'"), 'Monthly report comparison must resolve the current date in Asia/Jerusalem');
assert(monthlyComparison.includes("String(monthValue||'')===jerusalemToday().slice(0,7)"), 'Monthly report comparison must only trim the current month');
assert(monthlyComparison.includes('Number(date.slice(8,10))<=elapsedDay'), 'Monthly report previous-month comparison must stop at the same elapsed day');
assert(monthlyComparison.includes("if(!isCurrentMonth(monthValue))return rows;"), 'Historical monthly comparisons must remain full-month comparisons');

const executiveDashboard = read('public/js/app-executive-dashboard.js');
assert(executiveDashboard.includes("timeZone: 'Asia/Jerusalem'"), 'Executive dashboard must use Asia/Jerusalem');
assert(executiveDashboard.includes('day: Number(values.day)'), 'Executive dashboard must expose the Jerusalem elapsed day');
assert(executiveDashboard.includes('Number(date.slice(8, 10)) <= elapsedDay'), 'Executive previous-month data must stop at the same elapsed day');
assert(executiveDashboard.includes('days: currentReports.length'), 'Executive operating days must equal the number of recorded reports');
assert(executiveDashboard.includes('item.monthNumber < currentPeriod.monthNumber'), 'Executive annual best/low/average indicators must use completed months only');
assert(executiveDashboard.includes('متوسط النفايات للشهور المكتملة'), 'Executive annual average label must disclose completed-month basis');
assert(executiveDashboard.includes('${monthLabel(currentRecorded.monthValue)} جزئي حتى اليوم ${elapsedDay}'), 'Executive annual trend must disclose the recorded current month as partial');
assert(executiveDashboard.includes('item.isCurrent ? "*" : ""'), 'Executive annual trend must visually mark the current partial month');
assert(executiveDashboard.includes('const recordedMonths = months.filter((item) => item.days > 0);'), 'Executive annual trend must omit months without reports');
assert(executiveDashboard.includes('class="executive-trend-value"'), 'Executive annual trend must display each monthly waste value');
assert(executiveDashboard.includes('${fmt(item.days)} يوم مسجل'), 'Executive annual trend must display recorded-day count for every month');

const annualComparison = read('public/js/app-annual-comparison.js');
assert(annualComparison.includes('function annualPeriodCutoff(reports, year)'), 'Annual comparison must derive its cutoff from the selected year data');
assert(annualComparison.includes('dates.at(-1).slice(5)'), 'Annual comparison must use the latest recorded date as its cutoff');
assert(annualComparison.includes('return !cutoff || date.slice(5) <= cutoff;'), 'Annual comparison must stop both compared years at the same month/day cutoff');
assert(annualComparison.includes('calculateAnnualTotals(String(previousYear), cutoff)'), 'Annual previous-year totals must use the same elapsed-period cutoff');
assert(annualComparison.includes('في السنتين'), 'Annual comparison title must disclose that both years use the same period');

const annualInsights = read('public/js/app-annual-insights.js');
assert(annualInsights.includes('timeZone: "Asia/Jerusalem"'), 'Annual report insights must resolve the current month in Asia/Jerusalem');
assert(annualInsights.includes('const isCurrentYear = String(year) === currentPeriod.year;'), 'Annual report insights must distinguish the current year from historical years');
assert(annualInsights.includes('item.monthValue < currentPeriod.month'), 'Annual report best/low/average indicators must exclude the current partial month');
assert(annualInsights.includes('للأشهر المكتملة فقط'), 'Annual report monthly average must disclose completed-month basis');
assert(annualInsights.includes('yearWaste / annualReports.length'), 'Annual daily waste average must divide by recorded report days only');
assert(annualInsights.includes('const highestDay = annualReports.reduce'), 'Annual report must calculate the highest recorded waste day');
assert(annualInsights.includes('const lowestDay = annualReports.reduce'), 'Annual report must calculate the lowest recorded waste day');
assert(annualInsights.includes('لأيام التشغيل المسجلة — ${annualReports.length} يوم'), 'Annual daily average must disclose the recorded-day basis');

const annualExport = read('public/js/app-annual-export.js');
assert(annualExport.includes('const daysTotal = reports.length;'), 'Annual CSV operating days must equal the number of recorded reports');
assert(annualExport.includes('dailyWasteAverage = daysTotal ? wasteTotal / daysTotal : 0'), 'Annual CSV daily average must use recorded report days only');
assert(annualExport.includes('const highestDay = reports.reduce'), 'Annual CSV must export the highest recorded waste day');
assert(annualExport.includes('const lowestDay = reports.reduce'), 'Annual CSV must export the lowest recorded waste day');
assert(annualExport.includes('متوسط النفايات اليومي طن/يوم مسجل'), 'Annual CSV must label the recorded-day daily average clearly');
assert(annualExport.includes('Number(report.total_trucks || 0)'), 'Annual CSV must use stored total_trucks values');
assert(annualExport.includes('Number(report.total_diesel || 0)'), 'Annual CSV must use stored total_diesel values');
assert(!annualExport.includes('getReport('), 'Annual CSV must not recalculate totals from report details');
assert(!annualExport.includes('diesel_liters'), 'Annual CSV must not recalculate diesel from equipment details');

const appFinal = read('public/js/app-final.js');
const monthlyExportStart = appFinal.indexOf('async function exportMonthlyCsv()');
const monthlyExportEnd = appFinal.indexOf('function setupMonthlyExportButton()', monthlyExportStart);
assert(monthlyExportStart >= 0 && monthlyExportEnd > monthlyExportStart, 'Monthly CSV export function could not be isolated');
const monthlyExport = appFinal.slice(monthlyExportStart, monthlyExportEnd);
assert(monthlyExport.includes('Number(report.total_trucks || 0)'), 'Monthly CSV must use stored total_trucks values');
assert(monthlyExport.includes('Number(report.total_diesel || 0)'), 'Monthly CSV must use stored total_diesel values');
assert(!monthlyExport.includes('getReport('), 'Monthly CSV must not recalculate totals from report details');
assert(!monthlyExport.includes('diesel_liters'), 'Monthly CSV must not recalculate diesel from equipment details');

const appLoader = read('public/app.js');
assert(appLoader.includes('js/app-monthly-chart-stable10.js'), 'Stored-total monthly chart override must be loaded');
assert(appLoader.includes('3.5.0-20260912-external-diesel-v2'), 'Main asset version must force the external diesel update');
const monthlyChart = read('public/js/app-monthly-chart-stable10.js');
assert(monthlyChart.includes('Number(report.total_trucks || 0)'), 'Monthly trucks chart must use stored total_trucks values');
assert(monthlyChart.includes('Number(report.total_diesel || 0)'), 'Monthly diesel chart must use stored total_diesel values');
assert(!monthlyChart.includes('getReport('), 'Monthly chart override must not fetch report details');
assert(!monthlyChart.includes('diesel_liters'), 'Monthly diesel chart must not recalculate equipment diesel');

const monthlyPrint = read('public/js/app-print-monthly.js');
assert(monthlyPrint.includes('timeZone: "Asia/Jerusalem"'), 'Monthly print must resolve the current month in Asia/Jerusalem');
assert(monthlyPrint.includes('Number(date.slice(8, 10)) <= elapsedDay'), 'Monthly print previous-month comparison must stop at the matching elapsed day');
assert(monthlyPrint.includes('Number(report.total_diesel || 0)'), 'Monthly print must use stored total_diesel values');
assert(!monthlyPrint.includes('calculateDieselFromDetailedReports'), 'Monthly print must not recalculate diesel from equipment details');
assert(!monthlyPrint.includes('dieselByReportId'), 'Monthly print daily diesel rows must use stored report totals');
assert(monthlyPrint.includes('margin-right: -10mm; margin-left: -4mm;'), 'Monthly print footer margins must remain unchanged');
assert(monthlyPrint.includes('width: 202mm; min-width: 202mm; max-width: 202mm;'), 'Monthly print table width must remain 202mm');

const annualPrint = read('public/js/app-print-annual.js');
assert(annualPrint.includes('Number(report.total_trucks || 0)'), 'Annual print must use stored total_trucks values');
assert(annualPrint.includes('Number(report.total_diesel || 0)'), 'Annual print must use stored total_diesel values');
assert(!annualPrint.includes('getReport('), 'Annual print must not recalculate totals from report details');
assert(!annualPrint.includes('diesel_liters'), 'Annual print must not recalculate diesel from equipment details');
assert(annualPrint.includes('margin-right: -10mm; margin-left: -4mm;'), 'Annual print footer margins must remain unchanged');
assert(annualPrint.includes('width: 202mm; min-width: 202mm; max-width: 202mm;'), 'Annual print table width must remain 202mm');

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

const linkedSummaryCss = read('public/period-linked-summary.css');
assert(linkedSummaryCss.includes('.linked-summary-block + .linked-summary-block'), 'Linked summary tables must have visible section separation');
assert(linkedSummaryCss.includes('padding: 8px 10px !important;'), 'Linked summary rows must remain compact on desktop');
assert(linkedSummaryCss.includes('min-width: 680px !important;'), 'Linked summary tables must use the reduced mobile width');

console.log('Stable 10 regression checks passed: port 6000, Jerusalem time, exact daily + matched weekly + elapsed monthly/annual/dashboard/print comparisons, completed-month annual indicators, recorded-day annual averages/high-low day export, stored truck/diesel export/chart/print totals, protected print layout, safe dashboard rendering, stable home layout, Drive guards, equipment route and Web Push.');
