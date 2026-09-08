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

console.log('Stable 10 regression checks passed: port 6000, runtime wrapper, Jerusalem time, Drive guards, equipment route and Web Push.');
