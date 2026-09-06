
/* ===== js/app-auth.js ===== */
/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html","/drive-import.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin") link.remove();
    });
  }

  function removeUserBox(){
    document.getElementById("minyaUserBox")?.remove();
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    removeUserBox();

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          removeUserBox();
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    if(user.role==="viewer"){
      const save=document.getElementById("saveBtn");
      if(save){save.disabled=true;save.title="حساب قراءة فقط";}
    }
  }

  async function check(){
    try{
      const r=await fetch("/api/auth/status",{cache:"no-store"});
      const d=await r.json();
      const path=location.pathname;
      if(d.setupRequired && path!=="/setup.html"){ location.replace("/setup.html"); return; }
      if(!d.setupRequired && !d.authenticated && !publicPages.includes(path)){ location.replace("/login.html"); return; }
      if(d.authenticated){
        window.MINYA_USER=d.user;
        document.documentElement.dataset.userRole=d.user.role;
        if(document.readyState==="loading"){
          document.addEventListener("DOMContentLoaded",()=>setupAuthenticatedUI(d.user),{once:true});
        }else{
          setupAuthenticatedUI(d.user);
        }
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
;

/* ===== js/app-driver-licenses.js ===== */
(function(){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let rows=[],current=null,isNew=false;
  async function api(url,opt){const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'فشل الطلب');return d;}
  function statusClass(s){return s==='منتهية'||s==='تنتهي قريبًا'?'danger':'success';}
  async function openStoredImage(id){try{const r=await fetch(`/api/driver-licenses/${id}/image`,{cache:'no-store'});if(!r.ok)throw new Error(r.status===404?'لا توجد صورة رخصة محفوظة':'تعذر فتح صورة الرخصة');const blob=await r.blob();if(!blob.size)throw new Error('المرفق فارغ');const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');if(!w){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();}setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){alert(e.message||'تعذر فتح صورة الرخصة');}}
  function filteredRows(){const q=String($('licenseSearch').value||'').trim().toLowerCase();return rows.filter(x=>!q||[x.name_ar,x.name_en,x.address,x.license_class,x.license_type].join(' ').toLowerCase().includes(q));}
  function render(){
    const list=filteredRows();
    const urgent=rows.filter(x=>Number.isFinite(Number(x.days_remaining))&&Number(x.days_remaining)>=0&&Number(x.days_remaining)<=15);
    $('licenseKpis').innerHTML=`<div><span>عدد الموظفين</span><strong>${rows.length}</strong></div><div><span>سارية</span><strong>${rows.filter(x=>x.status==='سارية').length}</strong></div><div style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c"><span>تنتهي قريبًا</span><strong>${rows.filter(x=>x.status==='تنتهي قريبًا').length}</strong></div><div style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c"><span>15 يوم أو أقل</span><strong>${urgent.length}</strong></div><div><span>منتهية</span><strong>${rows.filter(x=>x.status==='منتهية').length}</strong></div>`;
    const u=$('licenseUrgent');if(urgent.length){u.style.display='block';u.textContent=`تنبيه مهم: ${urgent.length} رخصة متبقي على انتهائها 15 يومًا أو أقل — ${urgent.map(x=>x.name_ar+' ('+x.days_remaining+' يوم)').join('، ')}`;}else{u.style.display='none';u.textContent='';}
    $('licenseBody').innerHTML=list.map(x=>`<tr${Number(x.days_remaining)>=0&&Number(x.days_remaining)<=15?' style="background:#fff7f7"':''}><td><strong>${esc(x.name_ar)}</strong><br><small>${esc(x.name_en)}</small></td><td>${esc(x.address||'-')}</td><td>${esc(x.license_class||'-')}</td><td>${esc(x.license_type||'-')}</td><td>${esc(x.expiry_date||'-')}</td><td>${x.days_remaining??'-'}</td><td><span class="status-pill ${statusClass(x.status)}">${esc(x.status)}</span></td><td>${x.has_image?`<button type="button" data-view-image="${x.id}">عرض الصورة</button>`:'-'}</td><td><button data-edit="${x.id}">فتح</button></td></tr>`).join('')||'<tr><td colspan="9">لا توجد نتائج</td></tr>';
    $('licenseBody').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openOne(Number(b.dataset.edit)));
    $('licenseBody').querySelectorAll('[data-view-image]').forEach(b=>b.onclick=e=>{e.stopPropagation();openStoredImage(Number(b.dataset.viewImage));});
  }
  async function load(){const d=await api('/api/driver-licenses');rows=d.rows||[];render();window.MINYA_DRIVER_LICENSE_ROWS=rows;window.dispatchEvent(new CustomEvent('driver-licenses-loaded',{detail:{rows}}));window.dispatchEvent(new Event('driver-licenses-updated'));}
  function fillForm(d={}){[['lNameAr','name_ar'],['lNameEn','name_en'],['lLicenseNo','license_number'],['lIdentity','identity_number'],['lAddress','address'],['lBirth','birth_date'],['lCardIssue','card_issue_date'],['lFirstIssue','first_issue_date'],['lExpiry','expiry_date'],['lClass','license_class'],['lType','license_type']].forEach(([i,k])=>{$(i).value=d[k]||'';});}
  async function openOne(id){const d=await api(`/api/driver-licenses/${id}`);current=d.driver;isNew=false;$('licenseEditor').classList.remove('hidden');$('licenseEditorTitle').textContent=`بيانات الرخصة — ${current.name_ar}`;fillForm(current);$('licenseEvents').innerHTML=(d.events||[]).map(e=>`<tr><td>${esc(String(e.event_date||'').replace('T',' ').slice(0,19))}</td><td>${esc(e.event_type)}</td><td>${esc(e.details||'-')}</td></tr>`).join('')||'<tr><td colspan="3">لا يوجد سجل تغييرات بعد</td></tr>';$('licenseMsg').textContent=current.has_image?'يوجد مرفق محفوظ لهذا الموظف':'لا يوجد مرفق محفوظ لهذا الموظف';$('openLicenseImageBtn').disabled=!current.has_image;$('deleteLicenseImageBtn').disabled=!current.has_image;$('licenseEditor').scrollIntoView({behavior:'smooth',block:'start'});}
  function newLicense(){current=null;isNew=true;$('licenseEditor').classList.remove('hidden');$('licenseEditorTitle').textContent='إضافة رخصة جديدة';fillForm({});$('licenseEvents').innerHTML='<tr><td colspan="3">سيظهر سجل التغييرات بعد الحفظ</td></tr>';$('licenseMsg').textContent='أدخل بيانات الرخصة ثم اضغط حفظ. بعد ذلك استخدم قسم رفع الصورة لربط المرفق.';$('openLicenseImageBtn').disabled=true;$('deleteLicenseImageBtn').disabled=true;$('licenseEditor').scrollIntoView({behavior:'smooth',block:'start'});}
  function cancelEdit(){current=null;isNew=false;fillForm({});$('licenseMsg').textContent='';$('licenseEditor').classList.add('hidden');}
  function body(){return{name_ar:$('lNameAr').value,name_en:$('lNameEn').value,license_number:$('lLicenseNo').value,identity_number:$('lIdentity').value,address:$('lAddress').value,birth_date:$('lBirth').value,card_issue_date:$('lCardIssue').value,first_issue_date:$('lFirstIssue').value,expiry_date:$('lExpiry').value,license_class:$('lClass').value,license_type:$('lType').value};}
  async function save(){try{const data=body();$('licenseMsg').textContent='جاري الحفظ...';if(isNew){const d=await api('/api/driver-licenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await load();await openOne(d.id);$('licenseMsg').textContent='تمت إضافة الرخصة الجديدة';}else if(current){await api(`/api/driver-licenses/${current.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await load();await openOne(current.id);$('licenseMsg').textContent='تم حفظ البيانات';}}catch(e){$('licenseMsg').textContent=e.message;}}
  async function openImage(){if(!current?.id)return;$('licenseMsg').textContent='جاري فتح الصورة...';await openStoredImage(current.id);}
  async function delImage(){if(!current?.id||!current.has_image)return;if(!confirm('حذف صورة الرخصة الحالية نهائيًا؟'))return;try{await api(`/api/driver-licenses/${current.id}/image`,{method:'DELETE'});await load();await openOne(current.id);$('licenseMsg').textContent='تم حذف المرفق';}catch(e){$('licenseMsg').textContent=e.message||'تعذر حذف المرفق';}}
  function printLicenses(){
    const list=filteredRows();if(!list.length){alert('لا توجد بيانات للطباعة');return;}
    const header=new URL('assets/header.png',location.href).href,footer=new URL('assets/footer.png',location.href).href;
    const bodyRows=list.map((x,i)=>`<tr><td>${i+1}</td><td class="name"><strong>${esc(x.name_ar)}</strong><small>${esc(x.name_en||'')}</small></td><td>${esc(x.address||'-')}</td><td>${esc(x.license_class||'-')}</td><td>${esc(x.license_type||'-')}</td><td>${esc(x.expiry_date||'-')}</td><td>${x.days_remaining??'-'}</td><td class="${x.status==='تنتهي قريبًا'||x.status==='منتهية'?'warn':''}">${esc(x.status||'-')}</td></tr>`).join('');
    const w=window.open('','_blank','width=1200,height=850');if(!w){alert('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للموقع.');return;}
    w.document.open();w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سجل رخص السائقين</title><style>@page{size:A4 landscape;margin:7mm 8mm 7mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,"Noto Kufi Arabic",Tahoma,sans-serif;color:#111;background:#fff}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.6pt}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #444;padding:3.2mm 2mm;text-align:center;vertical-align:middle;line-height:1.25}th{background:#f1f5f9;font-weight:800;font-size:9.2pt}.letterhead th{border:0!important;background:#fff!important;padding:0 0 3mm!important}.letterhead img{display:block;width:100%;max-height:26mm;object-fit:contain}.title{font-size:15pt;font-weight:800;margin:2mm 0 1mm}.subtitle{font-size:9pt;font-weight:500;color:#555;margin:0 0 2mm}.footer td{border:0!important;padding:3mm 0 0!important}.footer img{display:block;width:100%;max-height:12mm;object-fit:contain}.name strong{display:block;font-size:9.7pt}.name small{display:block;margin-top:1mm;font-size:7.5pt;color:#777;direction:ltr}.warn{font-weight:800;color:#b91c1c;background:#fff7f7}th:nth-child(1),td:nth-child(1){width:5%}th:nth-child(2),td:nth-child(2){width:24%}th:nth-child(3),td:nth-child(3){width:12%}th:nth-child(4),td:nth-child(4){width:9%}th:nth-child(5),td:nth-child(5){width:18%}th:nth-child(6),td:nth-child(6){width:13%}th:nth-child(7),td:nth-child(7){width:9%}th:nth-child(8),td:nth-child(8){width:10%}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><table><thead><tr class="letterhead"><th colspan="8"><img src="${header}"><div class="title">سجل رخص السائقين والموظفين</div><div class="subtitle">قاعدة الموظفين المعتمدة ومتابعة انتهاء الرخص</div></th></tr><tr><th>م</th><th>الاسم</th><th>العنوان</th><th>الفئة</th><th>نوع الرخصة</th><th>تاريخ الانتهاء</th><th>الأيام المتبقية</th><th>الحالة</th></tr></thead><tbody>${bodyRows}</tbody><tfoot><tr class="footer"><td colspan="8"><img src="${footer}"></td></tr></tfoot></table><script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script></body></html>`);w.document.close();
  }
  function init(){if(!$('licenseBody'))return;$('licenseSearch').addEventListener('input',render);$('saveLicenseBtn').onclick=save;$('newLicenseBtn').onclick=newLicense;$('cancelLicenseEditBtn').onclick=cancelEdit;$('printLicensesBtn').onclick=printLicenses;$('openLicenseImageBtn').onclick=openImage;$('deleteLicenseImageBtn').onclick=delImage;window.addEventListener('driver-license-image-saved',async e=>{try{await load();const id=Number(e.detail?.id||0);if(id&&current?.id===id)await openOne(id);}catch{}});load().catch(e=>$('licenseBody').innerHTML=`<tr><td colspan="9">${esc(e.message)}</td></tr>`);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-driver-license-badge.js ===== */
(function(){
  function ensureBadge(count){
    const nav=document.querySelector('.top-header nav');
    if(!nav)return false;
    const link=nav.querySelector('a[href="/drivers-licenses.html"]');
    if(!link)return false;
    let badge=link.querySelector('.driver-license-alert-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='driver-license-alert-badge';
      badge.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin-inline-start:6px;border-radius:999px;background:#c62828;color:#fff;font-size:12px;font-weight:800;line-height:1;vertical-align:middle;box-shadow:0 0 0 2px rgba(198,40,40,.12)';
      link.appendChild(badge);
    }
    badge.textContent=String(count);
    badge.title=`${count} رخصة متبقي على انتهائها 45 يومًا أو أقل`;
    badge.style.display=count>0?'inline-flex':'none';
    return true;
  }
  async function refresh(){
    try{
      const r=await fetch('/api/driver-licenses',{cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      const rows=Array.isArray(d.rows)?d.rows:[];
      const count=rows.filter(x=>Number.isFinite(Number(x.days_remaining))&&Number(x.days_remaining)>=0&&Number(x.days_remaining)<=45).length;
      let tries=0;
      const paint=()=>{if(ensureBadge(count)||tries++>20)return;setTimeout(paint,250);};
      paint();
    }catch(_){ }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
  window.addEventListener('driver-licenses-updated',refresh);
})();

;

/* ===== js/app-driver-license-status-red.js ===== */
(function(){
  function apply(){
    const body=document.getElementById('licenseBody');
    if(!body)return;
    body.querySelectorAll('tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<7)return;
      const statusCell=cells[6];
      const text=String(statusCell.textContent||'').trim();
      if(text==='تنتهي قريبًا'){
        statusCell.style.setProperty('background','transparent','important');
        statusCell.style.setProperty('color','inherit','important');
        statusCell.style.setProperty('font-weight','400','important');
        const pill=statusCell.querySelector('.status-pill')||statusCell.querySelector('span');
        if(pill){
          pill.style.setProperty('display','inline-flex','important');
          pill.style.setProperty('align-items','center','important');
          pill.style.setProperty('justify-content','center','important');
          pill.style.setProperty('background','#fef2f2','important');
          pill.style.setProperty('color','#b91c1c','important');
          pill.style.setProperty('border','1px solid #fecaca','important');
          pill.style.setProperty('border-radius','999px','important');
          pill.style.setProperty('font-weight','800','important');
          pill.style.setProperty('padding','5px 10px','important');
          pill.style.setProperty('box-shadow','none','important');
        }
      }
    });
  }
  function init(){
    const body=document.getElementById('licenseBody');
    if(!body)return;
    apply();
    new MutationObserver(apply).observe(body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('driver-licenses-updated',apply);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-driver-license-multi-image-import.js ===== */
(function(){
  const $=id=>document.getElementById(id);
  let rows=[],cropper=null,selectedFile=null;
  const bytes=n=>n<1024?`${n} B`:n<1024*1024?`${Math.round(n/1024)} KB`:`${(n/1024/1024).toFixed(2)} MB`;
  function dataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
  async function loadRows(){const r=await fetch('/api/driver-licenses',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'تعذر تحميل أسماء الموظفين');rows=d.rows||[];const sel=$('licenseLinkEmployee'),current=sel.value;sel.innerHTML='<option value="">اختر الاسم...</option>'+rows.map(x=>`<option value="${x.id}">${x.name_ar} — ${x.name_en||'-'}</option>`).join('');if(current&&rows.some(x=>String(x.id)===String(current)))sel.value=current;syncEmployee();}
  function selectedEmployee(){const id=Number($('licenseLinkEmployee').value||0);return rows.find(x=>Number(x.id)===id)||null;}
  function syncEmployee(){const e=selectedEmployee(),cur=$('currentLicenseExpiry'),next=$('newLicenseExpiry'),info=$('licenseLinkInfo');if(!e){cur.value='';next.value='';info.textContent='';return;}cur.value=e.expiry_date||'';next.value=e.expiry_date||'';info.textContent=e.has_image?'يوجد مرفق حالي لهذا الموظف، وسيتم استبداله تلقائيًا عند حفظ الصورة الجديدة.':'لا يوجد مرفق حالي لهذا الموظف.';}
  function destroyCropper(){if(cropper){cropper.destroy();cropper=null;}}
  function openEditor(file){destroyCropper();selectedFile=file;const img=$('licenseCropImage'),url=URL.createObjectURL(file);img.src=url;$('licenseImageEditor').classList.remove('hidden');img.onload=()=>{cropper=new Cropper(img,{viewMode:1,dragMode:'move',autoCropArea:.92,responsive:true,background:false,rotatable:true,scalable:true,zoomable:true,checkOrientation:true});setTimeout(()=>URL.revokeObjectURL(url),30000);};$('licenseImageEditInfo').textContent=`الحجم الأصلي: ${bytes(file.size)}. يمكنك القص والتدوير والتكبير قبل الحفظ.`;}
  function canvasToBlob(canvas,type='image/webp',quality=.86){return new Promise(resolve=>canvas.toBlob(resolve,type,quality));}
  async function editedBlob(target=300*1024){if(!cropper)throw new Error('اختر صورة أولًا');const c=cropper.getCroppedCanvas({maxWidth:2000,maxHeight:2000,imageSmoothingEnabled:true,imageSmoothingQuality:'high',fillColor:'#fff'});if(!c)throw new Error('تعذر تجهيز الصورة');let q=.88,blob=null;for(let i=0;i<9;i++){blob=await canvasToBlob(c,'image/webp',q);if(blob&&blob.size<=target)break;q=Math.max(.48,q-.05);}if(!blob)throw new Error('تعذر ضغط الصورة');return blob;}
  async function saveLinked(){const e=selectedEmployee(),msg=$('licenseLinkMsg');if(!e){msg.textContent='اختر اسم الموظف أولًا';return;}if(!selectedFile||!cropper){msg.textContent='اختر صورة الرخصة أولًا';return;}const next=$('newLicenseExpiry').value||e.expiry_date||'';if(next&&e.expiry_date&&next<e.expiry_date&&!confirm(`تاريخ الانتهاء الجديد ${next} أقدم من المحفوظ ${e.expiry_date}. هل تريد المتابعة؟`))return;try{$('saveLinkedLicenseBtn').disabled=true;msg.textContent='جاري تجهيز الصورة وضغطها...';const blob=await editedBlob(),base64=await dataUrl(blob);msg.textContent='جاري رفع الصورة وربطها بالسجل...';const r=await fetch(`/api/driver-licenses/${e.id}/renew`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_base64:base64,image_name:String(selectedFile.name||'license').replace(/\.[^.]+$/,'')+'.webp',image_mime:'image/webp',expiry_date:next})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'فشل رفع الصورة');msg.textContent=`تم ربط الصورة مع ${e.name_ar} واستبدال المرفق السابق. الحجم بعد الضغط: ${bytes(blob.size)}${next&&next!==e.expiry_date?` — تم تحديث الانتهاء إلى ${next}`:''}`;destroyCropper();selectedFile=null;$('singleLicenseImage').value='';$('licenseImageEditor').classList.add('hidden');await loadRows();$('licenseLinkEmployee').value=String(e.id);syncEmployee();window.dispatchEvent(new CustomEvent('driver-license-image-saved',{detail:{id:e.id}}));window.dispatchEvent(new Event('driver-licenses-updated'));}catch(err){msg.textContent=err.message||'تعذر حفظ الصورة';}finally{$('saveLinkedLicenseBtn').disabled=false;}}
  function init(){const input=$('singleLicenseImage');if(!input)return;loadRows().catch(e=>$('licenseLinkMsg').textContent=e.message);window.addEventListener('driver-licenses-loaded',()=>loadRows().catch(()=>{}));$('licenseLinkEmployee').addEventListener('change',syncEmployee);input.addEventListener('change',()=>{const f=input.files?.[0];if(!f)return;if(!String(f.type||'').startsWith('image/')){$('licenseLinkMsg').textContent='اختر ملف صورة فقط';return;}if(f.size>12*1024*1024){$('licenseLinkMsg').textContent='حجم الصورة أكبر من 12MB';return;}openEditor(f);});$('cropRotateLeft').onclick=()=>cropper?.rotate(-90);$('cropRotateRight').onclick=()=>cropper?.rotate(90);$('cropZoomIn').onclick=()=>cropper?.zoom(.1);$('cropZoomOut').onclick=()=>cropper?.zoom(-.1);$('cropReset').onclick=()=>cropper?.reset();$('cropAspectFree').onclick=()=>cropper?.setAspectRatio(NaN);$('cropAspectCard').onclick=()=>cropper?.setAspectRatio(1.586);$('saveLinkedLicenseBtn').onclick=saveLinked;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-driver-license-print-v2.js ===== */
(function(){
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function getRows(){
    const all=Array.isArray(window.MINYA_DRIVER_LICENSE_ROWS)?window.MINYA_DRIVER_LICENSE_ROWS:[];
    const q=String(document.getElementById('licenseSearch')?.value||'').trim().toLowerCase();
    return all.filter(x=>!q||[x.name_ar,x.name_en,x.address,x.license_class,x.license_type].join(' ').toLowerCase().includes(q));
  }
  function pageRows(rows,start){
    return rows.map((x,i)=>`<tr><td class="no">${start+i+1}</td><td class="name"><strong>${esc(x.name_ar)}</strong><small>${esc(x.name_en||'')}</small></td><td>${esc(x.address||'-')}</td><td>${esc(x.license_class||'-')}</td><td>${esc(x.license_type||'-')}</td><td>${esc(x.expiry_date||'-')}</td><td>${x.days_remaining??'-'}</td><td class="${x.status==='تنتهي قريبًا'||x.status==='منتهية'?'warn':''}">${esc(x.status||'-')}</td></tr>`).join('');
  }
  function printNow(){
    const rows=getRows();
    if(!rows.length){alert('لا توجد بيانات للطباعة');return;}
    const header=new URL('assets/header.png',location.href).href;
    const footer=new URL('assets/footer.png',location.href).href;
    const pages=[];
    let start=0;
    while(start<rows.length){
      const pageSize=start===0?20:17;
      const part=rows.slice(start,start+pageSize);
      pages.push(`<section class="sheet"><header><img src="${header}" alt="هيدر المجلس"><h1>سجل رخص السائقين والموظفين</h1><p>قاعدة الموظفين المعتمدة ومتابعة انتهاء الرخص</p></header><div class="table-wrap"><table><thead><tr><th>الرقم</th><th>الاسم</th><th>العنوان</th><th>الفئة</th><th>نوع الرخصة</th><th>تاريخ الانتهاء</th><th>الأيام المتبقية</th><th>الحالة</th></tr></thead><tbody>${pageRows(part,start)}</tbody></table></div><footer><img src="${footer}" alt="تذييل المجلس"><div class="page-no">صفحة ${pages.length+1}</div></footer></section>`);
      start+=pageSize;
    }
    const w=window.open('','_blank','width=900,height=1000');
    if(!w){alert('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للموقع.');return;}
    w.document.open();
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سجل رخص السائقين</title><style>
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Tahoma,"Noto Kufi Arabic",Arial,sans-serif}
.sheet{width:210mm;height:297mm;padding:0 8mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}
.sheet:last-child{page-break-after:auto}
header{flex:0 0 auto;text-align:center}
header img{display:block;width:210mm;height:auto;margin:0 -8mm 1.2mm}
h1{font-size:14pt;margin:0 0 .6mm;font-weight:800}
header p{font-size:8.2pt;margin:0 0 2mm;color:#555}
.table-wrap{width:100%;overflow:visible}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.1pt}
th,td{border:1px solid #333;text-align:center;vertical-align:middle;padding:1.2mm .7mm;line-height:1.12;height:9.7mm;white-space:normal;overflow-wrap:normal;word-break:normal}
th{background:#eef2f6;font-weight:800;height:8.3mm;font-size:8.2pt}
.no{font-weight:700}
.name{white-space:normal!important;overflow:visible!important}
.name strong{display:block;font-size:8.5pt;line-height:1.08;white-space:normal}
.name small{display:block;margin-top:.4mm;font-size:6.2pt;line-height:1;color:#777;direction:ltr;white-space:nowrap}
.warn{font-weight:800;color:#b91c1c;background:#fff2f2}
th:nth-child(1),td:nth-child(1){width:7%}
th:nth-child(2),td:nth-child(2){width:23%}
th:nth-child(3),td:nth-child(3){width:12%}
th:nth-child(4),td:nth-child(4){width:8%}
th:nth-child(5),td:nth-child(5){width:18%}
th:nth-child(6),td:nth-child(6){width:14%}
th:nth-child(7),td:nth-child(7){width:9%}
th:nth-child(8),td:nth-child(8){width:9%}
footer{margin-top:auto;flex:0 0 auto;position:relative;padding-top:2mm}
footer img{display:block;width:210mm;height:auto;margin:0 -8mm}
.page-no{position:absolute;left:0;bottom:1mm;font-size:7pt;color:#666}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{break-after:page}.sheet:last-child{break-after:auto}}
</style></head><body>${pages.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),350);<\/script></body></html>`);
    w.document.close();
  }
  function bind(){const b=document.getElementById('printLicensesBtn');if(b)b.onclick=printNow;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();

;