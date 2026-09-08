const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'public', 'js', 'app-drive-import.js');
const source = fs.readFileSync(file, 'utf8').replace(/\}\)\(\);\s*$/, 'globalThis.__driveImportTest={dateIso,parseDailySheet};})();');
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById() { return null; } },
  window: {},
  location: { pathname: '/drive-import.html' },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch: async () => { throw new Error('Network access is not expected in parser tests'); },
};
sandbox.window = sandbox;
sandbox.XLSX = { utils: { sheet_to_json: rows => rows } };
vm.createContext(sandbox);
new vm.Script(source, { filename: 'app-drive-import.js' }).runInContext(sandbox);

const { dateIso, parseDailySheet } = sandbox.__driveImportTest;
function assert(condition, message) { if (!condition) throw new Error(message); }

assert(dateIso('01112025') === '2025-11-01', 'compact sheet date was not parsed');
assert(dateIso('1/11/25') === '2025-11-01', 'two-digit year date was not parsed');
assert(dateIso('31/02/2025') === '', 'impossible date was accepted');

const rows = Array.from({ length: 40 }, () => []);
rows[1] = ['01/11/25', 'التقرير اليومي لمهام العمل داخل مكب المنيا'];
rows[2] = ['حالة الطقس', 'مشمس', '', '', 27, 'درجة الحرارة'];
rows[4] = ['طواقم العمل', '', 'موقع العمل مكب نفايات المنيا'];
rows[5] = ['سائقين جرافات واليات', '', 4];
rows[11] = ['المجموع', '', 4];
rows[14] = ['موقع مكب المنيا', 'وقت البداية', 'وقت النهاية', 'عدد المركبات', 'الكمية', 'الوحدة'];
rows[15] = ['مكب نفايات المنيا', '4:00 AM', '7:00 PM', 90, 919.13, 'طن'];
rows[16] = ['مواد التغطية (طمم)', '', '', 3, 20, 'نقلة'];
rows[24] = ['موقع محطات الترحيل', '', '', 'عدد الشاحنات', 'الكمية', 'الوحدة'];
rows[25] = ['محطة ترحيل ترقوميا', '', '', 5, 78.82, 'طن'];
rows[26] = ['محطة ترحيل يطا', '', '', 12, 372.32, 'طن'];
rows[29] = ['كميات النفايات الواردة لمكب المنيا', '', '', 'عدد الشاحنات', 'الكمية النهائية', 'الوحدة'];
rows[30] = ['المجموع النهائي', '', '', 107, 1370.27, 'طن'];
rows[33] = ['اسم الالية', 'حالة الالية', 'وصف العطل', '', '', 'كمية السولار'];
rows[34] = ['مدحلة نفايات 2024', 'يعمل', '-', '', '', 250];
rows[35] = ['مجموع كمية السولار', '', '', '', '', 250];

const parsed = parseDailySheet('01112025', rows);
assert(parsed.report_date === '2025-11-01', 'daily sheet date was lost');
assert(parsed.issues.length === 0, `valid daily sheet reported issues: ${parsed.issues.join(', ')}`);
assert(parsed.operations[0].vehicle_count === 90, 'operation vehicle count was lost');
assert(parsed.stations.reduce((sum, row) => sum + row.truck_count, 0) === 17, 'station truck counts were lost');
assert(parsed.total_trucks === 107, 'final truck total is incorrect');
assert(parsed.total_waste_tons === 1370.27, 'final waste total is incorrect');

const fallbackRows = rows.map(row => [...row]);
fallbackRows[30] = [];
const fallback = parseDailySheet('01112025', fallbackRows);
assert(fallback.total_trucks === 107, `fallback truck total must use landfill + stations only, got ${fallback.total_trucks}`);
assert(fallback.total_waste_tons === 1370.27, `fallback waste total must use landfill + stations only, got ${fallback.total_waste_tons}`);
assert(fallback.operations.some(row => row.operation_name === 'مواد التغطية (طمم)' && row.vehicle_count === 3), 'support-operation vehicle count should remain in operation details');

console.log('Drive import regression checks passed: compact dates + canonical totals + fallback excludes support-operation vehicles.');
