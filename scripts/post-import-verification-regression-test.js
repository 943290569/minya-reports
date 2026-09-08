const fs = require('fs');

const source = fs.readFileSync('public/js/app-drive-postimport-verify.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes('let activeObserver=null;'), 'Post-import verification must track one active observer');
assert(source.includes('let verificationInFlight=false;'), 'Post-import verification must lock while verification is running');
assert(source.includes('if(activeObserver||verificationInFlight)return;'), 'Repeated approval clicks must not arm duplicate verification');
assert(source.includes('const byDate=new Map();'), 'Selected verification snapshots must be unique by report date');
assert(source.includes('if(s.date)byDate.set(s.date,s);'), 'Each report date must map to one verification snapshot');
assert(source.includes("new Map((listing.reports||[]).filter(x=>x.report_date&&x.id).map(x=>[String(x.report_date),Number(x.id)]))"), 'Saved reports must be indexed by exact report_date');
assert(source.includes('const id=ids.get(src.date);'), 'Each snapshot must resolve the saved report by its exact date');
assert(source.includes('finally{verificationInFlight=false;}'), 'Verification lock must be released after the verification finishes');

console.log('Post-import verification regression checks passed: one observer per batch, one snapshot per date, exact saved-date matching.');
