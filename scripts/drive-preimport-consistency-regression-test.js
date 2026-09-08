const fs=require('fs');
const src=fs.readFileSync('public/js/app-drive-preimport-consistency.js','utf8');
function assert(c,m){if(!c)throw new Error(m);}

assert(src.includes("const LANDFILL_OPERATION=norm('مكب نفايات المنيا');"),'Canonical landfill operation constant is missing');
assert(src.includes('if(name===LANDFILL_OPERATION){'),'Pre-import guard must match the landfill operation exactly');
assert(src.includes("else if(name.includes('محطه ترحيل'))"),'Pre-import guard must include transfer stations');
assert(!src.includes("if(name.includes('مكب نفايات المنيا'))"),'Pre-import guard must not use a loose landfill-operation match');
assert(src.includes("numberAfter('عدد المركبات',s)"),'Landfill vehicle count must be read from the landfill operation');
assert(src.includes("numberAfter('عدد الشاحنات',s)"),'Station truck count must be read from transfer stations');
assert(!src.includes("name.includes('مواد التغطيه')"),'Cover-operation vehicles must not be added to total trucks');
assert(!src.includes("name.includes('كميات المياه')"),'Water-operation vehicles must not be added to total trucks');
assert(!src.includes("name.includes('كميات العصاره')"),'Leachate-operation vehicles must not be added to total trucks');
assert(src.includes('if(!same(total.trucks,detail.trucks))'),'Truck mismatch must remain blocking');
assert(src.includes('if(!same(total.waste,detail.waste))'),'Waste mismatch must remain blocking');
assert(src.includes('if(!same(total.diesel,detail.diesel))dieselWarnings.push'),'Diesel mismatch must remain a warning');
assert(src.includes('هذا لا يمنع الاستيراد تلقائيًا'),'Diesel warning must explicitly remain non-blocking');
console.log('Drive pre-import consistency regression checks passed.');
