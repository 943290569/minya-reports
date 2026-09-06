const fs=require('fs');
const path=require('path');

const dir=path.join(process.cwd(),'.github','workflows');
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/\.ya?ml$/i.test(name)):[];

function assert(condition,message){if(!condition)throw new Error(message);}

for(const name of files){
  const source=fs.readFileSync(path.join(dir,name),'utf8');
  const targetsMain=/branches\s*:\s*\[[^\]]*\bmain\b[^\]]*\]/m.test(source)||/branches\s*:\s*\n\s*-\s*main\b/m.test(source);
  if(!targetsMain) continue;
  const writesContents=/contents\s*:\s*write\b/m.test(source);
  const pushes=/\bgit\s+push\b/m.test(source);
  assert(!(writesContents||pushes),`${name} must not auto-write or git push on main`);
}

console.log('Workflow safety checks passed: main workflows are read-only.');
