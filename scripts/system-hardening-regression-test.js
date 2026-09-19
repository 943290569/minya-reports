const fs=require('node:fs');
function assert(condition,message){if(!condition)throw new Error(message);}

const monthly=fs.readFileSync('monthly-entry.js','utf8');
const monthlyUi=fs.readFileSync('public/monthly-entry-full-grid.js','utf8');
const form=fs.readFileSync('public/js/app-form.js','utf8');
const diesel=fs.readFileSync('public/js/app-external-diesel.js','utf8');
const today=fs.readFileSync('public/js/app-today-dashboard.js','utf8');
const integrity=fs.readFileSync('public/js/app-system-integrity.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const css=fs.readFileSync('public/review-improvements.css','utf8');
const systemHtml=fs.readFileSync('public/system.html','utf8');

assert(monthly.includes('function monthlyNameKey(value)'), 'Monthly backend legacy-name normalization missing');
assert(monthlyUi.includes('function nameKey(value)')&&monthlyUi.includes('findNamed(src,nameKey,d[nameKey])'), 'Monthly UI flexible field matching missing');
assert(form.includes('LOCAL_REPORT_DRAFT_KEY')&&form.includes('restoreLocalReportDraft')&&form.includes('getReportInputWarnings'), 'Full daily-report draft or anomaly checks missing');
assert(form.includes('Math.abs(waste - wasteMedian) / wasteMedian >= 0.5'), 'Daily report anomaly threshold missing');
assert(diesel.includes('repeatedInput')&&diesel.includes('possibleExisting'), 'External diesel duplicate checks missing');
assert(today.includes('pairedMonth')&&today.includes('pairedYear')&&today.includes('يومًا متقابلًا'), 'Matched-day dashboard comparisons missing');
assert(server.includes('missingReportDates')&&server.includes('suspiciousZeroReports')&&server.includes('totalsMismatches'), 'System integrity report diagnostics missing');
assert(server.includes('latestBackupValid')&&server.includes('validateBackupObject(parsed)'), 'Latest backup validation missing');
assert(integrity.includes('integrityExtended')&&integrity.includes('صلاحية آخر نسخة'), 'Extended integrity UI missing');
assert(css.includes('@media screen and (max-width:760px)')&&css.includes('@media print')&&css.includes('content-visibility:auto'), 'Mobile, print, or performance CSS hardening missing');
const systemJs=fs.readFileSync('public/js/app-system.js','utf8');
assert(server.includes('const AUTO_BACKUP_RETENTION_COUNT = 3;'), 'Backup retention must keep only the newest 3 files');
assert(server.includes('app.delete("/api/backups/:name"')&&server.includes('DELETE_SAVED_BACKUP'), 'Admin backup delete endpoint or audit log is missing');
assert(systemJs.includes('data-backup-delete')&&systemJs.includes('method: "DELETE"'), 'Backup delete button behavior is missing');
assert(systemHtml.includes('آخر 3 نسخ تلقائية')&&!systemHtml.includes('آخر 5 نسخ تلقائية')&&!systemHtml.includes('آخر 10 نسخ تلقائية'), 'Backup retention copy must match server retention of 3');
console.log('System hardening regression checks passed.');
