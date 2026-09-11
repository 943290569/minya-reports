const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const startPath=path.join(root,'scripts','start-server.js');
const appPath=path.join(root,'public','app.js');
let start=fs.readFileSync(startPath,'utf8');
if(!start.includes('monthly-close')){
  const needle='require("./monthly-entry-live-fix")(app,{db,requireAuth});\\n';
  if(!start.includes(needle))throw new Error('monthly mount point missing');
  start=start.replace(needle,'require("./monthly-close")(app,{db,requireRole,audit});\\n'+needle);
  fs.writeFileSync(startPath,start,'utf8');
}
let app=fs.readFileSync(appPath,'utf8');
if(!app.includes('js/app-monthly-close.js')){
  const needle='  "js/app-monthly.js",';
  if(!app.includes(needle))throw new Error('monthly UI mount point missing');
  app=app.replace(needle,needle+'\n  "js/app-monthly-close.js",');
}
app=app.replace('3.5.0-20260908-stable10-summary3','3.5.0-20260911-month-close1');
fs.writeFileSync(appPath,app,'utf8');
console.log('Monthly close installed');
