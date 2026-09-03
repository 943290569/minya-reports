(function(){
  const $=id=>document.getElementById(id);
  async function importZip(){
    const input=$('licenseZipFile'),msg=$('licenseZipMsg'),btn=$('licenseZipImportBtn');
    const file=input?.files?.[0];
    if(!file){msg.textContent='اختر ملف ZIP أولًا';return;}
    if(!/\.zip$/i.test(file.name)){msg.textContent='الملف يجب أن يكون بصيغة ZIP';return;}
    if(file.size>12*1024*1024){msg.textContent='حجم ملف ZIP أكبر من 12MB';return;}
    if(!confirm('سيتم توزيع صور الرخص تلقائيًا على الموظفين المطابقين، واستبدال أي مرفق حالي لهم. متابعة؟'))return;
    try{
      btn.disabled=true;
      msg.textContent='جاري رفع ملف ZIP وتوزيع الصور على السجلات...';
      const r=await fetch('/api/driver-licenses/import-zip?replace=1',{
        method:'POST',
        headers:{'Content-Type':'application/zip'},
        body:file
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||'فشل رفع ملف ZIP');
      const extra=[];
      if(d.missing?.length)extra.push(`ملفات غير موجودة: ${d.missing.length}`);
      if(d.skipped?.length)extra.push(`تم تجاوز: ${d.skipped.length}`);
      msg.textContent=`${d.message||'تم الاستيراد'}${extra.length?' — '+extra.join('، '):''}`;
      input.value='';
      setTimeout(()=>location.reload(),900);
    }catch(e){
      msg.textContent=e.message||'تعذر رفع الصور';
    }finally{
      btn.disabled=false;
    }
  }
  function init(){
    const btn=$('licenseZipImportBtn');
    if(btn)btn.onclick=importZip;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
