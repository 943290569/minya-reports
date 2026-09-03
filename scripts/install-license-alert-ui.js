const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
function patch(rel,fn){const p=path.join(root,rel);const old=fs.readFileSync(p,'utf8');const next=fn(old);if(next===old){console.log(rel+': no change');return;}fs.writeFileSync(p,next);console.log(rel+': updated');}
patch('public/app.js',s=>{
  s=s.replace('const MINYA_ASSET_VERSION = "3.3.0-20260830-v25";','const MINYA_ASSET_VERSION = "3.3.0-20260903-v26";');
  if(!s.includes('"js/app-driver-license-badge.js"'))s=s.replace('  "js/app-v3-pages.js",','  "js/app-v3-pages.js",\n  "js/app-driver-license-badge.js",');
  return s;
});
patch('public/drivers-licenses.html',s=>{
  s=s.replace(/background:#fff7ed;border:1px solid #fdba74;color:#9a3412/g,'background:#fef2f2;border:1px solid #ef4444;color:#b91c1c');
  if(!s.includes('app-driver-license-badge.js'))s=s.replace('</body>','<script src="js/app-driver-license-badge.js?v=drivers-v7"></script></body>');
  return s.replace(/drivers-v6/g,'drivers-v7');
});
patch('public/js/app-driver-licenses.js',s=>{
  s=s.replace('style=\\"background:#fff7ed\\"','style=\\"background:#fef2f2\\"');
  s=s.replace('<div><span>15 يوم أو أقل</span><strong>${urgent.length}</strong></div>','<div style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c"><span>15 يوم أو أقل</span><strong>${urgent.length}</strong></div>');
  s=s.replace("async function load(){const d=await api('/api/driver-licenses');rows=d.rows||[];render();}","async function load(){const d=await api('/api/driver-licenses');rows=d.rows||[];render();window.dispatchEvent(new Event('driver-licenses-updated'));}");
  return s;
});
