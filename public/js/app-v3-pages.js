/* =========================================================
   V3 management pages
========================================================= */
(function(){
  const path=location.pathname.replace(/\/+$/,"")||"/";
  const fmt=v=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:2});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  function shell(title,subtitle){
    const main=document.querySelector("main.container"); if(!main)return null;
    main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>MINYA LANDFILL</span><h2>${title}</h2><p>${subtitle}</p></div></div><div id="v3Content"></div></section>`;
    return document.getElementById("v3Content");
  }
  function activeNav(href,label){
    const nav=document.querySelector(".top-header nav"); if(!nav)return;
    let a=nav.querySelector(`a[href="${href}"]`); if(!a){a=document.createElement("a");a.href=href;a.className="app-nav-link";a.textContent=label;nav.appendChild(a);} nav.querySelectorAll(".app-nav-link").forEach(x=>x.classList.toggle("active",x.getAttribute("href")===href));
  }
  function addGlobalNav(){
    const nav=document.querySelector(".top-header nav"); if(!nav)return;
    const items=[["/equipment","المعدات"],["/weekly","الأسبوعي"],["/search","بحث متقدم"],["/managerial","تقرير إداري"]];
    items.forEach(([href,label])=>{if(!nav.querySelector(`a[href="${href}"]`)){const a=document.createElement("a");a.href=href;a.className="app-nav-link";a.textContent=label;nav.appendChild(a);}});
  }
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"فشل الطلب");return d;}

  async function renderEquipment(){
    activeNav("/equipment","المعدات"); const c=shell("المعدات والصيانة","متابعة حالة الآليات وساعات العمل والسولار وسجل الأعطال والصيانة."); if(!c)return;
    c.innerHTML=`<div class="v3-filter"><label>من<input id="eqFrom" type="date"></label><label>إلى<input id="eqTo" type="date"></label><button id="eqLoad">تحديث</button></div><div class="v3-panel"><h3>ملخص المعدات</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>الآلية</th><th>الحالة الأخيرة</th><th>ساعات العمل</th><th>السولار</th><th>أيام التسجيل</th><th>سجلات الصيانة</th></tr></thead><tbody id="eqBody"></tbody></table></div></div><div class="v3-panel"><h3>إضافة سجل صيانة / عطل</h3><div class="v3-form-grid"><label>اسم الآلية<input id="maintName"></label><label>التاريخ<input id="maintDate" type="date"></label><label>الحالة<select id="maintStatus"><option>ملاحظة</option><option>صيانة</option><option>عطل</option><option>إصلاح</option></select></label><label>التكلفة<input id="maintCost" type="number" step="0.01"></label></div><label>الوصف<textarea id="maintDesc" rows="3"></textarea></label><label>الإجراء المتخذ<textarea id="maintAction" rows="2"></textarea></label><button id="maintSave" class="v3-primary">حفظ سجل الصيانة</button><p id="maintMsg"></p></div><div class="v3-panel"><h3>سجل الصيانة</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>الآلية</th><th>الحالة</th><th>الوصف</th><th>الإجراء</th><th>التكلفة</th></tr></thead><tbody id="maintBody"></tbody></table></div></div>`;
    const now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1); eqFrom.value=start.toISOString().slice(0,10); eqTo.value=now.toISOString().slice(0,10); maintDate.value=eqTo.value;
    async function load(){try{const [s,m]=await Promise.all([api(`/api/equipment/summary?from=${eqFrom.value}&to=${eqTo.value}`),api(`/api/maintenance?from=${eqFrom.value}&to=${eqTo.value}`)]);eqBody.innerHTML=s.rows.length?s.rows.map(r=>`<tr><td>${esc(r.equipment_name)}</td><td><span class="status-pill status-${encodeURIComponent(r.latest_status||"")}">${esc(r.latest_status||"-")}</span><small>${esc(r.latest_date||"")}</small></td><td>${fmt(r.working_hours)}</td><td>${fmt(r.diesel_liters)} لتر</td><td>${fmt(r.report_days)}</td><td>${fmt(r.maintenance_count)}</td></tr>`).join(""):`<tr><td colspan="6">لا توجد بيانات</td></tr>`;maintBody.innerHTML=m.logs.length?m.logs.map(x=>`<tr><td>${esc(x.log_date)}</td><td>${esc(x.equipment_name)}</td><td>${esc(x.status)}</td><td>${esc(x.description)}</td><td>${esc(x.action_taken)}</td><td>${fmt(x.cost)}</td></tr>`).join(""):`<tr><td colspan="6">لا توجد سجلات صيانة</td></tr>`;}catch(e){eqBody.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}}
    eqLoad.onclick=load; maintSave.onclick=async()=>{try{await api("/api/maintenance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({equipment_name:maintName.value,log_date:maintDate.value,status:maintStatus.value,description:maintDesc.value,action_taken:maintAction.value,cost:maintCost.value})});maintMsg.textContent="تم حفظ سجل الصيانة";maintDesc.value="";maintAction.value="";load();}catch(e){maintMsg.textContent=e.message;}}; load();
  }

  async function renderWeekly(){
    activeNav("/weekly","الأسبوعي"); const c=shell("التقرير الأسبوعي","ملخص سبعة أيام للنفايات والشاحنات والسولار مع التفاصيل اليومية."); if(!c)return;
    c.innerHTML=`<div class="v3-filter"><label>بداية الأسبوع<input id="weekStart" type="date"></label><button id="weekLoad">عرض الأسبوع</button></div><div id="weekCards" class="v3-kpis"></div><div class="v3-panel"><h3 id="weekTitle">تفاصيل الأسبوع</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>رقم التقرير</th><th>النفايات طن</th><th>الشاحنات</th><th>السولار لتر</th></tr></thead><tbody id="weekBody"></tbody></table></div></div>`;
    const d=new Date();d.setDate(d.getDate()-6);weekStart.value=d.toISOString().slice(0,10);
    async function load(){try{const x=await api(`/api/weekly?start=${weekStart.value}`);weekTitle.textContent=`${x.start} — ${x.end}`;weekCards.innerHTML=[['أيام مسجلة',x.summary.days,'يوم'],['إجمالي النفايات',x.summary.waste,'طن'],['إجمالي الشاحنات',x.summary.trucks,'شاحنة'],['إجمالي السولار',x.summary.diesel,'لتر'],['متوسط النفايات',x.summary.waste_avg,'طن/يوم'],['متوسط الشاحنات',x.summary.trucks_avg,'شاحنة/يوم']].map(v=>`<div><span>${v[0]}</span><strong>${fmt(v[1])}</strong><small>${v[2]}</small></div>`).join("");weekBody.innerHTML=x.reports.length?x.reports.map(r=>`<tr><td>${r.report_date}</td><td>${r.report_no}</td><td>${fmt(r.total_waste_tons)}</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)}</td></tr>`).join(""):`<tr><td colspan="5">لا توجد تقارير في هذه الفترة</td></tr>`;}catch(e){weekBody.innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`;}}
    weekLoad.onclick=load;load();
  }

  async function renderSearch(){
    activeNav("/search","بحث متقدم"); const c=shell("البحث المتقدم","البحث داخل التقارير والملاحظات والمعدات مع فلاتر التاريخ والحالة والكميات."); if(!c)return;
    c.innerHTML=`<div class="v3-panel"><div class="v3-search-grid"><label>كلمة البحث<input id="sQ" placeholder="رقم تقرير، ملاحظة، آلية..."></label><label>من<input id="sFrom" type="date"></label><label>إلى<input id="sTo" type="date"></label><label>حالة المعدات<select id="sStatus"><option value="">الكل</option><option>يعمل</option><option>جاهز</option><option>تحت الصيانة</option><option>متعطل</option></select></label><label>أقل نفايات<input id="sMin" type="number"></label><label>أعلى نفايات<input id="sMax" type="number"></label></div><button id="sGo" class="v3-primary">بحث</button></div><div class="v3-panel"><h3>النتائج <small id="sCount"></small></h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>رقم التقرير</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>إجراء</th></tr></thead><tbody id="sBody"></tbody></table></div></div>`;
    async function run(){try{const p=new URLSearchParams({q:sQ.value,from:sFrom.value,to:sTo.value,equipment_status:sStatus.value,min_waste:sMin.value,max_waste:sMax.value});const d=await api(`/api/search?${p}`);sCount.textContent=`(${d.reports.length})`;sBody.innerHTML=d.reports.length?d.reports.map(r=>`<tr><td>${r.report_date}</td><td>${r.report_no}</td><td>${fmt(r.total_waste_tons)}</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)}</td><td><button onclick="printReport(${r.id})">طباعة</button></td></tr>`).join(""):`<tr><td colspan="6">لا توجد نتائج</td></tr>`;}catch(e){sBody.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}}
    sGo.onclick=run;sQ.addEventListener("keydown",e=>{if(e.key==="Enter")run();});run();
  }

  async function renderManagerial(){
    activeNav("/managerial","تقرير إداري"); const c=shell("التقرير الإداري المختصر","تقرير تنفيذي للفترة المحددة، مناسب للطباعة PDF والتصدير إلى Excel/CSV."); if(!c)return;
    c.innerHTML=`<div class="v3-filter no-print"><label>من<input id="mFrom" type="date"></label><label>إلى<input id="mTo" type="date"></label><button id="mLoad">تحديث</button><button id="mPrint">طباعة / PDF</button><a id="mCsv" class="v3-link-btn">Excel / CSV</a></div><section id="managerialReport" class="managerial-report"><div class="managerial-title"><h2>التقرير الإداري التشغيلي</h2><p id="mPeriod"></p></div><div id="mCards" class="v3-kpis"></div><div class="v3-panel flat"><h3>البيانات اليومية</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th></tr></thead><tbody id="mBody"></tbody></table></div></div><div class="managerial-sign">تصميم قسم المكب — المهندس محمد جبرين</div></section>`;
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1);mFrom.value=start.toISOString().slice(0,10);mTo.value=now.toISOString().slice(0,10);
    async function load(){try{const p=new URLSearchParams({from:mFrom.value,to:mTo.value});const d=await api(`/api/search?${p}`);const rs=d.reports.sort((a,b)=>a.report_date.localeCompare(b.report_date));const sum=k=>rs.reduce((s,r)=>s+Number(r[k]||0),0);mPeriod.textContent=`الفترة من ${mFrom.value} إلى ${mTo.value}`;mCards.innerHTML=[['عدد التقارير',rs.length,'تقرير'],['النفايات',sum('total_waste_tons'),'طن'],['الشاحنات',sum('total_trucks'),'شاحنة'],['السولار',sum('total_diesel'),'لتر']].map(v=>`<div><span>${v[0]}</span><strong>${fmt(v[1])}</strong><small>${v[2]}</small></div>`).join('');mBody.innerHTML=rs.length?rs.map(r=>`<tr><td>${r.report_date}</td><td>${fmt(r.total_waste_tons)}</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)}</td></tr>`).join(''):`<tr><td colspan="4">لا توجد بيانات</td></tr>`;mCsv.href=`/api/export/managerial.csv?from=${mFrom.value}&to=${mTo.value}`;}catch(e){mBody.innerHTML=`<tr><td colspan="4">${esc(e.message)}</td></tr>`;}}
    mLoad.onclick=load;mPrint.onclick=()=>window.print();load();
  }

  async function renderAdmin(){
    activeNav("/admin","الإدارة"); const c=shell("الإدارة والصلاحيات","إدارة المستخدمين، سجل التعديلات، النسخ الاحتياطي والاستعادة."); if(!c)return;
    c.innerHTML=`<div class="v3-admin-grid"><div class="v3-panel"><h3>النسخ الاحتياطي والاستعادة</h3><a class="v3-primary inline" href="/api/backup/download">تنزيل نسخة كاملة</a><p>للحماية من استعادة ملف غير صالح، تتم الاستعادة من شاشة إدارة النظام بعد فحص النسخة ومعاينتها والتأكيد.</p><a class="v3-link-btn" href="/system.html">فتح الاستعادة الآمنة</a></div></div><div class="v3-panel"><h3>سجل التعديلات Audit Log</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النوع</th><th>المعرف</th><th>التفاصيل</th></tr></thead><tbody id="auditBody"></tbody></table></div></div>`;
    async function load(){try{const a=await api('/api/audit?limit=300');auditBody.innerHTML=a.logs.map(x=>`<tr><td>${esc(x.created_at)}</td><td>${esc(x.username)}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${esc(x.entity_id)}</td><td>${esc(x.details)}</td></tr>`).join('');}catch(e){c.innerHTML=`<div class="v3-panel">${esc(e.message)} — هذه الصفحة للمدير فقط.</div>`;}}
    load();
  }

  function enhanceReportAttachments(){
    if(path!=="/report")return;
    const actions=document.querySelector("section.actions"); if(!actions||document.getElementById("reportAttachmentsPanel"))return;
    const p=document.createElement("section");p.id="reportAttachmentsPanel";p.className="panel";p.innerHTML=`<h2>مرفقات التقرير</h2><p class="muted">بعد حفظ التقرير يمكنك إرفاق صور الموقع أو الأعطال أو الأعمال المنفذة. الحد الأقصى 8MB للملف.</p><input id="attachmentFile" type="file" accept="image/*,.pdf"><button id="attachmentUploadBtn" type="button">رفع المرفق</button><div id="attachmentList" class="attachment-list"></div>`;actions.before(p);
    async function refresh(){if(!window.editingId)return;try{const d=await api(`/api/reports/${window.editingId||editingId}/attachments`);attachmentList.innerHTML=d.attachments.length?d.attachments.map(a=>`<div><a href="/api/attachments/${a.id}/download" target="_blank">${esc(a.original_name)}</a><small>${fmt(a.size_bytes/1024)} KB</small></div>`).join(''):'لا توجد مرفقات';}catch{}}
    attachmentUploadBtn.onclick=async()=>{const f=attachmentFile.files[0];if(!f)return alert('اختر ملفًا');const id=window.editingId||editingId;if(!id)return alert('احفظ التقرير أولًا ثم ارفع المرفق');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});try{await api(`/api/reports/${id}/attachments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,mime_type:f.type,data_base64:data})});attachmentFile.value='';refresh();}catch(e){alert(e.message);}};setInterval(refresh,2500);refresh();
  }

  async function addAlerts(){
    if(path!=="/")return;setTimeout(async()=>{const dash=document.querySelector('.dashboard-home');if(!dash||document.getElementById('dashboardAlerts'))return;try{const d=await api('/api/alerts');const s=document.createElement('section');s.id='dashboardAlerts';s.className='dashboard-alerts';s.innerHTML=`<div class="dashboard-section-head compact"><div><span>تنبيهات</span><h3>تنبيهات التشغيل</h3></div></div>${d.alerts.length?`<div class="alerts-grid">${d.alerts.map(a=>`<div class="alert-card ${a.level}"><strong>${esc(a.title)}</strong><small>${esc(a.detail)}</small></div>`).join('')}</div>`:'<div class="alert-card success"><strong>لا توجد تنبيهات حالية</strong><small>البيانات المسجلة تبدو طبيعية.</small></div>'}`;dash.insertBefore(s,dash.querySelector('.dashboard-grid'));}catch{}},400);
  }

  document.addEventListener("DOMContentLoaded",()=>{
    addGlobalNav();
    if(path==="/equipment")renderEquipment();
    else if(path==="/weekly")renderWeekly();
    else if(path==="/search")renderSearch();
    else if(path==="/managerial")renderManagerial();
    else if(path==="/admin")renderAdmin();
    else {enhanceReportAttachments();addAlerts();}
  });
})();
