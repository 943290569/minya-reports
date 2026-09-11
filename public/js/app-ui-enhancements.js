/* System-wide visual state enhancement — no business logic changes */
(function(){
  const emptyPhrases=["لا توجد بيانات","لا توجد نتائج","لا توجد تقارير","لا توجد سجلات","لا توجد تقارير في هذه الفترة","لا توجد سجلات صيانة"];
  function classifyEmptyCells(root=document){root.querySelectorAll('td[colspan]').forEach(td=>{const text=(td.textContent||'').trim();if(emptyPhrases.some(p=>text.includes(p)))td.classList.add('minya-empty-state');else td.classList.remove('minya-empty-state');});}
  function classifyMessages(root=document){root.querySelectorAll('#maintMsg,.message,[id$="Msg"],[class*="message"]').forEach(el=>{const text=(el.textContent||'').trim();if(!text)return;el.classList.add('minya-ui-message');el.classList.remove('is-success','is-warning','is-error');if(/تم |نجاح|حفظ|مكتمل|سليم|لا توجد تنبيهات/.test(text))el.classList.add('is-success');else if(/خطأ|فشل|تعذر|غير مسموح|مرفوض/.test(text))el.classList.add('is-error');else if(/تحذير|تنبيه|مطلوب|قيد|انتظار/.test(text))el.classList.add('is-warning');});}
  function enhance(root=document){classifyEmptyCells(root);classifyMessages(root);}
  function start(){enhance();let queued=false;const observer=new MutationObserver(mutations=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mutations.forEach(m=>{if(m.target&&m.target.nodeType===1)enhance(m.target.closest?.('main')||document);});});});observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Operations dashboard and unified search */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  if(!['/ops-dashboard','/global-search'].includes(route))return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const api=async(url,opt)=>{const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function shell(title,sub){const main=document.querySelector('main.container');if(!main)return null;main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>MINYA LANDFILL</span><h2>${title}</h2><p>${sub}</p></div></div><div id="opsAux"></div></section>`;return document.getElementById('opsAux');}
  async function dashboard(){
    const c=shell('لوحة التشغيل','ملخص المركبات والحوادث والعصارة والغطاء والتنبيهات التشغيلية.');if(!c)return;
    const today=localDate(),from=today.slice(0,7)+'-01';
    c.innerHTML=`<div id="opsKpis" class="v3-kpis"></div><div class="v3-panel"><h3>التنبيهات</h3><div id="opsAlerts"></div></div><div class="v3-panel"><h3>الأقسام</h3><div class="dashboard-grid"><a class="dashboard-card" href="/fleet"><h3>المركبات والسائقون</h3><p>الرخص والتأمين وحركة مركبات المكب.</p></a><a class="dashboard-card" href="/maintenance-incidents"><h3>الصيانة والحوادث</h3><p>الأعطال والحوادث والمتابعة والتكاليف.</p></a><a class="dashboard-card" href="/environment"><h3>العصارة والغطاء</h3><p>العصارة ونقلات الصهريج والغطاء اليومي.</p></a><a class="dashboard-card" href="/global-search"><h3>البحث الشامل</h3><p>بحث موحد داخل بيانات النظام.</p></a></div></div>`;
    const [f,i,e,r]=await Promise.all([api('/api/ops/fleet').catch(()=>({vehicles:[]})),api('/api/incidents').catch(()=>({incidents:[]})),api(`/api/ops/environment?from=${from}&to=${today}`).catch(()=>({totals:{},rows:[]})),api('/api/reports').catch(()=>({reports:[]}))]);
    const open=(i.incidents||[]).filter(x=>x.followup_status!=='مغلقة');
    const pending=(r.reports||[]).filter(x=>x.workflow_status==='pending');
    document.getElementById('opsKpis').innerHTML=[['المركبات',(f.vehicles||[]).length,'مركبة'],['السجلات المفتوحة',open.length,'سجل'],['بانتظار الاعتماد',pending.length,'تقرير'],['العصارة هذا الشهر',e.totals?.leachate_m3||0,'م³'],['نقلات الغطاء',e.totals?.cover_trips||0,'نقلة']].map(x=>`<div><span>${x[0]}</span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></div>`).join('');
    const alerts=[];
    (f.vehicles||[]).forEach(v=>[['رخصة السائق',v.driver_license_days],['رخصة المركبة',v.vehicle_license_days],['التأمين',v.insurance_days]].forEach(([name,d])=>{if(d!==null&&d<=30)alerts.push(`${name} - ${v.vehicle_name}: ${d<0?'منتهية منذ '+Math.abs(d)+' يوم':'متبقي '+d+' يوم'}`);}));
    open.slice(0,12).forEach(x=>alerts.push(`${x.incident_type} - ${x.asset_name}: ${x.followup_status}`));
    if(pending.length)alerts.push(`${pending.length} تقرير بانتظار المراجعة أو الاعتماد`);
    if(!(e.rows||[]).some(x=>x.log_date===today))alerts.push(`لم يتم إدخال سجل العصارة والغطاء لليوم ${today}`);
    document.getElementById('opsAlerts').innerHTML=alerts.length?`<ul>${alerts.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:'<div class="minya-empty-state">لا توجد تنبيهات حالية</div>';
  }
  async function globalSearch(){
    const c=shell('البحث الشامل','بحث موحد في التقارير والمركبات والسائقين والصيانة والحوادث.');if(!c)return;
    c.innerHTML=`<div class="v3-panel"><div class="v3-filter"><input id="globalQ" placeholder="اكتب كلمة البحث"><button id="globalGo" class="v3-primary">بحث</button></div></div><div id="globalResults"></div>`;
    const q=document.getElementById('globalQ'),out=document.getElementById('globalResults');
    async function run(){const text=q.value.trim();if(!text){out.innerHTML='';return;}out.innerHTML='<div class="minya-empty-state">جاري البحث...</div>';const [reports,fleet,incidents]=await Promise.all([api(`/api/search?q=${encodeURIComponent(text)}`).catch(()=>({reports:[]})),api(`/api/ops/fleet?q=${encodeURIComponent(text)}`).catch(()=>({vehicles:[]})),api(`/api/incidents?q=${encodeURIComponent(text)}`).catch(()=>({incidents:[]}))]);const rows=[...(reports.reports||[]).map(x=>['تقرير',x.report_no,x.report_date,x.notes||'','/archive']),...(fleet.vehicles||[]).map(x=>['مركبة/سائق',x.vehicle_name,x.plate_no,x.driver_name||x.driver_license_no||'','/fleet']),...(incidents.incidents||[]).map(x=>['صيانة/حادث',x.asset_name,x.incident_date,x.description||'','/maintenance-incidents'])];out.innerHTML=rows.length?`<div class="v3-panel"><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>النوع</th><th>العنوان</th><th>التاريخ/الرقم</th><th>التفصيل</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td><td><a href="${x[4]}">فتح</a></td></tr>`).join('')}</tbody></table></div></div>`:'<div class="minya-empty-state">لا توجد نتائج</div>';}
    document.getElementById('globalGo').onclick=run;q.onkeydown=e=>{if(e.key==='Enter')run();};
  }
  const render=()=>route==='/ops-dashboard'?dashboard():globalSearch();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
