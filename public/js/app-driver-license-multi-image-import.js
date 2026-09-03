(function(){
  const $=id=>document.getElementById(id);
  const bootstrapMap={
    'IMG-20260706-WA0032.jpg':'سعيد ربعي','IMG-20260706-WA0035.jpg':'فادي جبارين','IMG-20260706-WA0036.jpg':'نادي الفروخ','IMG-20260706-WA0040.jpg':'عامر شلالدة','IMG-20260706-WA0047.jpg':'عبد الفتاح فروخ','IMG-20260706-WA0052.jpg':'رمزي البربري','IMG-20260706-WA0055.jpg':'نديم الكوازبة','IMG-20260706-WA0057.jpg':'قصي جبارين','IMG-20260706-WA0058.jpg':'ينال شلالدة','IMG-20260706-WA0059.jpg':'حسن علامه','IMG-20260706-WA0060.jpg':'وحيد أبو عياش','IMG-20260706-WA0061.jpg':'أنس أبو عمر','IMG-20260706-WA0062.jpg':'رامي مطور','IMG-20260706-WA0063.jpg':'محمد جبرين','IMG-20260706-WA0064.jpg':'باسل جرادات','IMG-20260706-WA0067.jpg':'محمود العمور','IMG-20260706-WA0068.jpg':'إسماعيل الفروخ','IMG-20260706-WA0068(1).jpg':'إسماعيل الفروخ','IMG-20260707-WA0002.jpg':'سامي فروخ','IMG-20260707-WA0002(1).jpg':'سامي فروخ','IMG-20260707-WA0009.jpg':'هاني الجنيدي','IMG-20260707-WA0010.jpg':'خالد الكوازبة','IMG-20260707-WA0012.jpg':'جهاد الكوازبة','IMG-20260707-WA0013.jpg':'يزن الكوازبة','IMG-20260707-WA0014.jpg':'أحمد ربعي','IMG-20260707-WA0016.jpg':'عدي الكوازبة','IMG-20260707-WA0017.jpg':'أمجد جبارين','IMG-20260707-WA0021.jpg':'علاء الفروخ','IMG-20260707-WA0023.jpg':'سامي الفروخ','IMG-20260709-WA0008.jpg':'صخر عرامين',
    'WhatsApp Image 2026-09-03 at 9.16.37 PM (1).jpeg':'نضال جبارين',
    'WhatsApp Image 2026-09-03 at 9.16.37 PM (2).jpeg':'عادل الفروخ',
    'WhatsApp Image 2026-09-03 at 9.16.37 PM.jpeg':'بلال طروة'
  };
  const bytes=n=>n<1024?`${n} B`:n<1024*1024?`${Math.round(n/1024)} KB`:`${(n/1024/1024).toFixed(2)} MB`;
  function dataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
  function validId9(id){if(!/^\d{9}$/.test(id))return false;let sum=0;for(let i=0;i<9;i++){let n=Number(id[i])*(i%2?2:1);sum+=n>9?n-9:n;}return sum%10===0;}
  function normalizeOcr(s){return String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[OoQ]/g,'0').replace(/[Il|]/g,'1').replace(/[Ss]/g,'5');}
  function idsFromLine(line){
    const raw=normalizeOcr(line),out=[];
    const groups=raw.match(/\d[\d\s.\-]{7,18}\d/g)||[];
    for(const g of groups){
      const digits=g.replace(/\D/g,'');
      if(digits.length===9&&!out.includes(digits))out.push(digits);
      if(digits.length===10){
        const first=digits.slice(0,9),last=digits.slice(1);
        if(validId9(first)&&!out.includes(first))out.push(first);
        if(validId9(last)&&!out.includes(last))out.push(last);
      }
    }
    return out;
  }
  function parseBand6(text){
    const lines=normalizeOcr(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const strong=[];
    for(const line of lines){
      const ids=idsFromLine(line);
      if(!ids.length)continue;
      const hasSix=/(?:^|\s)[.]?\s*6(?:\s|$)|(?:^|\s)6\s*[.]?(?:\s|$)/.test(line) || /[.]6\b|\b6[.]/.test(line);
      if(hasSix)for(const id of ids)if(!strong.includes(id))strong.push(id);
    }
    const validStrong=strong.filter(validId9);
    if(validStrong.length===1)return {id:validStrong[0],confidence:'band6'};
    if(strong.length===1)return {id:strong[0],confidence:'band6'};

    const all=[];
    for(const line of lines)for(const id of idsFromLine(line))if(!all.includes(id))all.push(id);
    const valid=all.filter(validId9);
    if(valid.length===1)return {id:valid[0],confidence:'checksum'};
    if(all.length===1)return {id:all[0],confidence:'single'};
    return {id:'',confidence:''};
  }
  async function imageCanvas(file,maxSide=2800){
    const bitmap=await createImageBitmap(file),scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale)),c=document.createElement('canvas');
    c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();return c;
  }
  function rotateCanvas(src,deg){
    if(!deg)return src;
    const swap=deg===90||deg===270,c=document.createElement('canvas');c.width=swap?src.height:src.width;c.height=swap?src.width:src.height;
    const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(deg*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return c;
  }
  function thresholdCanvas(src){
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);const img=ctx.getImageData(0,0,c.width,c.height),d=img.data;
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=g>172?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}ctx.putImageData(img,0,0);return c;
  }
  async function compressCanvas(c,target=260*1024){let q=.84,blob=null;for(let i=0;i<9;i++){blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',q));if(blob&&blob.size<=target)break;q=Math.max(.46,q-.05);}if(!blob)throw new Error('تعذر ضغط الصورة');return blob;}
  async function createOcrWorker(){
    if(!window.Tesseract)throw new Error('خدمة قراءة رقم الهوية لم تُحمّل. تحقق من اتصال الإنترنت ثم أعد فتح الصفحة.');
    const worker=await window.Tesseract.createWorker('eng');
    await worker.setParameters({tessedit_char_whitelist:'0123456789.-/ ',preserve_interword_spaces:'1'});
    return worker;
  }
  async function recognizeIdentity(canvas,worker,onTry){
    const rotations=[0,90,270,180],fallback=[];
    for(const deg of rotations){
      onTry?.(`قراءة البند 6 — تدوير ${deg}°`);
      const rotated=rotateCanvas(canvas,deg),r=await worker.recognize(rotated),parsed=parseBand6(r?.data?.text||'');
      if(parsed.id&&parsed.confidence==='band6')return {...parsed,rotation:deg};
      if(parsed.id)fallback.push({...parsed,rotation:deg});
    }
    for(const deg of rotations){
      onTry?.(`تحسين البند 6 — تدوير ${deg}°`);
      const rotated=thresholdCanvas(rotateCanvas(canvas,deg)),r=await worker.recognize(rotated),parsed=parseBand6(r?.data?.text||'');
      if(parsed.id&&parsed.confidence==='band6')return {...parsed,rotation:deg};
      if(parsed.id)fallback.push({...parsed,rotation:deg});
    }
    const unique=[...new Set(fallback.map(x=>x.id).filter(Boolean))];
    if(unique.length===1)return fallback.find(x=>x.id===unique[0]);
    return {id:'',confidence:'',rotation:null};
  }
  async function uploadOne(file,worker,setProgress){
    const canvas=await imageCanvas(file),found=await recognizeIdentity(canvas,worker,setProgress),identity=found.id;
    if(!identity)return {ok:false,file:file.name,message:'لم يتم التعرف بشكل مؤكد على رقم الهوية من البند 6'};
    const blob=await compressCanvas(canvas),image_base64=await dataUrl(blob);
    const r=await fetch('/api/driver-licenses/import-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity_number:identity,bootstrap_name_ar:bootstrapMap[file.name]||'',image_base64,image_name:file.name.replace(/\.[^.]+$/,'')+'.webp',image_mime:'image/webp'})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return {ok:false,file:file.name,identity,message:d.message||`HTTP ${r.status}`};
    return {ok:true,file:file.name,identity,name_ar:d.name_ar,before:file.size,after:blob.size,identity_added:d.identity_added,rotation:found.rotation};
  }
  async function run(){
    const input=$('licenseImagesFile'),btn=$('licenseImagesImportBtn'),msg=$('licenseImagesMsg'),results=$('licenseImagesResults');
    const files=[...(input?.files||[])].filter(f=>String(f.type||'').startsWith('image/'));
    if(!files.length){msg.textContent='اختر صورة واحدة أو أكثر أولًا';return;}
    if(!confirm(`سيتم البحث عن رقم الهوية بجوار البند 6 مع تدوير الصور تلقائيًا ثم مطابقتها مع ${files.length} سجل. متابعة؟`))return;
    btn.disabled=true;results.innerHTML='';let success=0,failed=0,worker=null;
    try{
      msg.textContent='جاري تجهيز قارئ رقم الهوية...';worker=await createOcrWorker();
      for(let i=0;i<files.length;i++){
        const base=`الصورة ${i+1} من ${files.length}: ${files[i].name}`;
        let out;try{out=await uploadOne(files[i],worker,step=>msg.textContent=`${base} — ${step}`);}catch(e){out={ok:false,file:files[i].name,message:e.message||'فشل المعالجة'};}
        const row=document.createElement('div');row.style.cssText='padding:7px 0;border-bottom:1px solid #e5e7eb';
        if(out.ok){success++;row.innerHTML=`✅ <strong>${out.name_ar}</strong> — الهوية ${out.identity} — ${bytes(out.before)} ← ${bytes(out.after)}${out.identity_added?' — تم حفظ رقم الهوية بالسجل':''}`;}
        else{failed++;row.innerHTML=`❌ <strong>${out.file}</strong>${out.identity?' — '+out.identity:''} — ${out.message}`;}
        results.appendChild(row);
      }
      msg.textContent=`اكتمل: ${success} صورة تم ربطها، ${failed} تحتاج مراجعة.`;
      if(success){window.dispatchEvent(new Event('driver-licenses-updated'));setTimeout(()=>location.reload(),2200);}
    }catch(e){msg.textContent=e.message||'تعذر تشغيل قارئ رقم الهوية';}
    finally{try{await worker?.terminate();}catch{}btn.disabled=false;}
  }
  function init(){const btn=$('licenseImagesImportBtn');if(btn)btn.onclick=run;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
