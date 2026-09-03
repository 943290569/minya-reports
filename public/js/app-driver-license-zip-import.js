(function(){
  const $=id=>document.getElementById(id);
  async function parseResponse(r){const text=await r.text();let d={};try{d=text?JSON.parse(text):{};}catch{};if(!r.ok){if(r.status===401)throw new Error('انتهت جلسة تسجيل الدخول. سجّل الدخول ثم أعد المحاولة.');if(r.status===403)throw new Error('ليس لديك صلاحية رفع صور الرخص.');throw new Error(d.message||d.error||`فشل الرفع — HTTP ${r.status}`);}return d;}
  async function importZip(){
    const input=$('licenseZipFile'),msg=$('licenseZipMsg'),btn=$('licenseZipImportBtn');
    const file=input?.files?.[0];
    if(!file){msg.textContent='اختر ملف ZIP أولًا';return;}
    if(!/\.zip$/i.test(file.name)){msg.textContent='الملف يجب أن يكون بصيغة ZIP';return;}
    if(file.size>12*1024*1024){msg.textContent='حجم ملف ZIP أكبر من 12MB';return;}
    if(!confirm('سيتم توزيع صور الرخص تلقائيًا على الموظفين المطابقين، واستبدال أي مرفق حالي لهم. متابعة؟'))return;
    try{
      btn.disabled=true;
      const chunkSize=256*1024,total=Math.ceil(file.size/chunkSize),uploadId=`zip${Date.now()}${Math.random().toString(36).slice(2,10)}`;
      let result=null;
      for(let i=0;i<total;i++){
        const start=i*chunkSize,end=Math.min(file.size,start+chunkSize),chunk=file.slice(start,end);
        msg.textContent=`جاري رفع ملف ZIP — الجزء ${i+1} من ${total} (${Math.round(((i+1)/total)*100)}%)`;
        const r=await fetch(`/api/driver-licenses/import-zip-chunk?upload_id=${encodeURIComponent(uploadId)}&index=${i}&total=${total}&replace=1`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:chunk});
        result=await parseResponse(r);
      }
      const d=result||{};
      const extra=[];
      if(d.missing?.length)extra.push(`ملفات غير موجودة: ${d.missing.length}`);
      if(d.skipped?.length)extra.push(`تم تجاوز: ${d.skipped.length}`);
      msg.textContent=`${d.message||'تم الاستيراد'}${extra.length?' — '+extra.join('، '):''}`;
      input.value='';
      setTimeout(()=>location.reload(),1200);
    }catch(e){
      msg.textContent=e.message||'تعذر رفع الصور';
    }finally{
      btn.disabled=false;
    }
  }
  function init(){const btn=$('licenseZipImportBtn');if(btn)btn.onclick=importZip;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
