(function(){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let rows=[],current=null,isNew=false,vehicleRows=[],vehicleEditingId=null;
  async function api(url,opt){const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'فشل الطلب');return d;}
  function statusClass(s){return s==='منتهية'||s==='تنتهي قريبًا'?'danger':'success';}

  function setupPageIdentity(){
    document.title='المركبات والسائقون';
    const subtitle=document.querySelector('.top-header > div > p');if(subtitle)subtitle.textContent='مركبات حركة المكب وسائقو المجلس';
    const nav=document.querySelector('.top-header nav a[href="/drivers-licenses.html"]');if(nav)nav.textContent='المركبات والسائقون';
  }

  function mountVehiclesPanel(){
    const main=document.querySelector('main.container');
    const firstPanel=main?.querySelector('section.panel');
    if(!main||!firstPanel||$('movementVehiclesPanel'))return;
    const section=document.createElement('section');
    section.id='movementVehiclesPanel';section.className='panel';
    section.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
        <div><h2 style="margin-bottom:4px">مركبات حركة المكب</h2><p style="margin:0;color:#64748b">سجل مركبات حركة المكب وربطها بسائقي المجلس المسجلين في قسم الرخص.</p></div>
        <button id="newMovementVehicleBtn" class="v3-primary" type="button">إضافة مركبة</button>
      </div>
      <div id="vehicleKpis" class="daily-summary" style="margin-top:16px"></div>
      <div class="v3-table-wrap" style="margin-top:14px"><table class="v3-table"><thead><tr><th>رقم اللوحة</th><th>نوع المركبة</th><th>الموديل</th><th>السائق</th><th>حالة الرخصة</th><th>حالة المركبة</th><th>إجراء</th></tr></thead><tbody id="movementVehicleBody"><tr><td colspan="7">جاري تحميل المركبات...</td></tr></tbody></table></div>
      <div id="movementVehicleEditor" class="hidden" style="margin-top:16px;padding-top:16px;border-top:1px solid #dbe4df">
        <div class="editor-head"><h2 id="movementVehicleEditorTitle">بيانات المركبة</h2><button id="cancelMovementVehicleBtn" class="editor-close" type="button">×</button></div>
        <div class="form-grid">
          <label>رقم اللوحة<input id="mvPlate" autocomplete="off"></label>
          <label>نوع المركبة<input id="mvType" placeholder="مثال: سيارة حركة"></label>
          <label>الموديل<input id="mvModel"></label>
          <label>السائق من موظفي المجلس<select id="mvDriver"><option value="">بدون سائق محدد</option></select></label>
          <label>حالة المركبة<select id="mvStatus"><option>تعمل</option><option>متوقفة</option><option>خارج الخدمة</option></select></label>
          <label>ملاحظات<input id="mvNotes"></label>
        </div>
        <p id="mvDriverInfo" style="margin:10px 0;color:#475569"></p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button id="saveMovementVehicleBtn" class="v3-primary" type="button">حفظ المركبة</button><button id="deleteMovementVehicleBtn" type="button" style="background:#b91c1c;color:white">حذف المركبة</button></div>
        <p id="movementVehicleMsg"></p>
      </div>`;
    main.insertBefore(section,firstPanel);
    $('newMovementVehicleBtn').onclick=()=>openVehicleEditor();
    $('cancelMovementVehicleBtn').onclick=closeVehicleEditor;
    $('saveMovementVehicleBtn').onclick=saveVehicle;
    $('deleteMovementVehicleBtn').onclick=deleteVehicle;
    $('mvDriver').addEventListener('change',renderVehicleDriverInfo);
  }

  function driverOptions(selected=''){
    return '<option value="">بدون سائق محدد</option>'+rows.map(x=>`<option value="${x.id}"${String(x.id)===String(selected)?' selected':''}>${esc(x.name_ar)} — ${esc(x.license_class||'-')}</option>`).join('');
  }
  function renderVehicleDriverInfo(){
    const id=Number($('mvDriver')?.value||0),d=rows.find(x=>Number(x.id)===id),box=$('mvDriverInfo');if(!box)return;
    if(!d){box.textContent='';return;}
    box.textContent=`الرخصة: ${d.status||'-'} — الانتهاء: ${d.expiry_date||'-'} — المتبقي: ${d.days_remaining??'-'} يوم`;
  }
  function renderVehicles(){
    const body=$('movementVehicleBody');if(!body)return;
    $('vehicleKpis').innerHTML=`<div><span>مركبات الحركة</span><strong>${vehicleRows.length}</strong></div><div><span>تعمل</span><strong>${vehicleRows.filter(x=>x.status==='تعمل').length}</strong></div><div><span>مرتبطة بسائق</span><strong>${vehicleRows.filter(x=>x.driver_id).length}</strong></div><div><span>رخص تحتاج متابعة</span><strong>${vehicleRows.filter(x=>x.driver_id&&(x.driver_license_status==='منتهية'||x.driver_license_status==='تنتهي قريبًا')).length}</strong></div>`;
    body.innerHTML=vehicleRows.length?vehicleRows.map(x=>`<tr><td><strong>${esc(x.plate_number)}</strong></td><td>${esc(x.vehicle_type||'-')}</td><td>${esc(x.model||'-')}</td><td>${esc(x.driver_name||'-')}</td><td>${x.driver_id?`<span class="status-pill ${statusClass(x.driver_license_status)}">${esc(x.driver_license_status)}</span><br><small>${esc(x.driver_license_expiry||'-')}</small>`:'-'}</td><td>${esc(x.status||'-')}</td><td><button type="button" data-vehicle-edit="${x.id}">فتح</button></td></tr>`).join(''):'<tr><td colspan="7">لم تتم إضافة مركبات حركة المكب بعد</td></tr>';
    body.querySelectorAll('[data-vehicle-edit]').forEach(b=>b.onclick=()=>openVehicleEditor(Number(b.dataset.vehicleEdit)));
  }
  async function loadVehicles(){
    if(!$('movementVehicleBody'))return;
    try{const d=await api('/api/movement-vehicles');vehicleRows=d.rows||[];renderVehicles();}catch(e){$('movementVehicleBody').innerHTML=`<tr><td colspan="7">${esc(e.message)}</td></tr>`;}
  }
  function openVehicleEditor(id=null){
    vehicleEditingId=id;
    const x=id?vehicleRows.find(v=>Number(v.id)===Number(id)):null;
    $('movementVehicleEditor').classList.remove('hidden');
    $('movementVehicleEditorTitle').textContent=x?`بيانات المركبة — ${x.plate_number}`:'إضافة مركبة حركة المكب';
    $('mvPlate').value=x?.plate_number||'';$('mvType').value=x?.vehicle_type||'';$('mvModel').value=x?.model||'';$('mvStatus').value=x?.status||'تعمل';$('mvNotes').value=x?.notes||'';
    $('mvDriver').innerHTML=driverOptions(x?.driver_id||'');
    $('deleteMovementVehicleBtn').style.display=x?'inline-block':'none';
    $('movementVehicleMsg').textContent='';renderVehicleDriverInfo();
    $('movementVehicleEditor').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function closeVehicleEditor(){vehicleEditingId=null;$('movementVehicleEditor')?.classList.add('hidden');}
  async function saveVehicle(){
    try{
      const payload={plate_number:$('mvPlate').value,vehicle_type:$('mvType').value,model:$('mvModel').value,driver_id:$('mvDriver').value||null,status:$('mvStatus').value,notes:$('mvNotes').value};
      $('movementVehicleMsg').textContent='جاري الحفظ...';
      if(vehicleEditingId)await api(`/api/movement-vehicles/${vehicleEditingId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      else await api('/api/movement-vehicles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      await loadVehicles();$('movementVehicleMsg').textContent='تم الحفظ';closeVehicleEditor();
    }catch(e){$('movementVehicleMsg').textContent=e.message;}
  }
  async function deleteVehicle(){
    if(!vehicleEditingId||!confirm('حذف هذه المركبة من سجل حركة المكب؟'))return;
    try{await api(`/api/movement-vehicles/${vehicleEditingId}`,{method:'DELETE'});await loadVehicles();closeVehicleEditor();}catch(e){$('movementVehicleMsg').textContent=e.message;}
  }

  async function openStoredImage(id){try{const r=await fetch(`/api/driver-licenses/${id}/image`,{cache:'no-store'});if(!r.ok)throw new Error(r.status===404?'لا توجد صورة رخصة محفوظة':'تعذر فتح صورة الرخصة');const blob=await r.blob();if(!blob.size)throw new Error('المرفق فارغ');const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');if(!w){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();}setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){alert(e.message||'تعذر فتح صورة الرخصة');}}
  function filteredRows(){const q=String($('licenseSearch').value||'').trim().toLowerCase();return rows.filter(x=>!q||[x.name_ar,x.name_en,x.address,x.license_class,x.license_type].join(' ').toLowerCase().includes(q));}
  function render(){
    const list=filteredRows();
    const urgent=rows.filter(x=>Number.isFinite(Number(x.days_remaining))&&Number(x.days_remaining)>=0&&Number(x.days_remaining)<=15);
    $('licenseKpis').innerHTML=`<div><span>عدد موظفي المجلس</span><strong>${rows.length}</strong></div><div><span>سارية</span><strong>${rows.filter(x=>x.status==='سارية').length}</strong></div><div style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c"><span>تنتهي قريبًا</span><strong>${rows.filter(x=>x.status==='تنتهي قريبًا').length}</strong></div><div style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c"><span>15 يوم أو أقل</span><strong>${urgent.length}</strong></div><div><span>منتهية</span><strong>${rows.filter(x=>x.status==='منتهية').length}</strong></div>`;
    const u=$('licenseUrgent');if(urgent.length){u.style.display='block';u.textContent=`تنبيه مهم: ${urgent.length} رخصة متبقي على انتهائها 15 يومًا أو أقل — ${urgent.map(x=>x.name_ar+' ('+x.days_remaining+' يوم)').join('، ')}`;}else{u.style.display='none';u.textContent='';}
    $('licenseBody').innerHTML=list.map(x=>`<tr${Number(x.days_remaining)>=0&&Number(x.days_remaining)<=15?' style="background:#fff7f7"':''}><td><strong>${esc(x.name_ar)}</strong><br><small>${esc(x.name_en)}</small></td><td>${esc(x.address||'-')}</td><td>${esc(x.license_class||'-')}</td><td>${esc(x.license_type||'-')}</td><td>${esc(x.expiry_date||'-')}</td><td>${x.days_remaining??'-'}</td><td><span class="status-pill ${statusClass(x.status)}">${esc(x.status)}</span></td><td>${x.has_image?`<button type="button" data-view-image="${x.id}">عرض الصورة</button>`:'-'}</td><td><button data-edit="${x.id}">فتح</button></td></tr>`).join('')||'<tr><td colspan="9">لا توجد نتائج</td></tr>';
    $('licenseBody').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openOne(Number(b.dataset.edit)));
    $('licenseBody').querySelectorAll('[data-view-image]').forEach(b=>b.onclick=e=>{e.stopPropagation();openStoredImage(Number(b.dataset.viewImage));});
    if($('mvDriver')){$('mvDriver').innerHTML=driverOptions($('mvDriver').value);renderVehicleDriverInfo();}
  }
  async function load(){const d=await api('/api/driver-licenses');rows=d.rows||[];render();window.MINYA_DRIVER_LICENSE_ROWS=rows;window.dispatchEvent(new CustomEvent('driver-licenses-loaded',{detail:{rows}}));window.dispatchEvent(new Event('driver-licenses-updated'));}
  function fillForm(d={}){[['lNameAr','name_ar'],['lNameEn','name_en'],['lLicenseNo','license_number'],['lIdentity','identity_number'],['lAddress','address'],['lBirth','birth_date'],['lCardIssue','card_issue_date'],['lFirstIssue','first_issue_date'],['lExpiry','expiry_date'],['lClass','license_class'],['lType','license_type']].forEach(([i,k])=>{$(i).value=d[k]||'';});}
  async function openOne(id){const d=await api(`/api/driver-licenses/${id}`);current=d.driver;isNew=false;$('licenseEditor').classList.remove('hidden');$('licenseEditorTitle').textContent=`بيانات الرخصة — ${current.name_ar}`;fillForm(current);$('licenseEvents').innerHTML=(d.events||[]).map(e=>`<tr><td>${esc(String(e.event_date||'').replace('T',' ').slice(0,19))}</td><td>${esc(e.event_type)}</td><td>${esc(e.details||'-')}</td></tr>`).join('')||'<tr><td colspan="3">لا يوجد سجل تغييرات بعد</td></tr>';$('licenseMsg').textContent=current.has_image?'يوجد مرفق محفوظ لهذا الموظف':'لا يوجد مرفق محفوظ لهذا الموظف';$('openLicenseImageBtn').disabled=!current.has_image;$('deleteLicenseImageBtn').disabled=!current.has_image;$('licenseEditor').scrollIntoView({behavior:'smooth',block:'start'});}
  function newLicense(){current=null;isNew=true;$('licenseEditor').classList.remove('hidden');$('licenseEditorTitle').textContent='إضافة رخصة موظف';fillForm({});$('licenseEvents').innerHTML='<tr><td colspan="3">سيظهر سجل التغييرات بعد الحفظ</td></tr>';$('licenseMsg').textContent='أدخل بيانات الرخصة ثم اضغط حفظ. بعد ذلك استخدم قسم رفع الصورة لربط المرفق.';$('openLicenseImageBtn').disabled=true;$('deleteLicenseImageBtn').disabled=true;$('licenseEditor').scrollIntoView({behavior:'smooth',block:'start'});}
  function cancelEdit(){current=null;isNew=false;fillForm({});$('licenseMsg').textContent='';$('licenseEditor').classList.add('hidden');}
  function body(){return{name_ar:$('lNameAr').value,name_en:$('lNameEn').value,license_number:$('lLicenseNo').value,identity_number:$('lIdentity').value,address:$('lAddress').value,birth_date:$('lBirth').value,card_issue_date:$('lCardIssue').value,first_issue_date:$('lFirstIssue').value,expiry_date:$('lExpiry').value,license_class:$('lClass').value,license_type:$('lType').value};}
  async function save(){try{const data=body();$('licenseMsg').textContent='جاري الحفظ...';if(isNew){const d=await api('/api/driver-licenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await load();await openOne(d.id);$('licenseMsg').textContent='تمت إضافة الرخصة الجديدة';}else if(current){await api(`/api/driver-licenses/${current.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await load();await loadVehicles();await openOne(current.id);$('licenseMsg').textContent='تم حفظ البيانات';}}catch(e){$('licenseMsg').textContent=e.message;}}
  async function openImage(){if(!current?.id)return;$('licenseMsg').textContent='جاري فتح الصورة...';await openStoredImage(current.id);}
  async function delImage(){if(!current?.id||!current.has_image)return;if(!confirm('حذف صورة الرخصة الحالية نهائيًا؟'))return;try{await api(`/api/driver-licenses/${current.id}/image`,{method:'DELETE'});await load();await openOne(current.id);$('licenseMsg').textContent='تم حذف المرفق';}catch(e){$('licenseMsg').textContent=e.message||'تعذر حذف المرفق';}}
  function printLicenses(){
    const list=filteredRows();if(!list.length){alert('لا توجد بيانات للطباعة');return;}
    const header=new URL('assets/header.png',location.href).href,footer=new URL('assets/footer.png',location.href).href;
    const bodyRows=list.map((x,i)=>`<tr><td>${i+1}</td><td class="name"><strong>${esc(x.name_ar)}</strong><small>${esc(x.name_en||'')}</small></td><td>${esc(x.address||'-')}</td><td>${esc(x.license_class||'-')}</td><td>${esc(x.license_type||'-')}</td><td>${esc(x.expiry_date||'-')}</td><td>${x.days_remaining??'-'}</td><td class="${x.status==='تنتهي قريبًا'||x.status==='منتهية'?'warn':''}">${esc(x.status||'-')}</td></tr>`).join('');
    const w=window.open('','_blank','width=1200,height=850');if(!w){alert('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للموقع.');return;}
    w.document.open();w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سجل رخص سائقي المجلس</title><style>@page{size:A4 landscape;margin:7mm 8mm 7mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,"Noto Kufi Arabic",Tahoma,sans-serif;color:#111;background:#fff}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.6pt}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #444;padding:3.2mm 2mm;text-align:center;vertical-align:middle;line-height:1.25}th{background:#f1f5f9;font-weight:800;font-size:9.2pt}.letterhead th{border:0!important;background:#fff!important;padding:0 0 3mm!important}.letterhead img{display:block;width:100%;max-height:26mm;object-fit:contain}.title{font-size:15pt;font-weight:800;margin:2mm 0 1mm}.subtitle{font-size:9pt;font-weight:500;color:#555;margin:0 0 2mm}.footer td{border:0!important;padding:3mm 0 0!important}.footer img{display:block;width:100%;max-height:12mm;object-fit:contain}.name strong{display:block;font-size:9.7pt}.name small{display:block;margin-top:1mm;font-size:7.5pt;color:#777;direction:ltr}.warn{font-weight:800;color:#b91c1c;background:#fff7f7}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><table><thead><tr class="letterhead"><th colspan="8"><img src="${header}"><div class="title">سجل رخص سائقي المجلس</div><div class="subtitle">موظفو المجلس العاملون على مركبات حركة المكب</div></th></tr><tr><th>م</th><th>الاسم</th><th>العنوان</th><th>الفئة</th><th>نوع الرخصة</th><th>تاريخ الانتهاء</th><th>الأيام المتبقية</th><th>الحالة</th></tr></thead><tbody>${bodyRows}</tbody><tfoot><tr class="footer"><td colspan="8"><img src="${footer}"></td></tr></tfoot></table><script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script></body></html>`);w.document.close();
  }

  async function init(){
    if(!$('licenseBody'))return;
    setupPageIdentity();mountVehiclesPanel();
    const licensePanel=$('licenseSearch')?.closest('section.panel');const heading=licensePanel?.querySelector('h2');if(heading)heading.textContent='رخص سائقي المجلس';
    const p=heading?.parentElement?.querySelector('p');if(p)p.textContent='رخص موظفي المجلس المسجلين كسائقي مركبات حركة المكب ومتابعة تواريخ الانتهاء والمرفقات.';
    $('licenseSearch').addEventListener('input',render);$('saveLicenseBtn').onclick=save;$('newLicenseBtn').onclick=newLicense;$('cancelLicenseEditBtn').onclick=cancelEdit;$('printLicensesBtn').onclick=printLicenses;$('openLicenseImageBtn').onclick=openImage;$('deleteLicenseImageBtn').onclick=delImage;
    window.addEventListener('driver-license-image-saved',async e=>{try{await load();await loadVehicles();const id=Number(e.detail?.id||0);if(id&&current?.id===id)await openOne(id);}catch{}});
    try{await load();await loadVehicles();}catch(e){$('licenseBody').innerHTML=`<tr><td colspan="9">${esc(e.message)}</td></tr>`;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
