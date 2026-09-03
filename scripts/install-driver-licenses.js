const fs=require('fs');
function patch(path,find,repl){let s=fs.readFileSync(path,'utf8');if(s.includes(repl))return false;if(!s.includes(find))throw new Error(`Marker not found: ${path}`);s=s.replace(find,repl);fs.writeFileSync(path,s);return true;}
patch('server.js','app.use(express.static(path.join(__dirname, "public")));','app.use(express.static(path.join(__dirname, "public")));\nrequire("./driver-licenses")(app,{db,requireAuth,requireRole,audit,uploadsDir});');
patch('public/js/app-v3-pages.js','const items=[["/equipment","المعدات"],["/weekly","الأسبوعي"],["/search","بحث متقدم"],["/managerial","تقرير إداري"],["/admin","الإدارة"]];','const items=[["/equipment","المعدات"],["/drivers-licenses.html","رخص السائقين"],["/weekly","الأسبوعي"],["/search","بحث متقدم"],["/managerial","تقرير إداري"],["/admin","الإدارة"]];');
console.log('Driver licenses integration installed.');
