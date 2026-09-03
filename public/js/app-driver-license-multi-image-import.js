(function(){
  const $=id=>document.getElementById(id);
  const bootstrapMap={
    'IMG-20260706-WA0032.jpg':'سعيد ربعي','IMG-20260706-WA0035.jpg':'فادي جبارين','IMG-20260706-WA0036.jpg':'نادي الفروخ','IMG-20260706-WA0040.jpg':'عامر شلالدة','IMG-20260706-WA0047.jpg':'عبد الفتاح فروخ','IMG-20260706-WA0052.jpg':'رمزي البربري','IMG-20260706-WA0055.jpg':'نديم الكوازبة','IMG-20260706-WA0057.jpg':'قصي جبارين','IMG-20260706-WA0058.jpg':'ينال شلالدة','IMG-20260706-WA0059.jpg':'حسن علامه','IMG-20260706-WA0060.jpg':'وحيد أبو عياش','IMG-20260706-WA0061.jpg':'أنس أبو عمر','IMG-20260706-WA0062.jpg':'رامي مطور','IMG-20260706-WA0063.jpg':'محمد جبرين','IMG-20260706-WA0064.jpg':'باسل جرادات','IMG-20260706-WA0067.jpg':'محمود العمور','IMG-20260706-WA0068.jpg':'إسماعيل الفروخ','IMG-20260706-WA0068(1).jpg':'إسماعيل الفروخ','IMG-20260707-WA0002.jpg':'سامي فروخ','IMG-20260707-WA0002(1).jpg':'سامي فروخ','IMG-20260707-WA0009.jpg':'هاني الجنيدي','IMG-20260707-WA0010.jpg':'خالد الكوازبة','IMG-20260707-WA0012.jpg':'جهاد الكوازبة','IMG-20260707-WA0013.jpg':'يزن الكوازبة','IMG-20260707-WA0014.jpg':'أحمد ربعي','IMG-20260707-WA0016.jpg':'عدي الكوازبة','IMG-20260707-WA0017.jpg':'أمجد جبارين','IMG-20260707-WA0021.jpg':'علاء الفروخ','IMG-20260707-WA0023.jpg':'سامي الفروخ','IMG-20260709-WA0008.jpg':'صخر عرامين'
  };
  const bytes=n=>n<1024?`${n} B`:n<1024*1024?`${Math.round(n/1024)} KB`:`${(n/1024/1024).toFixed(2)} MB`;
  function dataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
  function validId9(id){if(!/^\d{9}$/.test(id))return false;let sum=0;for(let i=0;i<9;i++){let n=Number(id[i])*(i%2?2:1);sum+=n>9?n-9:n;}return sum%10===0;}
  function normalizeOcr(s){return String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[OoQ]/g,'0').replace(/[Il|]/g,'1').replace(/[Ss]/g,'5');}
  function identityCandidates(text){
    const raw=normalizeOcr(text),out=[];
    const add=id=>{if(/^\d{9}$/.test(id)&&!out.includes(id))out.push(id);};
    for(const line of raw.split(/\r?\n/)){
      const groups=line.match(/\d[\d\s.\-/:]{7,24}\d/g)||[];
      for(const g of groups){
        const digits=g.replace(/\D/g,'');
        if(digits.length===9)add(digits);
        if(digits.length>9&&digits.length<=14){for(let i=0;i<=digits.length-9;i++)add(digits.slice(i,i+9));}
      }
    }
    const compact=raw.replace(/\D/g,'');
    if(compact.length>=9&&compact.length<=120){for(let i=0;i<=compact.length-9;i++){const id=compact.slice(i,i+9);if(validId9(id))add(id);}}
    return out;
  }
  function extractIdentity(text){const ids=identityCandidates(text),checked=ids.filter(validId9);if(checked.length===1)return checked[0];if(checked.length>1)return '';if(ids.length===1)return ids[0];return '';}
  async function imageCanvas(file,maxSide=2600){const bitmap=await createImageBitmap(file),scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();return c;}
  function preprocess(src,mode){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);if(mode==='original')return c;const img=ctx.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];let v;if(mode==='contrast')v=Math.max(0,Math.min(255,(g-128)*1.75+128));else v=g>165?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}ctx.putImageData(img,0,0);return c;}
  async function compressCanvas(c,target=260*1024){let q=.84,blob=null;for(let i=0;i<9;i++){blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',q));if(blob&&blob.size<=target)break;q=Math.max(.46,q-.05);}if(!blob)throw new Error('تعذر ضغط الصورة');return blob;}
  async function ocr(canvas){const result=await window.Tesseract.recognize(canvas,'eng',{logger:()=>{}});return result?.data?.text||'';}
  async function recognizeIdentity(canvas){
    if(!window.Tesseract)throw new Error('خدمة قراءة رقم الهوية لم تُحمّل. تحقق من اتصال الإنترنت ثم أعد فتح الصفحة.');
    const modes=['original','contrast','threshold'];
    const all=[];
    for(const mode of modes){
      const text=await ocr(preprocess(canvas,mode));
      all.push(text);
      const id=extractIdentity(text);
      if(id)return id;
    }
    const candidates=[...new Set(all.flatMap(identityCandidates))];
    const checked=candidates.filter(validId9);
    return checked.length===1?checked[0]:'';
  }
  async function uploadOne(file){const canvas=await imageCanvas(file);const identity=await recognizeIdentity(canvas);if(!identity)return {ok:false,file:file.name,message:'لم يتم التعرف على رقم الهوية من البند 6 بعد 3 محاولات قراءة'};const blob=await compressCanvas(canvas),image_base64=await dataUrl(blob);const r=await fetch('/api/driver-licenses/import-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity_number:identity,bootstrap_name_ar:bootstrapMap[file.name]||'',image_base64,image_name:file.name.replace(/\.[^.]+$/,'')+'.webp',image_mime:'image/webp'})});const d=await r.json().catch(()=>({}));if(!r.ok)return {ok:false,file:file.name,identity,message:d.message||`HTTP ${r.status}`};return {ok:true,file:file.name,identity,name_ar:d.name_ar,before:file.size,after:blob.size,identity_added:d.identity_added};}
  async function run(){const input=$('licenseImagesFile'),btn=$('licenseImagesImportBtn'),msg=$('licenseImagesMsg'),results=$('licenseImagesResults');const files=[...(input?.files||[])].filter(f=>String(f.type||'').startsWith('image/'));if(!files.length){msg.textContent='اختر صورة واحدة أو أكثر أولًا';return;}if(!confirm(`سيتم قراءة رقم الهوية من البند 6 ومطابقة ${files.length} صورة مع الموظفين. متابعة؟`))return;btn.disabled=true;results.innerHTML='';let success=0,failed=0;try{for(let i=0;i<files.length;i++){msg.textContent=`جاري معالجة الصورة ${i+1} من ${files.length}: ${files[i].name}`;let out;try{out=await uploadOne(files[i]);}catch(e){out={ok:false,file:files[i].name,message:e.message||'فشل المعالجة'};}const row=document.createElement('div');row.style.cssText='padding:7px 0;border-bottom:1px solid #e5e7eb';if(out.ok){success++;row.innerHTML=`✅ <strong>${out.name_ar}</strong> — الهوية ${out.identity} — ${bytes(out.before)} ← ${bytes(out.after)}${out.identity_added?' — تم حفظ رقم الهوية بالسجل':''}`;}else{failed++;row.innerHTML=`❌ <strong>${out.file}</strong>${out.identity?' — '+out.identity:''} — ${out.message}`;}results.appendChild(row);}msg.textContent=`اكتمل: ${success} صورة تم ربطها، ${failed} تحتاج مراجعة.`;if(success){window.dispatchEvent(new Event('driver-licenses-updated'));setTimeout(()=>location.reload(),1800);}}finally{btn.disabled=false;}}
  function init(){const btn=$('licenseImagesImportBtn');if(btn)btn.onclick=run;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
