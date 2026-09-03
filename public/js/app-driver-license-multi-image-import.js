(function(){
  const $=id=>document.getElementById(id);
  const bootstrapMap={
    'IMG-20260706-WA0032.jpg':'سعيد ربعي','IMG-20260706-WA0035.jpg':'فادي جبارين','IMG-20260706-WA0036.jpg':'نادي الفروخ','IMG-20260706-WA0040.jpg':'عامر شلالدة','IMG-20260706-WA0047.jpg':'عبد الفتاح فروخ','IMG-20260706-WA0052.jpg':'رمزي البربري','IMG-20260706-WA0055.jpg':'نديم الكوازبة','IMG-20260706-WA0057.jpg':'قصي جبارين','IMG-20260706-WA0058.jpg':'ينال شلالدة','IMG-20260706-WA0059.jpg':'حسن علامه','IMG-20260706-WA0060.jpg':'وحيد أبو عياش','IMG-20260706-WA0061.jpg':'أنس أبو عمر','IMG-20260706-WA0062.jpg':'رامي مطور','IMG-20260706-WA0063.jpg':'محمد جبرين','IMG-20260706-WA0064.jpg':'باسل جرادات','IMG-20260706-WA0067.jpg':'محمود العمور','IMG-20260706-WA0068.jpg':'إسماعيل الفروخ','IMG-20260706-WA0068(1).jpg':'إسماعيل الفروخ','IMG-20260707-WA0002.jpg':'سامي فروخ','IMG-20260707-WA0002(1).jpg':'سامي فروخ','IMG-20260707-WA0009.jpg':'هاني الجنيدي','IMG-20260707-WA0010.jpg':'خالد الكوازبة','IMG-20260707-WA0012.jpg':'جهاد الكوازبة','IMG-20260707-WA0013.jpg':'يزن الكوازبة','IMG-20260707-WA0014.jpg':'أحمد ربعي','IMG-20260707-WA0016.jpg':'عدي الكوازبة','IMG-20260707-WA0017.jpg':'أمجد جبارين','IMG-20260707-WA0021.jpg':'علاء الفروخ','IMG-20260707-WA0023.jpg':'سامي الفروخ','IMG-20260709-WA0008.jpg':'صخر عرامين'
  };
  const bytes=n=>n<1024?`${n} B`:n<1024*1024?`${Math.round(n/1024)} KB`:`${(n/1024/1024).toFixed(2)} MB`;
  function dataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
  function normalizeOcr(s){return String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[OoQ]/g,'0').replace(/[Il|]/g,'1').replace(/[Ss]/g,'5');}
  function extractField(text,field){
    const raw=normalizeOcr(text),lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const re1=new RegExp('(\\d{5,12})\\s*[.,:;]?\\s*'+field+'(?:\\D|$)');
    const re2=new RegExp('(?:^|\\D)'+field+'\\s*[.,:;]?\\s*(\\d{5,12})(?:\\D|$)');
    for(const line of lines){const a=line.match(re1);if(a)return a[1];const b=line.match(re2);if(b)return b[1];}
    const compact=raw.replace(/\s+/g,' ');const a=compact.match(re1);if(a)return a[1];const b=compact.match(re2);if(b)return b[1];return '';
  }
  async function imageCanvas(file,maxSide=2800){const bitmap=await createImageBitmap(file),scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();return c;}
  function rotateCanvas(src,deg){const swap=Math.abs(deg)%180===90,c=document.createElement('canvas');c.width=swap?src.height:src.width;c.height=swap?src.width:src.height;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(deg*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return c;}
  function preprocess(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);const img=ctx.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];const v=g>155?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}ctx.putImageData(img,0,0);return c;}
  async function ocr(canvas){const result=await window.Tesseract.recognize(canvas,'eng',{logger:()=>{}});return result?.data?.text||'';}
  async function recognizeFields(canvas,msg){
    if(!window.Tesseract)throw new Error('خدمة قراءة بيانات الرخصة لم تُحمّل. تحقق من اتصال الإنترنت ثم أعد فتح الصفحة.');
    let best={license_number:'',identity_number:''};
    for(const angle of [0,90,270,180]){if(msg)msg.textContent=`جاري قراءة البندين 5 و6 — تدوير ${angle}°`;const text=await ocr(rotateCanvas(canvas,angle));const license=extractField(text,5),identity=extractField(text,6);if(license&&!best.license_number)best.license_number=license;if(identity&&!best.identity_number)best.identity_number=identity;if(best.license_number&&best.identity_number)return best;}
    for(const angle of [0,90,270]){if(msg)msg.textContent=`تحسين القراءة للبندين 5 و6 — تدوير ${angle}°`;const text=await ocr(preprocess(rotateCanvas(canvas,angle)));const license=extractField(text,5),identity=extractField(text,6);if(license&&!best.license_number)best.license_number=license;if(identity&&!best.identity_number)best.identity_number=identity;if(best.license_number&&best.identity_number)return best;}
    return best;
  }
  async function compressCanvas(c,target=260*1024){let q=.84,blob=null;for(let i=0;i<9;i++){blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',q));if(blob&&blob.size<=target)break;q=Math.max(.46,q-.05);}if(!blob)throw new Error('تعذر ضغط الصورة');return blob;}
  async function uploadOne(file,msg){
    const canvas=await imageCanvas(file),fields=await recognizeFields(canvas,msg);
    if(!fields.license_number)return {ok:false,file:file.name,message:'لم يتم التعرف على رقم الرخصة من البند 5'};
    const blob=await compressCanvas(canvas),image_base64=await dataUrl(blob);
    const r=await fetch('/api/driver-licenses/import-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({license_number:fields.license_number,identity_number:fields.identity_number,bootstrap_name_ar:bootstrapMap[file.name]||'',image_base64,image_name:file.name.replace(/\.[^.]+$/,'')+'.webp',image_mime:'image/webp'})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return {ok:false,file:file.name,license_number:fields.license_number,identity_number:fields.identity_number,message:d.message||`HTTP ${r.status}`};
    return {ok:true,file:file.name,license_number:d.license_number,identity_number:d.identity_number,name_ar:d.name_ar,before:file.size,after:blob.size,license_added:d.license_added,identity_added:d.identity_added};
  }
  async function run(){
    const input=$('licenseImagesFile'),btn=$('licenseImagesImportBtn'),msg=$('licenseImagesMsg'),results=$('licenseImagesResults');const files=[...(input?.files||[])].filter(f=>String(f.type||'').startsWith('image/'));
    if(!files.length){msg.textContent='اختر صورة واحدة أو أكثر أولًا';return;}
    if(!confirm(`سيتم اعتماد رقم الرخصة من البند 5 للمطابقة، وحفظ رقم الهوية من البند 6، لعدد ${files.length} صورة. متابعة؟`))return;
    btn.disabled=true;results.innerHTML='';let success=0,failed=0;
    try{for(let i=0;i<files.length;i++){msg.textContent=`جاري معالجة الصورة ${i+1} من ${files.length}: ${files[i].name}`;let out;try{out=await uploadOne(files[i],msg);}catch(e){out={ok:false,file:files[i].name,message:e.message||'فشل المعالجة'};}const row=document.createElement('div');row.style.cssText='padding:7px 0;border-bottom:1px solid #e5e7eb';if(out.ok){success++;row.innerHTML=`✅ <strong>${out.name_ar}</strong> — رقم الرخصة ${out.license_number}${out.identity_number?' — الهوية '+out.identity_number:''} — ${bytes(out.before)} ← ${bytes(out.after)}${out.license_added?' — تم حفظ رقم الرخصة بالسجل':''}${out.identity_added?' — تم حفظ رقم الهوية':''}`;}else{failed++;row.innerHTML=`❌ <strong>${out.file}</strong>${out.license_number?' — رخصة '+out.license_number:''}${out.identity_number?' — هوية '+out.identity_number:''} — ${out.message}`;}results.appendChild(row);}msg.textContent=`اكتمل: ${success} صورة تم ربطها، ${failed} تحتاج مراجعة.`;if(success){window.dispatchEvent(new Event('driver-licenses-updated'));setTimeout(()=>location.reload(),2000);}}finally{btn.disabled=false;}
  }
  function init(){const btn=$('licenseImagesImportBtn');if(btn)btn.onclick=run;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
