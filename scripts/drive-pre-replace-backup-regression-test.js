const fs = require('fs');

const source = fs.readFileSync('public/js/app-drive-pre-replace-backup.js', 'utf8');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("fetch('/api/backup/download',{cache:'no-store'})"), 'Pre-replace backup must fetch the authenticated full backup');
assert(source.includes('if(!response.ok||!data)throw new Error'), 'Backup download failure must throw before replacement can continue');
assert(source.includes("if(busy){\n      event.preventDefault();\n      event.stopImmediatePropagation();\n      return;\n    }"), 'Repeated approval clicks must be blocked while backup is in progress');

const handleStart = source.indexOf('async function handle(event)');
const handleEnd = source.indexOf('function init()', handleStart);
assert(handleStart >= 0 && handleEnd > handleStart, 'Pre-replace backup handler could not be isolated');
const handle = source.slice(handleStart, handleEnd);

const backupIndex = handle.indexOf('await downloadBackup();');
const bypassIndex = handle.indexOf('bypass=true;');
const clickIndex = handle.indexOf('btn.click();');
const catchIndex = handle.indexOf('}catch(error){');
assert(backupIndex >= 0, 'Replacement handler must await backup completion');
assert(bypassIndex > backupIndex, 'Replacement bypass must only be enabled after backup completes');
assert(clickIndex > bypassIndex, 'Synthetic approval click must only occur after successful backup and bypass activation');
assert(catchIndex > clickIndex, 'Backup failure path must surround the continuation path');
assert(handle.includes('تم إيقاف الاستبدال ولم يتم تغيير أي تقرير.'), 'Backup failure must explicitly stop replacement');

const catchBlock = handle.slice(catchIndex);
assert(!catchBlock.includes('bypass=true;'), 'Backup failure path must not enable bypass');
assert(!catchBlock.includes('btn.click();'), 'Backup failure path must not retry approval');

console.log('Drive pre-replace backup regression checks passed: repeated clicks are blocked and replacement only continues after successful backup.');
