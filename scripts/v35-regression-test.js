const fs=require('fs');

function read(path){return fs.readFileSync(path,'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}

const health=read('public/js/app-admin-system-health.js');
const build=read('scripts/build-app-bundle.js');
const bundle=read('public/app-bundle.js');
const startServer=read('scripts/start-server.js');
const driveImport=read('public/drive-import.html');
const driveBundle=read('public/drive-import-bundle.js');

assert(health.includes("window.MINYA_USER?.role==='admin'"),'system health dashboard is not restricted to admins');
assert(health.includes("api('/api/system/integrity')"),'system health dashboard does not read integrity status');
assert(health.includes("api('/api/system/storage')"),'system health dashboard does not read storage status');
assert(health.includes("api('/api/backups')"),'system health dashboard does not read backup status');
assert(health.includes("integrity.missing_attachments?.length"),'missing attachment problems are not included');
assert(health.includes("integrity.invalid_attachment_paths?.length"),'invalid attachment paths are not included');
assert(health.includes("integrity.orphan_files?.length"),'orphan attachment files are not included');
assert(health.includes("integrity.reports_without_operations"),'reports without operations are not included');
assert(health.includes("integrity.reports_without_equipment"),'reports without equipment are not included');
assert(health.includes("metric('تقارير بدون عمليات'"),'reports-without-operations metric is missing');
assert(health.includes("metric('تقارير بدون معدات'"),'reports-without-equipment metric is missing');
assert(health.includes("href=\"/system.html\""),'system health dashboard does not link to system management');
assert(build.includes('const adminSystemHealthModule = "js/app-admin-system-health.js"'),'system health module is not registered in the build');
assert(build.includes('modulePaths.splice(todayOpsIndex >= 0 ? todayOpsIndex + 1'),'system health module order is not deterministic');
assert(bundle.includes('/* ===== js/app-admin-system-health.js ===== */'),'system health module is missing from generated bundle');

assert(startServer.includes('if(cleanName.length>255)'), 'production attachment upload does not validate file-name length');
assert(startServer.includes('if(/[\\\\/\\u0000-\\u001F\\u007F]/.test(cleanName))'), 'production attachment upload does not reject unsafe file-name characters');
assert(startServer.includes('try{encodeURIComponent(cleanName);}catch'), 'production attachment upload does not reject unencodable file names');
assert(startServer.includes('if(!validateMimeType(cleanMime))'), 'production attachment upload does not validate MIME type');
assert(startServer.includes('const buffer=decodeStrictBase64(rawBase64)'), 'production attachment upload does not strictly validate Base64');
assert(startServer.includes('if(buffer.length>MAX_ATTACHMENT_BYTES)'), 'production attachment upload does not use the shared attachment size limit');
assert(startServer.includes('new Set(["application/pdf","image/jpeg","image/png","image/gif","image/webp","text/plain"])'), 'safe inline attachment MIME allowlist is missing');
assert(startServer.includes('safeInline?requestedMime:"application/octet-stream"'), 'unsafe attachment MIME types are not forced to binary download');
assert(startServer.includes('safeInline?"inline":"attachment"'), 'unsafe attachment MIME types are not forced to attachment disposition');

assert(startServer.includes('const reportDate=String(r.report_date||"").trim()'), 'backup validation does not normalize report dates');
assert(startServer.includes('parsedDate.toISOString().slice(0,10)!==reportDate'), 'backup validation does not reject impossible calendar dates');
assert(startServer.includes('const numericChecks=[["temperature",false],["total_trucks",true],["total_waste_tons",true],["total_diesel",true]]'), 'backup validation numeric field checks are missing');
assert(startServer.includes('field==="total_trucks"&&!Number.isInteger(n)'), 'backup validation does not require integer truck totals');
assert(startServer.includes('approved_by_name,returned_reason,returned_at,returned_by,returned_to)'), 'restore insert does not include returned-report fields');
assert(startServer.includes('r.returned_reason||"",r.returned_at||null,r.returned_by||null,r.returned_to||null'), 'restore does not write returned-report metadata values');

assert(driveImport.includes('معاينة مستقرة V33'),'Drive import stable badge is not V33');
assert(driveImport.includes('drive-import-bundle.js?v='),'Drive JavaScript bundle is missing');
assert(driveBundle.includes('js/app-source-stable-v16.js'),'canonical stable source parser is missing');
assert(driveBundle.includes('js/app-source-pivot-raw-v30.js'),'pivot compatibility parser is missing');
assert(driveBundle.includes('js/app-source-stations-wide-v9.js'),'station parser is missing');
const forbiddenDriveScripts=['app-source-pivot-raw-v29.js','app-source-landfill-flat-v31.js','app-source-stable-disabled-v31.js','app-source-summary-final-v12.js','app-source-summary-final-v13.js','app-source-approve-v1.js','app-source-approve-v2.js','app-source-landfill-dedupe-v61.js'];
for(const legacy of forbiddenDriveScripts)assert(!driveBundle.includes(legacy),`legacy Drive parser is active again: ${legacy}`);

console.log('V3.5 regression checks passed: admin health + report quality + strict attachments + safe backup/restore + Drive V33 parser isolation.');
