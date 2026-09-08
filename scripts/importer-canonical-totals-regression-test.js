const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function assert(c,m){if(!c)throw new Error(m);}

const drive=read('public/js/app-drive-import.js');
assert(drive.includes("const landfill=operations.find(x=>normalize(x.operation_name)===normalize('مكب نفايات المنيا'))"),'Direct Drive importer must match the landfill operation exactly');
assert(drive.includes('const totalTrucks=num(landfill?.vehicle_count)+stations.reduce'),'Direct Drive importer trucks must equal landfill vehicles plus station trucks');
assert(drive.includes('const totalWaste=num(landfill?.quantity)+stations.reduce'),'Direct Drive importer waste must equal landfill waste plus station waste');
assert(drive.includes('const totalDiesel=equipment.reduce'),'Direct Drive importer diesel must be summed from equipment details');
assert(!drive.includes("const finalRow=findRow(rows,'المجموع النهائي')"),'Direct Drive importer must not trust the Excel final-total row');
assert(!drive.includes("if(normalize(name).includes('مجموع كميه السولار')){totalDiesel="),'Direct Drive importer must not trust the Excel diesel-total row');

const raw=read('public/js/app-source-files-import.js');
assert(raw.includes("const incomingKeys=['localAuthorities','settlements','individuals','companies','otherWaste']"),'Raw source importer incoming waste must use only canonical waste buckets');
assert(!raw.match(/incomingKeys=.*leachate/),'Raw source importer must exclude leachate from incoming waste');
assert(!raw.match(/incomingKeys=.*externalFill/),'Raw source importer must exclude external fill from incoming waste');
assert(raw.includes('d.stations.yata.trucks++;d.stations.yata.tons+=qty;d.azizAddedToYata.trucks++;d.azizAddedToYata.tons+=qty;'),'Aziz must be added to Yata exactly in the raw importer');
assert(raw.includes('if(!eq){state.ignoredDieselNames.add(raw);continue;}'),'Raw source importer must ignore diesel rows not mapped to landfill equipment');

console.log('Importer canonical totals regression checks passed.');
