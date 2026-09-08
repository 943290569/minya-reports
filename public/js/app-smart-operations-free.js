/* Stable 10 — free smart operations: equipment patterns, actions, forecasts */
(function(){
  const state={reports:[],details:[],notifications:[]};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
  const avg=a=>a.length?a.reduce((s,v)=>s+Number(v||0),0)/a.length:0;
  const localDateParts=()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(x=>x.type===t)?.value||'';
    return {year:Number(get('year')),month:Number(get('month')),day:Number(get('day')),iso:`${get('year')}-${get('month')}-${get('day')}`};
  };
  const today=()=>localDateParts().iso;
  const thisMonth=()=>today().slice(0,7);
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const getJson=async url=>{const r=await fetch(url,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'فشل تحميل البيانات');return d;};

  function equipmentName(x){return String(x?.equipment_name||x?.name||x?.equipment||'معدة غير مسماة').trim();}
  function equipmentStatus(x){return String(x?.operating_status||x?.status||x?.condition||'').trim();}
  function isIssueStatus(status){return !!status && !['يعمل','شغال','متاح','جيد','فعال'].includes(status);}

  function analyzeEquipment(){
    const byName=new Map();
    state.details.forEach(({date,equipment})=>{
      (equipment||[]).forEach(item=>{
        const name=equipmentName(item); const status=equipmentStatus(item);
        if(!byName.has(name))byName.set(name,{name,total:0,issues:0,lastIssue:'',statuses:new Map()});
        const row=byName.get(name); row.total++;
        if(status){row.statuses.set(status,(row.statuses.get(status)||0)+1);}
        if(isIssueStatus(status)){row.issues++; if(!row.lastIssue||date>row.lastIssue)row.lastIssue=date;}
      });
    });
    return [...byName.values()].filter(x=>x.issues>0).sort((a,b)=>b.issues-a.issues).slice(0,6);
  }

  function forecast(){
    const rows=state.reports.filter(r=>String(r.report_date||'').startsWith(thisMonth())).sort((a,b)=>String(a.report_date).localeCompare(String(b.report_date)));
    if(rows.length<3)return null;
    const waste=rows.map(r=>Number(r.total_waste_tons||0)).filter(v=>v>0);
    const diesel=rows.map(r=>Number(r.total_diesel||0)).filter(v=>v>0);
    const trucks=rows.map(r=>Number(r.total_trucks||0)).filter(v=>v>0);
    const recentWaste=avg(waste.slice(-7));
    const recentDiesel=avg(diesel.slice(-7));
    const recentTrucks=avg(trucks.slice(-7));
    const p=localDateParts();
    const daysInMonth=new Date(Date.UTC(p.year,p.month,0)).getUTCDate();
    return {
      days:rows.length,
      dailyWaste:recentWaste,
      monthWaste:recentWaste*daysInMonth,
      dailyDiesel:recentDiesel,
      monthDiesel:recentDiesel*daysInMonth,
      dailyTrucks:recentTrucks
    };
  }

  function dismissedSet(){try{return new Set(JSON.parse(localStorage.getItem('minya_dismissed_actions_v1')||'[]'));}catch{return new Set();}}
  function dismiss(key){const s=dismissedSet();s.add(key);localStorage.setItem('minya_dismissed_actions_v1',JSON.stringify([...s].slice(-50)));renderActions();}

  function actionItems(){
    const hidden=dismissedSet(); const out=[];
    (state.notifications||[]).forEach((n,i)=>{
      const key=`n:${n.title||''}:${n.text||''}`;
      if(!hidden.has(key))out.push({key,title:n.title||'تنبيه',text:n.text||'',href:n.href||'/',tone:n.tone||'info'});
    });
    analyzeEquipment().slice(0,3).forEach(x=>{
      const key=`eq:${x.name}:${x.issues}`;
      if(!hidden.has(key))out.push({key,title:`متابعة ${x.name}`,text:`تكررت حالة تحتاج متابعة ${x.issues} مرة في التقارير المفحوصة.`,href:'/equipment',tone:'warning'});
    });
    return out.slice(0,8);
  }

  function ensureUi(){
    const dash=document.querySelector('.dashboard-home');
    if(!dash||document.getElementById('smartOperationsFree'))return;
    const section=document.createElement('section'); section.id='smartOperationsFree'; section.className='smart-ops-free';
    section.innerHTML=`
      <div class="sof-head"><div><span>متابعة تشغيلية</span><h3>قراءة سريعة وإجراءات</h3></div></div>
      <div class="sof-grid">
        <div class="sof-card"><h4>المعدات التي تحتاج متابعة</h4><div id="sofEquipment">جاري الفحص...</div></div>
        <div class="sof-card"><h4>تقدير الشهر الحالي</h4><div id="sofForecast">جاري الحساب...</div></div>
      </div>
      <div class="sof-actions"><div class="sof-actions-head"><h4>إجراءات مقترحة</h4><small>يمكن إخفاء الإجراء بعد مراجعته</small></div><div id="sofActions"></div></div>`;
    const smart=document.getElementById('freeSmartInsights');
    if(smart)smart.insertAdjacentElement('afterend',section); else dash.appendChild(section);
  }

  function renderEquipment(){
    const box=document.getElementById('sofEquipment'); if(!box)return;
    const rows=analyzeEquipment();
    box.innerHTML=rows.length?rows.map(x=>`<a class="sof-eq-row" href="/equipment"><strong>${esc(x.name)}</strong><span>${x.issues} حالة تحتاج متابعة${x.lastIssue?` — آخرها ${esc(x.lastIssue)}`:''}</span></a>`).join(''):'<div class="sof-ok">لا يظهر تكرار لمشكلات المعدات في التقارير المفحوصة.</div>';
  }

  function renderForecast(){
    const box=document.getElementById('sofForecast');if(!box)return;
    const f=forecast();
    if(!f){box.innerHTML='<div class="sof-muted">نحتاج 3 تقارير على الأقل لإظهار تقدير مفيد.</div>';return;}
    box.innerHTML=`<div class="sof-forecast-grid"><div><span>متوسط النفايات المتوقع يوميًا</span><strong>${fmt(f.dailyWaste)} طن</strong></div><div><span>تقدير نفايات الشهر</span><strong>${fmt(f.monthWaste)} طن</strong></div><div><span>متوسط الشاحنات</span><strong>${fmt(f.dailyTrucks)} يوميًا</strong></div><div><span>تقدير سولار الشهر</span><strong>${fmt(f.monthDiesel)} لتر</strong></div></div><small class="sof-note">تقدير حسابي يعتمد على متوسط أحدث الأيام المسجلة، وليس تنبؤًا مضمونًا.</small>`;
  }

  function renderActions(){
    const box=document.getElementById('sofActions');if(!box)return;
    const items=actionItems();
    if(!items.length){box.innerHTML='<div class="sof-ok">لا توجد إجراءات عاجلة الآن.</div>';return;}
    box.innerHTML=items.map(x=>`<div class="sof-action" data-tone="${esc(x.tone)}"><div><strong>${esc(x.title)}</strong><span>${esc(x.text)}</span></div><div class="sof-action-buttons"><a href="${esc(x.href)}">فتح</a><button type="button" data-dismiss="${esc(x.key)}">تمت المراجعة</button></div></div>`).join('');
    box.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>dismiss(b.dataset.dismiss));
  }

  async function loadDetails(){
    const monthRows=state.reports.filter(r=>String(r.report_date||'').startsWith(thisMonth())).sort((a,b)=>String(b.report_date).localeCompare(String(a.report_date))).slice(0,31);
    const details=[];
    for(let i=0;i<monthRows.length;i+=5){
      const batch=monthRows.slice(i,i+5);
      const vals=await Promise.all(batch.map(async r=>{try{const d=await getJson(`/api/reports/${r.id}`);const report=d.report||d;const equipment=Array.isArray(report.equipment)?report.equipment:Array.isArray(d.equipment)?d.equipment:[];return {date:r.report_date,equipment};}catch{return {date:r.report_date,equipment:[]};}}));
      details.push(...vals);
    }
    state.details=details;
  }

  async function init(){
    ensureUi();
    try{
      const r=await getJson('/api/reports'); state.reports=Array.isArray(r.reports)?r.reports:[];
      await loadDetails();
      state.notifications=Array.isArray(window.MINYA_NOTIFICATIONS)?window.MINYA_NOTIFICATIONS:[];
      renderEquipment();renderForecast();renderActions();
    }catch(e){
      const eq=document.getElementById('sofEquipment');if(eq)eq.textContent='تعذر تحميل تحليل المعدات الآن.';
      const fc=document.getElementById('sofForecast');if(fc)fc.textContent='تعذر حساب التقدير الآن.';
    }
  }

  window.addEventListener('minya-notifications-updated',e=>{state.notifications=Array.isArray(e.detail?.items)?e.detail.items:[];renderActions();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,260),{once:true});else setTimeout(init,260);
})();
