const fs = require('fs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync('monthly-entry.js', 'utf8');
assert(source.includes('function loadDailyReportRows(month, stagedDates)'), 'daily-report fallback loader is missing');
assert(source.includes('function hasMeaningfulData(row)'), 'empty staged rows are not distinguished from saved rows');
assert(source.includes('FROM daily_reports WHERE report_date LIKE ?'), 'monthly loader does not read saved daily reports');
assert(source.includes('FROM crews WHERE report_id IN'), 'monthly loader does not read saved crews');
assert(source.includes('FROM operations WHERE report_id IN'), 'monthly loader does not read saved operations');
assert(source.includes('FROM transfer_stations WHERE report_id IN'), 'monthly loader does not read saved transfer stations');
assert(source.includes('FROM equipment WHERE report_id IN'), 'monthly loader does not read saved equipment');
assert(source.includes("source: 'daily-report'"), 'daily-report rows are not marked as fallback data');
assert(source.includes('rows.filter(x=>hasMeaningfulData(x.data))'), 'only meaningful staged rows should take precedence');
assert(source.includes('rows.filter(x=>!fallbackDates.has(x.report_date))'), 'empty staged rows are not replaced by daily report rows');
assert(source.includes('rows:[...rows.filter(x=>!fallbackDates.has(x.report_date)),...fallbackRows].sort'), 'monthly API does not merge and sort both data sources');
assert(source.includes('auto: { water: false, workday: false }'), 'saved daily values may be overwritten by automatic rules on load');
console.log('Monthly entry regression checks passed: saved daily report values are loaded without overwriting staged monthly rows.');
