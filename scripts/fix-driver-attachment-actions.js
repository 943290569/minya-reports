const fs=require('fs');
const p='public/js/app-driver-licenses.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace("async function delImage(){if(!current||!current.has_image)return;if(!confirm('حذف صورة الرخصة الحالية؟'))return;try{await api(`/api/driver-licenses/${current.id}/image`,{method:'DELETE'});await load();await openOne(current.id);}catch(e){$('licenseMsg').textContent=e.message;}}",`async function openImage(){
 if(!current){$('licenseMsg').textContent='اختر موظفًا أولًا';return;}
 if(!current.has_image){$('licenseMsg').textContent='لا يوجد مرفق حالي لهذا الموظف';return;}
 try{
  $('licenseMsg').textContent='جاري فتح المرفق...';
  const r=await fetch(\`/api/driver-licenses/\${current.id}/image\`,{cache:'no-store'});
  if(!r.ok){let m='تعذر فتح المرفق';try{const d=await r.json();m=d.message||m;}catch{}throw new Error(m+' ('+r.status+')');}
  const blob=await r.blob();
  if(!blob.size)throw new Error('المرفق فارغ');
  const url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank');
  if(!w){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('licenseMsg').textContent='تم فتح المرفق';
 }catch(e){$('licenseMsg').textContent=e.message||'تعذر فتح المرفق';}
}
async function delImage(){
 if(!current){$('licenseMsg').textContent='اختر موظفًا أولًا';return;}
 if(!current.has_image){$('licenseMsg').textContent='لا يوجد مرفق حالي لهذا الموظف';return;}
 if(!confirm('حذف صورة الرخصة الحالية نهائيًا؟'))return;
 try{
  $('licenseMsg').textContent='جاري حذف المرفق...';
  const d=await api(\`/api/driver-licenses/\${current.id}/image\`,{method:'DELETE'});
  $('licenseMsg').textContent=d.message||'تم حذف المرفق';
  await load();await openOne(current.id);
 }catch(e){$('licenseMsg').textContent=e.message||'تعذر حذف المرفق';}
}`);
s=s.replace("$('openLicenseImageBtn').onclick=()=>{if(current?.has_image)window.open(`/api/driver-licenses/${current.id}/image`,'_blank');else $('licenseMsg').textContent='لا يوجد مرفق حالي';};$('deleteLicenseImageBtn').onclick=delImage;", "$('openLicenseImageBtn').onclick=openImage;$('deleteLicenseImageBtn').onclick=delImage;");
fs.writeFileSync(p,s);
