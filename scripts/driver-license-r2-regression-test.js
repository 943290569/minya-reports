const fs=require('fs');
function need(file,text){const source=fs.readFileSync(file,'utf8');if(!source.includes(text))throw new Error(`${file} missing ${text}`);}
need('driver-licenses.js',"require('./r2-storage')");
need('driver-licenses.js',"image_storage='r2'");
need('driver-licenses.js',"r2SignedUrl('GET'");
need('driver-licenses.js','await r2PutObject');
need('driver-licenses.js','await r2DeleteObject');
need('scripts/migrate-driver-licenses-to-r2.js','local_backup');
need('r2-storage.js',"'UNSIGNED-PAYLOAD'");
console.log('Driver license R2 regression: OK');
