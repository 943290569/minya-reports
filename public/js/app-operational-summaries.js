/* Stable 10 — automatic operational summaries (daily / weekly / monthly) */
(function(){
  const state={reports:[],details:new Map(),mode:'daily'};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const getJson=async url=>{const r=await fetch(url,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'تعذر تحميل البيانات');return d;};
  const sum=(rows,key)=>rows.reduce((s,r)=>s+Number(r?.[key]||0),0);
  const avg=(rows,key)=>rows.length?sum(rows,key)/rows.length:0;

  function dateMinus(dateString,days){const d=new Date(`${dateString}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);}
  function rowsFor(mode){
    const today=localDate();
    if(mode==='daily') return state.reports.filter(r=>String(r.report_date||'')===today);
    if(mode==='weekly') {const from=dateMinus(today,6);return state.reports.filter(r=>String(r.report_date||'')>=from&&String(r.report_date||'')<=today);}
    const month=today.slice(0,7);return state.reports.filter(r=>String(r.report_date||'').startsWith(month));
  }

  function latestReport(){return [...state.reports].sort((a,b)=>String(b.report_date||'').localeCompare(String(a.report_date||'')))[0]||null;}
  function labelFor(mode,rows){
    if(mode==='daily') return rows.length?`تقرير ${rows[0].report_date}`:'لا يوجد تقرير محفوظ لليوم حتى الآن';
    if(!rows.length) return mode==='weekly'?'لا توجد تقارير خلال آخر 7 أيام':'لا توجد تقارير في الشهر الحالي';
    const sorted=[...rows].sort((a,b)=>String(a.report_date).localeCompare(String(b.report_date)));
    return mode==='weekly'?`${sorted[0].report_date} — ${sorted[sorted.length-1].report_date}`:`${localDate().slice(0,7)} — ${rows.length} يوم مسجل`;
  }

  function equipmentIssuesForLatest(){
    const latest=latestReport(); if(!latest)return [];
    const d=state.details.get(latest.id); const eq=Array.isArray(d?.equipment)?d.equipment:[];
    return eq.filter(x=>{const s=String(x.operating_status||x.status||'').trim();return s&&!['يعمل','شغال','متاح','جيد','فعال'].includes(s);});
  }

  function summaryText(mode,rows){
    if(!rows.length){
      if(mode==='daily'){
        const latest=latestReport();
        return latest?`آخر تقرير محفوظ بتاريخ ${latest.report_date}.`:'لا توجد تقارير محفوظة.';
      }
      return 'لا تتوفر بيانات كافية لهذه الفترة.';
    }
    const waste=sum(rows,'total_waste_tons'),trucks=sum(rows,'total_trucks'),diesel=sum(rows,'total_diesel');
    if(mode==='daily') return `تم تسجيل ${fmt(waste)} طن عبر ${fmt(trucks)} شاحنة، واستهلاك ${fmt(diesel)} لتر سولار.`;
    return `إجمالي ${fmt(waste)} طن، ${fmt(trucks)} شاحنة، و${fmt(diesel)} لتر سولار خلال ${rows.length} يوم مسجل.`;
  }

  function ensureUi(){
    const dash=document.querySelector('.dashboard-home');if(!dash||document.getElementById('operationalSummaries'))return;
    const s=document.createElement('section');s.id='operationalSummaries';s.className='ops-summaries';
    s.innerHTML=`<div class="ops-summary-head"><div><span>ملخصات التشغيل</span><h3>قراءة يومية وأسبوعية وشهرية</h3></div><div class="ops-summary-tabs" role="tablist"><button type="button" data-mode="daily" class="active">اليوم</button><button type="button" data-mode="weekly">الأسبوع</button><button type="button" data-mode="monthly">الشهر</button></div></div><div id="opsSummaryBody" class="ops-summary-body">جاري تحميل الملخص...</div>`;
    const health=document.getElementById('adminSystemHealth');
    if(health?.parentNode)health.insertAdjacentElement('afterend',s);else dash.prepend(s);
    s.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;s.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));render();});
  }

  function render(){
    const box=document.getElementById('opsSummaryBody');if(!box)return;
    const rows=rowsFor(state.mode);
    const waste=sum(rows,'total_waste_tons'),trucks=sum(rows,'total_trucks'),diesel=sum(rows,'total_diesel');
    const issues=equipmentIssuesForLatest();
    const avgWaste=avg(rows,'total_waste_tons'),avgTrucks=avg(rows,'total_trucks');
    const cards=state.mode==='daily'?[['النفايات',`${fmt(waste)} طن`],['الشاحنات',fmt(trucks)],['السولار',`${fmt(diesel)} لتر`]]:[['إجمالي النفايات',`${fmt(waste)} طن`],['متوسط النفايات',`${fmt(avgWaste)} طن/يوم`],['متوسط الشاحنات',`${fmt(avgTrucks)} شاحنة/يوم`],['السولار',`${fmt(diesel)} لتر`]];
    box.innerHTML=`<div class="ops-summary-period">${esc(labelFor(state.mode,rows))}</div><div class="ops-summary-cards">${cards.map(([a,b])=>`<div><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div><p class="ops-summary-text">${esc(summaryText(state.mode,rows))}</p><div class="ops-summary-followup"><strong>متابعة المعدات:</strong> ${issues.length?`${issues.length} معدة تحتاج مراجعة في آخر تقرير.`:'لا تظهر معدات متوقفة في آخر تقرير.'}</div>`;
  }

  async function loadLatestDetail(){const latest=latestReport();if(!latest)return;try{const d=await getJson(`/api/reports/${latest.id}`);state.details.set(latest.id,d);}catch{}}
  async function init(){ensureUi();try{const d=await getJson('/api/reports');state.reports=Array.isArray(d.reports)?d.reports:[];await loadLatestDetail();render();}catch{const b=document.getElementById('opsSummaryBody');if(b)b.textContent='تعذر تحميل الملخصات التشغيلية الآن.';}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,340),{once:true});else setTimeout(init,340);
})();
