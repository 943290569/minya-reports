const fs=require('fs');

function read(path){return fs.readFileSync(path,'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}

const health=read('public/js/app-admin-system-health.js');
const build=read('scripts/build-app-bundle.js');
const bundle=read('public/app-bundle.js');

assert(health.includes("window.MINYA_USER?.role==='admin'"),'system health dashboard is not restricted to admins');
assert(health.includes("api('/api/system/integrity')"),'system health dashboard does not read integrity status');
assert(health.includes("api('/api/system/storage')"),'system health dashboard does not read storage status');
assert(health.includes("api('/api/backups')"),'system health dashboard does not read backup status');
assert(health.includes("integrity.missing_attachments?.length"),'missing attachment problems are not included');
assert(health.includes("integrity.invalid_attachment_paths?.length"),'invalid attachment paths are not included');
assert(health.includes("integrity.orphan_files?.length"),'orphan attachment files are not included');
assert(health.includes("href=\"/system.html\""),'system health dashboard does not link to system management');
assert(build.includes('const adminSystemHealthModule = "js/app-admin-system-health.js"'),'system health module is not registered in the build');
assert(build.includes('modulePaths.splice(todayOpsIndex >= 0 ? todayOpsIndex + 1'),'system health module order is not deterministic');
assert(bundle.includes('/* ===== js/app-admin-system-health.js ===== */'),'system health module is missing from generated bundle');

console.log('V3.5 regression checks passed: admin-only health dashboard + integrity + backup + storage visibility.');
