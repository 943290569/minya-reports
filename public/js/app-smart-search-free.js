/* Smart local search — free, no external AI/API */
(function(){
  const state={reports:[]};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const normalize=s=>String(s||'').trim().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').toLowerCase();
  const nowYear=()=>new Date().getFullYear();
  async function getJson(url){const r=await fetch(url,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'فشل تحميل البيانات');return d;}

  function extractMonth(q){
    const m=q.match(/(?:شهر|الشهر)\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}))?/);
    if(!m)return null;const month=Math.min(12,Math.max(1,Number(m[1])));const year=Number(m[2]||nowYear());return `${year}-${String(month).padStart(2,'0')}`;
  }
  function extractDate(q){const m=q.match(/(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)/);if(!m)return null;return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;}
  function extractThreshold(q){const m=q.match(/(?:عن|فوق|اكثر من|أكثر من|اكبر من|أكبر من)\s*(\d+(?:\.\d+)?)/);return m?Number(m[1]):null;}
  function metricFor(q){const n=normalize(q);if(/سولار|ديزل|لتر/.test(n))return ['total_diesel','السولار','لتر'];if(/شاحن|مركب/.test(n))return ['total_trucks','الشاحنات','شاحنة'];return ['total_waste_tons','النفايات','طن'];}
  function searchableText(r){return normalize([r.notes,r.weather,r.report_no,r.report_date,r.status,r.workflow_status,r.created_by,r.updated_by].filter(Boolean).join(' '));}
  function keyword(q){
    let n=normalize(q);
    n=n.replace(/تقارير?|اعطني|اظهر|ابحث|فيها|فيه|التي|الذي|خلال|شهر|الشهر|الا?يام|النفايات|الشاحنات|السولار|ديزل|اكثر|اكبر|فوق|عن|طن|لتر|ملاحظه|ملاحظات|20\d{2}|\d+/g,' ');
    return n.replace(/\s+/g,' ').trim();
  }

  function search(query){
    const raw=String(query||'').trim();if(!raw)return {title:'اكتب ما تريد البحث عنه',rows:[],note:'يمكن البحث بالشهر أو الكمية أو كلمة من الملاحظات.'};
    const month=extractMonth(raw),date=extractDate(raw),threshold=extractThreshold(raw),metric=metricFor(raw),word=keyword(raw);
    let rows=state.reports.slice();
    if(month)rows=rows.filter(r=>String(r.report_date||'').startsWith(month));
    if(date)rows=rows.filter(r=>String(r.report_date||'')===date);
    if(threshold!==null)rows=rows.filter(r=>Number(r[metric[0]]||0)>threshold);
    if(word)rows=rows.filter(r=>searchableText(r).includes(word));
    rows.sort((a,b)=>String(b.report_date||'').localeCompare(String(a.report_date||'')));
    const parts=[];if(month)parts.push(`شهر ${Number(month.slice(5))}/${month.slice(0,4)}`);if(threshold!==null)parts.push(`${metric[1]} أكثر من ${fmt(threshold)} ${metric[2]}`);if(word)parts.push(`ملاحظات تحتوي «${word}»`);if(date)parts.push(date);
    return {title:parts.length?parts.join(' — '):'نتائج البحث',rows:rows.slice(0,50),total:rows.length,note:rows.length>50?'يعرض أول 50 نتيجة.':' '};
  }

  function renderResult(result){
    const box=document.getElementById('smartSearchResults');if(!box)return;
    if(!result.rows.length){box.innerHTML=`<div class="ss-empty"><strong>لا توجد نتائج مطابقة</strong><span>${esc(result.title)}</span></div>`;return;}
    box.innerHTML=`<div class="ss-result-head"><strong>${esc(result.title)}</strong><span>${result.total} نتيجة</span></div><div class="ss-result-list">${result.rows.map(r=>`<a href="/archive" class="ss-result-item"><div><strong>${esc(r.report_date||'-')}</strong><small>${esc(r.report_no||'')}</small></div><div><span>${fmt(r.total_waste_tons)} طن</span><span>${fmt(r.total_trucks)} شاحنة</span><span>${fmt(r.total_diesel)} لتر</span></div>${r.notes?`<p>${esc(String(r.notes).slice(0,140))}</p>`:''}</a>`).join('')}</div>${result.note.trim()?`<small class="ss-note">${esc(result.note)}</small>`:''}`;
  }

  function mount(){
    const host=document.getElementById('freeSmartInsights')||document.querySelector('.dashboard-home');if(!host||document.getElementById('smartLocalSearch'))return;
    const section=document.createElement('section');section.id='smartLocalSearch';section.className='smart-local-search';
    section.innerHTML=`<div class="ss-head"><div><span>بحث متقدم</span><h3>ابحث في التقارير</h3></div></div><div class="ss-bar"><input id="smartSearchInput" type="search" placeholder="مثال: الأيام التي زادت فيها النفايات عن 1400 طن"><button id="smartSearchBtn" type="button">بحث</button></div><div class="ss-examples"><button data-ss="تقارير شهر 8 فيها العصارة">شهر 8 + العصارة</button><button data-ss="الأيام التي زادت فيها النفايات عن 1400 طن">أكثر من 1400 طن</button><button data-ss="السولار أكثر من 500 لتر">سولار مرتفع</button></div><div id="smartSearchResults" class="ss-results"><div class="ss-hint">اكتب السؤال كما تتكلم، وسيتم البحث داخل بيانات التقارير المحفوظة.</div></div>`;
    host.insertAdjacentElement('afterend',section);
    const run=()=>renderResult(search(document.getElementById('smartSearchInput').value));
    document.getElementById('smartSearchBtn').onclick=run;document.getElementById('smartSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter')run();});section.querySelectorAll('[data-ss]').forEach(b=>b.onclick=()=>{document.getElementById('smartSearchInput').value=b.dataset.ss;run();});
  }

  async function init(){mount();try{const d=await getJson('/api/reports');state.reports=Array.isArray(d.reports)?d.reports:[];}catch(e){const box=document.getElementById('smartSearchResults');if(box)box.textContent='تعذر تحميل بيانات البحث الآن.';}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,220),{once:true});else setTimeout(init,220);
})();
