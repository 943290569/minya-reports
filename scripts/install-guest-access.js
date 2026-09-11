const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const serverPath=path.join(root,'server.js');
const appPath=path.join(root,'public','app.js');

let server=fs.readFileSync(serverPath,'utf8');
const serverNeedle='require("./driver-licenses")(app,{db,requireAuth,requireRole,audit,uploadsDir});';
const serverInsert='require("./guest-access")(app,{db,requireRole,audit,COOKIE_SECURE});';
if(!server.includes(serverInsert)){
  if(!server.includes(serverNeedle)) throw new Error('driver-licenses mount point not found');
  server=server.replace(serverNeedle,`${serverNeedle}\n${serverInsert}`);
  fs.writeFileSync(serverPath,server,'utf8');
}

let app=fs.readFileSync(appPath,'utf8');
const appNeedle='  "js/app-admin-users.js",';
const appInsert='  "js/app-guest-links.js",';
if(!app.includes(appInsert)){
  if(!app.includes(appNeedle)) throw new Error('admin users module point not found');
  app=app.replace(appNeedle,`${appNeedle}\n${appInsert}`);
  fs.writeFileSync(appPath,app,'utf8');
}

console.log('Guest viewer links installed.');
