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
      const text=await r.text();
      let d={};
      try{d=text?JSON.parse(text):{};}catch{}
      if(!r.ok){
        if(r.status===413)throw new Error('حجم الطلب مرفوض من خادم الويب (413). سنحوّل الرفع إلى أجزاء صغيرة.');
        if(r.status===401)throw new Error('انتهت جلسة تسجيل الدخول. سجّل الدخول ثم أعد المحاولة.');
        if(r.status===403)throw new Error('ليس لديك صلاحية رفع صور الرخص.');
        throw new Error(d.message||`فشل رفع ملف ZIP — HTTP ${r.status}${text&&!d.message?' — '+text.slice(0,120):''}`);
      }
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
