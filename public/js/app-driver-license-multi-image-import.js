(function(){
  const $=id=>document.getElementById(id);
  const bytes=n=>n<1024?`${n} B`:n<1024*1024?`${Math.round(n/1024)} KB`:`${(n/1024/1024).toFixed(2)} MB`;
  function dataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
  function normToken(v){return String(v||'').toUpperCase().replace(/0/g,'O').replace(/1/g,'I').replace(/5/g,'S').replace(/[^A-Z]/g,'');}
  function nameTokens(v){return String(v||'').toUpperCase().split(/[^A-Z]+/).map(normToken).filter(x=>x.length>=2);}
  function ocrWords(text){return new Set(String(text||'').toUpperCase().replace(/0/g,'O').replace(/1/g,'I').replace(/5/g,'S').split(/[^A-Z]+/).map(normToken).filter(x=>x.length>=2));}
  function matchByEnglishName(text,employees){
    const words=ocrWords(text);
    const prepared=employees.map(e=>({e,t:nameTokens(e.name_en)})).filter(x=>x.t.length);
    let candidates=prepared.filter(x=>words.has(x.t[0]));
    if(candidates.length===1)return {employee:candidates[0].e,matched:candidates[0].t[0],level:1};
    if(candidates.length>1){
      const second=candidates.filter(x=>x.t[1]&&words.has(x.t[1]));
      if(second.length===1)return {employee:second[0].e,matched:`${second[0].t[0]} ${second[0].t[1]}`,level:2};
      return {employee:null,ambiguous:candidates.map(x=>x.e.name_en)};
    }
    // إذا لم يقرأ الاسم الأول بوضوح، نستخدم المقطع الثاني فقط عندما يكون فريدًا تمامًا في القاعدة.
    const bySecond=prepared.filter(x=>x.t[1]&&words.has(x.t[1]));
    if(bySecond.length===1){
      const token=bySecond[0].t[1];
      const owners=prepared.filter(x=>x.t[1]===token);
      if(owners.length===1)return {employee:bySecond[0].e,matched:token,level:2};
    }
    return {employee:null};
  }
  async function imageCanvas(file,maxSide=2600){const bitmap=await createImageBitmap(file),scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();return c;}
  function rotateCanvas(src,deg){const swap=Math.abs(deg)%180===90,c=document.createElement('canvas');c.width=swap?src.height:src.width;c.height=swap?src.width:src.height;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(deg*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return c;}
  function preprocess(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);const img=ctx.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];const v=Math.max(0,Math.min(255,(g-128)*1.55+128));d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}ctx.putImageData(img,0,0);return c;}
  async function ocr(canvas){const result=await window.Tesseract.recognize(canvas,'eng',{logger:()=>{}});return result?.data?.text||'';}
  async function recognizeEmployee(canvas,employees,msg){
    if(!window.Tesseract)throw new Error('خدمة قراءة الاسم الإنجليزي لم تُحمّل. تحقق من اتصال الإنترنت ثم أعد فتح الصفحة.');
    let ambiguous=[];
    for(const angle of [0,90,270,180]){
      if(msg)msg.textContent=`جاري قراءة الاسم الإنجليزي — تدوير ${angle}°`;
      const text=await ocr(rotateCanvas(canvas,angle));
      const m=matchByEnglishName(text,employees);
      if(m.employee)return m;
      if(m.ambiguous?.length)ambiguous=m.ambiguous;
    }
    for(const angle of [0,90,270]){
      if(msg)msg.textContent=`تحسين قراءة الاسم الإنجليزي — تدوير ${angle}°`;
      const text=await ocr(preprocess(rotateCanvas(canvas,angle)));
      const m=matchByEnglishName(text,employees);
      if(m.employee)return m;
      if(m.ambiguous?.length)ambiguous=m.ambiguous;
    }
    return {employee:null,ambiguous};
  }
  async function compressCanvas(c,target=260*1024){let q=.84,blob=null;for(let i=0;i<9;i++){blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',q));if(blob&&blob.size<=target)break;q=Math.max(.46,q-.05);}if(!blob)throw new Error('تعذر ضغط الصورة');return blob;}
  async function uploadOne(file,employees,msg){
    const canvas=await imageCanvas(file),match=await recognizeEmployee(canvas,employees,msg);
    if(!match.employee){
      if(match.ambiguous?.length)return {ok:false,file:file.name,message:`الاسم الأول مكرر ولم ينجح المقطع الثاني في الحسم: ${match.ambiguous.join(' / ')}`};
      return {ok:false,file:file.name,message:'لم يتم التعرف على اسم إنجليزي مطابق لسجل الموظفين'};
    }
    const blob=await compressCanvas(canvas),image_base64=await dataUrl(blob),employee=match.employee;
    const r=await fetch(`/api/driver-licenses/${employee.id}/renew`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_base64,image_name:file.name.replace(/\.[^.]+$/,'')+'.webp',image_mime:'image/webp'})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return {ok:false,file:file.name,name_ar:employee.name_ar,name_en:employee.name_en,message:d.message||`HTTP ${r.status}`};
    return {ok:true,file:file.name,name_ar:employee.name_ar,name_en:employee.name_en,matched:match.matched,before:file.size,after:blob.size};
  }
  async function run(){
    const input=$('licenseImagesFile'),btn=$('licenseImagesImportBtn'),msg=$('licenseImagesMsg'),results=$('licenseImagesResults');
    const files=[...(input?.files||[])].filter(f=>String(f.type||'').startsWith('image/'));
    if(!files.length){msg.textContent='اختر صورة واحدة أو أكثر أولًا';return;}
    let employees=[];
    try{const r=await fetch('/api/driver-licenses',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر تحميل سجل الموظفين');employees=d.rows||[];}catch(e){msg.textContent=e.message;return;}
    if(!confirm(`سيتم التعرف على الموظف من الاسم الإنجليزي في ${files.length} صورة. يبدأ النظام بالاسم الأول، وإذا كان مكررًا يستخدم المقطع الثاني. متابعة؟`))return;
    btn.disabled=true;results.innerHTML='';let success=0,failed=0;
    try{
      for(let i=0;i<files.length;i++){
        msg.textContent=`جاري معالجة الصورة ${i+1} من ${files.length}: ${files[i].name}`;
        let out;try{out=await uploadOne(files[i],employees,msg);}catch(e){out={ok:false,file:files[i].name,message:e.message||'فشل المعالجة'};}
        const row=document.createElement('div');row.style.cssText='padding:7px 0;border-bottom:1px solid #e5e7eb';
        if(out.ok){success++;row.innerHTML=`✅ <strong>${out.name_ar}</strong> — ${out.name_en} — تطابق: ${out.matched} — ${bytes(out.before)} ← ${bytes(out.after)}`;}
        else{failed++;row.innerHTML=`❌ <strong>${out.file}</strong> — ${out.message}`;}
        results.appendChild(row);
      }
      msg.textContent=`اكتمل: ${success} صورة تم ربطها، ${failed} تحتاج مراجعة.`;
      if(success){window.dispatchEvent(new Event('driver-licenses-updated'));setTimeout(()=>location.reload(),2000);}
    }finally{btn.disabled=false;}
  }
  function init(){const btn=$('licenseImagesImportBtn');if(btn)btn.onclick=run;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
