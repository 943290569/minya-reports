/* Free smart insights — no external AI/API */
(function(){
  const state={reports:[],licenses:[]};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
  const avg=a=>a.length?a.reduce((s,v)=>s+Number(v||0),0)/a.length:0;
  const std=a=>{if(a.length<2)return 0;const m=avg(a);return Math.sqrt(avg(a.map(v=>(Number(v||0)-m)**2)));};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const thisMonth=()=>today().slice(0,7);
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  async function getJson(url){const r=await fetch(url,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'فشل تحميل البيانات');return d;}

  function monthReports(){const m=thisMonth();return state.reports.filter(r=>String(r.report_date||'').startsWith(m));}

  function detectReviewItems(){
    const items=monthReports();
    const out=[];
    [['total_waste_tons','النفايات','طن'],['total_diesel','السولار','لتر'],['total_trucks','الشاحنات','شاحنة']].forEach(([key,label,unit])=>{
      const vals=items.map(r=>Number(r[key]||0)).filter(v=>v>0);
      const m=avg(vals),sd=std(vals);
      if(!vals.length)return;
      items.forEach(r=>{const v=Number(r[key]||0);if(!v)return;const unusual=sd>0&&Math.abs(v-m)>=2*sd;const jump=m>0&&Math.abs(v-m)/m>=.35;if(unusual||jump)out.push({date:r.report_date,label,value:v,unit,avg:m});});
    });
    return out.slice(0,8);
  }

  function insightSummary(){
    const items=monthReports();
    if(!items.length)return ['لا توجد بيانات كافية لهذا الشهر حتى الآن.'];
    const waste=items.map(r=>Number(r.total_waste_tons||0));
    const trucks=items.map(r=>Number(r.total_trucks||0));
    const diesel=items.map(r=>Number(r.total_diesel||0));
    const top=items.slice().sort((a,b)=>Number(b.total_waste_tons||0)-Number(a.total_waste_tons||0))[0];
    const soon=state.licenses.filter(x=>{const d=Number(x.days_remaining);return Number.isFinite(d)&&d>=0&&d<=30;}).length;
    return [
      `متوسط النفايات ${fmt(avg(waste))} طن يوميًا خلال ${items.length} يوم مسجل.`,
      `أعلى كمية مسجلة كانت في ${top?.report_date||'-'} وبلغت ${fmt(top?.total_waste_tons)} طن.`,
      `متوسط الشاحنات ${fmt(avg(trucks))} يوميًا، ومتوسط السولار ${fmt(avg(diesel))} لتر يوميًا.`,
      soon?`${soon} رخصة تحتاج متابعة خلال 30 يومًا.`:'لا توجد رخص تحتاج متابعة خلال 30 يومًا.'
    ];
  }

  function answer(q){
    const query=String(q||'').trim();
    if(!query)return 'اكتب سؤالًا عن النفايات أو الشاحنات أو السولار أو الرخص.';
    const items=monthReports();
    if(/رخص|انتهاء/.test(query)){
      const exp=state.licenses.filter(x=>x.status==='منتهية');
      const soon=state.licenses.filter(x=>{const d=Number(x.days_remaining);return Number.isFinite(d)&&d>=0&&d<=30;});
      return `الرخص: ${exp.length} منتهية، و${soon.length} تحتاج متابعة خلال 30 يومًا.`;
    }
    if(/أعلى|اعلى|اكبر|أكبر/.test(query)&&/نفايات|طن/.test(query)){
      const rows=items.slice().sort((a,b)=>Number(b.total_waste_tons||0)-Number(a.total_waste_tons||0)).slice(0,5);
      return rows.length?rows.map((r,i)=>`${i+1}) ${r.report_date}: ${fmt(r.total_waste_tons)} طن`).join(' — '):'لا توجد بيانات كافية للشهر الحالي.';
    }
    if(/متوسط/.test(query)&&/نفايات|طن/.test(query))return `متوسط النفايات للشهر الحالي ${fmt(avg(items.map(r=>r.total_waste_tons)))} طن يوميًا.`;
    if(/شاحن/.test(query))return `إجمالي الشاحنات للشهر الحالي ${fmt(items.reduce((s,r)=>s+Number(r.total_trucks||0),0))}، والمتوسط اليومي ${fmt(avg(items.map(r=>r.total_trucks)))}.`;
    if(/سولار|ديزل/.test(query))return `إجمالي السولار للشهر الحالي ${fmt(items.reduce((s,r)=>s+Number(r.total_diesel||0),0))} لتر، والمتوسط اليومي ${fmt(avg(items.map(r=>r.total_diesel)))} لتر.`;
    if(/اليوم|تقرير اليوم/.test(query)){const r=state.reports.find(x=>x.report_date===today());return r?`تقرير اليوم موجود: ${fmt(r.total_waste_tons)} طن، ${fmt(r.total_trucks)} شاحنة، ${fmt(r.total_diesel)} لتر سولار.`:'لا يوجد تقرير محفوظ لليوم حتى الآن.';}
    if(/مراجعة|غير طبيعي|مختلف|تنبيه|مشكلة/.test(query)){const a=detectReviewItems();return a.length?a.map(x=>`${x.date}: ${x.label} ${fmt(x.value)} ${x.unit} مقارنة بمتوسط ${fmt(x.avg)}`).join(' — '):'لا توجد فروقات كبيرة تحتاج مراجعة في بيانات الشهر الحالي.';}
    return 'يمكنني الإجابة عن: متوسط وأعلى النفايات، الشاحنات، السولار، تقرير اليوم، الرخص، والقراءات التي تحتاج مراجعة.';
  }

  function mount(){
    const dashboard=document.querySelector('.dashboard-home');
    if(!dashboard||document.getElementById('freeSmartInsights'))return;
    const section=document.createElement('section');
    section.id='freeSmartInsights';section.className='free-smart-insights';
    section.innerHTML=`<div class="fsi-head"><div><span>تحليل ذكي</span><h3>ملخص وتشغيل</h3></div><strong>بدون تكلفة</strong></div><div id="fsiSummary" class="fsi-summary"><div>جاري تحليل البيانات...</div></div><div class="fsi-anomaly"><h4>ملاحظات مهمة</h4><div id="fsiAnomalies">جاري الفحص...</div></div><div class="fsi-ask"><h4>اسأل عن البيانات</h4><div class="fsi-ask-row"><input id="fsiQuestion" placeholder="مثال: ما متوسط النفايات هذا الشهر؟"><button id="fsiAskBtn" type="button">عرض النتيجة</button></div><div class="fsi-chips"><button data-q="ما متوسط النفايات هذا الشهر؟">متوسط النفايات</button><button data-q="ما أعلى أيام النفايات؟">أعلى الأيام</button><button data-q="ما القراءات التي تحتاج مراجعة؟">مراجعة البيانات</button><button data-q="ما وضع الرخص؟">الرخص</button></div><div id="fsiAnswer" class="fsi-answer">يمكنك اختيار أحد الأزرار أو كتابة سؤال مباشر عن بيانات الموقع.</div></div>`;
    const exec=document.getElementById('executiveDashboardSection');
    if(exec)exec.insertAdjacentElement('beforebegin',section);else dashboard.appendChild(section);
    const ask=()=>document.getElementById('fsiAnswer').textContent=answer(document.getElementById('fsiQuestion').value);
    document.getElementById('fsiAskBtn').onclick=ask;document.getElementById('fsiQuestion').addEventListener('keydown',e=>{if(e.key==='Enter')ask();});
    section.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{document.getElementById('fsiQuestion').value=b.dataset.q;ask();});
  }

  async function load(){
    try{
      const [r,l]=await Promise.all([getJson('/api/reports'),getJson('/api/driver-licenses').catch(()=>({rows:[]}))]);
      state.reports=Array.isArray(r.reports)?r.reports:[];state.licenses=Array.isArray(l.rows)?l.rows:[];
      const s=document.getElementById('fsiSummary');if(s)s.innerHTML=insightSummary().map(x=>`<div>${esc(x)}</div>`).join('');
      const a=detectReviewItems(),box=document.getElementById('fsiAnomalies');if(box)box.innerHTML=a.length?a.map(x=>`<div><strong>${esc(x.date)}</strong><span>${esc(x.label)}: ${fmt(x.value)} ${esc(x.unit)} — المتوسط ${fmt(x.avg)}</span></div>`).join(''):'<div class="fsi-ok">لا توجد فروقات كبيرة تحتاج مراجعة حاليًا.</div>';
    }catch(e){const s=document.getElementById('fsiSummary');if(s)s.textContent='تعذر تحميل الملخص الآن.';}
  }

  function init(){mount();load();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,160),{once:true});else setTimeout(init,160);
})();
